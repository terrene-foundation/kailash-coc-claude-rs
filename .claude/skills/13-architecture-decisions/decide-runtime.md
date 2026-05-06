---
name: decide-runtime
description: "Understand the unified Kailash Runtime with async execute() and sync execute_sync() methods. Use when asking 'which runtime', 'async vs sync', 'runtime choice', 'sync vs async', 'runtime selection', or 'choose runtime'."
---

# Decision: Runtime Selection

Guide for choosing between async and sync execution with the unified Kailash Runtime.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Choosing async vs sync execution
- **Category**: cross-cutting
- **Priority**: HIGH
- **Trigger Keywords**: which runtime, async vs sync, runtime choice, sync vs async, runtime selection

## Unified Runtime

Kailash Rust has a **single unified `Runtime`** -- there is no `LocalRuntime` vs `AsyncLocalRuntime` split. The same `Runtime` instance provides both async and sync execution.

### Async Execution (Primary)

Use in tokio async contexts: axum handlers, async main, integration tests.

```rust
use kailash_core::{Runtime, RuntimeConfig, NodeRegistry, WorkflowBuilder};
use kailash_core::value::ValueMap;
use std::sync::Arc;

let registry = Arc::new(NodeRegistry::default());
let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());

let mut builder = WorkflowBuilder::new();
builder.add_node("LLMNode", "llm", ValueMap::new());
let workflow = builder.build(&registry)?;

// Async execution -- level-based parallelism via tokio::spawn
let result = runtime.execute(&workflow, ValueMap::new()).await?;
println!("Run ID: {}", result.run_id);
```

### Sync Execution (CLI/Scripts)

Use when no tokio runtime exists or in synchronous contexts.

```rust
use kailash_core::{Runtime, RuntimeConfig, NodeRegistry, WorkflowBuilder};
use kailash_core::value::ValueMap;
use std::sync::Arc;

let registry = Arc::new(NodeRegistry::default());
let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());

let mut builder = WorkflowBuilder::new();
builder.add_node("FileReaderNode", "reader", ValueMap::from([
    ("file_path".into(), kailash_core::value::Value::String("data.txt".into())),
]));
let workflow = builder.build(&registry)?;

// Sync execution -- creates tokio runtime internally if needed
let result = runtime.execute_sync(&workflow, ValueMap::new())?;
println!("Run ID: {}", result.run_id);
```

## Comparison Table

| Feature             | `execute()`                                 | `execute_sync()`                           |
| ------------------- | ------------------------------------------- | ------------------------------------------ |
| **Execution Model** | Async (tokio)                               | Sync (blocks current thread)               |
| **Best For**        | axum handlers, async main, APIs             | CLI tools, scripts, simple tests           |
| **Performance**     | Level-based parallelism                     | Sequential execution                       |
| **Context**         | Requires tokio runtime                      | Creates runtime internally if needed       |
| **Return Type**     | `Result<ExecutionResult, RuntimeError>`     | `Result<ExecutionResult, RuntimeError>`    |
| **Method**          | `runtime.execute(&workflow, inputs).await?` | `runtime.execute_sync(&workflow, inputs)?` |

## RuntimeConfig

Both execution methods share the same configuration:

```rust
use kailash_core::RuntimeConfig;

let config = RuntimeConfig {
    debug: true,
    max_concurrent_nodes: 20,
    ..RuntimeConfig::default()
};

let runtime = Runtime::new(config, registry);

// Same runtime, choose execution style per call site
let result_async = runtime.execute(&workflow, inputs.clone()).await?;
let result_sync = runtime.execute_sync(&workflow, inputs)?;
```

## ExecutionResult

Both methods return the same result type:

```rust
pub struct ExecutionResult {
    pub results: HashMap<String, ValueMap>,  // node_id -> outputs
    pub run_id: String,
    pub metadata: ExecutionMetadata,
}

// Access node results
let node_output = result.results.get("my_node")
    .and_then(|m| m.get("result"))
    .ok_or_else(|| anyhow::anyhow!("missing output"))?;
```

## Level-Based Parallelism (Async)

