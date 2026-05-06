---
name: testing-strategies
description: "Kailash Rust testing: 3-tier strategy with NO MOCKING policy for Tier 2/3. Real infra, regression tests, coverage. Use for test design, organization, best practices."
---

# Kailash Testing Strategies

Comprehensive testing approach for the Kailash Rust SDK using the 4-tier testing strategy with NO MOCKING policy.

## Overview

Kailash testing philosophy:

- **4-Tier Strategy**: Regression, Unit, Integration, End-to-End
- **Regression-First**: Every bug fix starts with a failing regression test
- **NO MOCKING Policy**: Tiers 2-3 use real infrastructure
- **Real Database Testing**: Actual PostgreSQL/SQLite via sqlx
- **Real API Testing**: Live HTTP calls
- **Real LLM Testing**: Actual model calls (with caching)

## Reference Documentation

- **[test-3tier-strategy](test-3tier-strategy.md)** -- Complete testing guide (tiers 0-3, test organization, helpers, CI/CD)
- **[testing-patterns](testing-patterns.md)** -- Component-specific test patterns (workflows, DataFlow, Nexus, Kaizen)

## 4-Tier Summary

### Tier 0: Regression Tests

**Scope**: Reproduce known bugs, permanent guards against re-introduction.
**Mocking**: Depends on bug scope (Tier 1 rules for unit-level, Tier 2 for integration).
**Lifetime**: PERMANENT -- regression tests are never deleted.

Every bug fix MUST start with a failing regression test. File: `tests/regression_*.rs`, function: `issue_{number}_{short_description}`.

### Tier 1: Unit Tests

**Scope**: Individual functions and structs. **Mocking**: Trait-based test doubles allowed. **Speed**: < 1s per test.

### Tier 2: Integration Tests

**Scope**: Component integration (workflows, database, APIs). **Mocking**: NO MOCKING. **Speed**: 1-10s per test.

### Tier 3: End-to-End Tests

**Scope**: Complete user workflows. **Mocking**: NO MOCKING. **Speed**: 10s+ per test.

## NO MOCKING Policy (Tiers 2-3)

**Real issues found by real infrastructure**: database constraint violations, API timeouts, race conditions, connection pool exhaustion, schema migration issues, LLM token limits.

**Use instead**: Test databases (Docker), test API endpoints, test LLM accounts (with caching), temp directories (`tempfile` crate).

## Test Organization

```
crates/{crate}/
  src/lib.rs           # #[cfg(test)] mod tests at bottom (Tier 1)
  tests/
    regression_*.rs    # Tier 0: permanent regression guards
    integration/       # #[cfg(feature = "integration")] (Tier 2)
    e2e/               # #[cfg(feature = "e2e")] (Tier 3)
tests/                 # Workspace-level integration tests
  docker-compose.test.yml
```

## Running Tests

```bash
cargo test --workspace                        # Tier 0-1: Regression + Unit
cargo test --workspace --features integration # Tier 2: Integration
cargo test --workspace --features e2e         # Tier 3: E2E
cargo tarpaulin --workspace --out Html        # Coverage
```

## Critical Rules

- Every bug fix starts with a failing regression test (Tier 0)
- Regression tests are permanent -- NEVER delete them
- Tier 1: trait-based test doubles for external dependencies
- Tiers 2-3: real infrastructure only, NO mockall/mock frameworks
- Feature-gate slow tests: `#[cfg(feature = "integration")]`
- Clean up resources after tests
- Cache LLM responses for cost
- Never commit test credentials (use `.env`)

## Related Skills

- **[02-dataflow](../../02-dataflow/SKILL.md)** -- DataFlow testing
- **[03-nexus](../../03-nexus/SKILL.md)** -- API testing
- **[17-gold-standards](../17-gold-standards/SKILL.md)** -- Testing best practices

## Support

- `testing-specialist` -- Testing strategies and patterns
- `tdd-implementer` -- Test-driven development
- `dataflow-specialist` -- DataFlow testing patterns
