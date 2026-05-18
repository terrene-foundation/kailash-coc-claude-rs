# /test - Testing Strategies Quick Reference

## Purpose

Testing patterns for the Kailash Rust workspace. See `rules/build-speed.md` for speed rules.

## Speed-First Test Commands

```bash
# Fast: test only what you changed (seconds)
cargo nextest run -p kailash-governance

# Fast: all lib+integration tests, no doc-tests (2-5 min)
cargo t

# Full: nextest workspace (5-10 min)
cargo ntw

# Slow: doc-tests only — CI or explicit (15-20 min)
cargo td
```

**Default to `cargo nextest run -p <crate>`. Never `cargo test --workspace` locally.**

## Quick Reference

| Command       | Action                                      |
| ------------- | ------------------------------------------- |
| `/test`       | Load testing patterns and tier strategy     |
| `/test tier1` | Show unit test patterns (mocking allowed)   |
| `/test tier2` | Show integration test patterns (NO MOCKING) |
| `/test tier3` | Show E2E test patterns (NO MOCKING)         |

## What You Get

- 3-tier testing strategy
- NO MOCKING enforcement (Tier 2-3)
- Real infrastructure patterns
- Coverage requirements

## 3-Tier Strategy

| Tier   | Type        | Mocking        | Focus                  |
| ------ | ----------- | -------------- | ---------------------- |
| Tier 1 | Unit Tests  | ALLOWED        | Isolated functions     |
| Tier 2 | Integration | **PROHIBITED** | Component interactions |
| Tier 3 | E2E         | **PROHIBITED** | Full user journeys     |

## Quick Pattern — Rust Tests

```rust
// Tier 1: Unit test (mocking allowed)
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_value_conversion() {
        let v = Value::from("hello");
        assert_eq!(v.as_str(), Some("hello"));
    }
}
```

```rust
// Tier 2: Integration test — real database (NO MOCKING)
#[tokio::test]
async fn test_user_creation() {
    let pool = sqlx::SqlitePool::connect(":memory:").await.unwrap();
    sqlx::migrate!().run(&pool).await.unwrap();

    sqlx::query("INSERT INTO users (name) VALUES (?)")
        .bind("test")
        .execute(&pool).await.unwrap();

    let row = sqlx::query("SELECT name FROM users WHERE name = ?")
        .bind("test")
        .fetch_one(&pool).await.unwrap();
    assert_eq!(row.get::<String, _>("name"), "test");
}
```

### If Project Uses Kailash Python Bindings

```python
# Python binding test — real Rust runtime (NO MOCKING)
import kailash

def test_workflow_execution():
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("EchoNode", "echo", {"message": "hello"})
    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf)
    assert result["results"]["echo"] is not None
```

## Critical Rule - NO MOCKING in Tier 2-3

```rust
// PROHIBITED in integration/e2e tests
// No mockall, no mock structs for real services
// No fake database connections
// No simulated API responses
```

```python
# PROHIBITED in integration/e2e tests (Python bindings)
@patch('module.function')    # BLOCKED
MagicMock()                  # BLOCKED
unittest.mock                # BLOCKED
mocker.patch()               # BLOCKED
```

## Agent Teams

When writing tests, deploy these agents as a team:

- **testing-specialist** — 3-tier strategy, test architecture, coverage requirements
- **tdd-implementer** — Test-first methodology, red-green-refactor cycle
- **reviewer** — Review test quality after writing

For E2E tests, additionally deploy:

- **testing-specialist** — Playwright/Marionette test generation
- **value-auditor** — Validate from user/buyer perspective, not just technical assertions

## Related Commands

- `/validate` - Project compliance checks
- `/sdk` - Core SDK patterns (Kailash projects)
- `/db` - DataFlow database operations (Kailash projects)
- `/api` - Nexus multi-channel deployment (Kailash projects)

## Skill Reference

This command loads: `.claude/skills/12-testing-strategies/SKILL.md`
