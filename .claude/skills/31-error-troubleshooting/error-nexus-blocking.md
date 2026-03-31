---
name: error-nexus-blocking
description: "Fix Nexus blocking, slow startup, and async runtime issues with axum/tower integration. Use when encountering 'Nexus blocking', 'Nexus slow startup', 'Nexus hangs', 'axum handler blocking', or startup delays."
---

# Error: Nexus Blocking / Slow Startup

Fix Nexus (axum + tower) blocking issues including handler blocking, slow startup with DataFlow integration, and async runtime conflicts in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH` (Critical integration issue)
> Related Skills: [`nexus-quickstart`](../../03-nexus/nexus-quickstart.md), [`dataflow-quickstart`](../../02-dataflow/dataflow-quickstart.md)

## The Problem

**Symptoms**:

- Nexus server hangs or blocks on startup
- axum handlers never respond (request times out)
- Slow startup when registering DataFlow models
- `tokio` runtime panics (nested runtime creation)

**Root Causes**:

1. **Blocking in async context**: Calling `execute_sync()` inside an async axum handler
2. **Nested tokio runtime**: Creating a new tokio runtime inside an existing one
3. **DataFlow initialization blocking**: Synchronous database operations during async startup

## Quick Fix

### :x: WRONG: Blocking Call in Async Handler

```rust
use axum::{Json, extract::State};
use kailash_core::{Runtime, Workflow};
use kailash_value::ValueMap;

async fn handle_request(
    State(runtime): State<Runtime>,
    State(workflow): State<Workflow>,
) -> Json<serde_json::Value> {
    // WRONG: execute_sync() creates a new tokio runtime internally
    // Inside an async handler, this will PANIC or DEADLOCK
    let result = runtime.execute_sync(&workflow, ValueMap::new());
    //                   ^^^^^^^^^^^^ BLOCKS the async runtime!

    Json(serde_json::json!({"status": "ok"}))
}
```

### :white_check_mark: FIX: Use Async execute() in Async Handlers

```rust
use axum::{Json, extract::State};
use kailash_core::{Runtime, Workflow};
use kailash_value::ValueMap;
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    runtime: Arc<Runtime>,
    workflow: Arc<Workflow>,
}

async fn handle_request(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    // CORRECT: Use async execute() -- works with the existing tokio runtime
    let result = state.runtime
        .execute(&state.workflow, ValueMap::new())
        .await
        .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "run_id": result.run_id,
        "status": "completed"
    })))
}
```

### :x: WRONG: Blocking DataFlow Init in Async Context

```rust
// This will block if called inside an async main or axum startup
fn setup_dataflow() -> DataFlowConnection {
    // Synchronous database connection inside async context -- BLOCKS
    DataFlowConnection::connect_sync("postgres://user:pass@localhost/db")
}
```

### :white_check_mark: FIX: Use Async Initialization

```rust
async fn setup_dataflow() -> DataFlowConnection {
    // Use async connection inside async context
    DataFlowConnection::connect("postgres://user:pass@localhost/db")
        .await
        .expect("DATABASE_URL must be valid")
}
```

## Why This Happens

1. **`execute_sync()`** creates a new tokio runtime internally via `tokio::runtime::Runtime::new()`
2. tokio does **not** allow nested runtimes -- calling `Runtime::new()` inside an existing runtime panics
3. Even if it did not panic, synchronous blocking inside an async task starves the executor of worker threads
4. axum handlers run on the tokio runtime -- all code in handlers must be async or use `tokio::task::spawn_blocking()`

## When to Use execute() vs execute_sync()

| Context                       | Method                                | Why                     |
| ----------------------------- | ------------------------------------- | ----------------------- |
| **axum/Nexus handlers**       | `runtime.execute(&wf, inputs).await?` | Already inside tokio    |
| **CLI tools**                 | `runtime.execute_sync(&wf, inputs)?`  | No tokio runtime exists |
| **#[tokio::main]**            | `runtime.execute(&wf, inputs).await?` | Already inside tokio    |
| **Tests with #[tokio::test]** | `runtime.execute(&wf, inputs).await?` | Already inside tokio    |
| **Blocking thread**           | `runtime.execute_sync(&wf, inputs)?`  | Inside `spawn_blocking` |

## Complete Nexus Example (axum)

```rust
use axum::{Router, Json, extract::State, routing::post};
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    runtime: Arc<Runtime>,
    workflow: Arc<kailash_core::Workflow>,
}

async fn execute_workflow(
    State(state): State<AppState>,
    Json(payload): Json<serde_json::Value>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    let inputs = ValueMap::from([
        ("data".into(), Value::from(payload)),
    ]);

    let result = state.runtime
        .execute(&state.workflow, inputs)
        .await
        .map_err(|e| {
            eprintln!("Workflow execution failed: {e}");
            axum::http::StatusCode::INTERNAL_SERVER_ERROR
        })?;

    Ok(Json(serde_json::json!({
        "run_id": result.run_id,
        "results": format!("{:?}", result.results),
    })))
}

#[tokio::main]
async fn main() {
    let registry = Arc::new(NodeRegistry::default());

    let mut builder = WorkflowBuilder::new();
    builder.add_node("JSONTransformNode", "transform", ValueMap::from([
        ("expression".into(), Value::String("@".into())),
    ]));

    let workflow = Arc::new(
        builder.build(&registry)
            .expect("workflow build must succeed")
    );

    let runtime = Arc::new(
        Runtime::new(RuntimeConfig::default(), registry)
    );

    let state = AppState { runtime, workflow };

    let app = Router::new()
        .route("/execute", post(execute_workflow))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .expect("failed to bind");

    println!("Nexus listening on :3000");
    axum::serve(listener, app).await.expect("server failed");
}
```

## If You Must Run Blocking Code in a Handler

Use `tokio::task::spawn_blocking()` to move blocking work off the async runtime:

```rust
async fn handle_blocking_work(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    let runtime = state.runtime.clone();
    let workflow = state.workflow.clone();

    // Move blocking work to a dedicated thread pool
    let result = tokio::task::spawn_blocking(move || {
        runtime.execute_sync(&workflow, ValueMap::new())
    })
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({"run_id": result.run_id})))
}
```

## Related Patterns

- **Nexus framework**: See `crates/kailash-nexus/` for handler patterns and middleware
- **Runtime**: See `crates/kailash-core/src/runtime.rs` for `execute()` vs `execute_sync()`
- **DataFlow integration**: See `crates/kailash-dataflow/` for async database patterns
- **axum docs**: [axum.rs](https://docs.rs/axum/latest/) for handler patterns

## Quick Tips

- :bulb: **Never `execute_sync()` in async**: Use `.execute().await` inside any async context
- :bulb: **Check your context**: If you are inside `#[tokio::main]`, `async fn`, or axum handler, use async
- :bulb: **spawn_blocking escape hatch**: For truly blocking operations, use `tokio::task::spawn_blocking()`
- :bulb: **Arc for sharing**: Wrap `Runtime` and `Workflow` in `Arc` for axum `State`
- :bulb: **DataFlow async**: Use async connection methods during server startup

<!-- Trigger Keywords: Nexus blocking, Nexus slow startup, Nexus hangs, axum handler blocking, execute_sync in async, nested runtime, startup delay, tokio panic, blocking in async, spawn_blocking -->
