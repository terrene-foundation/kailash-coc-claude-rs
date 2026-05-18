# Runtime Execution

RuntimeConfig, execute/execute_sync, result access, resource lifecycle, and production modules.

## Runtime Creation and Execution

```rust
use kailash_core::{Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::ValueMap;
use std::sync::Arc;

let runtime = Runtime::new(RuntimeConfig::default(), Arc::new(registry));
let result = runtime.execute(&workflow, inputs).await?;   // async (preferred)
let result = runtime.execute_sync(&workflow, inputs)?;     // sync (CLI/scripts/tests)
```

## RuntimeConfig

```rust
let config = RuntimeConfig {
    debug: false,                                        // verbose node logging
    enable_cycles: false,                                // default: DAG only
    conditional_execution: ConditionalMode::SkipBranches,// or EvaluateAll
    connection_validation: ValidationMode::Strict,       // or Warn, Off
    enable_monitoring: false,
    enable_resource_limits: false,
    max_concurrent_nodes: 16,                            // semaphore-controlled
    enable_security: false,
    enable_audit: false,
    node_timeout: None,
    workflow_timeout: None,
    max_workflow_duration: Some(Duration::from_secs(300)),
    max_nodes_per_workflow: Some(100),
    max_concurrent_workflows: Some(10),
    redact_dlq_inputs: true,
    ..RuntimeConfig::default()
};
```

## ExecutionResult and Access

```rust
pub struct ExecutionResult {
    pub run_id: String,
    pub results: HashMap<String, ValueMap>,  // node_id -> outputs
    pub metadata: ExecutionMetadata,
}

let result = runtime.execute(&workflow, inputs).await?;
let output = result.results.get("final_node")
    .ok_or("node 'final_node' not in results")?;
let text = result.results.get("text_node")
    .and_then(|o| o.get("text"))
    .and_then(|v| v.as_str())
    .unwrap_or("default");
```

## Execution Model

```
DAG:  A -> B -> D       Level 0: [A]  ->  Level 1: [B, C] parallel  ->  Level 2: [D]
      A -> C -> D
```

Levels pre-computed at `builder.build()`. Same-level nodes run concurrently via `tokio::spawn` + semaphore.

## Passing Inputs

```rust
let mut inputs = ValueMap::new();
inputs.insert(Arc::from("text"), Value::String(Arc::from("hello world")));
inputs.insert(Arc::from("count"), Value::Integer(10));
inputs.insert(Arc::from("enabled"), Value::Bool(true));
```

## Concurrent Executions

```rust
let runtime = Arc::new(Runtime::new(RuntimeConfig::default(), registry));
let workflow = Arc::new(builder.build(&registry)?);
let handles: Vec<_> = (0..10).map(|i| {
    let (rt, wf) = (Arc::clone(&runtime), Arc::clone(&workflow));
    tokio::spawn(async move {
        let mut inputs = ValueMap::new();
        inputs.insert(Arc::from("id"), Value::Integer(i));
        rt.execute(&wf, inputs).await
    })
}).collect();
```

## Resource Lifecycle (Three-Layer Model)

1. **Access** -- `PoolRegistry` (`parking_lot::RwLock`, `OnceLock` singleton)
2. **Ownership** -- DataFlow/nodes own pools with explicit `close()`
3. **Lifecycle** -- `ResourceRegistry` (`tokio::sync::RwLock`) -- LIFO shutdown

```rust
let displaced = resources.register("my_pool", pool_resource).await?;
if let Some(old) = displaced { old.close().await; }
runtime.shutdown().await;  // LIFO, 30s per-resource timeout
```

Always call `shutdown()` before dropping. `Drop` warns via `tracing::warn!` if resources remain. Close-before-remove: `pool.close().await` then `pool_registry.remove(key)`.

Capacity: ResourceRegistry 256, PoolRegistry 64 (configurable via `::with_capacity(n)`). New key over capacity errors; replacing existing key is free.

Never expose raw sqlx errors in `NodeError::ExecutionFailed.message` -- generic messages only, raw at `tracing::debug`.

## Extensions (Type-Safe Injection)

```rust
runtime.set_extension(my_pool_registry);              // T: Any + Send + Sync
let reg = ctx.extension::<PoolRegistry>();            // Option<&T>
let reg = ctx.extension_arc::<PoolRegistry>();        // Option<Arc<T>>
ctx.insert_extension(my_value);                       // direct insert (tests)
```

## Durability (Checkpoint/Resume)

```rust
use kailash_core::durability::{CheckpointPolicy, InMemoryCheckpointStore};
let config = RuntimeConfig { checkpoint_policy: CheckpointPolicy::PerLevel, ..Default::default() };
runtime.set_checkpoint_store(Arc::new(InMemoryCheckpointStore::new()));
// SQLite: SqliteCheckpointStore::open("ck.db")? (feature: durability-sqlite, WAL mode)
// Trait: save, load, load_latest, list_incomplete, delete, gc
```

