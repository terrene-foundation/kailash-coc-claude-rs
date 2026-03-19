# Agent Orchestration Rules

## Scope

These rules govern when and how specialized agents MUST be used in the Kailash Rust codebase.

## MANDATORY Delegations

### Rule 1: Code Review After ANY Change

After completing ANY file modification (Edit, Write), you MUST:

1. Delegate to **intermediate-reviewer** for code review
2. Wait for review completion before proceeding
3. Address any findings before moving to next task

**Enforced by**: PostToolUse hook reminder
**Exception**: User explicitly says "skip review"

### Rule 2: Security Review Before ANY Commit

Before executing ANY git commit command, you MUST:

1. Delegate to **security-reviewer** for security audit
2. Address all CRITICAL findings
3. Document any HIGH findings for tracking

**Enforced by**: PreToolUse hook on git commit
**Exception**: NONE - security review is always required

### Rule 3: Crate Specialist for Crate Work

When working with Kailash crates, you MUST consult the appropriate specialist:

- **rust-architect**: For crate architecture, trait hierarchy, dependency decisions, API surface design across `kailash-core`, `kailash-value`, `kailash-nodes`, `kailash-dataflow`, `kailash-nexus`, `kailash-kaizen`, `kailash-enterprise`
- **cargo-specialist**: For workspace configuration, dependency management, feature flags, cross-compilation, publishing
- **ffi-specialist**: For `kailash-capi` (C ABI), `kailash-python` (PyO3), `kailash-node` (napi-rs), `kailash-wasm` (wasm-bindgen), Go/Java FFI

**Applies when**:

- Creating new nodes or workflows
- Modifying database models or migrations
- Setting up API routes or middleware
- Building AI agents
- Implementing WASM or native plugins
- Working on FFI bindings

**Enforced by**: Crate detection in session-start hook

### Rule 4: Analysis Chain for Complex Features

For features requiring design decisions, follow this chain:

1. **deep-analyst** -> Identify failure points and unsafe boundaries
2. **requirements-analyst** -> Break down requirements
3. **rust-architect** -> Choose implementation crate and approach
4. Then appropriate specialist for implementation

**Applies when**:

- New feature spanning multiple crates
- Unclear requirements
- Multiple valid approaches exist
- Cross-crate API design decisions

### Rule 5: Parallel Execution for Independent Operations

When multiple independent operations are needed, you MUST:

1. Launch agents in parallel using Task tool
2. Wait for all to complete
3. Aggregate results

**Example independent operations**:

- Reading multiple unrelated source files
- Running multiple search queries across crates
- Validating separate crate implementations
- Running `cargo clippy` and `cargo test` in parallel

## Examples

### Correct: Sequential with Review

```
User asks for code change
   -> Agent implements change
   -> Agent delegates to intermediate-reviewer
   -> Agent addresses review findings
   -> Only then moves to next task
```

### Incorrect: Skipping Review

```
User asks for code change
   -> Agent implements change
   -> Agent moves to next task (skipped review!)
```

### Rule 6: Pre-Existing Failures MUST Be Fixed

See `rules/zero-tolerance.md` Rule 1. If you find it, you fix it. "Not introduced in this session" is BLOCKED.
**Exception**: User explicitly says "skip this issue."

### Rule 7: No Workarounds for Core SDK Issues

See `rules/zero-tolerance.md` Rule 4. Deep dive, reproduce, fix directly. NEVER re-implement SDK functionality.
**Exception**: NONE.

## PROHIBITED Actions

### MUST NOT: Skip Code Review

Code review is mandatory after changes. Skipping requires explicit user approval.

### MUST NOT: Commit Without Security Review

Security review before commits is non-negotiable.

### MUST NOT: Crate Work Without Specialist

Never use raw SQL strings when `kailash-dataflow` (sqlx) patterns exist.
Never build custom HTTP handlers when `kailash-nexus` (axum) patterns exist.
Never build custom agent loops when `kailash-kaizen` patterns exist.
Never use raw FFI when `kailash-capi` patterns exist.

### MUST NOT: Sequential When Parallel Possible

If operations are independent, run them in parallel.

### MUST NOT: Violate Zero-Tolerance Rules

Stubs, naive fallbacks, unfixed pre-existing failures, and SDK workarounds are all BLOCKED. See `rules/zero-tolerance.md` and `rules/no-stubs.md` for full enforcement details.

## Quality Gates

### Checkpoint 1: After Planning

- [ ] Requirements understood
- [ ] Approach validated
- [ ] Target crate(s) identified

### Checkpoint 2: After Implementation

- [ ] Code review completed
- [ ] Tests written (`cargo test`)
- [ ] `cargo clippy -- -D warnings` passes
- [ ] `cargo fmt --check` passes
- [ ] Patterns validated

### Checkpoint 3: Before Commit

- [ ] Security review passed
- [ ] `cargo test --workspace` passes
- [ ] `cargo audit` clean
- [ ] Documentation updated (rustdoc)

### Checkpoint 4: Before Push

- [ ] PR description complete
- [ ] CI checks configured
- [ ] Ready for human review
