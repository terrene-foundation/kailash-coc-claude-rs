# Ruby Framework Bindings

Use the 4 framework modules from Ruby: Kaizen, Enterprise, Nexus, DataFlow.

## Overview

All 4 Kailash frameworks are exposed as Ruby classes via Magnus. Each module provides Rust-backed types for all operations.

| Module         | Ruby Namespace           | Class Count | Import              |
| -------------- | ------------------------ | ----------- | ------------------- |
| **Kaizen**     | `Kailash::Kaizen::*`     | 42          | `require "kailash"` |
| **Enterprise** | `Kailash::Enterprise::*` | 18          | `require "kailash"` |
| **Nexus**      | `Kailash::Nexus::*`      | 10          | `require "kailash"` |
| **DataFlow**   | `Kailash::DataFlow::*`   | 9           | `require "kailash"` |

All types are available after a single `require "kailash"`.

## Kaizen (AI Agents)

AI agent framework with TAOD loop, tools, memory, checkpoints, A2A protocol.

### Core Agent

```ruby
config = Kailash::Kaizen::AgentConfig.new
config.model = ENV.fetch("LLM_MODEL", "gpt-5")
config.system_prompt = "You are a helpful assistant."

agent = Kailash::Kaizen::Agent.new(config)
result = agent.run("What is the capital of France?")
puts result  # Agent response
```

### LLM Client

```ruby
client = Kailash::Kaizen::LlmClient.new
# Reads API keys from environment variables automatically
```

### Tool Registry

```ruby
tools = Kailash::Kaizen::ToolRegistry.new

search_fn = ->(args) { { "results" => "Results for: #{args['query']}" } }

tool = Kailash::Kaizen::ToolDef.new(
  "search",
  "Search the web",
  search_fn
)
param = Kailash::Kaizen::ToolParam.new("query", "string", true)
tool.add_param(param)

tools.register(tool)
```

### Memory

```ruby
# Session memory (per-conversation)
memory = Kailash::Kaizen::SessionMemory.new
memory.store("user_name", "Alice")
value = memory.recall("user_name")  # "Alice"

# Shared memory (cross-agent, thread-safe)
shared = Kailash::Kaizen::SharedMemory.new
shared.store("global_config", { "key" => "value" })
```

### Cost Tracking

```ruby
tracker = Kailash::Kaizen::CostTracker.new
tracker.record(0.05)   # record $0.05
tracker.total           # current total in dollars
```

### Orchestration

```ruby
runtime = Kailash::Kaizen::OrchestrationRuntime.new
# Multi-agent coordination
```

### Checkpoint / Resume

```ruby
checkpoint = Kailash::Kaizen::AgentCheckpoint.new("agent-1")
storage = Kailash::Kaizen::InMemoryCheckpointStorage.new
# or: Kailash::Kaizen::FileCheckpointStorage.new("/path/to/checkpoints")
```

### A2A Protocol

```ruby
card = Kailash::Kaizen::AgentCard.new("agent-1", "My Agent")
registry = Kailash::Kaizen::AgentRegistry.new
registry.register(card)

bus = Kailash::Kaizen::InMemoryMessageBus.new
protocol = Kailash::Kaizen::A2AProtocol.new(bus)
```

### Trust

```ruby
trust_level = Kailash::Kaizen::TrustLevel.new("supervised")
posture = Kailash::Kaizen::TrustPosture.new("supervised")
```

### Structured Output

```ruby
parser = Kailash::Kaizen::StructuredOutputParser.new("json")
result = parser.parse('{"key": "value"}')
```

## Enterprise (RBAC, ABAC, Audit, Tenancy)

### RBAC

```ruby
evaluator = Kailash::Enterprise::RbacEvaluator.new

# Create role with permissions
role = Kailash::Enterprise::Role.new("admin")
role.add_permission(Kailash::Enterprise::Permission.new("users", "read"))
role.add_permission(Kailash::Enterprise::Permission.new("users", "write"))
evaluator.add_role(role)

# Create user with role
user = Kailash::Enterprise::User.new("alice")
user.add_role("admin")

# Check permission
evaluator.check(user, "users", "read")   # true
evaluator.check(user, "users", "delete") # false
```