**Shadow store**: `ShadowCheckpointStore::new(prod, candidate)` -- writes both, reads prod. `divergence_rate()` evaluates candidate. `promote()` returns candidate.

## Dead Letter Queue

```rust
use kailash_core::dlq::InMemoryDlq;
let dlq = Arc::new(InMemoryDlq::new(1000));
runtime.set_dlq(dlq.clone());
dlq.peek(10).await?;  dlq.pop().await?;  dlq.remove("id").await?;
// Entry: run_id, workflow_hash, error, inputs, partial_results, retry_count
```

## Metrics (Prometheus)

```rust
let metrics = runtime.metrics();
// Auto-updated: workflows_started/completed/failed, nodes_executed/failed, total_execution_us
let text = metrics.to_prometheus();  // standard text exposition
```

## Execution Store (History)

```rust
use kailash_core::execution_store::{InMemoryExecutionStore, ExecutionQuery, ExecutionStatus};
let store = Arc::new(InMemoryExecutionStore::new());
runtime.set_execution_store(store.clone());
// Records written automatically. Query:
store.list_recent(20).await?;
store.search(&ExecutionQuery { status: Some(ExecutionStatus::Failed), ..Default::default() }).await?;
```

## RunHandle (Pause/Resume/Signal/Cancel)

```rust
let (join, handle) = runtime.execute_with_handle(&workflow, inputs).await?;
handle.pause();  handle.resume();  handle.signal(Value::Null);  handle.cancel();
handle.is_paused();  handle.is_cancelled();  handle.run_id();
// By run ID: runtime.pause/resume_run/signal/cancel("run-id")
```

## Drain (Graceful Shutdown)

```rust
let result: DrainResult = runtime.drain(Duration::from_secs(30)).await;
// result.drained (completed) / result.cancelled (timed out)
```

## Scheduler (Cron)

```rust
use kailash_core::scheduler::{Scheduler, WorkflowSchedule};
scheduler.add(WorkflowSchedule {
    schedule_id: "daily".into(), cron_expr: "0 0 9 * * *".into(), // 6-field cron
    workflow_hash: "abc123".into(), inputs: ValueMap::new(), enabled: true,
});
scheduler.start(runtime);  // background tokio task
```

## Task Queue (Multi-Worker)

```rust
use kailash_core::task_queue::{InProcessTaskQueue, WorkflowTask};
let queue = InProcessTaskQueue::new(100);
queue.submit(WorkflowTask {
    task_id: "t1".into(), workflow_hash: "abc".into(),
    inputs: ValueMap::new(), priority: 0, metadata: HashMap::new(),
}).await?;
queue.claim("worker-1").await?;  queue.complete("t1").await?;  queue.fail("t1", "err").await?;
```

## Versioning

```rust
use kailash_core::versioning::VersionedWorkflowRegistry;
let mut reg = VersionedWorkflowRegistry::new();
reg.register("wf", "1.0.0", def1);  reg.register("wf", "2.0.0", def2);
reg.latest("wf");  reg.list_versions("wf");
// VersionMigration trait for checkpoint upgrades between versions
```

## Time Utilities

```rust
use kailash_core::time_util::{now_iso8601, epoch_days_to_ymd};
now_iso8601();  // "2026-03-17T10:30:00Z"
epoch_days_to_ymd(20530);  // Howard Hinnant's algorithm
```

## Key Files

All under `crates/kailash-core/src/`: `runtime.rs`, `durability.rs`, `shadow_checkpoint.rs`, `trust_durability.rs`, `dlq.rs`, `metrics.rs`, `execution_store.rs`, `scheduler.rs`, `task_queue.rs`, `versioning.rs`, `time_util.rs`.

## Testing

```rust
#[tokio::test]
async fn test_workflow_output() {
    let mut registry = NodeRegistry::new();
    register_system_nodes(&mut registry);
    register_transform_nodes(&mut registry);
    let registry = Arc::new(registry);

    let mut builder = WorkflowBuilder::new();
    builder.add_node("TextTransformNode", "upper", {
        let mut c = ValueMap::new();
        c.insert(Arc::from("operation"), Value::String(Arc::from("uppercase")));
        c
    });
    let workflow = builder.build(&registry).expect("should build");
    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let mut inputs = ValueMap::new();
    inputs.insert(Arc::from("text"), Value::String(Arc::from("hello")));
    let result = runtime.execute(&workflow, inputs).await.expect("should execute");
    assert_eq!(result.results["upper"].get("result").and_then(|v| v.as_str()), Some("HELLO"));
}
```

## Verify

```bash
cargo test -p kailash-core -- runtime --nocapture
```
