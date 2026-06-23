---
priority: 10
scope: path-scoped
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
  - "**/Cargo.lock"
  - ".cargo/**"
  - ".claude/hooks/build-cache-*.js"
---

# Build-Cache Hygiene — One Shared Cache, Always Torn Down

A compiled program whose shipped artifacts are <100MB does NOT need hundreds of
GB of build cache. When it accumulates that, the cause is never the build — it
is **N independent `target/` directories with no shared cache and no teardown**,
each re-compiling the whole dependency tree and never being cleaned. This rule
makes the cache **singular** (prevention) and its teardown **automatic + self-
distributing** (surveillance), so the failure mode cannot recur in this repo or
in any Rust repo this artifact cascades to.

## Root Cause (the 2026-06-20 incident)

~619GB of regenerable build cache for a <100MB program:

- **371GB** — the main `target/`: unbounded incremental fragments × every
  feature / profile / test combo, over thousands of builds, never `cargo clean`ed.
- **51GB** — one full `target/` per parallel-agent git worktree, never pruned
  after the worktree's work merged.
- **197GB** — TWO full build trees abandoned in `/private/tmp` by review/redteam
  tooling that cloned-to-tmp (or redirected `CARGO_TARGET_DIR` there), built, and
  walked away.

The self-hosted CI runner builds the SAME workspace (release + all features +
maturin) in **~7GB using sccache** — proof the build is small; the bloat is
duplicated, un-torn-down cache.

## MUST Rules

### 1. Prefer ONE Shared Compilation Cache (sccache) Over N Per-Worktree `target/`s

The N-copies multiplication is the root cause. A shared **compilation** cache
(sccache: `rustc-wrapper` keyed on inputs) dedupes the expensive crate
compilations ACROSS separate `target/` dirs WITHOUT the `target/`-lock
contention that forced per-worktree dirs in the first place. The CI runner
already uses it (`/opt/homebrew/bin/sccache`); developer + agent builds SHOULD
too: `export RUSTC_WRAPPER=sccache` + a bounded `SCCACHE_CACHE_SIZE` (e.g. 25G).
A bare shared `CARGO_TARGET_DIR` across PARALLEL worktrees is BLOCKED — it
serializes compiles on the `target/` lock (the very reason worktrees were
isolated). sccache is the lock-free dedup; it does NOT remove the teardown
obligation (Rules 2-3) — it shrinks each per-worktree `target/`, it does not
delete it.

**Why:** Without dedup, every worktree + every tmp clone re-builds the world.
sccache is force-injected NOWHERE (a missing `sccache` binary breaks
`rustc-wrapper`), so this is a strong RECOMMENDATION the rule documents, not a
config the sync silently imposes.

### 2. Every Isolated Build Tree MUST Be Torn Down When Its Work Is Done

Any build tree created for isolation — a git worktree, OR a clone / redirected
`CARGO_TARGET_DIR` under `/tmp` for review/redteam/CI — MUST be removed when its
work merges or its review ends. Worktrees: `git worktree remove <path>` at
wave-close (the worktree's `target/` goes with it). Tmp build trees: `rm -rf`
the directory the moment the review/test that created it finishes. Leaving an
orphaned build tree "for next time" is BLOCKED — "next time" never comes and the
orphan is invisible until disk fills.

```bash
# DO — teardown is part of the work, not a someday-cleanup
git worktree remove .claude/worktrees/<name>      # at wave-close
rm -rf /tmp/<review-clone>                          # when the review ends
# DO NOT — leave them; they become the 51GB + 197GB classes
```

**BLOCKED rationalizations:** "I'll prune the worktrees later" / "the tmp clone
might be reused" / "cargo clean is destructive" (it is not — `target/` is
regenerable) / "disk is cheap" (it filled to 92%).

### 3. The Live `target/` Has A Cap; Exceeding It Triggers `cargo clean`

The working checkout's `target/` MUST NOT be allowed to grow unbounded. When it
exceeds the cap (default 60GB — a full debug+test build is ~10-40GB), run
`cargo clean` (or `cargo sweep -t <days>` to drop only stale artifacts). The
SessionStart guard (Rule 4) measures it and warns. Bumping the cap to silence
the warning instead of cleaning is BLOCKED — a `target/` past the cap is
accumulated incremental cruft, not a working-set requirement.

### 4. Surveillance + Auto-Reclaim Are Hook-Enforced And Self-Distributing

This rule is backed by two session-lifecycle hooks that make the discipline
structural AND carry it to every repo the artifact cascades to (loom → all Rust
BUILD repos + USE templates → downstream consumers like aegis, csq):

- **`build-cache-guard.js` (SessionStart, advisory)** — measures the reclaimable
  footprint (main `target/`, per-worktree `target/`s, stray `/tmp` build trees)
  and emits a LOUD non-blocking warning with the exact reclaim commands when any
  threshold trips. The "it can never silently grow again" defense.
