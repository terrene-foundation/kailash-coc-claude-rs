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

When launching agents that compile code, give each one its own worktree to avoid build lock contention. Create it yourself as a SIBLING outside the repo — do NOT pass `isolation: "worktree"`, which nests it at `<repo>/.claude/worktrees/<id>` inside the repo's own `.claude/`. `rules/worktree-isolation.md` Rule 1(a) is what BLOCKS the flag; Rule 7 specifies the SIBLING placement that replaces it:

```bash
main_top=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
wt="$(dirname "$main_top")/.kailash-rs-wt/shard-a"
git worktree add -b feat/shard-a "$wt" origin/main   # sibling, OUTSIDE the repo
```

```
Agent(prompt: "Working directory: <wt>
STEP 0 (before any edit) — cd FIRST, then assert you are at a worktree ROOT:
  cd <wt>
  [ \"$(git rev-parse --show-toplevel)\" = \"$(pwd -P)\" ] || STOP
  ...and confirm it is NOT the main checkout. Any mismatch → STOP.
All paths MUST be absolute under <wt>. ...")
# Independent target/ dir
```

STEP 0 is not optional. Compare RESOLVED paths (`pwd -P`) — never the passed string, since `--show-toplevel` returns the symlink-resolved path and a symlinked `<wt>` would false-refuse a correct worktree. The main-checkout exclusion matters because MAIN is itself a valid worktree root, so a root check alone passes there. Do NOT use `git -C <wt> …`: it never establishes cwd, so the agent stays in MAIN and every later relative path resolves there. Retiring the flag retired the cwd guarantee — the prompt is now the ONLY thing pointing the agent at its worktree. Full four-case form: `rules/worktree-isolation.md` Rule 1(b).

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
