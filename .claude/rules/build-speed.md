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

Origin: 2026-04-19 /codify — three PRs (#427, #428, #430) failed CI fmt while code was correct. Root cause: toolchain divergence between local stable and CI-pinned nightly. `.github/workflows/rust.yml:44` pins `dtolnay/rust-toolchain@nightly` for Format.

## MUST: Match CI Clippy Toolchain Version

Clippy MUST run against the SAME Rust toolchain version that CI's Clippy job pins — not the local rustup default. Rust 1.95.0 tightens `clippy::doc_markdown` to flag bare technology names (e.g. `PostgreSQL`, `DataFlow`, `GitHub`) in doc comments that must be backticked. Local rustup at 1.93.1 silently misses these lints; CI rejects.

```bash
# DO — match CI's pinned version explicitly
cargo +1.95 clippy --all-targets -- -D warnings

# DO — or pin the entire repo via rust-toolchain.toml
# rust-toolchain.toml:
#   [toolchain]
#   channel = "1.95"

# DO NOT — trust the local rustup default
cargo clippy --all-targets -- -D warnings
# ↑ local 1.93.1 passes; CI 1.95 flags bare `PostgreSQL` in doc comments
```

**BLOCKED rationalizations:**

- "Clippy passed locally, CI will catch anything else"
- "Doc-markdown is a style lint, not load-bearing"
- "I'll iterate on CI — faster than installing a second toolchain"
- "The lint is pedantic; suppress it globally"
- "My rustup's default is newer than CI anyway"

**Why:** PR #437 hit two fix-cycles of bare-technology-name flags that passed local 1.93.1 but were rejected by CI 1.95 — each cycle cost one CI run + one local agent turn. The failure mode is identical to the nightly-rustfmt trap: a lint that silently disappears on one toolchain reappears on another, the local agent commits thinking it passed, CI rejects. Pinning `rust-toolchain.toml` OR prefixing every pre-push clippy invocation with `cargo +<ci-version>` is the only structural defense.

**Required setup (if not pinning rust-toolchain.toml):**

```bash
rustup toolchain install 1.95 --profile minimal --component clippy
```

Origin: 2026-04-20 /codify — PR #437 flagged twice by CI's clippy 1.95 on bare technology names in doc comments; local 1.93.1 produced zero findings on the same diff. Cross-principle with nightly-rustfmt section above: match CI's pinned toolchain version for linters, not just formatters.

## MUST: Run Full CI Job-Set Locally Before FIRST Push AND Before Admin-Merge

**Both** the first `git push -u` to an open PR branch AND every subsequent admin-merge MUST be preceded by the full local CI parity command set. The merger cannot rely on "CI will catch it" because every push to an open PR retriggers the full PR-gate matrix; cancelled-mid-flight runs (under `concurrency: cancel-in-progress`) are still billed for elapsed wall-clock minutes.

```bash
# DO — pre-flight ALL commands BEFORE first push AND BEFORE admin-merge
cargo +nightly fmt --all --check
cargo +1.95 clippy --workspace --all-targets -- -D warnings
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
