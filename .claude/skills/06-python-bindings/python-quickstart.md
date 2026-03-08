# Python Quickstart

Fastest path to running workflows with `kailash-enterprise`.

## Installation

```bash
pip install kailash-enterprise
```

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

## Result Structure

`runtime.execute()` always returns a plain Python `dict` with three keys:

```python
{
    "results": {
        "node_id_1": {"output_key": value, ...},
        "node_id_2": {"output_key": value, ...},
    },
    "run_id": "550e8400-e29b-41d4-a716-446655440000",
    "metadata": {
        # timing, concurrency, and execution metadata
    }
}
```

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

## RuntimeConfig (Optional Tuning)

```python
import kailash

config = kailash.RuntimeConfig(
    debug=True,               # enable verbose tracing output
    max_concurrent_nodes=8,   # semaphore limit for parallel node execution
)
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry, config)
```

## Inspect Available Node Types

```python
import kailash

registry = kailash.NodeRegistry()
all_types = registry.list_types()   # sorted list of strings
print(f"{len(registry)} node types registered")

if "MathOperationsNode" in all_types:
    print("Math node available")
```

## Workflow Serialization

```python
import kailash

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

## Key Constraints

- `builder.build(registry)` **consumes** the builder -- create a new one for each workflow
- `registry.register_callback()` must be called **before** `Runtime(registry)` -- once shared, the registry is immutable
- `runtime.execute()` is synchronous and blocking -- use `asyncio.to_thread()` for async contexts
- Node IDs must be **unique strings** within a workflow

## Framework Modules

All four framework modules are available via `pip install kailash-enterprise`:

```python
from kailash.dataflow import db, F, with_tenant          # DataFlow
from kailash.kaizen import BaseAgent, HookManager         # Kaizen
from kailash.nexus import NexusApp, NexusAuthPlugin       # Nexus
from kailash.enterprise import RbacEvaluator, Role        # Enterprise
```

See [python-framework-bindings](python-framework-bindings.md) for complete API reference.
