# Ruby Framework Bindings

Use the 4 framework modules from Ruby: Kaizen, Enterprise, Nexus, DataFlow.

## Usage

`/ruby-framework-bindings` — Quick reference for all framework Ruby APIs

---

## Overview

All 4 Kailash frameworks are exposed as Ruby classes via Magnus. Each module provides Rust-backed types for all operations.

| Module         | Ruby Namespace           | Class Count | Import              |
| -------------- | ------------------------ | ----------- | ------------------- |
| **Kaizen**     | `Kailash::Kaizen::*`     | 42          | `require "kailash"` |
| **Enterprise** | `Kailash::Enterprise::*` | 18          | `require "kailash"` |
| **Nexus**      | `Kailash::Nexus::*`      | 10          | `require "kailash"` |
| **DataFlow**   | `Kailash::DataFlow::*`   | 9           | `require "kailash"` |

All types are available after a single `require "kailash"`.

---

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

---

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

---

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

---

## DataFlow (Database)

### Configuration

```ruby
config = Kailash::DataFlow::DataFlowConfig.new("sqlite::memory:")
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

## Key Differences from Python Binding

| Feature          | Python                               | Ruby                                   |
| ---------------- | ------------------------------------ | -------------------------------------- |
| Import           | `from kailash.kaizen import ...`     | `Kailash::Kaizen::*` (single require)  |
| Compat layers    | `BaseAgent`, `NexusApp`, `@db.model` | None — direct Rust-backed classes only |
| Resource cleanup | Implicit (Python GC)                 | Explicit `close` or block form         |
| Async            | `asyncio.to_thread`                  | GVL release (automatic)                |
| Custom nodes     | `register_callback`                  | `register_callback` (identical API)    |
| Error types      | `RuntimeError`, `TypeError`          | `Kailash::Error` hierarchy             |

---

## Source Files

| File                                                  | Purpose                                      |
| ----------------------------------------------------- | -------------------------------------------- |
| `bindings/kailash-ruby/ext/kailash/src/kaizen/mod.rs` | All 42 Kaizen classes                        |
| `bindings/kailash-ruby/ext/kailash/src/enterprise.rs` | Enterprise classes                           |
| `bindings/kailash-ruby/ext/kailash/src/nexus.rs`      | Nexus classes                                |
| `bindings/kailash-ruby/ext/kailash/src/dataflow.rs`   | DataFlow classes                             |
| `bindings/kailash-ruby/spec/kaizen_spec.rb`           | Kaizen tests (~300)                          |
| `bindings/kailash-ruby/spec/enterprise_spec.rb`       | Enterprise tests (~80)                       |
| `bindings/kailash-ruby/spec/nexus_spec.rb`            | Nexus tests (~70)                            |
| `bindings/kailash-ruby/spec/dataflow_spec.rb`         | DataFlow tests (~80)                         |
| `bindings/kailash-ruby/ext/kailash/src/infra.rs`      | Enterprise infra (15 classes + 2 module fns) |
