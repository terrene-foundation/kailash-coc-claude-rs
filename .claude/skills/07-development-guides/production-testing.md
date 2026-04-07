# Production Testing

You are an expert in production-quality testing for Kailash SDK. Guide users through comprehensive testing strategies, test organization, and quality assurance.

## Core Responsibilities

### 1. 3-Tier Testing Strategy

- **Tier 1**: Unit tests - Individual node testing
- **Tier 2**: Integration tests - Multi-node workflows with real infrastructure
- **Tier 3**: End-to-end tests - Complete workflows with external services

### 2. Tier 1: Unit Tests (Node-Level)

```rust
use kailash_core::node::{Node, NodeRegistry};
use kailash_value::ValueMap;

#[test]
fn test_processor_node_execution() {
    // Test individual node execution.
    let registry = NodeRegistry::default();
    let node = registry.create("ProcessorNode", "test_node", serde_json::json!({
        "operation": "double"
    })).unwrap();

    let mut inputs = ValueMap::new();
    inputs.insert("input_value".into(), 10.into());

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(node.execute(inputs)).unwrap();

    assert_eq!(result["status"].as_str(), Some("success"));
    assert_eq!(result["value"].as_i64(), Some(20));
}

#[test]
fn test_processor_node_error_handling() {
    // Test node error handling.
    let registry = NodeRegistry::default();
    let node = registry.create("ProcessorNode", "test_node", serde_json::json!({
        "operation": "divide",
        "divisor": 0
    })).unwrap();

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(node.execute(Default::default()));

    assert!(result.is_err());
}

#[test]
fn test_parameter_validation() {
    // Test parameter validation.
    let registry = NodeRegistry::default();

    // Valid node creation
    let node = registry.create("HTTPRequestNode", "test_node", serde_json::json!({
        "url": "https://api.example.com",
        "method": "GET"
    }));
    assert!(node.is_ok());

    // Missing required URL -- should fail
    let invalid = registry.create("HTTPRequestNode", "test_node", serde_json::json!({
        "method": "GET"
    }));
    assert!(invalid.is_err());
}
```

### 3. Tier 2: Integration Tests (Real Infrastructure)

```rust
use kailash_core::workflow::WorkflowBuilder;
use kailash_core::runtime::Runtime;
use kailash_core::node::NodeRegistry;
use sqlx::SqlitePool;

async fn setup_test_database() -> SqlitePool {
    // Setup test database -- Real infrastructure recommended.
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    sqlx::query(
        "CREATE TABLE test_data (id INTEGER PRIMARY KEY, value TEXT)"
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO test_data VALUES (1, 'test')")
        .execute(&pool)
        .await
        .unwrap();
    pool
}

#[tokio::test]
async fn test_database_workflow_integration() {
    // Test workflow with real database -- NO MOCKS.
    let pool = setup_test_database().await;

    let registry = NodeRegistry::default();
    let mut builder = WorkflowBuilder::new();

    builder.add_node("SQLReaderNode", "reader", serde_json::json!({
        "query": "SELECT * FROM test_data"
    }));

    builder.add_node("ProcessorNode", "processor", serde_json::json!({
        "operation": "count"
    }));

    builder.add_connection("reader", "data", "processor", "data");

    let workflow = builder.build(&registry).unwrap();
    let runtime = Runtime::new(registry);
    let results = runtime.execute(&workflow, Default::default()).await.unwrap();

    assert!(results["processor"]["count"].as_i64().unwrap() > 0);
}

#[tokio::test]
async fn test_api_workflow_integration() {
    // Test workflow with real API -- NO MOCKS.
    let registry = NodeRegistry::default();
    let mut builder = WorkflowBuilder::new();

    // Use real test API (jsonplaceholder)
    builder.add_node("HTTPRequestNode", "api_call", serde_json::json!({
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "method": "GET"
    }));

    let workflow = builder.build(&registry).unwrap();
    let runtime = Runtime::new(registry);
    let results = runtime.execute(&workflow, Default::default()).await.unwrap();

    let response = &results["api_call"];
    assert!(response["title"].is_string());
}
```

### 4. Tier 3: End-to-End Tests

