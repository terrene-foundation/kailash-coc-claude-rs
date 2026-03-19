# Git Workflow Rules

## Scope

These rules apply to all git operations in the Kailash Rust workspace.

## MUST Rules

### 1. Conventional Commits

Commit messages MUST follow conventional commits format.

**Format**:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, no code change
- `refactor`: Code restructure
- `test`: Adding tests
- `chore`: Maintenance
- `perf`: Performance improvement
- `ci`: CI/CD changes

**Scopes** (use crate names):

- `core`, `value`, `nodes`, `plugin`, `capi`
- `dataflow`, `nexus`, `kaizen`, `enterprise`
- `python`, `node`, `wasm` (bindings)
- `workspace` (cross-crate changes)

**Examples**:

```
feat(nexus): add OAuth2 middleware for axum router
fix(dataflow): resolve sqlx connection pool exhaustion
docs(core): update Node trait rustdoc examples
refactor(value): simplify KailashValue serde impl
test(dataflow): add integration tests for bulk operations
perf(core): optimize workflow DAG traversal
ci(workspace): add cargo-deny to CI pipeline
```

**Enforced by**: Pre-commit hook (future)
**Violation**: Commit message rejection

### 2. Security Review Before Commit

MUST run security-reviewer before commit.

**Process**:

1. Complete code changes
2. Delegate to security-reviewer
3. Address all CRITICAL findings (especially `unsafe` blocks, FFI boundaries)
4. Then commit

**Enforced by**: agents.md rule
**Violation**: Potential security issues

### 3. Branch Naming

Feature branches MUST follow naming convention.

**Format**: `type/description`

**Examples**:

- `feat/add-auth-middleware`
- `fix/sqlx-pool-timeout`
- `docs/update-readme`
- `refactor/workflow-builder`
- `test/dataflow-integration`

### 4. PR Description

Pull requests MUST include:

- Summary of changes (what and why)
- Test plan (how to verify)
- Related issues (links)
- Crates affected

**Template**:

```markdown
## Summary

[1-3 bullet points]

## Crates Affected

- `kailash-core`
- `kailash-nexus`

## Test plan

- [ ] `cargo test --workspace` passes
- [ ] `cargo clippy --workspace -- -D warnings` clean
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related issues

Fixes #123
```

### 5. Atomic Commits

Each commit MUST be self-contained.

**Correct**:

- One commit per logical change
- Tests and implementation together
- Each commit compiles and passes `cargo test`

**Incorrect**:

```
"WIP"
"fix stuff"
"update files"
Multiple unrelated crate changes
```

## MUST NOT Rules

### 1. No Direct Push to Main

MUST NOT push directly to main/master branch.

**Enforced by**: Branch protection
**Consequence**: Push rejected

### 2. No Force Push to Main

MUST NOT force push to main/master.

**Enforced by**: Branch protection
**Consequence**: Team notification, potential rollback

### 3. No Secrets in Commits

MUST NOT commit secrets, even in history.

**Detection**: Pre-commit secret scanning
**Consequence**: History rewrite required

**Check for**:

- API keys
- Passwords
- Tokens
- Private keys
- `.env` files
- `Cargo` registry tokens

### 4. No Large Binaries

MUST NOT commit large binary files.

**Limits**:

- Single file: <10MB
- Total repo: <1GB

**Alternatives**:

- Git LFS for large files
- External storage for assets
- Use `cargo build` artifacts in `target/` (already gitignored)

### 5. No Cargo.lock for Libraries, Required for Binaries

- MUST commit `Cargo.lock` for binary crates and the workspace root
- MUST NOT commit `Cargo.lock` for library-only crates published to crates.io independently

## Pre-Commit Checklist

Before every commit:

- [ ] Code review completed (intermediate-reviewer)
- [ ] Security review completed (security-reviewer)
- [ ] `cargo test --workspace` passes
- [ ] `cargo fmt --check` passes
- [ ] `cargo clippy --workspace -- -D warnings` passes
- [ ] `cargo audit` clean
- [ ] No secrets in changes
- [ ] Commit message follows convention

## Branching Strategy

### Main

- Always deployable
- Protected branch
- Requires PR with reviews

### Feature Branches

- Branch from main
- PR back to main
- Delete after merge

### Hotfix Branches

- Branch from main
- Fix critical issues
- Fast-track review process

## Release Process

### Version Bumps

- Update `version` in the affected crate's `Cargo.toml`
- Update workspace `Cargo.toml` if using workspace version inheritance
- Tag with `v{version}` (e.g., `v0.1.0`)

### Publishing to crates.io

- Run `cargo publish --dry-run -p kailash-{crate}` before actual publish
- Publish dependency crates first (e.g., `kailash-value` before `kailash-core`)
- Never publish with `--allow-dirty`

## Exceptions

Git exceptions require:

1. Explicit user approval
2. Documentation in PR
3. Team notification for force operations
