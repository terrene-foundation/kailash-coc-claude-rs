#!/usr/bin/env node
/**
 * Hook: build-cache-guard
 * Event: SessionStart
 * Purpose: Detect runaway Rust/build-cache bloat and emit a LOUD, non-blocking
 *          warning with the exact reclaim commands, so disk usage can NEVER
 *          again silently grow to hundreds of GB unnoticed.
 *
 *   Failure mode this defends (2026-06-20): a <100MB program accumulated
 *   ~619GB of REGENERABLE build cache —
 *     • 371GB  main `target/` (never `cargo clean`ed; unbounded incremental
 *              fragments × every feature/profile combo over thousands of builds)
 *     •  51GB  one full `target/` per parallel-agent git worktree, never pruned
 *     • 197GB  TWO stray full build trees in /private/tmp left by prior
 *              review/redteam tooling (clone-to-tmp → build → never cleaned up)
 *   The root cause is N independent `target/` directories with NO teardown and
 *   NO shared cache. This hook surfaces the footprint every session; its sibling
 *   `build-cache-gc.js` (SessionEnd) auto-reclaims the unambiguously-safe class.
 *
 *   Advisory by design (per hook-output-discipline.md MUST-2: a disk-hygiene
 *   signal is judgment-bearing, never `block`). It informs; the human/agent acts.
 *
 * Codified by: rules/build-cache-hygiene.md
 *
 * Exit Codes:
 *   0 = success (always — never blocks)
 *   1 = hook timeout (still continues the session)
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---- thresholds (GiB) — tunable; conservative so the warning is meaningful --
const MAIN_TARGET_WARN_GIB = 60; // a full debug+test build is ~10-40GB
const RECLAIMABLE_WARN_GIB = 10; // worktree targets + stray /tmp build trees
const STALE_WORKTREE_WARN = 3; // worktrees beyond the working checkout

const TIMEOUT_MS = 9000;
const _timeout = setTimeout(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
}, TIMEOUT_MS);

/** du -skx <dir> → KiB, or null on error/timeout. Fast + bounded. */
function dirKiB(dir, ms = 3500) {
  try {
    if (!fs.existsSync(dir)) return 0;
    const out = execFileSync("du", ["-skx", dir], {
      timeout: ms,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const kib = parseInt(out.split(/\s+/)[0], 10);
    return Number.isFinite(kib) ? kib : null;
  } catch (_) {
    return null; // timeout/permission → unknown; caller treats as "present"
  }
}

const gib = (kib) => (kib == null ? null : kib / (1024 * 1024));
const fmt = (kib) =>
  kib == null ? "?GB" : `${(kib / (1024 * 1024)).toFixed(1)}GB`;

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (c) => (input += c));
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input || "{}");
    const cwd = data.cwd || process.cwd();

    // Only meaningful in a Rust workspace (has a root Cargo.toml).
    if (!fs.existsSync(path.join(cwd, "Cargo.toml"))) {
      console.log(JSON.stringify({ continue: true }));
      return process.exit(0);
    }

    const findings = [];
    let reclaimableKiB = 0;

    // 1) main target
    const mainKiB = dirKiB(path.join(cwd, "target"));
    const mainGiB = gib(mainKiB);
    if (mainGiB != null && mainGiB > MAIN_TARGET_WARN_GIB) {
      findings.push(
        `  • main target/ is ${fmt(mainKiB)} (> ${MAIN_TARGET_WARN_GIB}GB cap). ` +
          `Reclaim: cargo clean   (regenerable; forces one full rebuild)`,
      );
    }

    // 2) per-worktree targets (the N-copies anti-pattern)
    const wtRoot = path.join(cwd, ".claude", "worktrees");
    let wtTargetKiB = 0;
    let wtCount = 0;
    if (fs.existsSync(wtRoot)) {
      for (const e of fs.readdirSync(wtRoot, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        wtCount++;
        const t = path.join(wtRoot, e.name, "target");
        const k = dirKiB(t, 2500);
        if (k && k > 0) wtTargetKiB += k;
      }
    }
    if (wtTargetKiB > 0) {
      reclaimableKiB += wtTargetKiB;
      findings.push(
        `  • ${wtCount} git worktree(s) hold ${fmt(wtTargetKiB)} of build cache. ` +
          `Reclaim: rm -rf .claude/worktrees/*/target`,
      );
    }
    if (wtCount > STALE_WORKTREE_WARN) {
      findings.push(
        `  • ${wtCount} worktrees exist (> ${STALE_WORKTREE_WARN}). Prune merged/clean ones: ` +
          `git worktree list ; git worktree remove <path>`,
      );
    }

    // 3) stray build trees under /tmp + /private/tmp (the review/redteam leak)
    const strays = findStrayTmpTargets();
    let strayKiB = 0;
    for (const s of strays) {
      const k = dirKiB(s, 2500);
      if (k && k > 0) strayKiB += k;
    }
    if (strayKiB > 0) {
      reclaimableKiB += strayKiB;
      findings.push(
        `  • ${strays.length} stray build tree(s) in /tmp total ${fmt(strayKiB)} ` +
          `(orphaned by review/redteam tooling). Auto-reclaimed at session end; ` +
          `or now: rm -rf ${strays.slice(0, 2).join(" ")}${strays.length > 2 ? " …" : ""}`,
      );
    }

    const reclaimableGiB = reclaimableKiB / (1024 * 1024);
    const trip =
      (mainGiB != null && mainGiB > MAIN_TARGET_WARN_GIB) ||
      reclaimableGiB > RECLAIMABLE_WARN_GIB ||
      wtCount > STALE_WORKTREE_WARN;

    if (!trip || findings.length === 0) {
      console.log(JSON.stringify({ continue: true }));
      return process.exit(0);
    }

    const warning = [
      "==================================================================",
      "🧹 BUILD-CACHE BLOAT DETECTED — regenerable cache is growing 🧹",
      "==================================================================",
      "",
      `Reclaimable build cache (NOT source, NOT committed work):`,
      ...findings,
      "",
      "WHY THIS MATTERS (2026-06-20 incident): a <100MB program accumulated",
      "~619GB of build cache — 371GB main target/, 51GB across un-pruned",
      "worktrees, 197GB of stray /tmp clones from review tooling. The disk",
      "hit 92% before anyone noticed. The cause: N independent target/ dirs",
      "with no teardown and no shared cache.",
      "",
      "DISCIPLINE (rules/build-cache-hygiene.md):",
      "  • Prefer ONE shared COMPILATION cache: export RUSTC_WRAPPER=sccache",
      "    + SCCACHE_CACHE_SIZE=25G (lock-free dedup across worktrees). Do NOT",
      "    use a bare shared CARGO_TARGET_DIR — it serializes parallel worktrees.",
      "  • `git worktree remove` at wave-close; /sweep prunes stale worktrees.",
      "  • Any build that redirects CARGO_TARGET_DIR / clones to a temp dir MUST",
      "    rm -rf it when done (the SessionEnd GC hook is the backstop).",
      "  • `cargo clean` (or `cargo sweep -t 7`) when main target/ exceeds the cap.",
      "",
      "This warning is advisory — it never blocks. Act on it when convenient.",
      "==================================================================",
    ].join("\n");

    // Two distinct figures: what the SessionEnd GC will auto-reclaim
    // (worktrees + stray /tmp), vs the main target/ which is warn-only (manual
    // `cargo clean`). `mainKiB` may be null on a du timeout — guard explicitly.
    const mainOver = mainGiB != null && mainGiB > MAIN_TARGET_WARN_GIB;
    const summary = mainOver
      ? `🧹 Build-cache: ~${fmt(reclaimableKiB)} auto-reclaimable + ${fmt(mainKiB)} main target/ (cargo clean) — see additionalContext`
      : `🧹 Build-cache: ~${fmt(reclaimableKiB)} auto-reclaimable — see additionalContext`;
    console.log(
      JSON.stringify({
        continue: true,
        systemMessage: summary,
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: warning,
        },
      }),
    );
    process.exit(0);
  } catch (_) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }
});

