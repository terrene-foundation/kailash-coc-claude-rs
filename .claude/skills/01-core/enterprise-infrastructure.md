---
description: "Progressive infrastructure scaling from in-memory to multi-worker PostgreSQL. Covers configure_from_env, all 5 store types, task queue, WorkerProcess, idempotency, and saga stores."
---

# Enterprise Infrastructure — Progressive Scaling

Auto-configure infrastructure from environment variables. Same engine, no replatforming.

## Progressive Levels

```
Level 0: No env vars           → InMemory stores (default)
Level 0.5: KAILASH_DATABASE_URL=sqlite:...  → SQLite checkpoint, rest in-memory
Level 1: KAILASH_DATABASE_URL=postgres://... → All PostgreSQL-backed stores
Level 2: Level 1 + KAILASH_WORKERS=4        → Multi-worker with task queue
```

**Environment Variables:**

- `KAILASH_DATABASE_URL` — Database connection URL
- `KAILASH_CHECKPOINT_POLICY` — `never` | `per_level` | `per_node`
- `KAILASH_IDEMPOTENCY` — `none` | `execution_scoped`
- `KAILASH_WORKERS` — Number of workers (>1 triggers Level 2)
- `KAILASH_WORKER_ID` — Unique worker ID (default: hostname-pid)
- `KAILASH_DB_MAX_CONNECTIONS` — Pool size (default: 10)
- `KAILASH_VISIBILITY_TIMEOUT_SECS` — Task visibility timeout (default: 1800)

## Quick Start

```rust
use kailash_core::infra_config::{configure_from_env, configure_from_env_full};
use kailash_core::node::NodeRegistry;
use std::sync::Arc;

// Level 0-1: Simple — just get a Runtime
let registry = Arc::new(NodeRegistry::default());
let runtime = configure_from_env(registry).await?;

// Level 2: Full — get Runtime + task queue + worker
let configured = configure_from_env_full(registry).await?;
let shutdown_token = configured.start_worker().await;
// Worker runs in background, cancel token to stop
```

## Five Store Types

All stores follow the same trait pattern: InMemory (always available) + PostgreSQL (behind `durability-postgres` feature).

| Store       | Trait              | InMemory                   | PostgreSQL                | Purpose                         |
| ----------- | ------------------ | -------------------------- | ------------------------- | ------------------------------- |
| Checkpoint  | `CheckpointStore`  | `InMemoryCheckpointStore`  | `PostgresCheckpointStore` | Workflow state for crash-resume |
| Execution   | `ExecutionStore`   | `InMemoryExecutionStore`   | `PostgresExecutionStore`  | Execution history/audit         |
| DLQ         | `DeadLetterQueue`  | `InMemoryDlq`              | `PostgresDlq`             | Failed workflow metadata        |
| Idempotency | `IdempotencyStore` | `InMemoryIdempotencyStore` | `SqlxIdempotencyStore`    | Exactly-once node execution     |
| Saga        | `SagaStore`        | `InMemorySagaStore`        | `PostgresSagaStore`       | Compensating transactions       |

**Key files:**

- `crates/kailash-core/src/infra_config.rs` — Auto-configuration
- `crates/kailash-core/src/postgres_infra.rs` — All PostgreSQL stores + InfraStores factory
- `crates/kailash-core/src/saga_store.rs` — Saga trait + InMemory impl
- `crates/kailash-core/src/idempotency.rs` — Idempotency trait + key strategies
- `crates/kailash-core/src/task_queue.rs` — TaskQueue trait + SqlxTaskQueue (SKIP LOCKED)
- `crates/kailash-core/src/worker.rs` — WorkerProcess with heartbeat + reaper

## Distributed Task Queue

