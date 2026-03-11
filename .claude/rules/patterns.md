---
paths:
  - "**/*.py"
  - "**/*.rb"
  - "**/*.ts"
  - "**/*.js"
---

# Kailash Pattern Rules

## Scope

These rules apply to all code using the Kailash Python package (`kailash-enterprise`) or Ruby gem (`kailash`).

## MUST Rules

### 1. Runtime Execution Pattern

MUST use `rt.execute(wf)` where `wf = builder.build(reg)`.

#### Python

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "node_id", {"param": "value"})
wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
# result is dict: {"results": {...}, "run_id": "...", "metadata": {...}}
```

**Incorrect**:

```python
❌ workflow.execute(runtime)  # WRONG order
❌ runtime.execute(workflow)  # Missing .build()
❌ runtime.run(workflow)  # Wrong method
```

#### Ruby

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("NodeType", "node_id", { "param" => "value" })
  workflow = builder.build(registry)
  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow, { "data" => "hello" })
    output = result.results["node_id"]
  end
  workflow.close
end
```

**Incorrect**:

```ruby
❌ builder.build  # Missing registry argument
❌ builder.build()  # Missing registry argument
❌ { key: value }  # Symbol keys - use { "key" => value }
❌ Kailash::Runtime.new  # Missing registry
❌ Timeout.timeout(5) { runtime.execute(...) }  # Won't interrupt Rust
```

**Enforced by**: validate-workflow hook
**Violation**: Code review flag

### 2. String-Based Node IDs

Node IDs MUST be string literals.

#### Python

```python
builder.add_node("NodeType", "my_node_id", {"param": "value"})
```

**Incorrect**:

```python
❌ builder.add_node("NodeType", node_id_var, {...})
❌ builder.add_node("NodeType", f"node_{i}", {...})
```

#### Ruby

```ruby
builder.add_node("NodeType", "my_node_id", { "param" => "value" })
```

**Incorrect**:

```ruby
❌ builder.add_node("NodeType", node_id_var, { "param" => "value" })
❌ builder.add_node("NodeType", "node_#{i}", { "param" => "value" })
```

**Enforced by**: Code review
**Violation**: Potential runtime issues

### 3. Imports

#### Python

MUST use `import kailash` for all Kailash types.

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
rt = kailash.Runtime(reg)
df = kailash.DataFlow("sqlite:///db.sqlite")
app = kailash.NexusApp(kailash.NexusConfig(port=3000))
agent = kailash.Agent(config, client)
```

#### Ruby

MUST use `require "kailash"` (single require). All types live under the `Kailash::` namespace.

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  runtime = Kailash::Runtime.open(registry) { |rt| rt }
end
```

**Enforced by**: validate-workflow hook
**Violation**: Code review flag

### 4. Environment Variable Loading

MUST load .env before any operation.

> See `env-models.md` for full .env rules, model-key pairings, and enforcement details.

**Enforced by**: session-start hook, validate-workflow hook
**Violation**: Runtime errors

### 5. 3-Parameter Node Pattern

MUST use correct parameter order for add_node.

#### Python

```python
builder.add_node(
    "NodeType",      # 1. Type (string)
    "node_id",       # 2. ID (string)
    {"param": "v"}   # 3. Config (dict, optional)
)
```

#### Ruby

```ruby
builder.add_node(
  "NodeType",          # 1. Type (string)
  "node_id",           # 2. ID (string)
  { "param" => "v" }   # 3. Config (hash with string keys, optional)
)
```

## Framework-Specific Rules

### DataFlow

#### Python

```python
import kailash

df = kailash.DataFlow("sqlite:///mydb.sqlite")

model = kailash.ModelDefinition("User", "users")
model.field("name", kailash.FieldType.text())  # field(name, field_type, ...)
model.field("email", kailash.FieldType.text(), unique=True, index=True)  # P17 constraints
# Or use the @db.model decorator (preferred):
# from kailash.dataflow import db
# @db.model
# class User:
#     id: int
#     name: str

# Quick setup with DataFlowExpress (P17-008)
from kailash.dataflow import DataFlowExpress
express = DataFlowExpress("sqlite::memory:", auto_migrate=True)

# Schema inspection (P17-009) -- static methods only, NO constructor
from kailash.dataflow import DataFlowInspector
tables = DataFlowInspector.tables(df)
info = DataFlowInspector.table_info(df, "users")

# Migrations (P17-007) -- no-arg constructor
from kailash import MigrationManager
mgr = MigrationManager()
migration = mgr.generate_migration(df)
mgr.apply(migration, df)  # NOTE: apply(migration, dataflow) -- NOT apply(dataflow, migration)
```

#### Ruby

```ruby
require "kailash"

config = Kailash::DataFlow::Config.new("sqlite:///mydb.sqlite")
df = Kailash::DataFlow.new(config)

model = Kailash::DataFlow::ModelDefinition.new("User", "users")
model.field("name", Kailash::DataFlow::FieldType.text)
model.field("email", Kailash::DataFlow::FieldType.text, unique: true, index: true)

df.register_model(model)
df.auto_migrate!
```

### Nexus

#### Python