```rust
#[tokio::test]
async fn test_complete_etl_pipeline() {
    // Test complete ETL pipeline end-to-end.
    let registry = NodeRegistry::default();
    let mut builder = WorkflowBuilder::new();

    // Extract
    builder.add_node("CSVReaderNode", "extract", serde_json::json!({
        "file_path": "tests/data/test_input.csv"
    }));

    // Transform
    builder.add_node("TransformNode", "transform", serde_json::json!({
        "operations": [
            {"field": "value", "action": "fill_null", "default": 0},
            {"field": "category", "action": "uppercase"}
        ]
    }));

    // Load
    builder.add_node("CSVWriterNode", "load", serde_json::json!({
        "file_path": "tests/output/test_output.csv"
    }));

    // Connections
    builder.add_connection("extract", "data", "transform", "data");
    builder.add_connection("transform", "result", "load", "data");

    // Execute
    let workflow = builder.build(&registry).unwrap();
    let runtime = Runtime::new(registry);
    let results = runtime.execute(&workflow, Default::default()).await.unwrap();

    // Verify output file exists and has correct data
    assert!(std::path::Path::new("tests/output/test_output.csv").exists());

    let content = std::fs::read_to_string("tests/output/test_output.csv").unwrap();
    assert!(!content.is_empty());

    // Cleanup
    let _ = std::fs::remove_file("tests/output/test_output.csv");
}
```

### 5. Test Organization (Real infrastructure recommended Policy)

```
tests/
    unit/
        test_nodes.rs          // Unit tests for individual nodes
    integration/
        test_workflows.rs      // Integration tests with real infrastructure
    e2e/
        test_complete_flows.rs // End-to-end tests of complete workflows
    common/
        mod.rs                 // Shared test helpers and fixtures
```

```rust
// tests/common/mod.rs
// Shared test helpers -- Real infrastructure recommended.

use sqlx::SqlitePool;

pub async fn setup_test_database() -> SqlitePool {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    // Setup schema
    pool
}

pub fn cleanup_test_files() {
    if std::path::Path::new("tests/output").exists() {
        std::fs::remove_dir_all("tests/output").ok();
    }
}
```

### 6. Async Testing

```rust
use kailash_core::workflow::WorkflowBuilder;
use kailash_core::runtime::Runtime;
use kailash_core::node::NodeRegistry;

#[tokio::test]
async fn test_async_workflow() {
    // Test async workflow execution.
    let registry = NodeRegistry::default();
    let mut builder = WorkflowBuilder::new();

    builder.add_node("ProcessorNode", "async_processor", serde_json::json!({
        "operation": "async_transform"
    }));

    let workflow = builder.build(&registry).unwrap();
    let runtime = Runtime::new(registry);
    let results = runtime.execute(&workflow, Default::default()).await.unwrap();

    assert!(results.contains_key("async_processor"));
}

#[tokio::test]
async fn test_async_api_calls() {
    // Test async API calls.
    let registry = NodeRegistry::default();
    let mut builder = WorkflowBuilder::new();

    builder.add_node("HTTPRequestNode", "api_call", serde_json::json!({
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "method": "GET"
    }));

    let workflow = builder.build(&registry).unwrap();
    let runtime = Runtime::new(registry);
    let results = runtime.execute(&workflow, Default::default()).await.unwrap();

    assert!(results.contains_key("api_call"));
    assert_eq!(results["api_call"]["status_code"].as_i64(), Some(200));
}
```

### 7. Test Coverage and Assertions

```rust
use kailash_core::workflow::WorkflowBuilder;
use kailash_core::runtime::Runtime;
use kailash_core::node::NodeRegistry;

#[tokio::test]
async fn test_comprehensive_workflow_coverage() {
    // Test all execution paths in workflow.
    let registry = NodeRegistry::default();
    let mut builder = WorkflowBuilder::new();

    builder.add_node("ProcessorNode", "input", Default::default());
    builder.add_node("SwitchNode", "router", serde_json::json!({
        "cases": [
            {"condition": "value > 50", "target": "high_path"},
            {"condition": "value <= 50", "target": "low_path"}
        ]
    }));
    builder.add_node("ProcessorNode", "high_path", Default::default());
    builder.add_node("ProcessorNode", "low_path", Default::default());

    let workflow = builder.build(&registry).unwrap();
    let runtime = Runtime::new(registry);

    // Test high path
    let mut high_inputs = ValueMap::new();
    high_inputs.insert("input.input_value".into(), 75.into());
    let results_high = runtime.execute(&workflow, high_inputs).await.unwrap();
    assert_eq!(results_high["high_path"]["category"].as_str(), Some("high"));

    // Test low path
    let mut low_inputs = ValueMap::new();
    low_inputs.insert("input.input_value".into(), 25.into());
    let results_low = runtime.execute(&workflow, low_inputs).await.unwrap();
    assert_eq!(results_low["low_path"]["category"].as_str(), Some("low"));

    // Test boundary
    let mut boundary_inputs = ValueMap::new();
    boundary_inputs.insert("input.input_value".into(), 50.into());
    let results_boundary = runtime.execute(&workflow, boundary_inputs).await.unwrap();
    assert_eq!(results_boundary["low_path"]["category"].as_str(), Some("low"));
}
```

