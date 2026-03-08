# Python Bindings v2 Quickstart

Fastest path to running workflows with the Rust-backed `kailash` package.

## Usage

`/python-v2-quickstart` — Complete working Python script using the v2 API

---

## Installation

```bash
# From PyPI (production)
pip install kailash

# Development mode (when working inside the kailash workspace)
cd bindings/kailash-python
maturin develop --release
```

---

## Complete Working Script

```python
import kailash

# Step 1: Create registry
# Auto-registers all 139 built-in node types (HTTP, SQL, File, AI, Auth, Security, etc.)
registry = kailash.NodeRegistry()

# Step 2: Build a workflow
builder = kailash.WorkflowBuilder()
builder.add_node("MathOperationsNode", "calc")     # type_name, node_id
builder.add_node("NoOpNode", "passthrough")
builder.connect("calc", "result", "passthrough", "data")   # src, src_port, tgt, tgt_port
workflow = builder.build(registry)                  # must pass registry

# Step 3: Execute
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {
    "operation": "add",
    "a": 10,
    "b": 5,
})

# Step 4: Read results
results = result["results"]      # dict: node_id -> output_dict
run_id  = result["run_id"]       # str: UUID for this execution
metadata = result["metadata"]    # dict: timing and execution metadata

print(results["calc"]["result"])         # 15
print(results["passthrough"]["data"])    # 15
print(f"Run ID: {run_id}")
```

---

## Result Structure

`runtime.execute()` always returns a plain Python `dict` with three keys:

```python
{
    "results": {
        "node_id_1": {"output_key": value, ...},
        "node_id_2": {"output_key": value, ...},
        # ... one entry per node in the workflow
    },
    "run_id": "550e8400-e29b-41d4-a716-446655440000",  # unique per run
    "metadata": {
        # timing, concurrency, and execution metadata from the Rust runtime
    }
}
```

---

## Node Configuration

Nodes accept an optional config dict as the third argument to `add_node`:

```python
builder.add_node(
    "HTTPRequestNode",
    "fetch",
    {
        "url": "https://api.example.com/data",
        "method": "GET",
        "headers": {"Authorization": "Bearer token"},
    }
)
```

Config keys and types depend on the specific node. Inputs passed to `runtime.execute()` are merged with node config at execution time.

---

## RuntimeConfig (Optional Tuning)

```python
import kailash

config = kailash.RuntimeConfig(
    debug=True,               # enable verbose Rust tracing output
    max_concurrent_nodes=8,   # semaphore limit for parallel node execution
)
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry, config)
```

---

## Inspect Available Node Types

```python
import kailash

registry = kailash.NodeRegistry()
all_types = registry.list_types()   # sorted list of strings
print(f"{len(registry)} node types registered")

# Check a specific type
if "MathOperationsNode" in all_types:
    print("Math node available")
```

---

## Workflow Serialization

Serialize and restore builder state as JSON (useful for storing workflow definitions):

```python
import kailash
import json

# Build and serialize
builder = kailash.WorkflowBuilder()
builder.add_node("NoOpNode", "n1")
builder.add_node("NoOpNode", "n2")
builder.connect("n1", "data", "n2", "data")
json_str = builder.to_json()   # does NOT consume the builder

# Restore and build
builder2 = kailash.WorkflowBuilder.from_json(json_str)
registry = kailash.NodeRegistry()
workflow = builder2.build(registry)
```

---

## Key Constraints

- `builder.build(registry)` **consumes** the builder — create a new one for each workflow
- `registry.register_callback()` must be called **before** `Runtime(registry)` — once shared, the registry is immutable
- `runtime.execute()` is synchronous and blocking — use `asyncio.to_thread()` for async contexts
- Node IDs must be **unique strings** within a workflow

---

## What This Is (and Is Not)

This is the **Rust-backed Python binding** — the `kailash` package wraps the Kailash Rust core via PyO3.

- All 139 built-in Rust nodes are available as type name strings
- All framework modules are available: DataFlow (`from kailash.dataflow`), Enterprise (`from kailash.enterprise`), Kaizen (`from kailash.kaizen`), Nexus (`from kailash.nexus`)
- Use `register_callback` for custom Python logic instead of class-based node inheritance
- The original Python SDK (pure Python, LocalRuntime, @db.model) is documented separately in `workspaces/references/`

For migration from the original Python SDK, see the `/python-migration-guide` skill.
For custom Python nodes, see the `/python-custom-nodes` skill.
For all available node types, see the `/python-available-nodes` skill.

---

## Framework Quickstart

All four framework modules are available in Python (added in Phase 12):

### DataFlow (Database)

```python
from kailash.dataflow import DataFlow, ModelDefinition, FieldType, db, F, with_tenant

# Rust-backed API
df = DataFlow(database_url="postgresql://localhost/mydb")

# Python compat decorator
@db.model
class User:
    id: int
    name: str
    email: str

# Query with filters
users = db.query("User", F.name == "Alice")
```

### Enterprise (RBAC, ABAC, Audit)

```python
from kailash.enterprise import RbacEvaluator, Role, Permission
from kailash.enterprise import requires_permission, audit_action, tenant_scoped

evaluator = RbacEvaluator()
evaluator.add_role(Role("admin", permissions=[Permission("users", "write")]))

@requires_permission("users", "read")
async def list_users():
    ...
```

### Kaizen (AI Agents)

```python
from kailash.kaizen import BaseAgent, Agent, AgentConfig
from kailash.kaizen.agents import SimpleQAAgent, ReActAgent
from kailash.kaizen.pipelines import SequentialPipeline

agent = Agent(AgentConfig(model=os.environ.get("LLM_MODEL", "gpt-5")))
result = await agent.run("What is the capital of France?")
```

### Nexus (Multi-Channel Platform)

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet")
async def greet(name: str) -> dict:
    return {"message": f"Hello, {name}!"}

app.start()
```