```rust
use kailash_core::task_queue::{SqlxTaskQueue, TaskQueue, WorkflowTask};

let queue = SqlxTaskQueue::new(pool, "worker-1".into(), 1800);
queue.ensure_schema().await?;

// Submit
queue.submit(WorkflowTask {
    task_id: "task-001".into(),
    workflow_hash: "abc123".into(),
    inputs: ValueMap::new(),
    priority: 0,   // lower = higher priority
    metadata: HashMap::new(),
}).await?;

// Claim (atomic: FOR UPDATE SKIP LOCKED on PostgreSQL)
if let Some(task) = queue.claim("worker-1").await? {
    // execute...
    queue.complete(&task.task_id, &run_id).await?;
}
```

## Idempotency Strategies

```rust
use kailash_core::idempotency::IdempotencyKeyStrategy;

// Per-execution (safe for crash-resume, same run_id)
IdempotencyKeyStrategy::ExecutionScoped

// Per-input (cross-run dedup, SHA-256 hashed)
IdempotencyKeyStrategy::InputScoped

// External key (e.g., Stripe payment intent ID)
IdempotencyKeyStrategy::FromInput("payment_id".into())
```

**Crash-window limitation:** The check-execute-store pattern has a window where a crash between execution and store causes re-execution. For payment nodes, use `FromInput` with the provider's idempotency key. See `idempotency.rs` module docs for full strategy safety table.

## Saga Store (Compensating Transactions)

```rust
use kailash_core::saga_store::{SagaStore, SagaDefinition, SagaStepDef};

let saga = SagaDefinition {
    saga_id: "order-001".into(),
    workflow_run_id: "run-001".into(),
    steps: vec![
        SagaStepDef { step_name: "charge_card".into(), compensation_action: Some("refund_card".into()) },
        SagaStepDef { step_name: "reserve_inventory".into(), compensation_action: Some("release_inventory".into()) },
    ],
};

store.create(saga).await?;
store.step_completed("order-001", 0).await?;
// On failure at step 1:
store.step_failed("order-001", 1, "out of stock".into()).await?;
// Compensate completed steps in reverse:
let to_comp = store.steps_to_compensate("order-001").await?;
for (idx, _step) in &to_comp {
    // execute compensation...
    store.step_compensated("order-001", *idx).await?;
}
store.mark_compensated("order-001").await?;
```

## Security Patterns

- **Credential redaction**: `InfraConfig` custom `Debug` impl uses `redact_url()` — passwords replaced with `***`
- **Error sanitization**: `From<sqlx::Error>` impls strip URLs from error messages
- **Pool bounds**: `KAILASH_DB_MAX_CONNECTIONS` env var (default 10)
- **Transactional reaping**: `reap_dead_workers()` uses BEGIN/COMMIT/ROLLBACK
- **Atomic DLQ**: PostgreSQL `pop()` and `remove()` use `DELETE ... RETURNING`
- **Worker isolation**: `complete()` and `fail()` include `AND worker_id = $N` guards

## ConfiguredInfra

```rust
pub struct ConfiguredInfra {
    pub runtime: Runtime,
    pub task_queue: Option<Arc<SqlxTaskQueue>>,  // Level 2 only
    pub worker_config: Option<WorkerConfig>,      // Level 2 only
    pub level: InfraLevel,
    pub worker_id: String,
}

// Auto-start worker for Level 2
let shutdown = configured.start_worker().await;
// Level 1: discovers incomplete runs on startup
// Level 2: spawns WorkerProcess in background
```

## Database Tables (created by `ensure_schema`)

| Table                    | Purpose                               |
| ------------------------ | ------------------------------------- |
| `_kailash_checkpoints`   | Workflow checkpoint data              |
| `_kailash_executions`    | Execution history records             |
| `_kailash_dlq`           | Dead letter queue entries             |
| `_kailash_sagas`         | Saga state with JSON steps            |
| `_kailash_idempotency`   | Idempotency cache records             |
| `_kailash_tasks`         | Task queue entries                    |
| `_kailash_workers`       | Worker registration + heartbeat       |
| `_kailash_signatures`    | Checkpoint signatures (trust feature) |
| `_kailash_infra_version` | Schema version tracking               |