### 8. Production Test Best Practices

```rust
// 1. Use helper functions for setup/teardown
fn production_config() -> serde_json::Value {
    serde_json::json!({
        "database_url": "sqlite::memory:",
        "api_timeout": 30,
        "retry_attempts": 3
    })
}

// 2. Test error scenarios
#[tokio::test]
async fn test_error_recovery() {
    // Test workflow error recovery.
    let registry = NodeRegistry::default();
    let mut builder = WorkflowBuilder::new();

    builder.add_node("ProcessorNode", "risky_op", serde_json::json!({
        "operation": "divide",
        "on_error": "fallback_zero"
    }));

    let workflow = builder.build(&registry).unwrap();
    let runtime = Runtime::new(registry);

    let mut inputs = ValueMap::new();
    inputs.insert("risky_op.divisor".into(), 0.into());
    let results = runtime.execute(&workflow, inputs).await.unwrap();

    assert_eq!(results["risky_op"]["error"].as_str(), Some("division_by_zero"));
}

// 3. Test performance
#[test]
fn test_workflow_performance() {
    // Test workflow execution performance.
    let start = std::time::Instant::now();

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let registry = NodeRegistry::default();
        let builder = create_complex_workflow();
        let workflow = builder.build(&registry).unwrap();
        let runtime = Runtime::new(registry);
        let _results = runtime.execute(&workflow, Default::default()).await.unwrap();
    });

    let execution_time = start.elapsed();
    assert!(execution_time.as_secs_f64() < 5.0, "Should complete in under 5 seconds");
}
```

## Critical Testing Rules

1. **Real infrastructure recommended in Tiers 2-3**: Use real infrastructure
2. **Test All Paths**: Ensure complete code coverage
3. **Real Data**: Use realistic test data
4. **Error Scenarios**: Test failures, not just successes
5. **Async Testing**: Use `#[tokio::test]` for async workflows
6. **Cleanup**: Always clean up test artifacts

## When to Engage

- User asks about "production testing", "quality assurance", "testing strategy"
- User needs testing guidance
- User wants to improve test coverage
- User has questions about test organization

## 9. Infrastructure Testing Patterns

Testing infrastructure stores (ConnectionManager, StoreFactory, task queues, idempotency) requires async setup, singleton cleanup, and transaction atomicity verification. All infrastructure tests run against real databases -- Real infrastructure recommended.

### Async Test Fixtures with Connection Pool

```rust
use sqlx::SqlitePool;

async fn setup_connection() -> SqlitePool {
    // Provide an initialized in-memory SQLite connection pool.
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();
    pool
}

async fn setup_connection_with_table() -> SqlitePool {
    // Connection pool with a pre-created test table.
    let pool = setup_connection().await;
    sqlx::query(
        "CREATE TABLE test_store (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active'
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    pool
}

#[tokio::test]
async fn test_insert_and_fetch() {
    // Test basic CRUD against real database.
    let pool = setup_connection_with_table().await;

    sqlx::query("INSERT INTO test_store (id, data) VALUES (?, ?)")
        .bind("record-1")
        .bind(r#"{"key": "value"}"#)
        .execute(&pool)
        .await
        .unwrap();

    let row: (String, String) = sqlx::query_as(
        "SELECT id, data FROM test_store WHERE id = ?"
    )
    .bind("record-1")
    .fetch_one(&pool)
    .await
    .unwrap();

    assert_eq!(row.1, r#"{"key": "value"}"#);
}
```

### StoreFactory Reset for Singleton Cleanup

The `StoreFactory` is a singleton. Tests MUST reset it between test cases to prevent state leakage:

