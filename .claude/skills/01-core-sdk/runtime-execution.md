# Runtime Execution Skill

Configuration and execution patterns for the Kailash Runtime.

## Usage

`/runtime-execution` -- Reference for RuntimeConfig, execute() vs execute_sync(), and reading results

## The Runtime

```rust
use kailash_core::{Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::ValueMap;
use std::sync::Arc;

// Runtime is created once and reused across workflow executions
let runtime = Runtime::new(RuntimeConfig::default(), Arc::new(registry));

// Async execution (preferred for services)
let result = runtime.execute(&workflow, inputs).await?;

// Sync execution (for CLI, scripts, tests without async context)
let result = runtime.execute_sync(&workflow, inputs)?;
```

## RuntimeConfig

```rust
use kailash_core::RuntimeConfig;

let config = RuntimeConfig {
    // Enable debug logging for node execution (very verbose)
    debug: false,

    // Allow workflows with cycles (default: false, DAG only)
    enable_cycles: false,

    // What to do when a conditional branch is not taken
    // SkipBranches: skip nodes on unmet branches (default)
    // EvaluateAll: evaluate all branches regardless of condition
    conditional_execution: ConditionalMode::SkipBranches,

    // Connection validation strictness at execution time
    // Strict: fail on any connection issues (default)
    // Warn: log warnings but continue
    // Off: skip validation
    connection_validation: ValidationMode::Strict,

    // Enable runtime monitoring/metrics collection
    enable_monitoring: false,

    // Enable resource limit enforcement
    enable_resource_limits: false,

    // Maximum nodes executing concurrently (semaphore-controlled)
    // Level-based parallelism: nodes in the same DAG level run in parallel
    max_concurrent_nodes: 16,

    // Enable security checks during execution
    enable_security: false,

    // Enable audit logging during execution
    enable_audit: false,

    // Per-node execution timeout (None = no timeout)
    node_timeout: None,

    // Total workflow execution timeout (None = no timeout)
    workflow_timeout: None,
};

let runtime = Runtime::new(config, registry);
```

## ExecutionResult

```rust
pub struct ExecutionResult {
    /// Unique identifier for this execution run
    pub run_id: String,

    /// Per-node output maps: node_id -> output ValueMap
    pub results: HashMap<String, ValueMap>,

    /// Execution metadata (timing, node counts, etc.)
    pub metadata: ExecutionMetadata,
}
```

## Accessing Results

```rust
let result = runtime.execute(&workflow, inputs).await?;

// Check the unique run ID
println!("Run: {}", result.run_id);

// Access output from a specific node by ID
let node_output = result.results.get("my_transform_node");
if let Some(outputs) = node_output {
    // Access a specific output field
    if let Some(value) = outputs.get("result") {
        println!("Result: {:?}", value);
    }
}

// Pattern: get or error
let output = result.results
    .get("final_node")
    .ok_or("node 'final_node' not in results")?;

// Pattern: get string value
let text = result.results
    .get("text_node")
    .and_then(|o| o.get("text"))
    .and_then(|v| v.as_str())
    .unwrap_or("default");

// Iterate all node results
for (node_id, outputs) in &result.results {
    println!("Node '{}': {} outputs", node_id, outputs.len());
    for (key, val) in outputs {
        println!("  {}: {:?}", key, val);
    }
}
```

## Execution Model (Level-Based Parallelism)

```
Workflow DAG:
  A → B → D
  A → C → D

Level 0: [A]        -- runs first (no dependencies)
Level 1: [B, C]     -- runs in parallel (both depend only on A)
Level 2: [D]        -- runs last (depends on B and C)
```

The Runtime pre-computes execution levels at `builder.build()` time and uses `tokio::spawn` + a semaphore to run nodes at the same level concurrently.

## Passing Inputs to Workflows

```rust
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

// Build input ValueMap
let mut inputs = ValueMap::new();
inputs.insert(Arc::from("text"), Value::String(Arc::from("hello world")));
inputs.insert(Arc::from("count"), Value::Integer(10));
inputs.insert(Arc::from("enabled"), Value::Bool(true));
inputs.insert(Arc::from("config"), Value::Object({
    let mut m = std::collections::BTreeMap::new();
    m.insert(Arc::from("timeout"), Value::Integer(30));
    m
}));

// Pass to execute
let result = runtime.execute(&workflow, inputs).await?;
```

## Common Patterns

### Re-using Runtime for Multiple Executions

```rust
// Create once, execute many times
let runtime = Arc::new(Runtime::new(RuntimeConfig::default(), registry));
let workflow = Arc::new(builder.build(&registry)?);

// Multiple concurrent executions (each with different inputs)
let handles: Vec<_> = (0..10).map(|i| {
    let runtime = Arc::clone(&runtime);
    let workflow = Arc::clone(&workflow);
    tokio::spawn(async move {
        let mut inputs = ValueMap::new();
        inputs.insert(Arc::from("id"), Value::Integer(i));
        runtime.execute(&workflow, inputs).await
    })
}).collect();

for handle in handles {
    let result = handle.await??;
    println!("Run ID: {}", result.run_id);
}
```

