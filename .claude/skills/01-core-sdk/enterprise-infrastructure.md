---
name: enterprise-infrastructure
description: "Progressive infrastructure scaling from in-memory to multi-worker PostgreSQL. Covers environment variable configuration, 5 store types, task queue, worker processes, idempotency, and saga coordination. Use when asking about 'enterprise infrastructure', 'progressive scaling', 'KAILASH_DATABASE_URL', 'checkpoint store', 'task queue', 'worker process', 'idempotency', 'saga store', 'dead letter queue', 'infrastructure levels', or 'configure from env'."
---

# Enterprise Infrastructure -- Progressive Scaling

The Kailash Runtime automatically configures infrastructure from environment variables. Same application code, no replatforming -- just set env vars and the Runtime scales from in-memory to distributed PostgreSQL.

## Progressive Levels

```
Level 0:   No env vars                          -> InMemory stores (default)
Level 0.5: KAILASH_DATABASE_URL=sqlite:...      -> SQLite checkpoint, rest in-memory
Level 1:   KAILASH_DATABASE_URL=postgres://...   -> All PostgreSQL-backed stores
Level 2:   Level 1 + KAILASH_WORKERS=4          -> Multi-worker with task queue
```

**Your code stays the same at every level.** The Runtime reads these env vars internally and configures the backing stores automatically.

## Environment Variables

| Variable                          | Values                           | Default      | Purpose                                |
| --------------------------------- | -------------------------------- | ------------ | -------------------------------------- |
| `KAILASH_DATABASE_URL`            | `sqlite:...` or `postgres://...` | (none)       | Database connection for durable stores |
| `KAILASH_CHECKPOINT_POLICY`       | `never`, `per_level`, `per_node` | `never`      | When to checkpoint workflow state      |
| `KAILASH_IDEMPOTENCY`             | `none`, `execution_scoped`       | `none`       | Node execution deduplication strategy  |
| `KAILASH_WORKERS`                 | Integer (>1 triggers Level 2)    | `1`          | Number of worker processes             |
| `KAILASH_WORKER_ID`               | String                           | hostname-pid | Unique worker identifier               |
| `KAILASH_DB_MAX_CONNECTIONS`      | Integer                          | `10`         | Database connection pool size          |
| `KAILASH_VISIBILITY_TIMEOUT_SECS` | Integer                          | `1800`       | Task visibility timeout (seconds)      |

## Quick Start

### Python

```python
import os
import kailash

# Level 0: In-memory (no env vars needed)
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

builder = kailash.WorkflowBuilder()
builder.add_node("LogNode", "logger", {"message": "hello"})
wf = builder.build(reg)
result = rt.execute(wf)

# Level 1: Set env var BEFORE creating Runtime
# os.environ["KAILASH_DATABASE_URL"] = "postgres://user:pass@localhost/kailash"
# rt = kailash.Runtime(reg)  # Now backed by PostgreSQL stores

# Level 2: Multi-worker (set both vars)
# os.environ["KAILASH_DATABASE_URL"] = "postgres://user:pass@localhost/kailash"
# os.environ["KAILASH_WORKERS"] = "4"
# rt = kailash.Runtime(reg)  # Task queue + worker processes activated
```

### Ruby

```ruby
require "kailash"

# Level 0: In-memory (no env vars needed)
Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("LogNode", "logger", { "message" => "hello" })
  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow)
    puts result.run_id
  end
  workflow.close
end

# Level 1: Set env var BEFORE creating Runtime
# ENV["KAILASH_DATABASE_URL"] = "postgres://user:pass@localhost/kailash"
# Kailash::Runtime.open(registry) { |rt| ... }  # Now PostgreSQL-backed

# Level 2: Multi-worker
# ENV["KAILASH_DATABASE_URL"] = "postgres://user:pass@localhost/kailash"
# ENV["KAILASH_WORKERS"] = "4"
# Kailash::Runtime.open(registry) { |rt| ... }  # Task queue + workers activated
```

## Auto-Configuration Functions

For most applications, use `configure_from_env()` to get a Runtime that auto-detects infrastructure level from environment variables. For Level 2 (multi-worker), use `configure_from_env_full()` to also get access to the task queue and worker lifecycle.

### Python

```python
import kailash

reg = kailash.NodeRegistry()

# Simple: auto-configured Runtime (Level 0-1)
rt = kailash.configure_from_env(reg)
result = rt.execute(wf)

# Full: Runtime + task queue + worker lifecycle (Level 0-2)
infra = kailash.configure_from_env_full(reg)
rt = infra.runtime             # kailash.Runtime
level = infra.level            # kailash.InfraLevel
worker_id = infra.worker_id    # str

# For Level 2: start a background worker
token = infra.start_worker()   # kailash.ShutdownToken
# ... later, shut down gracefully:
token.shutdown()
```

### Ruby

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  # Simple: auto-configured Runtime (Level 0-1)
  runtime = Kailash.configure_from_env(registry)

  # Full: Runtime + task queue + worker lifecycle (Level 0-2)
  infra = Kailash.configure_from_env_full(registry)
  runtime = infra.runtime       # Kailash::Runtime
  level = infra.level           # Kailash::InfraLevel
  worker_id = infra.worker_id   # String
