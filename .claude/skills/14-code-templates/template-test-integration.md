---
name: template-test-integration
description: "Generate Kailash integration test template (Tier 2). Use when requesting 'integration test template', 'Tier 2 test', 'real infrastructure test', 'NO MOCKING test', or 'integration test example'."
---

# Integration Test Template (Tier 2)

Integration test template with real infrastructure (NO MOCKING policy). Uses `#[cfg(feature = "integration")]` gating.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `HIGH`
> Related Skills: [`CLAUDE.md`](../../../../CLAUDE.md), [`template-test-unit`](template-test-unit.md), [`template-test-e2e`](template-test-e2e.md)
> Related Subagents: `testing-specialist` (NO MOCKING policy), `tdd-implementer`

## Quick Reference

- **Purpose**: Test component interactions with real services
- **Speed**: < 5 seconds per test
- **Dependencies**: Real Docker services (PostgreSQL, Redis, etc.)
- **Location**: `tests/` directory or `crates/*/tests/`
- **Mocking**: FORBIDDEN -- use real services only
- **Run**: `cargo test --workspace --features integration`
- **Requires**: `.env` with `DATABASE_URL` etc., Docker services running

## Integration Test Template

```rust
//! Integration tests for [Component] with real infrastructure.
//!
//! Run: cargo test -p kailash-dataflow --features integration

#[cfg(feature = "integration")]
mod integration_tests {
    use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
    use kailash_core::value::{Value, ValueMap};
    use std::sync::Arc;

    /// Load environment and return database URL.
    fn database_url() -> String {
        dotenvy::dotenv().ok();
        std::env::var("DATABASE_URL")
            .expect("DATABASE_URL must be set in .env for integration tests")
    }

    fn test_registry() -> Arc<NodeRegistry> {
        Arc::new(NodeRegistry::default())
    }

    #[tokio::test]
    async fn test_database_workflow() {
        let db_url = database_url();
        let registry = test_registry();

        let mut builder = WorkflowBuilder::new();

        // Use real database node with real connection
        builder.add_node("SQLQueryNode", "db_write", ValueMap::from([
            ("connection_string".into(), Value::String(db_url.clone().into())),
            ("query".into(), Value::String(
                "INSERT INTO test_items (name, value) VALUES ($1, $2)".into(),
            )),
            ("params".into(), Value::Array(vec![
                Value::String("test_name".into()),
                Value::Integer(42),
            ])),
        ]));

        builder.add_node("SQLQueryNode", "db_read", ValueMap::from([
            ("connection_string".into(), Value::String(db_url.into())),
            ("query".into(), Value::String(
                "SELECT * FROM test_items WHERE name = $1".into(),
            )),
            ("params".into(), Value::Array(vec![
                Value::String("test_name".into()),
            ])),
        ]));

        builder.connect("db_write", "result", "db_read", "trigger");

        let workflow = builder.build(&registry)
            .expect("Workflow should build");

        let runtime = Runtime::new(RuntimeConfig::default(), registry);
        let result = runtime.execute(&workflow, ValueMap::new()).await
            .expect("Execution should succeed with real database");

        // Verify real database operations
        assert!(result.results.contains_key("db_read"));
    }

    #[tokio::test]
    async fn test_multi_node_pipeline() {
        let registry = test_registry();

        let mut builder = WorkflowBuilder::new();

        // Node 1: Source data
        builder.add_node("LogNode", "source", ValueMap::from([
            ("message".into(), Value::String("source data".into())),
        ]));

        // Node 2: Transform
        builder.add_node("JSONTransformNode", "transform", ValueMap::from([
            ("expression".into(), Value::String("@".into())),
        ]));

        // Node 3: Validate
        builder.add_node("LogNode", "validate", ValueMap::from([
            ("message".into(), Value::String("validated".into())),
        ]));

        // Connect pipeline
        builder.connect("source", "output", "transform", "data");
        builder.connect("transform", "result", "validate", "input");

        let workflow = builder.build(&registry)
            .expect("Workflow should build");

        let runtime = Runtime::new(RuntimeConfig::default(), registry);
        let result = runtime.execute(&workflow, ValueMap::new()).await
            .expect("Pipeline execution should succeed");

        assert!(result.results.contains_key("source"));
        assert!(result.results.contains_key("transform"));
        assert!(result.results.contains_key("validate"));
        assert_eq!(result.results.len(), 3);
    }
}
```

## DataFlow Integration Test Template