### Debug Mode for Development

```rust
let config = RuntimeConfig {
    debug: true,  // Logs each node before and after execution
    ..RuntimeConfig::default()
};
let runtime = Runtime::new(config, registry);
```

### Strict Connection Validation

```rust
// Default is Strict -- always prefer this in production
let config = RuntimeConfig {
    connection_validation: ValidationMode::Strict,
    ..RuntimeConfig::default()
};
```

### High-Concurrency Configuration

```rust
let config = RuntimeConfig {
    max_concurrent_nodes: 32,  // Allow more parallel node execution
    enable_resource_limits: true,
    ..RuntimeConfig::default()
};
```

## Resource Lifecycle (Three-Layer Model)

The Runtime manages resources through a three-layer model:

1. **Access layer** — `PoolRegistry` (`parking_lot::RwLock`, global singleton via `OnceLock`) — fast key-based pool lookup
2. **Ownership layer** — DataFlow/nodes own pools with explicit `close()`
3. **Lifecycle layer** — `ResourceRegistry` (`tokio::sync::RwLock`) — LIFO shutdown via `Runtime::shutdown()`

### Registering Resources

```rust
use kailash_core::resource::{Resource, ResourceRegistry};

// Resources are registered during node execution (e.g., DatabaseConnectionNode)
// Access the registry from Runtime:
let resources = runtime.resources();

// Register a resource (returns displaced resource if key already exists)
let displaced = resources.register("my_pool", pool_resource).await?;
if let Some(old) = displaced {
    old.close().await; // Caller responsible for closing displaced resources
}
```

### Shutdown

```rust
// Orderly shutdown: closes all resources in LIFO order with 30s per-resource timeout
runtime.shutdown().await;
// After shutdown, the ResourceRegistry is empty
```

**Critical**: Always call `shutdown()` before dropping a Runtime that has registered resources. The `Drop` impl will warn (via `tracing::warn!`) if resources remain when the Runtime is dropped without shutdown.

### Extensions (Type-Safe Injection)

```rust
// Runtime-level: inject typed data accessible by all nodes
let mut runtime = Runtime::new(config, registry);
runtime.set_extension(my_pool_registry);  // T: Any + Send + Sync

// Node-level: retrieve typed extension from ExecutionContext
let registry = ctx.extension::<PoolRegistry>();          // Option<&PoolRegistry>
let registry = ctx.extension_arc::<PoolRegistry>();      // Option<Arc<PoolRegistry>>

// Direct insertion on ExecutionContext (for tests or downstream crates)
let mut ctx = ExecutionContext::new("run", "node");
ctx.insert_extension(my_value);  // pub method, replaces existing of same type
```

### Capacity Limits

Both registries have configurable capacity limits:

- `ResourceRegistry`: default 256 entries, configurable via `ResourceRegistry::with_capacity(n)`
- `PoolRegistry`: default 64 pools, configurable via `PoolRegistry::with_capacity(n)`

Exceeding capacity with a **new** key returns an error. **Replacing** an existing key never counts against the limit.

### Close-Before-Remove Ordering

When cleaning up pools, always close the pool **before** removing it from the registry:

```rust
// CORRECT: close cooperatively drains connections, then remove the entry
if let Some(pool) = pool_registry.get(key) {
    pool.close().await;       // Cooperative drain
    pool_registry.remove(key); // Then remove entry
}

// WRONG: remove first leaves connections dangling
pool_registry.remove(key);  // Entry gone but connections still active
```

### Credential Sanitization

Database connection errors MUST NOT include raw sqlx errors in the user-facing `NodeError::ExecutionFailed.message` — use generic messages and log raw errors at `tracing::debug` only. See `crates/kailash-nodes/src/sql/database_connection.rs` for the pattern.

## Production-Readiness Modules

### Durability (Checkpoint and Resume)

```rust
use kailash_core::durability::{
    CheckpointPolicy, CheckpointStore, InMemoryCheckpointStore, WorkflowCheckpoint,
};

// Configure checkpoint policy in RuntimeConfig
let config = RuntimeConfig {
    checkpoint_policy: CheckpointPolicy::PerLevel,  // or PerNode, or Never (default)
    ..RuntimeConfig::default()
};

// Attach a checkpoint store to the runtime
let mut runtime = Runtime::new(config, registry);
runtime.set_checkpoint_store(Arc::new(InMemoryCheckpointStore::new()));

// SQLite-backed store (feature: durability-sqlite, WAL mode for crash safety)
#[cfg(feature = "durability-sqlite")]
let store = SqliteCheckpointStore::open("checkpoints.db")?;

// CheckpointStore trait methods: save, load, load_latest, list_incomplete, delete, gc
```