- **`build-cache-gc.js` (SessionEnd, never-blocks)** — auto-reclaims the
  unambiguously-safe class only. A directory is deleted ONLY when ALL hold:
  it is not a symlink (refuses a planted-link redirect); its REALPATH is
  confined under a canonicalized allowed root (`/tmp` + `/private/tmp`, or
  `cwd/.claude/worktrees/`) — so a symlink cannot escape scope; its basename is
  `target`; it carries POSITIVE proof-of-cache (Cargo's `target/CACHEDIR.TAG`
  or a sibling `Cargo.toml`) — so a dir merely NAMED `target` (Maven output, a
  data dir) is never touched; it is NOT the live checkout's `target/`, NOT
  under an `actions-runner` / `.cargo` / `.rustup` path; and nothing in the
  target subtree was modified within 30 minutes (skips active builds). Stray
  `/tmp` trees additionally require no `.git` at the clone root (never disturb a
  version-controlled checkout). **Source is never deleted** — only a proven,
  confined, stale `target/` cache. The temp roots include `$TMPDIR` (the macOS
  `mktemp -d` default), not just `/tmp`. Because it runs in WHATEVER repo it is
  synced into, the cascade self-remediates each Rust repo's PRE-EXISTING
  worktree + stray-tmp accumulation (the 51GB + 197GB classes) on that repo's
  next session. **The main `target/` (the 371GB class) is NEVER auto-deleted** —
  it is the live cache; the guard surfaces it for a manual `cargo clean` /
  `cargo sweep`. So the cascade clears the duplicated/orphaned classes
  automatically and surfaces the live-cache class for human action.
- **Non-session backstop** — `node .claude/hooks/build-cache-gc.js --sweep` runs
  the exact same reclamation outside the session lifecycle, for `/sweep`, a cron
  job, or a `launchd` agent — so a repo that rarely opens a Claude session still
  gets its orphaned caches reclaimed.

Disabling either hook to "skip the check" is BLOCKED. Both fail-open (a hook
error never blocks the session) per `hook-output-discipline.md`.

**Why:** Memory + a rule are not enough (the 2026-06-20 incident proves it).
The auto-GC hook is the teeth; its repo-agnostic design is the cascade — syncing
it to csq/aegis/etc. means those repos self-clean their orphaned caches the next
time they run a session, which is the "clear all old mistakes too" the discipline
requires.

## MUST NOT

- Redirect `CARGO_TARGET_DIR` to `/tmp` (or clone-to-tmp) for a one-shot build
  without an `rm -rf` of that directory in the same task. **Why:** this is
  exactly the 197GB review/redteam-orphan class.
- Create a git worktree without removing it when its work merges. **Why:** the
  51GB N-copies class.
- Silence the SessionStart guard by raising the cap instead of running
  `cargo clean`. **Why:** the cap is the signal that incremental cruft has
  accumulated past the working set.

## Trust Posture Wiring

- **Severity:** `advisory` — build-cache footprint is a disk-hygiene signal, not
  a per-tool-call structural fact; per `hook-output-discipline.md` MUST-2 a
  lexical/measurement signal MUST NOT carry `block`. The SessionEnd auto-GC is a
  never-block teardown; the SessionStart guard is a never-block advisory.
- **Grace period:** 7 days from rule landing (2026-06-20 → 2026-06-27).
- **Cumulative posture impact:** same-class violations (an un-torn-down worktree
  / tmp build tree left after its work completed; a cap-raise in place of
  `cargo clean`) contribute to `trust-posture.md` MUST-4 cumulative math (3×
  same-rule / 5× total in 30d → drop 1 posture).
- **Regression-within-grace:** any same-class violation within 7 days →
  emergency downgrade L5→L4 per `trust-posture.md` MUST-4. Trigger key
  `build_cache_teardown_skipped` (to be registered in trust-posture.md's
  emergency-trigger list at loom Gate-1 — this is a loom-synced baseline rule, so
  the key is added upstream, not in a BUILD copy).
- **Receipt requirement:** SessionStart MUST require `[ack: build-cache-hygiene]`
  in the agent's first response IF `posture.json::pending_verification` includes
  this rule_id. Soft-gate.
- **Detection mechanism:** Phase 1 (live) — `build-cache-guard.js` (SessionStart
  advisory) measures + surfaces; `build-cache-gc.js` (SessionEnd) auto-reclaims +
  reports freed bytes to stderr. Gate-review: reviewer / cc-architect at
  `/codify` confirm every wave-close pruned its worktrees and every tmp build
  tree was torn down. Audit fixtures at `.claude/audit-fixtures/build-cache-gc/`
  exercise the deletion-safety predicates (build-only-vs-`.git`, recency guard,
  live-cache exclusion).
- **Violation scope:** MUST-1 (shared-cache recommendation) is advisory-only;
  MUST-2 (teardown) + MUST-3 (live-cap) + MUST-4 (hooks enabled) are the
  enforced clauses. Every `violations.jsonl` row records which MUST fired.
- **Origin:** 2026-06-20 — co-owner-directed after a <100MB program accumulated
  ~619GB of build cache (371GB main + 51GB worktrees + 197GB tmp review clones),
  filling the disk to 92%. Directive: "introduce absolute discipline so that we
  don't end up with 600GB of garbage … use hooks to conform … ensure the
  enforcement also do surveillance/maintenance so that all old mistakes are
  cleared too" across all Rust applications (kailash-rs, csq, aegis, …).