/**
 * Stray "build-only" target trees under /tmp + /private/tmp: a `target` dir
 * whose clone-root has NO `.git` (i.e. a redirected CARGO_TARGET_DIR / orphan),
 * NOT under an actions-runner / cargo / rustup path. Bounded find.
 */
function findStrayTmpTargets() {
  // Include $TMPDIR (the macOS `mktemp -d` default, e.g. /var/folders/.../T),
  // not just /tmp — that is where most clone-to-tmp build trees actually land.
  const roots = [
    ...new Set(
      ["/private/tmp", "/tmp", process.env.TMPDIR]
        .filter(Boolean)
        .map((r) => r.replace(/\/+$/, "")),
    ),
  ];
  const out = [];
  for (const root of roots) {
    let lines = [];
    try {
      lines = execFileSync(
        "find",
        [root, "-maxdepth", "3", "-type", "d", "-name", "target"],
        {
          timeout: 3000,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      )
        .split("\n")
        .filter(Boolean);
    } catch (_) {
      /* find timed out / permission — skip this root */
    }
    for (const t of lines) {
      if (/actions-runner|\.cargo|\.rustup/.test(t)) continue;
      const cloneRoot = path.dirname(t);
      // build-only = no .git at the clone root (not a real checkout we'd disturb)
      if (fs.existsSync(path.join(cloneRoot, ".git"))) continue;
      // positive proof-of-cache: only report a PROVEN regenerable Cargo cache,
      // never a directory merely named `target` (Maven output, a data dir).
      const isCargoCache =
        fs.existsSync(path.join(t, "CACHEDIR.TAG")) ||
        fs.existsSync(path.join(cloneRoot, "Cargo.toml"));
      if (!isCargoCache) continue;
      out.push(t);
    }
  }
  return [...new Set(out)];
}
