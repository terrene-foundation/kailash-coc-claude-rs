---
name: decide-test-tier
description: "Choose test tier (unit, integration, e2e) based on scope and dependencies. Use when asking 'test tier', 'unit vs integration', 'test type', 'which test', 'test strategy', or 'test level'."
---

# Decision: Test Tier Selection

Guide for choosing the right test tier in the Kailash Rust SDK's 3-tier testing strategy.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `MEDIUM`

## Quick Reference

- **Primary Use**: Test tier selection
- **Category**: cross-cutting
- **Priority**: MEDIUM
- **Trigger Keywords**: test tier, unit vs integration, test type, which test, test strategy

## 3-Tier Testing Strategy

### Tier 1: Unit Tests

**Fast, isolated, mocking allowed. Run on every `cargo test`.**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use kailash_core::value::{Value, ValueMap};

    #[test]
    fn test_value_creation() {
        let val = Value::String("hello".into());
        assert_eq!(val.to_string(), "hello");
    }

    #[test]
    fn test_valuemap_construction() {
        let map = ValueMap::from([
            ("key".into(), Value::Integer(42)),
        ]);
        assert_eq!(map.get("key"), Some(&Value::Integer(42)));
    }

    #[tokio::test]
    async fn test_node_execution() {
        let node = MyNode::from_config(&ValueMap::new());
        let result = node.execute(ValueMap::new(), &ExecutionContext::default()).await;
        assert!(result.is_ok());
    }
}
```

**When to use:**

- Testing pure functions and data structures
- Testing individual node logic
- Testing Value conversions
- Testing config parsing

**Commands:**

```bash
cargo test --workspace                    # All unit tests
cargo test -p kailash-core                # Single crate
cargo test -p kailash-core test_value     # Specific test
```

### Tier 2: Integration Tests

**Real infrastructure, NO MOCKING. Feature-gated behind `integration`.**

```rust
#[cfg(feature = "integration")]
mod integration_tests {
    use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
    use kailash_core::value::{Value, ValueMap};
    use std::sync::Arc;

    #[tokio::test]
    async fn test_workflow_execution() {
        dotenvy::dotenv().ok();

        let registry = Arc::new(NodeRegistry::default());
        let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());

        let mut builder = WorkflowBuilder::new();
        builder.add_node("JSONTransformNode", "transform", ValueMap::from([
            ("expression".into(), Value::String("@.name".into())),
        ]));
        let workflow = builder.build(&registry).expect("build should succeed");

        let inputs = ValueMap::from([
            ("data".into(), Value::Object(
                [("name".into(), Value::String("Alice".into()))].into_iter().collect()
            )),
        ]);

        let result = runtime.execute(&workflow, inputs).await
            .expect("execution should succeed");

        assert!(result.results.contains_key("transform"));
    }

    #[tokio::test]
    async fn test_database_operations() {
        dotenvy::dotenv().ok();
        let db_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set for integration tests");

        let pool = sqlx::PgPool::connect(&db_url).await
            .expect("failed to connect to database");

        let row = sqlx::query!("SELECT 1 as result")
            .fetch_one(&pool)
            .await
            .expect("query should succeed");

        assert_eq!(row.result, Some(1));
    }
}
```

**When to use:**

- Testing workflow execution end-to-end
- Testing database operations (real DB, not mocked)
- Testing HTTP integrations (real endpoints)
- Testing multi-node workflows

**Commands:**

```bash
cargo test --workspace --features integration    # All integration tests
cargo test -p kailash-dataflow --features integration  # Single crate
```

**CRITICAL RULE: NO MOCKING in Tier 2/3.** Use real databases, real HTTP endpoints, real infrastructure.

### Tier 3: End-to-End Tests

**Full system tests with real everything. Feature-gated behind `e2e`.**

```rust
#[cfg(feature = "e2e")]
mod e2e_tests {
    use kailash_nexus::{NexusApp, Preset};
    use reqwest::Client;

