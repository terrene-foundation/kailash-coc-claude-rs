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
