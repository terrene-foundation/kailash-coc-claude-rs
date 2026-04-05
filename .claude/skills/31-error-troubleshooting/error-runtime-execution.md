---
name: error-runtime-execution
description: "Fix runtime execution errors in Kailash Rust workflows. Use when encountering 'RuntimeError', 'NodeFailed', 'workflow execution failed', 'execute() error', or execution-related failures."
---

# Error: Runtime Execution Failures

Fix common runtime execution errors including wrong runtime usage, node failures, timeout issues, and error handling patterns in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH`
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)

## RuntimeError Variants

The `RuntimeError` enum covers all execution-phase failures:

```rust
pub enum RuntimeError {
    BuildFailed { source: BuildError },    // Inline build failed
    NodeFailed { node_id: String, source: NodeError },  // A node returned an error
    Timeout { duration: Duration },        // Workflow exceeded time limit
    Cancelled,                             // Execution was cancelled
    Internal { message: String },          // Bug in the runtime
}
```

## Common Errors

### Error 1: Node Execution Failed

```rust
// RuntimeError::NodeFailed wraps the underlying NodeError
let result = runtime.execute(&workflow, inputs).await;
match result {
    Ok(exec_result) => println!("Success: {}", exec_result.run_id),
    Err(RuntimeError::NodeFailed { node_id, source }) => {
        eprintln!("Node '{node_id}' failed: {source}");
        // Match on the specific NodeError variant
        match source {
            NodeError::MissingInput { name } => {
                eprintln!("  -> Missing input: {name}");
            }
            NodeError::ExecutionFailed { message, .. } => {
                eprintln!("  -> Execution error: {message}");
            }
            _ => {}
        }
    }
    Err(e) => eprintln!("Other error: {e}"),
}
```

### Error 2: Workflow Timeout

```rust
use std::time::Duration;

// :x: Default timeout may be too short for long workflows
let config = RuntimeConfig::default();

// :white_check_mark: Configure an appropriate timeout
let config = RuntimeConfig {
    timeout: Some(Duration::from_secs(120)),  // 2 minutes
    max_concurrency: 8,
    ..RuntimeConfig::default()
};
let runtime = Runtime::new(config, registry);
```

### Error 3: Using execute_sync() in Async Context

```rust
// :x: WRONG - will panic or deadlock inside async context
async fn handler() {
    let result = runtime.execute_sync(&workflow, inputs);
    // PANIC: Cannot start a runtime from within a runtime
}

// :white_check_mark: CORRECT - use async execute() in async context
async fn handler() {
    let result = runtime.execute(&workflow, inputs).await?;
}
```

### Error 4: Forgetting to Propagate Errors

```rust
// :x: WRONG - ignoring the Result
let result = runtime.execute(&workflow, inputs).await;
// result is Result<ExecutionResult, RuntimeError> -- not handled!

// :white_check_mark: CORRECT - propagate with ? or handle explicitly
let result = runtime.execute(&workflow, inputs).await?;

// Or handle explicitly:
let result = match runtime.execute(&workflow, inputs).await {
    Ok(result) => result,
    Err(RuntimeError::NodeFailed { node_id, source }) => {
        return Err(AppError::WorkflowFailed(format!("Node {node_id}: {source}")));
    }
    Err(RuntimeError::Timeout { duration }) => {
        return Err(AppError::Timeout(duration));
    }
    Err(e) => {
        return Err(AppError::Internal(e.to_string()));
    }
};
```

## Runtime Selection Guide

| Context                  | Method                  | Signature                                                                               |
| ------------------------ | ----------------------- | --------------------------------------------------------------------------------------- |
| **Async (primary)**      | `execute()`             | `async fn execute(&self, &Workflow, ValueMap) -> Result<ExecutionResult, RuntimeError>` |
| **Sync (CLI/scripts)**   | `execute_sync()`        | `fn execute_sync(&self, &Workflow, ValueMap) -> Result<ExecutionResult, RuntimeError>`  |
| **With event streaming** | `execute_with_events()` | Returns result + `mpsc::Receiver<ExecutionEvent>`                                       |

## Complete Examples

### Async Execution (Primary Pattern)

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::error::RuntimeError;
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut builder = WorkflowBuilder::new();
    builder.add_node("JSONTransformNode", "transform", ValueMap::from([
        ("expression".into(), Value::String("@.name".into())),
    ]));

    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute(&workflow, ValueMap::from([
        ("name".into(), Value::String("Alice".into())),
    ])).await?;

    println!("Run ID: {}", result.run_id);
    for (node_id, outputs) in &result.results {
        println!("{node_id}: {outputs:?}");
    }

    Ok(())
}
```

### Sync Execution (CLI Pattern)

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut builder = WorkflowBuilder::new();
    builder.add_node("JSONTransformNode", "transform", ValueMap::from([
        ("expression".into(), Value::String("@.name".into())),
    ]));

    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    // execute_sync creates a tokio runtime internally
    let result = runtime.execute_sync(&workflow, ValueMap::from([
        ("name".into(), Value::String("Alice".into())),
    ]))?;

    println!("Completed: {}", result.run_id);
    Ok(())
}
```

### Error Handling with Source Chain

```rust
use std::error::Error;

let result = runtime.execute(&workflow, inputs).await;

if let Err(ref e) = result {
    // Walk the error source chain for full context
    eprintln!("Error: {e}");
    let mut source = e.source();
    while let Some(cause) = source {
        eprintln!("  Caused by: {cause}");
        source = cause.source();
    }
}
```

## ExecutionResult Structure

On success, `execute()` returns `ExecutionResult`:

```rust
pub struct ExecutionResult {
    /// Per-node output maps keyed by node ID
    pub results: HashMap<String, ValueMap>,
    /// Unique run ID for this execution
    pub run_id: String,
    /// Execution metadata (timing, counts)
    pub metadata: ExecutionMetadata,
}
```

Access individual node outputs:

```rust
let result = runtime.execute(&workflow, inputs).await?;

// Get a specific node's outputs
if let Some(transform_output) = result.results.get("transform") {
    if let Some(Value::String(name)) = transform_output.get("result") {
        println!("Transformed name: {name}");
    }
}
```

## Related Patterns

- **Error types**: See `crates/kailash-core/src/error.rs` for `RuntimeError`, `NodeError`, `BuildError`
- **Runtime**: See `crates/kailash-core/src/runtime.rs` for `execute()`, `execute_sync()`, `RuntimeConfig`
- **Events**: See `crates/kailash-core/src/events.rs` for `ExecutionEvent` streaming
- **Parameter errors**: [`error-parameter-validation`](error-parameter-validation.md)
- **Nexus blocking**: [`error-nexus-blocking`](error-nexus-blocking.md)

## Quick Tips

- :bulb: **Always handle errors**: Use `?` or explicit `match` on the `Result` -- never ignore it
- :bulb: **Async in async**: Use `execute()` inside async functions, `execute_sync()` only in sync contexts
- :bulb: **Error source chain**: Use `.source()` to walk the chain for full diagnostic context
- :bulb: **Timeout config**: Set `RuntimeConfig::timeout` appropriate to your workload
- :bulb: **Node ID in errors**: `RuntimeError::NodeFailed` tells you exactly which node broke

<!-- Trigger Keywords: RuntimeError, NodeFailed, execute() failed, runtime error, workflow execution error, execution failed, runtime.execute error, execution failure, runtime issue, Timeout, Cancelled -->
