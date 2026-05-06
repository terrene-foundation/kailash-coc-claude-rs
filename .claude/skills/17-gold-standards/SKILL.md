---
name: gold-standards
description: "Kailash Rust SDK gold standards via Python binding — imports, params, error handling, NO mocking Tier 2/3, security, docs."
---

# Kailash Gold Standards - Mandatory Best Practices

Mandatory best practices and standards for all Kailash Rust SDK development. These are **required** patterns that must be followed.

## Reference Documentation

### Code Organization

- **[gold-absolute-imports](gold-absolute-imports.md)** -- Use absolute crate paths (`use kailash_core::...`), group imports (std, external, workspace), no wildcards
- **[gold-parameter-passing](gold-parameter-passing.md)** -- 4-parameter connection format, result access via `result.results["node_id"]["field"]`

### Testing Standards

- **[gold-mocking-policy](gold-mocking-policy.md)** -- NO mocking in Tiers 2-3, trait-based doubles in Tier 1 only
- **[gold-testing](gold-testing.md)** -- 4-tier strategy, real infrastructure, feature-gated, deterministic
- **[gold-test-creation](gold-test-creation.md)** -- TDD, one assertion focus per test, AAA pattern, snake_case names

### Error Handling

- **[gold-error-handling](gold-error-handling.md)** -- Always `Result<T, E>`, use `?` operator, `thiserror` domain errors, no silent swallowing

### Workflow and Node Design

- **[gold-workflow-design](gold-workflow-design.md)** -- Always `builder.build(&registry)?` before execution, 4-parameter `connect()`
- **[gold-custom-nodes](gold-custom-nodes.md)** -- `Node` trait, `input_params()`/`output_params()`, `Pin<Box<dyn Future>>`, `NodeError`

### Security and Documentation

- **[gold-security](gold-security.md)** -- No hardcoded secrets, `sqlx::query!` for SQL, `// SAFETY:` for unsafe, `cargo audit`
- **[gold-documentation](gold-documentation.md)** -- Rustdoc for public APIs, `# Examples` with doc tests, explain WHY not WHAT
- **[documentation-validation-patterns](documentation-validation-patterns.md)** -- Documentation validation patterns

## Quick Reference: 8 Critical Standards

| # | Standard                 | DO                                                    | DO NOT                                       |
|---|--------------------------|-------------------------------------------------------|----------------------------------------------|
| 1 | Imports                  | `use kailash_core::{WorkflowBuilder, Runtime};`      | `use kailash_core::*;`                       |
| 2 | NO MOCKING (Tier 2-3)   | Real DB via `dotenvy` + `DATABASE_URL`                | `mockall::automock` in integration tests     |
| 3 | 4-param connections      | `connect("src", "output", "tgt", "input")`            | `connect("src", "tgt")`                      |
| 4 | build() before execute   | `let wf = builder.build(&registry)?;`                 | `runtime.execute(&builder, inputs)`          |
| 5 | Error handling           | `.ok_or(NodeError::MissingInput{..})?`                | `.unwrap()` in production                    |
| 6 | Secrets                  | `std::env::var("API_KEY")`                            | `let api_key = "sk-...";`                    |
| 7 | TDD                      | Write test first, then implement                      | Implement first, add tests later             |
| 8 | Explicit errors          | `match result { Ok(..) => .., Err(..) => .. }`       | `let _ = result;`                            |

## Compliance Checklists

### Before Every Commit

- [ ] All imports use absolute crate paths
- [ ] All connections use 4 parameters
- [ ] `builder.build(&registry)?` called before execute
- [ ] No hardcoded secrets
- [ ] Error handling with `Result` and `?`
- [ ] Tests written (TDD)
- [ ] No mocking in Tier 2-3 tests
- [ ] Rustdoc on public APIs

### Before Every PR

- [ ] `cargo test --workspace` passes
- [ ] `cargo clippy --workspace -- -D warnings` clean
- [ ] `cargo fmt --all --check` passes
- [ ] `cargo audit` clean

### Before Every Release

- [ ] Full gold standards audit
- [ ] `cargo test --doc --workspace` passes
- [ ] Security audit complete

## Enforcement

```bash
cargo test --workspace && cargo clippy --workspace -- -D warnings && cargo fmt --all --check && cargo audit && cargo test --doc --workspace
```

## Related Skills

- **[12-testing-strategies](../12-testing-strategies/SKILL.md)** -- Testing strategies
- **[03-nexus](../03-nexus/SKILL.md)** -- Nexus patterns

## Support

- `reviewer` -- Code review after changes
- `security-reviewer` -- Security audit before commits
- `testing-specialist` -- Testing compliance