### ABAC

```ruby
policy = Kailash::Enterprise::AbacPolicy.new("dept-access", "allow")
policy.add_subject_condition("department", "eq", "engineering")
policy.add_action("read")

evaluator = Kailash::Enterprise::AbacEvaluator.new([policy])

result = evaluator.evaluate(
  { "department" => "engineering" },  # subject attributes
  { "type" => "documents" },          # resource attributes
  "read",                              # action
  {}                                   # environment
)
# result["allowed"] == true
```

### Audit

```ruby
logger = Kailash::Enterprise::AuditLogger.new
logger.log("user.login", { "user_id" => "alice", "ip" => "127.0.0.1" })

filter = Kailash::Enterprise::AuditFilter.new
filter.action = "user.login"
entries = logger.query(filter)
```

### Tenancy

```ruby
tenant = Kailash::Enterprise::TenantInfo.new("acme-001")
context = Kailash::Enterprise::TenantContext.new("acme-001")
registry = Kailash::Enterprise::TenantRegistry.new
```

## Nexus (Multi-Channel Platform)

### Configuration

```ruby
config = Kailash::Nexus::NexusConfig.new
config.host = "0.0.0.0"
config.port = 3000
```

### Presets

```ruby
preset = Kailash::Nexus::Preset.new("standard")
# Available: "none", "lightweight", "standard", "saas", "enterprise"
```

### JWT Authentication

```ruby
jwt = Kailash::Nexus::JwtConfig.new("secret-at-least-32-bytes-long!!")
claims = Kailash::Nexus::JwtClaims.new
claims.sub = "user-42"
claims.exp = Time.now.to_i + 3600
token = jwt.encode(claims)
```

### RBAC Config

```ruby
rbac = Kailash::Nexus::RbacConfig.new(["admin", "user", "viewer"])
```

### Handler Parameters

```ruby
param = Kailash::Nexus::HandlerParam.new("name", true)
# HandlerParam(name, required)
```

### Middleware

```ruby
mw = Kailash::Nexus::MiddlewareConfig.new
```

### MCP Server

```ruby
mcp = Kailash::Nexus::McpServer.new
```

## DataFlow (Database)

### Configuration

```ruby
config = Kailash::DataFlow::Config.new("sqlite::memory:")
# or: "postgresql://user:pass@localhost/mydb"
# or: "mysql://user:pass@localhost/mydb"
```

### Model Definition

```ruby
model = Kailash::DataFlow::ModelDefinition.new("User", "users")
model.add_field("id", "integer", primary_key: true)
model.add_field("name", "text", required: true)
model.add_field("email", "text", nullable: true)
```

### Field Types

```ruby
# Available via Kailash::DataFlow::FieldType
# "integer", "text", "real", "boolean", "timestamp", "blob"
```

### Filter Conditions

```ruby
filter = Kailash::DataFlow::FilterCondition.new("name", "eq", "Alice")
# Operators: "eq", "ne", "gt", "gte", "lt", "lte", "like", "in", "is_null", "is_not_null"
```

### Tenant Context

```ruby
ctx = Kailash::DataFlow::TenantContext.new("acme-001")
interceptor = Kailash::DataFlow::QueryInterceptor.new(ctx)
```

### Transactions

```ruby
tx = Kailash::DataFlow::DataFlowTransaction.new
```

---

## Enterprise Infrastructure

Progressive infrastructure scaling. All types are in the `Kailash::` namespace.

### Auto-Configuration

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  # Simple: auto-configured Runtime from env vars (Level 0-1)
  runtime = Kailash.configure_from_env(registry)

  # Full: Runtime + task queue + worker lifecycle (Level 0-2)
  infra = Kailash.configure_from_env_full(registry)
  runtime = infra.runtime       # Kailash::Runtime
  level = infra.level           # Kailash::InfraLevel
  worker_id = infra.worker_id   # String