```rust
//! Integration tests for DataFlow models with real PostgreSQL.

#[cfg(feature = "integration")]
mod dataflow_integration {
    use kailash_dataflow::{DataFlow, Connection};

    async fn setup_db() -> DataFlow {
        dotenvy::dotenv().ok();
        let url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL required");
        let conn = Connection::new(&url).await
            .expect("Failed to connect to test database");
        DataFlow::new(conn)
    }

    #[tokio::test]
    async fn test_model_crud_operations() {
        let df = setup_db().await;

        // Create -- real database insert
        let created = df.execute_node("CreateUser", kailash_core::value::ValueMap::from([
            ("name".into(), kailash_core::value::Value::String("Alice".into())),
            ("email".into(), kailash_core::value::Value::String("alice@example.com".into())),
        ])).await;

        assert!(created.is_ok(), "Create should succeed with real DB");

        // Read -- real database query
        let read = df.execute_node("ListUser", kailash_core::value::ValueMap::new()).await;
        assert!(read.is_ok(), "List should succeed with real DB");
    }

    #[tokio::test]
    async fn test_transaction_rollback() {
        let df = setup_db().await;

        // Start transaction
        let tx = df.begin().await.expect("Transaction should start");

        // Insert within transaction
        let _ = tx.execute_node("CreateUser", kailash_core::value::ValueMap::from([
            ("name".into(), kailash_core::value::Value::String("Rollback Test".into())),
            ("email".into(), kailash_core::value::Value::String("rollback@test.com".into())),
        ])).await;

        // Rollback
        tx.rollback().await.expect("Rollback should succeed");

        // Verify not persisted
        let result = df.execute_node("ListUser", kailash_core::value::ValueMap::from([
            ("filter".into(), kailash_core::value::Value::String("name = 'Rollback Test'".into())),
        ])).await;

        // Should not find the rolled-back record
        assert!(result.is_ok());
    }
}
```

## Nexus HTTP Integration Test Template

```rust
//! Integration tests for Nexus HTTP handlers.

#[cfg(feature = "integration")]
mod nexus_integration {
    use kailash_nexus::{NexusApp, Preset};
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_handler_returns_200() {
        let app = NexusApp::builder()
            .preset(Preset::Lightweight)
            .build()
            .expect("App should build");

        app.register("health", || async {
            axum::Json(serde_json::json!({"status": "ok"}))
        }).await.expect("Registration should succeed");

        let router = app.into_router();

        let response = router
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .expect("Request should succeed");

        assert_eq!(response.status(), StatusCode::OK);
    }
}
```

## Docker Setup Required

```bash
# Start test infrastructure before running integration tests
docker compose -f tests/docker-compose.yml up -d

# Verify services are ready
docker compose -f tests/docker-compose.yml ps

# Run integration tests
cargo test --workspace --features integration

# Tear down after testing
docker compose -f tests/docker-compose.yml down -v
```

## NO MOCKING Policy -- Tier 2 and Tier 3

### FORBIDDEN in Tier 2

```rust
// WRONG: Do not mock databases
struct MockDatabase;
impl Database for MockDatabase {
    fn query(&self, _: &str) -> Vec<Row> { vec![] }  // Fake!
}

// WRONG: Do not use test doubles for infrastructure
fn test_with_fake_redis() {
    let fake = HashMap::new();  // Not a real Redis!
}
```

### USE REAL SERVICES

```rust
// CORRECT: Use real PostgreSQL from Docker
#[tokio::test]
#[cfg(feature = "integration")]
async fn test_with_real_db() {
    dotenvy::dotenv().ok();
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL required");
    let pool = sqlx::PgPool::connect(&url).await.expect("DB connect");

    sqlx::query("INSERT INTO items (name) VALUES ($1)")
        .bind("test")
        .execute(&pool)
        .await
        .expect("Insert should succeed");

    let rows = sqlx::query("SELECT * FROM items WHERE name = $1")
        .bind("test")
        .fetch_all(&pool)
        .await
        .expect("Query should succeed");

    assert!(!rows.is_empty());
}
```

## Quick Tips

- Gate all integration tests with `#[cfg(feature = "integration")]`
- Load `.env` with `dotenvy::dotenv().ok()` at the start of each test
- Use `#[tokio::test]` for all async tests
- Keep tests under 5 seconds
- NO MOCKING -- this is an absolute rule for Tier 2 and Tier 3
- Clean up test data in each test (use transactions + rollback, or truncate)
- Call `runtime.shutdown().await` when tests register resources (database pools, etc.)
- Run with: `cargo test --workspace --features integration`

## Related Patterns

- **Unit tests**: [`template-test-unit`](template-test-unit.md)
- **E2E tests**: [`template-test-e2e`](template-test-e2e.md)
- **Testing rules**: See `rules/testing.md` for NO MOCKING policy

## When to Escalate

Use `testing-specialist` when:

- Complex test infrastructure needed
- Custom Docker setup required
- CI/CD integration

Use `tdd-implementer` when:

- Test-first development approach
- Complete test suite design

## Documentation References

### Primary Sources

- **Testing Rules**: [`rules/testing.md`](../../../../rules/testing.md) -- 3-tier strategy, NO MOCKING
- **CLAUDE.md**: [`CLAUDE.md`](../../../../CLAUDE.md) -- `cargo test --workspace --features integration`
- **DataFlow Tests**: [`crates/kailash-dataflow/tests/`](../../../../crates/kailash-dataflow/tests/) -- Reference integration tests

<!-- Trigger Keywords: integration test template, Tier 2 test, real infrastructure test, NO MOCKING test, integration test example, integration test boilerplate, Docker test template -->
