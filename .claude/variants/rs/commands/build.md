# /build - Cargo Build Patterns

## Purpose

Reference for building the Kailash Rust workspace. See `rules/build-speed.md` for mandatory speed rules.

## Speed-First Quick Reference

| Command                        | Time          | Use                                                |
| ------------------------------ | ------------- | -------------------------------------------------- |
| `cargo check -p <crate>`       | **seconds**   | After editing a crate                              |
| `cargo nextest run -p <crate>` | **seconds**   | Test what you changed                              |
| `cargo t`                      | **2-5 min**   | All workspace lib+integration tests (no doc-tests) |
| `cargo ntw`                    | **5-10 min**  | nextest full workspace                             |
| `cargo ck`                     | **5-10 min**  | Workspace check (use sparingly)                    |
| `cargo td`                     | **15-20 min** | Doc-tests only (CI or explicit)                    |

## Default Workflow (Fast)

```bash
# 1. Check only what you changed (seconds)
cargo check -p kailash-governance

# 2. Test only what you changed (seconds)
cargo nextest run -p kailash-governance

# 3. Before commit: lint changed crates
cargo clippy -p kailash-governance -- -D warnings

# 4. CI handles: full workspace test, doc-tests, fmt
```

## When Workspace-Wide Is Needed

```bash
# Pre-release validation
cargo ck                    # check all
cargo cl                    # clippy all
cargo t                     # test all (no doc-tests)
cargo td                    # doc-tests
```

## Parallel Agent Builds

When launching agents that compile code, use worktree isolation to avoid build lock contention:

```
Agent(isolation: "worktree", ...)  # Gets independent target/ dir
```

Never run multiple `cargo` processes in the same workspace directory.

## Release Build

```bash
cargo build --workspace --release
cargo build -p kailash-nexus --release --bin kailash-server
```

## Cross-Compilation

```bash
cargo build --workspace --release --target x86_64-unknown-linux-gnu
cargo build --workspace --release --target aarch64-unknown-linux-gnu
```

## Bindings

```bash
# Python (requires maturin)
cargo clean -p kailash-python  # ALWAYS clean first (stale binary prevention)
cd bindings/kailash-python && maturin develop --release

# Node.js
cd bindings/kailash-node && npm run build
```

**Full reference**: `.claude/skills/management/build-reference.md`
