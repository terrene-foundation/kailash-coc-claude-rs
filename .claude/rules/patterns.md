---
priority: 10
scope: path-scoped
paths:
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
---

# Kailash Pattern Rules


<!-- slot:neutral-body -->


### 1. Runtime Execution Pattern

MUST use `rt.execute(wf)` where `wf = builder.build(reg)`.

**Why:** The Rust runtime owns the execution context and borrows the built workflow immutably; reversing the call order or skipping `.build()` passes an unvalidated graph that panics at the FFI boundary.

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

### 2. String-Based Node IDs

Node IDs MUST be string literals.

**Why:** The Rust registry interns node IDs at compile time; dynamic strings bypass the intern table and produce dangling references when the Python string is garbage-collected.

```python
builder.add_node("NodeType", "my_node_id", {"param": "value"})

❌ builder.add_node("NodeType", node_id_var, {...})
❌ builder.add_node("NodeType", f"node_{i}", {...})
```

### 3. Imports

MUST use `import kailash` for all Kailash types.

**Why:** Sub-module imports bypass the PyO3 binding root and may resolve to stale or missing Rust-backed symbols, causing `ImportError` at runtime.

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
rt = kailash.Runtime(reg)
df = kailash.DataFlow("sqlite:///db.sqlite")
app = kailash.NexusApp(kailash.NexusConfig(port=3000))
agent = kailash.Agent(config, client)
```

### 4. Environment Variable Loading

MUST load .env before any operation. See `env-models.md`.

**Why:** The Rust runtime reads environment variables once during initialization and caches them; loading `.env` after init leaves config values as empty strings with no warning.

### 5. 3-Parameter Node Pattern

```python
builder.add_node(
    "NodeType",      # 1. Type (string)
    "node_id",       # 2. ID (string)
    {"param": "v"}   # 3. Config (dict, optional)
)
```

## Framework-Specific Rules

### DataFlow

```python
import kailash

df = kailash.DataFlow("sqlite:///mydb.sqlite")

model = kailash.ModelDefinition("User", "users")
model.field("name", kailash.FieldType.text())
model.field("email", kailash.FieldType.text(), unique=True, index=True)

# DataFlowExpress for simple CRUD
from kailash.dataflow import DataFlowExpress
express = DataFlowExpress("sqlite::memory:", auto_migrate=True)

# Schema inspection — static methods only, NO constructor
from kailash.dataflow import DataFlowInspector
tables = DataFlowInspector.tables(df)

# Migrations — no-arg constructor
from kailash import MigrationManager
mgr = MigrationManager()
migration = mgr.generate_migration(df)
mgr.apply(migration, df)  # NOTE: apply(migration, dataflow)
```

### Nexus

```python
import kailash
from kailash.nexus import NexusApp, PluginManager, WorkflowRegistry, EventBus

app = NexusApp(kailash.NexusConfig(port=3000))

@app.handler("chat")
def chat_handler(params):
    return {"message": "Hello"}

app.start()
```

### Kaizen

```python
import os, kailash

config = kailash.AgentConfig(model=os.environ["OPENAI_PROD_MODEL"])
client = kailash.LlmClient("openai", os.environ["OPENAI_API_KEY"])
agent = kailash.Agent(config, client)

# Mock LLM for testing
mock_client = kailash.LlmClient.mock()
```

### MCP

```python
from kailash.mcp import McpApplication

app = McpApplication("my-server", "1.0")

@app.tool(name="search", description="Search the web")
def search(query: str) -> str:
    return f"Results for {query}"

@app.resource(uri="config://settings", name="Settings")
def get_settings() -> str:
    return '{"theme": "dark"}'
```

<!-- /slot:neutral-body -->