```rust
use std::sync::Once;

// Each test gets its own StoreFactory to avoid state leakage.
// In Rust, use per-test setup rather than global singletons.

#[tokio::test]
async fn test_level0_returns_sqlite_event_store() {
    // StoreFactory with no URL returns Level 0 defaults.
    let factory = StoreFactory::new(None).await.unwrap();
    assert!(factory.is_level0());
    let event_store = factory.create_event_store().await.unwrap();
    assert_eq!(event_store.backend_name(), "SqliteEventStoreBackend");
}

#[tokio::test]
async fn test_level1_returns_db_event_store() {
    // StoreFactory with SQLite URL returns Level 1 DB backends.
    let factory = StoreFactory::new(Some("sqlite::memory:")).await.unwrap();
    assert!(!factory.is_level0());
    let event_store = factory.create_event_store().await.unwrap();
    assert_eq!(event_store.backend_name(), "DBEventStoreBackend");
}
```

### Transaction Atomicity Verification

Test that multi-statement operations are truly atomic:

```rust
#[tokio::test]
async fn test_transaction_rollback_on_error() {
    // Verify transaction rolls back ALL statements on failure.
    let pool = setup_connection().await;

    sqlx::query("CREATE TABLE atomic_test (id TEXT PRIMARY KEY, val INTEGER)")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO atomic_test VALUES (?, ?)")
        .bind("existing")
        .bind(1)
        .execute(&pool)
        .await
        .unwrap();

    // Attempt a transaction that fails partway through
    let tx_result = async {
        let mut tx = pool.begin().await?;
        sqlx::query("INSERT INTO atomic_test VALUES (?, ?)")
            .bind("new-row")
            .bind(2)
            .execute(&mut *tx)
            .await?;
        // This will fail (duplicate primary key)
        sqlx::query("INSERT INTO atomic_test VALUES (?, ?)")
            .bind("existing")
            .bind(3)
            .execute(&mut *tx)
            .await?;
        tx.commit().await
    }
    .await;

    assert!(tx_result.is_err());

    // Verify 'new-row' was NOT persisted (transaction rolled back)
    let row: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM atomic_test WHERE id = ?"
    )
    .bind("new-row")
    .fetch_optional(&pool)
    .await
    .unwrap();

    assert!(row.is_none(), "Transaction should have rolled back the first INSERT");
}

#[tokio::test]
async fn test_dequeue_atomicity() {
    // Verify task queue dequeue is atomic -- no double-processing.
    let pool = setup_connection().await;
    let queue = SQLTaskQueue::new(&pool).await.unwrap();

    // Enqueue one task
    let task_id = queue.enqueue(serde_json::json!({"job": "test"})).await.unwrap();

    // Dequeue it
    let task = queue.dequeue("worker-1").await.unwrap();
    assert!(task.is_some());
    assert_eq!(task.unwrap().task_id, task_id);

    // Second dequeue should return None (task already claimed)
    let task2 = queue.dequeue("worker-2").await.unwrap();
    assert!(task2.is_none(), "Task should not be dequeued twice");
}
```

### Infrastructure Red Team Checklist

When reviewing SQL infrastructure code, verify:

- [ ] All table/column names pass through `validate_identifier()`
- [ ] All multi-statement operations use transactions
- [ ] All SQL uses `?` canonical placeholders (no `$1` or `%s`)
- [ ] DDL uses `dialect.blob_type()` not hardcoded `BLOB`
- [ ] Upserts use `dialect.upsert()` not check-then-act
- [ ] In-memory stores have bounded size with LRU eviction
- [ ] No `AUTOINCREMENT` in shared DDL
- [ ] Database drivers imported lazily (feature-gated)
- [ ] `FOR UPDATE SKIP LOCKED` only used inside transactions
- [ ] StoreFactory singleton is reset in test setup

> For the full set of infrastructure SQL rules, see `.claude/rules/infrastructure-sql.md`.
> For the complete enterprise infrastructure skills, see `.claude/skills/15-enterprise-infrastructure/`.

## Integration with Other Skills

- Route to **testing-best-practices** for testing strategies
- Route to **test-organization** for Real infrastructure recommended policy
- Route to **regression-testing** for regression testing
- Route to **tdd-implementer** for test-first development
- Route to **infrastructure-specialist** for infrastructure store testing patterns
