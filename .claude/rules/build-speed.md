---
paths:
  - "**/*.rs"
  - "**/*.toml"
  - "**/Cargo.lock"
---

# Build Speed Rules

## MUST: Targeted Builds, Never Workspace-Wide

```bash
# DO: Check only crates you changed + direct dependents
cargo check -p kailash-governance -p kailash-pact

# DO NOT: Check everything (5-10 min wasted)
cargo check --workspace
```

**Why:** The workspace has 46 crates and 817 packages. `--workspace` recompiles everything even if you touched 1 file in 1 crate. Targeted checks finish in seconds.

**Exception:** CI and pre-release validation may use `--workspace`.

## MUST: Skip Doc-Tests Locally

```bash
# DO: Run lib + integration tests only (fast)
cargo test -p kailash-governance --lib --tests
# Or use cargo alias:
cargo t  # aliased to --lib --tests

# DO NOT: Run doc-tests locally (each compiles from scratch, 15-20 min)
cargo test --workspace --doc  # CI only
```

**Why:** Each doc-test compiles independently against the full crate dependency tree. 50 doc-tests = 50 independent compilations. Run them in CI.

## MUST: Use nextest for Test Execution

```bash
# DO: nextest runs test binaries in parallel
cargo nextest run -p kailash-governance  # 669 tests in 0.45s

# DO NOT: cargo test (sequential binary execution)
cargo test -p kailash-governance  # Same tests, 3-5x slower
```

**Why:** nextest runs each test binary as a separate process in parallel. `cargo test` runs binaries sequentially and only parallelizes tests within each binary.

## MUST: Use Worktrees for Parallel Agents

```bash
# DO: Each agent gets its own worktree (independent target/ dir)
git worktree add /tmp/agent-pact feat/pact-work
# Agent compiles without blocking main workspace

# DO NOT: Multiple cargo processes in same directory
cargo check -p foo &  # Blocks on build directory lock
cargo check -p bar &  # Waits for lock, wastes time
```

**Why:** Cargo uses a filesystem lock on `target/`. Two cargo processes in the same directory serialize completely. Worktrees have independent `target/` dirs.

When using the Agent tool, set `isolation: "worktree"` for any agent that will compile code.

## MUST: Stream Output, Never Pipe-Buffer

```bash
# DO: tee streams output while saving to file
cargo test -p kailash-core 2>&1 | tee /tmp/test.log
# Or redirect and tail:
cargo test -p kailash-core > /tmp/test.log 2>&1 &
tail -f /tmp/test.log

# DO NOT: pipe to tail/grep (buffers entire output, blind for minutes)
cargo test --workspace 2>&1 | tail -30  # See nothing until 45 min later
cargo test --workspace 2>&1 | grep "FAILED"  # Same problem
```

**Why:** `tail -N` and `grep` buffer their entire input before producing output. On a 45-min test run, you see nothing until the end.

## Cargo Aliases

| Alias       | Command                             | Use                                  |
| ----------- | ----------------------------------- | ------------------------------------ |
| `cargo t`   | `test --workspace --lib --tests`    | Fast local tests (no doc-tests)      |
| `cargo td`  | `test --workspace --doc`            | Doc-tests only (CI or explicit)      |
| `cargo nt`  | `nextest run`                       | nextest single crate                 |
| `cargo ntw` | `nextest run --workspace`           | nextest full workspace               |
| `cargo ck`  | `check --workspace`                 | Full workspace check (use sparingly) |
| `cargo cl`  | `clippy --workspace -- -D warnings` | Lint                                 |

## Configuration (.cargo/config.toml)

- `debug = "line-tables-only"` — 2x faster compile vs full debug info
- `[profile.dev.package."*"] debug = false` — no debug info for dependencies
- `jobs = 16` — match core count
- `incremental = true` — enabled for dev and test profiles

## MUST NOT

- Run `cargo test --workspace` locally unless validating a release