**Checkpoint stores**: `InMemoryCheckpointStore` (DashMap-backed, for testing) and `SqliteCheckpointStore` (WAL mode, crash-safe, feature-gated behind `durability-sqlite`).

### Shadow Checkpoint Store

Test a candidate durability backend against production without risk:

```rust
use kailash_core::shadow_checkpoint::ShadowCheckpointStore;

let production = InMemoryCheckpointStore::new();
let candidate = SqliteCheckpointStore::open("candidate.db")?;
let shadow = ShadowCheckpointStore::new(production, candidate);

// All writes go to BOTH stores. All reads come from production only.
// Check divergence rate to evaluate the candidate:
let rate = shadow.divergence_rate();  // 0.0 = perfect agreement
// When ready: shadow.promote() returns the candidate for use as new production
```

### Dead Letter Queue (DLQ)

Failed workflow executions are captured for inspection and replay:

```rust
use kailash_core::dlq::{DeadLetterQueue, InMemoryDlq, DeadLetterEntry};

// Bounded, VecDeque-backed DLQ
let dlq = Arc::new(InMemoryDlq::new(1000));

// Attach to runtime
let mut runtime = Runtime::new(config, registry);
runtime.set_dlq(dlq.clone());

// Inspect failed executions
let entries = dlq.peek(10).await?;
let popped = dlq.pop().await?;     // FIFO order
dlq.remove("entry-id").await?;     // Remove specific entry

// DeadLetterEntry contains: run_id, workflow_hash, error, inputs, partial_results, retry_count
```

### Runtime Metrics (Prometheus)

Lock-free, atomic counters with Prometheus text exposition:

```rust
use kailash_core::metrics::RuntimeMetrics;

let runtime = Runtime::new(config, registry);
let metrics: &Arc<RuntimeMetrics> = runtime.metrics();

// Counters are updated automatically during execution
// Read counters:
metrics.workflows_started();
metrics.workflows_completed();
metrics.workflows_failed();
metrics.nodes_executed();
metrics.nodes_failed();
metrics.total_execution_us();

// Export for /metrics endpoint:
let prometheus_text = metrics.to_prometheus();
// Returns standard Prometheus text format (# HELP, # TYPE, counter lines)
```

### Execution Store (History and Search)

Persist and query execution records for dashboard support:

```rust
use kailash_core::execution_store::{
    ExecutionStore, InMemoryExecutionStore, ExecutionRecord, ExecutionStatus, ExecutionQuery,
};

let store = Arc::new(InMemoryExecutionStore::new());
let mut runtime = Runtime::new(config, registry);
runtime.set_execution_store(store.clone());

// Records are written automatically on execute start and complete/fail
// Query:
let recent = store.list_recent(20).await?;
let failures = store.search(&ExecutionQuery {
    status: Some(ExecutionStatus::Failed),
    since: Some("2026-03-17T00:00:00Z".into()),
    limit: 50,
    ..Default::default()
}).await?;
```

### RunHandle (Pause / Resume / Signal / Cancel)

Interact with in-flight workflow executions:

```rust
// execute_with_handle returns (JoinHandle<Result>, RunHandle)
let (join_handle, run_handle) = runtime.execute_with_handle(&workflow, inputs).await?;

// External control:
run_handle.pause();                  // Pauses between levels
run_handle.resume();                 // Resumes after pause
run_handle.signal(Value::Null);      // Send signal to nodes (via ExecutionContext::try_recv_signal)
run_handle.cancel();                 // Cancel the run (all child tokens cancelled)

// Query state:
run_handle.is_paused();
run_handle.is_cancelled();
run_handle.run_id();

// Runtime-level control (by run ID):
runtime.pause("run-id");
runtime.resume_run("run-id");
runtime.signal("run-id", value);
runtime.cancel("run-id");
```

### Drain (Graceful Shutdown)

Stop accepting new work and wait for in-flight executions:

```rust
use kailash_core::runtime::DrainResult;

// Drain with a timeout — completes in-flight runs, rejects new ones
let result: DrainResult = runtime.drain(Duration::from_secs(30)).await;
// result.drained: runs that completed before timeout
// result.cancelled: runs forcibly cancelled after timeout
```

### Scheduler (Cron-Based Workflow Execution)

```rust
use kailash_core::scheduler::{Scheduler, WorkflowSchedule};

let scheduler = Scheduler::new();
scheduler.add(WorkflowSchedule {
    schedule_id: "daily-report".into(),
    cron_expr: "0 0 9 * * *".into(),      // 6-field cron: sec min hour dom month dow
    workflow_hash: "abc123".into(),
    inputs: ValueMap::new(),
    enabled: true,
});
// scheduler.start(runtime) launches a background tokio task
```