    #[tokio::test]
    async fn test_full_api_flow() {
        dotenvy::dotenv().ok();

        // Start the Nexus app
        let app = NexusApp::builder()
            .preset(Preset::Standard)
            .build()
            .expect("app should build");

        // ... register handlers, start server ...

        // Test via HTTP client
        let client = Client::new();
        let response = client
            .get("http://localhost:3000/health")
            .send()
            .await
            .expect("request should succeed");

        assert!(response.status().is_success());
    }
}
```

**When to use:**

- Testing complete user flows
- Testing API endpoints
- Testing multi-service interactions
- Testing deployment configurations

**Commands:**

```bash
cargo test --workspace --features e2e    # All E2E tests
```

## Decision Matrix

| What You're Testing       | Tier   | Feature Gate   | Mocking         |
| ------------------------- | ------ | -------------- | --------------- |
| Pure function / data type | Tier 1 | None (default) | Allowed         |
| Single node logic         | Tier 1 | None           | Allowed         |
| Value/ValueMap ops        | Tier 1 | None           | Allowed         |
| Workflow execution        | Tier 2 | `integration`  | **NOT allowed** |
| Database queries          | Tier 2 | `integration`  | **NOT allowed** |
| HTTP API calls            | Tier 2 | `integration`  | **NOT allowed** |
| Multi-node pipeline       | Tier 2 | `integration`  | **NOT allowed** |
| Full API endpoint         | Tier 3 | `e2e`          | **NOT allowed** |
| Complete user flow        | Tier 3 | `e2e`          | **NOT allowed** |
| Multi-service flow        | Tier 3 | `e2e`          | **NOT allowed** |

## Decision Flow

```
What are you testing?
  |-- Individual function/struct?
  |     -> Tier 1: #[test] or #[tokio::test]
  |-- Workflow with real nodes?
  |     -> Tier 2: #[cfg(feature = "integration")] + #[tokio::test]
  |-- Database with real DB?
  |     -> Tier 2: #[cfg(feature = "integration")] + real DATABASE_URL
  |-- Complete API endpoint?
  |     -> Tier 3: #[cfg(feature = "e2e")] + real server
  |-- Full user journey?
        -> Tier 3: #[cfg(feature = "e2e")] + all services running
```

## Cargo.toml Feature Configuration

```toml
[features]
default = []
integration = []
e2e = ["integration"]  # E2E implies integration

[dev-dependencies]
tokio = { version = "1", features = ["full", "test-util"] }
```

## Coverage Targets

| Tier                 | Coverage Target | Run Frequency      |
| -------------------- | --------------- | ------------------ |
| Tier 1 (Unit)        | 80%+            | Every `cargo test` |
| Tier 2 (Integration) | Critical paths  | CI + pre-merge     |
| Tier 3 (E2E)         | Happy paths     | Release pipeline   |

## Test Organization

```
crates/kailash-core/
  src/
    lib.rs
    node.rs          # Contains #[cfg(test)] mod tests { ... }
  tests/
    integration/     # #[cfg(feature = "integration")] tests
      mod.rs
      workflow_test.rs
    e2e/             # #[cfg(feature = "e2e")] tests
      mod.rs
      api_test.rs
```

## Related Patterns

- **Testing rules**: See `rules/testing.md`
- **Test templates**: See `.claude/skills/15-code-templates/`
- **CI configuration**: See `.github/workflows/`

## Documentation References

### Primary Sources

- [`CLAUDE.md`](../../../../CLAUDE.md) -- Development Quick Reference section
- `rules/testing.md` -- 3-tier testing policy, NO MOCKING rule

## Quick Tips

- Tier 1 runs on every `cargo test` -- keep them fast
- Tier 2/3 require `.env` with real credentials (DATABASE_URL, API keys)
- NEVER mock in Tier 2/3 -- use real infrastructure
- Use `#[cfg(feature = "integration")]` to gate Tier 2 tests
- Use `#[cfg(feature = "e2e")]` to gate Tier 3 tests
- `cargo test` (no features) runs only Tier 1 -- safe and fast

<!-- Trigger Keywords: test tier, unit vs integration, test type, which test, test strategy, test level, cargo test features -->