**Why:** 15,098 tests across 46 crates takes 45+ minutes. Test the crates you changed.

- Run `cargo check --workspace` when you only changed 1-3 crates

**Why:** 5-10 minute overhead for no benefit. `cargo check -p <crate>` takes seconds.

- Use `cargo build` when `cargo check` suffices

**Why:** `check` skips code generation and linking. 2-3x faster for validation.

- Run multiple cargo processes in the same workspace directory

**Why:** Build directory lock serializes them. Use worktrees for parallelism.

## MUST: Use Nightly Rustfmt To Match CI

CI's Format job (`.github/workflows/rust.yml`) uses `dtolnay/rust-toolchain@nightly`, not stable. `rustfmt.toml` enables nightly-only options (`imports_granularity`, `group_imports`, `trailing_comma`, `blank_lines_upper_bound`, `blank_lines_lower_bound`, `format_strings`) that stable silently ignores. Local `cargo fmt --all` passes; CI rejects.

```bash
# DO — match CI toolchain
cargo +nightly fmt --all
cargo +nightly fmt --all --check

# DO NOT — default stable (silently skips nightly rules)
cargo fmt --all
```

**BLOCKED rationalizations:**

- "Nightly rustfmt is unstable, stable is safer"
- "Warnings say config is ignored, so stable is fine"
- "CI will catch it; I'll iterate on CI"
- "I don't have nightly installed"

**Why:** Stable rustfmt reads `rustfmt.toml`, hits the nightly-only keys, emits a "config key ignored" warning, then produces output that CI's nightly rustfmt rejects as unformatted. The local green signal is false; the CI red signal is real; the fix is one toolchain flag.

**Setup:** `rustup toolchain install nightly --profile minimal --component rustfmt`

