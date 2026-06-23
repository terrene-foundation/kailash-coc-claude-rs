#!/usr/bin/env node
/**
 * Hook: build-cache-gc
 * Event: SessionEnd  (also runnable standalone: `node build-cache-gc.js --sweep`)
 * Purpose: Auto-reclaim the UNAMBIGUOUSLY-SAFE class of regenerable build cache
 *          at session teardown, so orphaned build trees can never accumulate.
 *          Surfaced + measured at SessionStart by `build-cache-guard.js`.
 *
 *   Deletes a directory ONLY when ALL of these hold (defense in depth):
 *     1) the path is NOT a symlink (lstat) — a planted link cannot redirect rm;
 *     2) its realpath is CONFINED under a canonicalized allowed root (the temp
 *        roots — /tmp, /private/tmp, $TMPDIR — OR cwd/.claude/worktrees/) — the
 *        realpath, not the scan path, so a symlink cannot escape scope;
 *     3) realpath basename is exactly `target`;
 *     4) it carries POSITIVE proof-of-cache — Cargo's own `target/CACHEDIR.TAG`
 *        marker OR a sibling `Cargo.toml` — so a directory merely NAMED `target`
 *        (Maven output, a user data dir) is never deleted;
 *     5) it is NOT the live checkout's `target/`, NOT under an
 *        actions-runner / .cargo / .rustup path;
 *     6) nothing in the target subtree was modified within ACTIVE_GRACE_MIN
 *        (an in-flight build is never deleted).
 *   Source is NEVER deleted: only a proven, confined, stale `target/` cache is.
 *
 *   Scope: stray build-only `target/` trees under the temp roots (clone-root has
 *   no .git — the review/redteam clone-to-tmp orphans, the 197GB class) +
 *   sibling-worktree `target/`s (the 51GB N-copies class). Repo-agnostic: synced
 *   into csq/aegis/etc. it self-remediates each repo's pre-existing accumulation
 *   on its next session. The `--sweep` entrypoint runs the same reclamation
 *   non-session-gated (for `/sweep`, cron, or launchd — the cascade backstop for
 *   repos that rarely open a session).
 *
 *   Never blocks (SessionEnd contract). Reports freed space to stderr.
 *
 * Codified by: rules/build-cache-hygiene.md
 * Hardened per security review (symlink-redirect CRIT + proof-of-cache HIGH)
 *   and cc-architect review ($TMPDIR scan root + --sweep backstop).
 *
 * Exit Codes:
 *   0 = success    1 = timeout/non-blocking error (session still continues)
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ACTIVE_GRACE_MIN = 30; // skip anything modified within the last 30 min
const TIMEOUT_MS = 12000;

// Temp roots a clone-to-tmp build tree may land in. $TMPDIR is the macOS
// default for `mktemp -d` (e.g. /var/folders/.../T) — the most common leak
// location, which a /tmp-only scan would miss.
function tempRoots() {
  return [
    ...new Set(
      ["/private/tmp", "/tmp", process.env.TMPDIR]
        .filter(Boolean)
        .map((r) => r.replace(/\/+$/, "")),
    ),
  ];
}

// Canonicalize a root for confinement comparison (null if it does not exist).
function realRoot(r) {
  try {
    return fs.realpathSync(r);
  } catch (_) {
    return null;
  }
}

function sizeKiB(p) {
  try {
    const out = execFileSync("du", ["-skx", p], {
      timeout: 4000,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const k = parseInt(out.split(/\s+/)[0], 10);
    return Number.isFinite(k) ? k : 0;
  } catch (_) {
    return 0;
  }
}

/**
 * Reclaim the safe class for a given working directory. Pure of session state,
 * so both the SessionEnd hook and the `--sweep` CLI call it.
 * Returns { freedKiB, removed: string[] }.
 */