The async `execute()` method uses level-based parallelism -- independent nodes at the same dependency level run concurrently via `tokio::spawn`:

```
Example workflow DAG:
  A (no deps) --+
  B (no deps) --+--> D (deps: A, B, C) --> F (deps: D, E)
  C (no deps) --+                    +--> E (deps: C)

Execution levels:
  Level 0: [A, B, C]  -> Execute concurrently
  Level 1: [D, E]     -> Execute concurrently
  Level 2: [F]        -> Execute alone
```

## Common Patterns

### Pattern 1: CLI Tool

```rust
use kailash_core::{Runtime, RuntimeConfig, NodeRegistry, WorkflowBuilder};
use kailash_core::value::ValueMap;
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    let registry = Arc::new(NodeRegistry::default());
    let runtime = Runtime::new(RuntimeConfig { debug: true, ..Default::default() }, registry.clone());

    let mut builder = WorkflowBuilder::new();
    // ... add nodes ...
    let workflow = builder.build(&registry)?;

    let result = runtime.execute_sync(&workflow, ValueMap::new())?;
    println!("Workflow {} completed", result.run_id);
    Ok(())
}
```

### Pattern 2: Axum Handler

```rust
use kailash_core::{Runtime, RuntimeConfig, NodeRegistry, WorkflowBuilder};
use kailash_core::value::ValueMap;
use axum::{Json, extract::State};
use std::sync::Arc;

async fn execute_workflow(
    State(runtime): State<Arc<Runtime>>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let registry = Arc::new(NodeRegistry::default());
    let mut builder = WorkflowBuilder::new();
    // ... add nodes ...
    let workflow = builder.build(&registry)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let result = runtime.execute(&workflow, ValueMap::new()).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "run_id": result.run_id })))
}
```

### Pattern 3: Test

```rust
#[tokio::test]
async fn test_workflow_execution() {
    let registry = Arc::new(NodeRegistry::default());
    let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());

    let mut builder = WorkflowBuilder::new();
    builder.add_node("NoOpNode", "noop", ValueMap::new());
    let workflow = builder.build(&registry).expect("build should succeed");

    let result = runtime.execute(&workflow, ValueMap::new()).await
        .expect("execution should succeed");

    assert!(!result.run_id.is_empty());
    assert!(result.results.contains_key("noop"));
}
```

## Key Differences from Python SDK

| Aspect            | Python SDK                                                | Rust SDK                                                       |
| ----------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| **Runtime types** | `LocalRuntime` + `AsyncLocalRuntime`                      | Single unified `Runtime`                                       |
| **Async method**  | `await runtime.execute_workflow_async(wf, inputs={})`     | `runtime.execute(&wf, inputs).await?`                          |
| **Sync method**   | `runtime.execute(wf.build())` returns `(results, run_id)` | `runtime.execute_sync(&wf, inputs)?` returns `ExecutionResult` |
| **Return type**   | Tuple `(results, run_id)`                                 | `ExecutionResult` struct                                       |
| **Config**        | Constructor kwargs                                        | `RuntimeConfig` struct                                         |
| **Parallelism**   | ThreadPoolExecutor / asyncio                              | tokio::spawn + level-based DAG                                 |

## Related Patterns

- **For workflow building**: See CLAUDE.md -- Essential Patterns section
- **For RuntimeConfig options**: See `crates/kailash-core/src/runtime/`
- **For node execution**: See `.claude/skills/01-core/`

## Documentation References

### Primary Sources

- [`CLAUDE.md`](../../../../CLAUDE.md) -- Runtime section under kailash-core
- `crates/kailash-core/src/runtime/` -- Runtime implementation

## Quick Tips

- There is ONE Runtime type -- choose `execute()` or `execute_sync()` per call site
- Prefer `execute()` (async) for production -- better concurrency via tokio
- Use `execute_sync()` for CLI tools and scripts where async is unnecessary
- RuntimeConfig is shared between both execution methods
- `execute_sync()` creates a tokio runtime internally if none exists

<!-- Trigger Keywords: which runtime, async vs sync, runtime choice, sync vs async, runtime selection, execute vs execute_sync -->