Origin: 2026-04-19 /codify — three PRs (#427, #428, #430) failed CI fmt while code was correct. Root cause: toolchain divergence between local stable and CI-pinned nightly. `.github/workflows/rust.yml:61` pins `dtolnay/rust-toolchain@nightly` for Format.

## MUST: Match CI Clippy Toolchain Version

Clippy MUST run against the SAME Rust toolchain CI's Clippy job uses — NOT a stale local pin, NOT the local rustup default if it lags. CI's Clippy / Workspace-Tests / Documentation jobs pin `dtolnay/rust-toolchain@stable` (`.github/workflows/rust.yml` — clippy is `@stable` at line ~144; Format pins `@nightly`; MSRV pins 1.94 via `@master`). `@stable` is ROLLING: as stable advances, CI enforces the NEW lints. A local `cargo +1.95` (or any pinned-older toolchain) SILENTLY MISSES them; CI rejects.

```bash
# DO — match CI's ROLLING stable: keep local stable current, THEN run default
rustup update stable
cargo clippy --workspace --exclude kailash-ruby --all-targets -- -D warnings
# (run the feature-gated cells too — see the full pre-flight matrix below)

# DO NOT — a stale pin lags CI's rolling stable and misses newly-enforced lints
cargo +1.95 clippy --all-targets -- -D warnings
# ↑ local clippy 0.1.95 passes; CI's current stable (0.1.97, 2026-07-07) flags
#   `useless_borrows_in_formatting` / `for_kv_map` / `question_mark` /
#   `manual_filter` on pre-existing code → CI red → fix-up cycle
```

**BLOCKED rationalizations:**

- "The rule says pin 1.95, so `+1.95` matches CI" (STALE — CI's clippy job is `@stable`, rolling, not a fixed 1.95)
- "Clippy passed locally on `+1.95`, CI will catch anything else"
- "My rustup default is old but close enough"
- "The new stable lints are pedantic; suppress them"
- "I'll iterate on CI — faster than updating the toolchain"

**Why:** CI's clippy/test/doc jobs resolve `@stable` to whatever stable is CURRENT at run time — a moving target. Pinning local clippy to an OLD version (`+1.95`) inverts the original PR #437 failure: instead of local lagging a fixed CI pin, local now lags CI's rolling stable, missing every lint stable added since the pin. The structural defense is `rustup update stable` before the pre-flight (matching the rolling channel), NOT a fixed `+N`. A rolling-stable bump can also red main REPO-WIDE (pre-existing code newly-flagged); those are `zero-tolerance.md` Rule 1 fixes owned by whoever's PR surfaces them, applied via clippy's own `cargo clippy --fix` semantics-preserving autofix.

**Required setup:**

```bash
rustup toolchain install stable --profile minimal --component clippy
rustup update stable   # re-run before each pre-flight — @stable is a moving target
```

Origin: 2026-04-20 /codify — PR #437 flagged by CI clippy on bare technology names a local OLDER toolchain missed (the original "local LAGS the CI pin" framing, when CI pinned a fixed version). CORRECTED 2026-07-10 /codify: CI's Clippy job is `dtolnay/rust-toolchain@stable` (ROLLING, verified `.github/workflows/rust.yml:144`), NOT a fixed 1.95 — a local `cargo +1.95` pre-flight missed 8 clippy-0.1.97 lints across 6 crates unrelated to the in-flight feature, reddening CI (PR #1710) AND revealing main was repo-wide red from the stable bump. The invariant is "match CI's toolchain CHANNEL"; for a rolling `@stable` job that means keeping local stable UPDATED, not prefixing a stale `+N`.

## MUST: Run Full CI Job-Set Locally Before FIRST Push AND Before Admin-Merge

**Both** the first `git push -u` to an open PR branch AND every subsequent admin-merge MUST be preceded by the full local CI parity command set. The merger cannot rely on "CI will catch it" because every push to an open PR retriggers the full PR-gate matrix; cancelled-mid-flight runs (under `concurrency: cancel-in-progress`) are still billed for elapsed wall-clock minutes.

```bash
# DO — pre-flight ALL commands BEFORE first push AND BEFORE admin-merge
cargo +nightly fmt --all --check
rustup update stable && cargo clippy --workspace --exclude kailash-ruby --all-targets -- -D warnings  # CI clippy is @stable (rolling) — see "Match CI Clippy Toolchain Version"
cargo nextest run --workspace
RUSTDOCFLAGS="-Dwarnings" cargo doc --workspace \
  --exclude kailash-ruby --exclude kailash-python --no-deps
RUSTDOCFLAGS="-Dwarnings" cargo doc --workspace \
  --exclude kailash-ruby --no-deps --no-default-features
# All five MUST exit 0. Then git push (or gh pr merge).

# DO NOT — push first, fix-up later
git push -u origin feat/branch                   # CI run #1 starts billing
# CI fails on fmt drift
git commit -am "style: fmt" && git push          # CI run #2 starts; #1 cancelled
                                                  # but already billed for mid-flight wall-clock
# DO NOT — admin-merge with cargo check alone
cargo check -p <crate> && gh pr merge <N> --admin --merge --delete-branch
```

**BLOCKED rationalizations:**

- "CI will catch it on the next push"
- "concurrency: cancel-in-progress refunds mid-flight minutes" (it does NOT)
- "cargo check is sufficient for first push"
- "Documentation is styling, non-load-bearing"
- "I'll fix format in a follow-up"
- "The `--no-default-features` doc invocation is paranoid"
- "Pre-flight takes too long; fix-ups are quicker"
- "Three push cycles is normal practice"

**Why:** Three v3.23 PRs (#566/#596/#597) admin-merged with `cargo check` clean but `cargo +nightly fmt --check` dirty AND `RUSTDOCFLAGS=-Dwarnings cargo doc --no-default-features` failing. PR #598 inherited all three classes via rebase; three fix-up commits cost three CI cycles + orchestrator turns. The Documentation job has TWO invocations because feature-gated paths surface different intra-doc-link graphs — admin-merge without the slim-build check leaves them latent. The first-push gate is structurally cheaper than the admin-merge gate at preventing fix-up cycles. `gh pr merge --admin --merge` bypasses branch protection's CI-green gate; the merger MUST run the same job-set locally first.

Origin: 2026-04-25 v3.23 sprint codify — admin-merging #596 + #597 propagated nightly-fmt drift + rustdoc `-Dwarnings` failures onto main; #598 inherited all three classes; PR #598 cycle of 5 sequential pushes (08:43Z → 10:14Z) caused 71 min of cancelled-but-billed Workspace Tests. Cross-references `git.md` § "Pre-FIRST-Push CI Parity Discipline" (always-loaded baseline) for branch-time visibility.

## MUST: kailash-capi Pre-Flight MUST Use `--all-features`

The kailash-capi crate has TWO CI gates that regenerate state under `cargo build --all-features` and diff against the committed tree: (a) the **C ABI header + binding-decl diff gate (BP-091)** re-emits `include/kailash.h` via cbindgen and fails on any drift, (b) the **Workspace Tests** `header_gate::header_gate_no_drift_on_current_checkout` test does the same drift check at test time. A local pre-flight that uses a feature SUBSET silently masks two failure classes that only `--all-features` surfaces:

1. **Feature-gated nested-module compile errors** — code inside `#[cfg(feature = "X")] mod inner { ... }` referencing a parent-module-private helper without an explicit `use super::<helper>;` import. The subset omits X; the inner module never compiles; the unresolved reference never surfaces locally. CI enables X via `--all-features` and the resolution failure surfaces at every push.
2. **`kailash.h` regenerated under subset** — cbindgen writes a header containing ONLY the subset's symbols; CI's `--all-features` regen then drifts byte-by-byte from the committed header; both BP-091 and `header_gate_no_drift_on_current_checkout` fail on every push.

Every kailash-capi local pre-flight (clippy / test / header regen) MUST use `cargo (build|clippy|test) -p kailash-capi --all-features` — matching the CI gates' regeneration command. Subset-feature pre-flights for kailash-capi are BLOCKED unless the change is provably scoped to a non-FFI surface (no header impact, no extern-fn signature change).

```bash
# DO — pre-flight uses --all-features, matches the CI gate
cargo build -p kailash-capi --all-features                   # regen header + verify compile
cargo clippy -p kailash-capi --all-features --tests -- -D warnings
cargo test   -p kailash-capi --all-features --test header_gate
# Commit include/kailash.h as regenerated; CI's --all-features regen matches → no drift.

# DO NOT — feature-subset pre-flight masks both failure classes
cargo build -p kailash-capi --features mcp,pact,capi-test-canary   # subset
# ↑ misses feature-gated nested-module compile errors AND regenerates kailash.h
#   with subset-only symbols → BP-091 + header_gate both red on every push.
```

**BLOCKED rationalizations:**

- "I'm only touching one feature, why compile the others"
- "The header subset is fine, cbindgen is idempotent across features"
- "The CI gate will catch any drift; I'll fix-up if needed"
- "`--all-features` is slower; the subset gets me through faster"
- "The nested module is feature-gated, it can't affect my changes"
- "I'll re-regen the header with `--all-features` at the end"
- "My change is small; subset pre-flight is good enough for small changes"
- "BP-091 + header_gate are paranoia gates; subset compile cleanly proves my code is correct"

**Why:** Both kailash-capi CI gates regenerate state under `--all-features` and diff against the committed tree; a subset pre-flight produces a header byte-different from CI's regen AND skips compilation of every feature-gated nested module the subset omits. Matching the gate's command at pre-flight is the structural defense — second-guessing which features a change "could affect" is exactly the rationalization that produces fix-up cycles (≥45 min wall-clock + orchestrator turn each).

### Default-Features Workspace Companion (MUST)

CI runs the Rust workspace clippy / unit-tests / MSRV-check WITHOUT `--all-features` — the `--all-features` pre-flight is structurally blind to default-features `dead_code` lints and feature-gated test-import resolution. The pre-flight matrix is BOTH halves, not either-or:

```bash
# Half 1 (per-crate, matches header_gate + BP-091):
cargo build  -p kailash-capi --all-features
cargo clippy -p kailash-capi --all-features --tests -- -D warnings
cargo test   -p kailash-capi --all-features

# Half 2 (workspace default-features, matches CI workspace clippy + unit-tests + MSRV):
cargo clippy --workspace --exclude kailash-ruby --all-targets -- -D warnings
cargo check  --workspace --exclude kailash-ruby
```

Either alone is incomplete: per-crate `--all-features` catches header regen + nested-module resolution; workspace default-features catches `dead_code` on feature-gated callers + feature-gated test imports.

**Why:** Second instance within 3 days — PR #1099 (2026-05-25) codified the `--all-features`-required failures; PR #1159's fix-up (2026-05-28, commit f187c0f8) surfaced the dual class (default-features `dead_code` on saturation helpers + `kailash_mcp_oauth2_*` test import unresolved without a feature gate) that the local `--all-features` pre-flight could not see. Extended same-cycle per `rules/autonomous-execution.md` MUST Rule 4 (same-class gap within shard budget).

### Trust Posture Wiring (kailash-capi pre-flight matrix)

- **Severity:** `halt-and-report` at gate-review (cc-architect at `/codify` + reviewer at `/implement` confirm any kailash-capi-touching PR receipt cites BOTH halves of the pre-flight matrix; no structural hook-level signal exists for the feature-flag set of a local cargo invocation, so `block` is not warranted per `hook-output-discipline.md` MUST-2).
- **Grace period:** 7 days from rule landing (`--all-features` half 2026-05-25 → 2026-06-01; default-features companion 2026-05-28 → 2026-06-04).
- **Cumulative posture impact:** same-class violations contribute per `trust-posture.md` MUST-4 (3× same-rule in 30d → drop 1 posture; 5× total in 30d → drop 1 posture).
- **Regression-within-grace:** emergency downgrade L5→L4 per `trust-posture.md` MUST-4; proposed trigger key `capi_subset_preflight_bypass` (1× = drop 1 posture).
- **Receipt requirement:** SessionStart MUST require `[ack: build-speed]` IF `posture.json::pending_verification` includes this rule_id.
- **Detection mechanism:** Phase 1 — cc-architect mechanical sweep at `/codify`: for any PR touching `crates/kailash-capi/**`, grep the PR description / receipt / commit body for both pre-flight halves; absent evidence AND CI red on BP-091 / `header_gate_no_drift_on_current_checkout` / workspace clippy = finding. Phase 2 (deferred per `trust-posture.md` Two-Phase Rollout, gated on ≥3 real Phase-1 invocations): a `validate-capi-preflight` script parsing session bash history pre-push.
- **Violation scope:** rule + lane (kailash-capi crate + the specific CI gate that surfaced the failure — BP-091 vs header_gate vs workspace clippy).
- **Origin:** 2026-05-25 PR #1099 fix-up cycle (commit ded749cd: nested-module `use super::{...}` import + `--all-features` header regen) + 2026-05-28 PR #1159 fix-up (commit f187c0f8: default-features dual class).

**Length rationale** (per `rules/rule-authoring.md` MUST NOT § "Rules longer than 200 lines"). This variant body exceeds the 200-line guidance. Named rationale: **CI-parity cohesion** — every MUST clause in this file codifies one structural defense against a billed fix-up cycle caused by local-vs-CI command divergence (nightly rustfmt, pinned clippy, full job-set pre-flight, the kailash-capi pre-flight matrix). Splitting into sibling rules would fragment the CI-parity contract across files and force cross-rule lookups for every pre-push decision — the load-failure mode `cc-artifacts.md` Rule 6 warns against. Sibling precedent: `user-flow-validation.md` + `multi-operator-coordination.md` Origins carry the same length-rationale shape.