function reclaim(cwd) {
  const graceMs = ACTIVE_GRACE_MIN * 60 * 1000;
  const liveTarget =
    realRoot(path.join(cwd, "target")) || path.join(cwd, "target");
  let freedKiB = 0;
  const removed = [];

  // newest mtime across the immediate target subtree → "actively building?"
  const recentlyActive = (dir) => {
    try {
      const probes = [
        dir,
        path.join(dir, "debug"),
        path.join(dir, "release"),
        path.join(dir, ".rustc_info.json"),
        path.join(dir, "CACHEDIR.TAG"),
      ];
      const newest = Math.max(
        ...probes.map((p) => {
          try {
            return fs.statSync(p).mtimeMs;
          } catch (_) {
            return 0;
          }
        }),
      );
      return Date.now() - newest < graceMs;
    } catch (_) {
      return true; // unknown → treat as active, skip
    }
  };
  // Positive proof this `target/` is a regenerable Cargo build cache.
  const isCargoCache = (realDir) =>
    fs.existsSync(path.join(realDir, "CACHEDIR.TAG")) ||
    fs.existsSync(path.join(path.dirname(realDir), "Cargo.toml"));

  // Delete `p` ONLY if it survives every guard. `allowedRoots` are the dirs the
  // REAL path must stay under (confinement closes the symlink-escape CRIT).
  const safeRemove = (p, allowedRoots) => {
    let lst;
    try {
      lst = fs.lstatSync(p);
    } catch (_) {
      return;
    }
    if (lst.isSymbolicLink()) return; // (1) never follow a planted symlink leaf
    let real;
    try {
      real = fs.realpathSync(p);
    } catch (_) {
      return;
    }
    const roots = allowedRoots.map(realRoot).filter(Boolean);
    if (!roots.some((r) => real === r || real.startsWith(r + path.sep))) return; // (2) confine
    if (path.basename(real) !== "target") return; // (3)
    if (real === liveTarget) return; // (5)
    if (/actions-runner|\.cargo|\.rustup/.test(real)) return; // (5)
    if (!isCargoCache(real)) return; // (4) positive proof-of-cache
    if (recentlyActive(real)) return; // (6) active-build guard
    const k = sizeKiB(real);
    try {
      fs.rmSync(real, { recursive: true, force: true });
      freedKiB += k;
      removed.push(`${real} (${(k / 1024 / 1024).toFixed(1)}GB)`);
    } catch (_) {
      /* leave it; surfaced again next SessionStart */
    }
  };

  const roots = tempRoots();
  // 1) stray build-only target trees under the temp roots
  for (const root of roots) {
    let out = "";
    try {
      out = execFileSync(
        "find",
        [root, "-maxdepth", "3", "-type", "d", "-name", "target", "-print0"],
        {
          timeout: 3500,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
    } catch (_) {
      continue; // skip root on timeout
    }
    for (const t of out.split("\0").filter(Boolean)) {
      // NUL-delimited (newline-safe dir names).
      if (/actions-runner|\.cargo|\.rustup/.test(t)) continue;
      const cloneRoot = path.dirname(t);
      if (fs.existsSync(path.join(cloneRoot, ".git"))) continue; // never disturb a checkout
      safeRemove(t, roots);
    }
  }

  // 2) sibling-worktree target caches (worktrees DO have a .git file, so the
  //    .git skip above does not apply here — these are explicitly reclaimable).
  const wtRoot = path.join(cwd, ".claude", "worktrees");
  if (fs.existsSync(wtRoot)) {
    for (const e of fs.readdirSync(wtRoot, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      safeRemove(path.join(wtRoot, e.name, "target"), [wtRoot]);
    }
  }

  return { freedKiB, removed };
}

// --- Standalone --sweep entrypoint (non-session backstop) -------------------
if (process.argv.includes("--sweep")) {
  try {
    const { freedKiB, removed } = reclaim(process.cwd());
    if (freedKiB > 0) {
      process.stdout.write(
        `[build-cache-gc] reclaimed ${(freedKiB / 1024 / 1024).toFixed(1)}GB: ${removed.join(", ")}\n`,
      );
    } else {
      process.stdout.write("[build-cache-gc] nothing to reclaim\n");
    }
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[build-cache-gc] sweep error: ${e.message}\n`);
    process.exit(1);
  }
}

// --- SessionEnd entrypoint ---------------------------------------------------
const _timeout = setTimeout(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
}, TIMEOUT_MS);

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const { freedKiB, removed } = reclaim(data.cwd || process.cwd());
    if (freedKiB > 0) {
      process.stderr.write(
        `[build-cache-gc] reclaimed ${(freedKiB / 1024 / 1024).toFixed(1)}GB of orphaned build cache: ${removed.join(", ")}\n`,
      );
    }
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  } catch (error) {
    process.stderr.write(`[build-cache-gc] HOOK ERROR: ${error.message}\n`);
    console.log(JSON.stringify({ continue: true }));
    process.exit(1);
  }
});