### Task Queue (Multi-Worker Distribution)

```rust
use kailash_core::task_queue::{TaskQueue, InProcessTaskQueue, WorkflowTask};

let queue = InProcessTaskQueue::new(100);  // bounded capacity

queue.submit(WorkflowTask {
    task_id: "task-001".into(),
    workflow_hash: "abc123".into(),
    inputs: ValueMap::new(),
    priority: 0,                           // lower = higher priority
    metadata: HashMap::new(),
}).await?;

let claimed = queue.claim("worker-1").await?;  // Worker claims task
queue.complete("task-001").await?;              // Mark done
queue.fail("task-001", "error msg").await?;     // Mark failed
```

### Versioning (Workflow Version Registry)

```rust
use kailash_core::versioning::VersionedWorkflowRegistry;

let mut registry = VersionedWorkflowRegistry::new();
registry.register("my-workflow", "1.0.0", workflow_def);
registry.register("my-workflow", "2.0.0", updated_def);

let def = registry.get("my-workflow", "2.0.0");
let versions = registry.list_versions("my-workflow");  // ["1.0.0", "2.0.0"]
let latest = registry.latest("my-workflow");

// VersionMigration trait for upgrading checkpoints between workflow versions
```

### RuntimeConfig Quotas

```rust
let config = RuntimeConfig {
    // Per-workflow resource quotas
    max_workflow_duration: Some(Duration::from_secs(300)),   // Total execution timeout
    max_nodes_per_workflow: Some(100),                        // Node count limit
    max_concurrent_workflows: Some(10),                       // Workflow-level semaphore

    // DLQ privacy
    redact_dlq_inputs: true,  // Redact inputs when pushing to DLQ (default: true)
    ..RuntimeConfig::default()
};
```

### Time Utilities

```rust
use kailash_core::time_util::{now_iso8601, epoch_days_to_ymd};

let timestamp = now_iso8601();                // "2026-03-17T10:30:00Z"
let (y, m, d) = epoch_days_to_ymd(20530);    // Howard Hinnant's algorithm
```

### Key Files

| Module               | File                                              | Description                                            |
| -------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `durability`         | `crates/kailash-core/src/durability.rs`           | CheckpointStore trait, InMemory + SQLite stores        |
| `shadow_checkpoint`  | `crates/kailash-core/src/shadow_checkpoint.rs`    | Shadow-mode checkpoint testing                         |
| `trust_durability`   | `crates/kailash-core/src/trust_durability.rs`     | EATP-signed checkpoints, governed resume (feat-gated)  |
| `dlq`                | `crates/kailash-core/src/dlq.rs`                  | Dead letter queue trait + InMemoryDlq                  |
| `metrics`            | `crates/kailash-core/src/metrics.rs`              | RuntimeMetrics (atomic counters, Prometheus export)    |
| `execution_store`    | `crates/kailash-core/src/execution_store.rs`      | ExecutionStore trait + InMemoryExecutionStore           |
| `scheduler`          | `crates/kailash-core/src/scheduler.rs`            | Cron-based workflow scheduler                          |
| `task_queue`         | `crates/kailash-core/src/task_queue.rs`           | Multi-worker task queue                                |
| `versioning`         | `crates/kailash-core/src/versioning.rs`           | Workflow version registry + migration                  |
| `time_util`          | `crates/kailash-core/src/time_util.rs`            | Shared ISO 8601 formatting                             |
| `runtime`            | `crates/kailash-core/src/runtime.rs`              | Runtime, RunHandle, DrainResult, signals, pause/resume |

## Testing with Runtime

```rust
#[tokio::test]
async fn test_workflow_produces_correct_output() {
    dotenvy::dotenv().ok();

    let mut registry = NodeRegistry::new();
    register_system_nodes(&mut registry);
    register_transform_nodes(&mut registry);
    let registry = Arc::new(registry);

    let mut builder = WorkflowBuilder::new();
    builder
        .add_node("TextTransformNode", "upper", {
            let mut c = ValueMap::new();
            c.insert(Arc::from("operation"), Value::String(Arc::from("uppercase")));
            c
        });

    let workflow = builder.build(&registry).expect("should build");
    let runtime = Runtime::new(RuntimeConfig::default(), registry);

    let mut inputs = ValueMap::new();
    inputs.insert(Arc::from("text"), Value::String(Arc::from("hello")));

    let result = runtime.execute(&workflow, inputs).await.expect("should execute");

    let output = &result.results["upper"];
    assert_eq!(
        output.get("result").and_then(|v| v.as_str()),
        Some("HELLO")
    );
}
```

## Verify

```bash
PATH="/Users/esperie/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH" SDKROOT=$(xcrun --show-sdk-path) cargo test -p kailash-core -- runtime --nocapture 2>&1
```