end
```

### Infrastructure Types

These types are returned by `configure_from_env_full()` and are available for direct use:

| Type (Python)                    | Type (Ruby)                       | Purpose                                  |
| -------------------------------- | --------------------------------- | ---------------------------------------- |
| `kailash.ConfiguredInfra`        | `Kailash::ConfiguredInfra`        | Auto-configuration result with runtime   |
| `kailash.InfraLevel`             | `Kailash::InfraLevel`             | Infrastructure level enum (4 variants)   |
| `kailash.ShutdownToken`          | `Kailash::ShutdownToken`          | Cancellation token for graceful shutdown |
| `kailash.InMemorySagaStore`      | `Kailash::InMemorySagaStore`      | In-memory saga coordination store        |
| `kailash.InProcessTaskQueue`     | `Kailash::InProcessTaskQueue`     | In-process task queue                    |
| `kailash.IdempotencyKeyStrategy` | `Kailash::IdempotencyKeyStrategy` | Idempotency key strategy (4 variants)    |
| `kailash.WorkflowTask`           | `Kailash::WorkflowTask`           | Task queue entry                         |
| `kailash.SagaDefinition`         | `Kailash::SagaDefinition`         | Saga with ordered steps                  |
| `kailash.SagaStepDef`            | `Kailash::SagaStepDef`            | Single saga step definition              |

### InfraLevel Variants

```python
# Python factory methods
level = kailash.InfraLevel.in_memory()       # Level 0
level = kailash.InfraLevel.local_file()      # Level 0.5
level = kailash.InfraLevel.shared_state()    # Level 1
level = kailash.InfraLevel.multi_worker()    # Level 2
print(level.kind)         # "in_memory", "local_file", "shared_state", "multi_worker"
print(level.description)  # Human-readable description
```

```ruby
# Ruby factory methods
level = Kailash::InfraLevel.in_memory       # Level 0
level = Kailash::InfraLevel.local_file      # Level 0.5
level = Kailash::InfraLevel.shared_state    # Level 1
level = Kailash::InfraLevel.multi_worker    # Level 2
puts level.kind         # "in_memory", "local_file", "shared_state", "multi_worker"
puts level.description  # Human-readable description
```

### IdempotencyKeyStrategy Variants

```python
# Python factory methods
strategy = kailash.IdempotencyKeyStrategy.none()
strategy = kailash.IdempotencyKeyStrategy.execution_scoped()
strategy = kailash.IdempotencyKeyStrategy.input_scoped()
strategy = kailash.IdempotencyKeyStrategy.from_input("payment_id")
print(strategy.kind)         # "none", "execution_scoped", "input_scoped", "from_input"
print(strategy.field_name)   # None or "payment_id" (for from_input)
```

```ruby
# Ruby factory methods
strategy = Kailash::IdempotencyKeyStrategy.none
strategy = Kailash::IdempotencyKeyStrategy.execution_scoped
strategy = Kailash::IdempotencyKeyStrategy.input_scoped
strategy = Kailash::IdempotencyKeyStrategy.from_input("payment_id")
puts strategy.kind       # "none", "execution_scoped", "input_scoped", "from_input"
puts strategy.input_key  # nil or "payment_id" (for from_input)
```

## Five Store Types

The Runtime manages five infrastructure stores internally. At Level 0, all are in-memory. At Level 1+, all switch to PostgreSQL automatically.

| Store           | Purpose                         | Level 0   | Level 1+   |
| --------------- | ------------------------------- | --------- | ---------- |
| **Checkpoint**  | Workflow state for crash-resume | In-memory | PostgreSQL |
| **Execution**   | Execution history and audit     | In-memory | PostgreSQL |
| **DLQ**         | Failed workflow metadata        | In-memory | PostgreSQL |
| **Idempotency** | Exactly-once node execution     | In-memory | PostgreSQL |
| **Saga**        | Compensating transaction state  | In-memory | PostgreSQL |

> **Note**: These stores are managed internally by the Runtime. You do not interact with them directly from Python or Ruby. You configure them via environment variables.

## Database Tables (Level 1+)

When using PostgreSQL, the Runtime auto-creates these tables on first use:

| Table                    | Purpose                               |
| ------------------------ | ------------------------------------- |
| `_kailash_checkpoints`   | Workflow checkpoint data              |
| `_kailash_executions`    | Execution history records             |
| `_kailash_dlq`           | Dead letter queue entries             |
| `_kailash_sagas`         | Saga state with JSON steps            |
| `_kailash_idempotency`   | Idempotency cache records             |
| `_kailash_tasks`         | Task queue entries (Level 2)          |
| `_kailash_workers`       | Worker registration + heartbeat       |
| `_kailash_signatures`    | Checkpoint signatures (trust feature) |
| `_kailash_infra_version` | Schema version tracking               |

## Saga Coordination (Workflow-Level)

Use `SagaCoordinatorNode` in your workflows to implement the saga pattern with compensating transactions. This node is available in the standard NodeRegistry.

### Python

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# Start a saga with ordered steps and compensating actions
builder.add_node("SagaCoordinatorNode", "saga", {})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), {
    "saga.operation": "start",
    "saga.steps": [
        {
            "step_id": "charge_card",
            "action": {"type": "charge", "amount": 100.0},
            "compensate_action": {"type": "refund_card"}
        },
        {
            "step_id": "reserve_inventory",
            "action": {"type": "reserve", "sku": "ITEM-001"},
            "compensate_action": {"type": "release_inventory"}
        },
    ]
})

saga_id = result["results"]["saga"]["saga_id"]
```