```python
import kailash
from kailash.nexus import NexusApp, PluginManager, WorkflowRegistry, EventBus

# Basic app
app = NexusApp(kailash.NexusConfig(port=3000))

@app.handler("chat")
def chat_handler(params):
    return {"message": "Hello"}

app.start()

# Plugin management (P17-023)
pm = PluginManager()
pm.load("auth", config={"secret": os.environ["AUTH_PLUGIN_SECRET"]})

# Workflow registry (P17-024)
registry = WorkflowRegistry()
registry.register("my-wf", {"steps": [...]})
result = registry.execute("my-wf", {"input": "data"})

# Event bus (P17-022)
bus = EventBus()
bus.subscribe("user.created", lambda data: print(data))
bus.publish("user.created", {"user_id": "123"})
```

#### Ruby

```ruby
require "kailash"

config = Kailash::Nexus::NexusConfig.new
config.port = 3000
app = Kailash::Nexus::NexusApp.new(config)

app.handler("chat") do |params|
  { "message" => "Hello" }
end

app.start
```

### Kaizen

#### Python

```python
import os
import kailash

config = kailash.AgentConfig(
    model=os.environ["OPENAI_PROD_MODEL"],  # NEVER hardcode model names
)
client = kailash.LlmClient("openai", os.environ["OPENAI_API_KEY"])
agent = kailash.Agent(config, client)

# Mock LLM for testing (P17-003)
mock_client = kailash.LlmClient.mock()
# Or: mock_client = kailash.LlmClient(provider="mock")

# Multi-agent (P17-018)
from kailash.kaizen import SupervisorAgent, WorkerAgent

# Streaming (P17-013)
from kailash.kaizen import StreamingAgent, StreamHandler

# Observability (P17-016)
from kailash.kaizen import ObservabilityManager, MetricsCollector
```

#### Ruby

```ruby
require "kailash"

config = Kailash::Kaizen::AgentConfig.new
config.model = ENV.fetch("OPENAI_PROD_MODEL")  # NEVER hardcode model names
client = Kailash::Kaizen::LlmClient.new("openai")  # API key from ENV automatically
agent = Kailash::Kaizen::Agent.new(config, client)

# Mock LLM for testing
mock_client = Kailash::Kaizen::LlmClient.new("mock")
```

### Enterprise

#### Python

```python
import kailash

# RBAC
role = kailash.Role("admin").with_permission(kailash.Permission("users", "read"))
evaluator = kailash.RbacEvaluator()
evaluator.add_role(role)

# ABAC
policy = kailash.AbacPolicy("age-check", "allow").with_action("read")
abac = kailash.AbacEvaluator([policy])

# Audit
logger = kailash.AuditLogger()
logger.log_event("data_access", "user", "user-123", "users", "read", True)

# Compliance (P17-026)
from kailash.enterprise import ComplianceManager
cm = ComplianceManager()
cm.add_framework("gdpr")
cm.set_context({"encryption_at_rest": True, "audit_logging_enabled": True})
result = cm.evaluate("gdpr")

# Policy engine (P17-027)
from kailash.enterprise import PolicyEngine
pe = PolicyEngine()
pe.add_policy({"id": "p1", "name": "P1", "effect": "allow", "actions": ["read"], "resources": ["*"], "conditions": {}})

# Token management (P17-028) -- constructor takes config dict
from kailash.enterprise import TokenManager
tm = kailash.TokenManager({"secret": os.environ["TOKEN_SECRET"], "default_ttl_secs": 3600})
jwt = tm.create_jwt({"subject": "user-123", "scopes": ["read"]})

# SSO (P17-029) -- constructor takes config dict
from kailash.enterprise import SSOProvider
sso = SSOProvider({"protocol": "oidc", "provider_name": "okta",
    "client_id": os.environ["SSO_CLIENT_ID"], "client_secret": os.environ["SSO_CLIENT_SECRET"],
    "redirect_uri": "https://app.example.com/callback",
    "metadata_url": os.environ["SSO_METADATA_URL"], "issuer": os.environ["SSO_ISSUER"],
    "scopes": ["openid", "profile", "email"]})
```

#### Ruby

```ruby
require "kailash"

# RBAC
role = Kailash::Enterprise::Role.new("admin")
role.add_permission(Kailash::Enterprise::Permission.new("users", "read"))
evaluator = Kailash::Enterprise::RbacEvaluator.new
evaluator.add_role(role)

# ABAC
policy = Kailash::Enterprise::AbacPolicy.new("age-check", "allow")
policy.add_action("read")
abac = Kailash::Enterprise::AbacEvaluator.new([policy])

# Audit
logger = Kailash::Enterprise::AuditLogger.new
logger.log_event("data_access", "user", "user-123", "users", "read", true)
```

### MCP

#### Python

```python
from kailash.mcp import McpApplication, prompt_argument

app = McpApplication("my-server", "1.0")

@app.tool(name="search", description="Search the web")
def search(query: str) -> str:
    return f"Results for {query}"

@app.resource(uri="config://settings", name="Settings")
def get_settings() -> str:
    return '{"theme": "dark"}'

@app.prompt(name="summarize", description="Summarize text")
def summarize_prompt(text: str) -> str:
    return f"Please summarize: {text}"

# Transport configuration (P17-034)
from kailash.nexus.mcp import STDIO, SSE, HTTP
app.server.set_transport(SSE)
```

## Exceptions

Pattern exceptions require:

1. Written justification
2. Approval from pattern-expert
3. Documentation in code comments