end
```

### InfraLevel

```ruby
level = Kailash::InfraLevel.in_memory       # Level 0 (default)
level = Kailash::InfraLevel.local_file      # Level 0.5 (SQLite)
level = Kailash::InfraLevel.shared_state    # Level 1 (PostgreSQL)
level = Kailash::InfraLevel.multi_worker    # Level 2 (PostgreSQL + workers)

puts level.kind         # "in_memory" | "local_file" | "shared_state" | "multi_worker"
puts level.description  # Human-readable description
```

### IdempotencyKeyStrategy

```ruby
strategy = Kailash::IdempotencyKeyStrategy.none
strategy = Kailash::IdempotencyKeyStrategy.execution_scoped
strategy = Kailash::IdempotencyKeyStrategy.input_scoped
strategy = Kailash::IdempotencyKeyStrategy.from_input("payment_id")

puts strategy.kind       # "none" | "execution_scoped" | "input_scoped" | "from_input"
puts strategy.input_key  # nil or "payment_id"
```

### ShutdownToken

```ruby
token = Kailash::ShutdownToken.new
token.cancelled?   # false
token.cancel
token.cancelled?   # true
```

### Saga Store

```ruby
store = Kailash::InMemorySagaStore.new

# Create a saga
step1 = Kailash::SagaStepDef.new("charge_card", "refund_card")
step2 = Kailash::SagaStepDef.new("reserve_inventory", "release_inventory")
saga = Kailash::SagaDefinition.new("order-001", "run-001", [step1, step2])
store.create(saga)

# Step lifecycle
store.step_completed("order-001", 0)
store.step_failed("order-001", 1, "out of stock")

# Compensate
to_compensate = store.steps_to_compensate("order-001")
to_compensate.each { |idx, step| store.step_compensated("order-001", idx) }
store.mark_compensated("order-001")

# Query
state = store.get("order-001")   # SagaState or nil
active = store.list_active       # Array of SagaState
```

### Task Queue

```ruby
queue = Kailash::InProcessTaskQueue.new(100)  # capacity

task = Kailash::WorkflowTask.new("task-001", "abc123")
queue.submit(task)

claimed = queue.claim("worker-1")
if claimed
  queue.complete(claimed.task_id, "run-001")
end

count = queue.pending_count
info = queue.status("task-001")
```

### Enterprise Infrastructure Types

| Type                                 | Purpose                                  |
| ------------------------------------ | ---------------------------------------- |
| `Kailash::ConfiguredInfra`           | Auto-configuration result (runtime + queue) |
| `Kailash::InfraLevel`               | Infrastructure level (4 variants)        |
| `Kailash::ShutdownToken`            | Cancellation token for graceful shutdown |
| `Kailash::InMemorySagaStore`        | In-memory saga coordination store        |
| `Kailash::SagaDefinition`           | Saga with ordered steps                  |
| `Kailash::SagaStepDef`              | Single saga step definition              |
| `Kailash::SagaState`                | Saga current state                       |
| `Kailash::SagaStepState`            | Step current state                       |
| `Kailash::SagaStatus`               | Saga status enum                         |
| `Kailash::SagaStepStatus`           | Step status enum                         |
| `Kailash::IdempotencyKeyStrategy`   | Idempotency key strategy (4 variants)    |
| `Kailash::InProcessTaskQueue`       | In-process task queue                    |
| `Kailash::WorkflowTask`             | Task queue entry                         |
| `Kailash::TaskStatus`               | Task status enum                         |
| `Kailash::TaskInfo`                 | Task metadata                            |

---

## Key Differences from Python Binding

| Feature          | Python                               | Ruby                                   |
| ---------------- | ------------------------------------ | -------------------------------------- |
| Import           | `from kailash.kaizen import ...`     | `Kailash::Kaizen::*` (single require)  |
| Compat layers    | `BaseAgent`, `NexusApp`, `@db.model` | None — direct Rust-backed classes only |
| Resource cleanup | Implicit (Python GC)                 | Explicit `close` or block form         |
| Async            | `asyncio.to_thread`                  | GVL release (automatic)                |
| Custom nodes     | `register_callback`                  | `register_callback` (identical API)    |
| Error types      | `RuntimeError`, `TypeError`          | `Kailash::Error` hierarchy             |