### Ruby

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("SagaCoordinatorNode", "saga", {})
  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow, {
      "saga.operation" => "start",
      "saga.steps" => [
        {
          "step_id" => "charge_card",
          "action" => { "type" => "charge", "amount" => 100.0 },
          "compensate_action" => { "type" => "refund_card" }
        },
        {
          "step_id" => "reserve_inventory",
          "action" => { "type" => "reserve", "sku" => "ITEM-001" },
          "compensate_action" => { "type" => "release_inventory" }
        }
      ]
    })

    saga_id = result.results["saga"]["saga_id"]
  end
  workflow.close
end
```

### Saga Operations

The `SagaCoordinatorNode` supports these operations via the `saga.operation` input:

| Operation       | Description                                   | Required Inputs                |
| --------------- | --------------------------------------------- | ------------------------------ |
| `start`         | Begin a new saga with ordered steps           | `saga.steps` (array)           |
| `step_complete` | Mark a step as successfully completed         | `saga.saga_id`, `saga.step_id` |
| `step_failed`   | Mark a step as failed (triggers compensation) | `saga.saga_id`, `saga.step_id` |
| `abort`         | Abort the saga and compensate completed steps | `saga.saga_id`                 |
| `get_status`    | Query current saga state                      | `saga.saga_id`                 |

## Idempotency Configuration

Control duplicate execution behavior via environment variable:

- **`none`** (default): No deduplication. Every execution runs all nodes.
- **`execution_scoped`**: Within a single run, nodes with the same inputs skip re-execution on crash-resume.

```bash
# .env
KAILASH_IDEMPOTENCY=execution_scoped
```

For payment-critical workflows, use external idempotency keys (e.g., Stripe payment intent IDs) passed as node inputs rather than relying on framework-level deduplication.

## Checkpoint Policies

Control when workflow state is checkpointed for crash-resume:

- **`never`** (default): No checkpointing. Fastest, but no crash recovery.
- **`per_level`**: Checkpoint after each DAG execution level completes.
- **`per_node`**: Checkpoint after every node completes. Most durable, highest overhead.

```bash
# .env
KAILASH_CHECKPOINT_POLICY=per_level
```

## Security Notes

- **Credential redaction**: The Runtime redacts database passwords from all log output and error messages
- **Error sanitization**: Database connection URLs are stripped from error messages propagated to Python/Ruby
- **Pool bounds**: `KAILASH_DB_MAX_CONNECTIONS` limits the connection pool size (default 10)
- **Worker isolation**: In Level 2 multi-worker mode, each worker only processes tasks it has claimed

## Testing Patterns

### Python

```python
import kailash

def test_workflow_runs_at_level_0():
    """Level 0: no env vars, in-memory stores."""
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)

    builder = kailash.WorkflowBuilder()
    builder.add_node("LogNode", "log", {"message": "test"})
    wf = builder.build(reg)

    result = rt.execute(wf)
    assert result["run_id"]
    assert "log" in result["results"]
```

### Ruby

```ruby
require "kailash"

RSpec.describe "Level 0 infrastructure" do
  it "runs workflows with in-memory stores" do
    Kailash::Registry.open do |registry|
      builder = Kailash::WorkflowBuilder.new
      builder.add_node("LogNode", "log", { "message" => "test" })
      workflow = builder.build(registry)

      Kailash::Runtime.open(registry) do |runtime|
        result = runtime.execute(workflow)
        expect(result.run_id).not_to be_nil
        expect(result.results).to have_key("log")
      end
      workflow.close
    end
  end
end
```

## When to Use This Skill

Use this skill when you need to:

- Scale a workflow application from development to production
- Configure PostgreSQL-backed durable stores
- Implement saga patterns with compensating transactions
- Set up multi-worker distributed execution
- Configure idempotency for exactly-once node execution
- Enable crash-resume via checkpoint policies

## Related Skills

- **[runtime-execution](runtime-execution.md)** -- Runtime creation and execute() patterns
- **[workflow-quickstart](workflow-quickstart.md)** -- Basic workflow creation
- **[saga-pattern](../06-cheatsheets/saga-pattern.md)** -- Saga pattern cheatsheet
- **[error-handling-patterns](error-handling-patterns.md)** -- Error management strategies

<!-- Trigger Keywords: enterprise infrastructure, progressive scaling, KAILASH_DATABASE_URL, checkpoint store, task queue, worker process, idempotency, saga store, dead letter queue, infrastructure levels, configure from env, durable stores, crash resume -->
