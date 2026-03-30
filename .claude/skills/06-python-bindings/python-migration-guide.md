# Python SDK Migration Guide

Migrate from the original kailash Python SDK (v0.12) to the Rust-backed Python bindings (v2).

## Usage

`/python-migration-guide` — Side-by-side comparison of every common pattern

---

## Background

The `kailash` package name is shared between two implementations:

|                       | Original Python SDK         | Python Bindings (v2)                                                              |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| Implementation        | Pure Python                 | Rust core via PyO3                                                                |
| Install               | `pip install kailash` (old) | `pip install kailash` (new)                                                       |
| Runtime               | `LocalRuntime`              | `kailash.Runtime`                                                                 |
| Registry              | Created internally          | `kailash.NodeRegistry()` passed explicitly                                        |
| Execute return        | `(results, run_id)` tuple   | `{"results": ..., "run_id": ..., "metadata": ...}` dict                           |
| DataFlow/Nexus/Kaizen | Python classes              | Full Python APIs via `from kailash.{dataflow,nexus,kaizen,enterprise} import ...` |
| Custom nodes          | Class-based inheritance     | `register_callback(name, fn, inputs, outputs)`                                    |
| Deprecation warnings  | No (is the original)        | Yes, for v0.12 compat shims                                                       |

The v0.12 compatibility shims (`LocalRuntime`, `build()` without registry) continue to work but emit `DeprecationWarning`. Migrate to avoid future breakage.

---

## Pattern 1: Runtime Creation

**v0.12 (original)**:

```python
from kailash.runtime import LocalRuntime

runtime = LocalRuntime()
runtime = LocalRuntime(debug=True, max_concurrent_nodes=4)
```

**v2 (new)**:

```python
import kailash

registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)

# With config:
config = kailash.RuntimeConfig(debug=True, max_concurrent_nodes=4)
runtime = kailash.Runtime(registry, config)
```

Key change: registry is now explicit. The same registry is passed to both `build()` and `Runtime()`.

---

## Pattern 2: Workflow Build

**v0.12 (original)**:

```python
from kailash.workflow.builder import WorkflowBuilder

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "n1")
wf = builder.build()        # no registry arg
```

**v2 (new)**:

```python
import kailash

registry = kailash.NodeRegistry()    # create once, reuse
builder = kailash.WorkflowBuilder()
builder.add_node("NoOpNode", "n1")
wf = builder.build(registry)         # registry required
```

The `add_node` and `connect` method signatures are identical. Only `build()` changes.

---

## Pattern 3: Execute and Read Results

**v0.12 (original)**:

```python
results, run_id = runtime.execute(wf, {"key": "value"})
# results is dict: node_id -> output_dict
print(results["n1"]["data"])
print(run_id)
```

**v2 (new)**:

```python
result = runtime.execute(wf, {"key": "value"})
# result is dict with "results", "run_id", "metadata" keys
results = result["results"]
run_id  = result["run_id"]
print(results["n1"]["data"])
print(run_id)
```

The node output data is identical. Only the envelope changes from a tuple to a dict. The `metadata` key provides additional execution information not available in v0.12.

---

## Pattern 4: Async Execution

**v0.12 (original)**:

```python
from kailash.runtime import AsyncLocalRuntime

async def run():
    runtime = AsyncLocalRuntime()
    results, run_id = await runtime.execute_workflow_async(wf, inputs)
    return results, run_id
```

**v2 (new, recommended)**:

```python
import asyncio
import kailash

async def run():
    registry = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("NoOpNode", "n1")
    wf = builder.build(registry)

    runtime = kailash.Runtime(registry)
    # run synchronous execute in a thread pool to avoid blocking the event loop
    result = await asyncio.to_thread(runtime.execute, wf, {"key": "value"})
    return result["results"], result["run_id"]
```

**v2 (using compat class — still emits DeprecationWarning)**:

```python
from kailash.runtime import AsyncLocalRuntime

async def run():
    runtime = AsyncLocalRuntime()   # DeprecationWarning
    results, run_id = await runtime.execute_workflow_async(wf, inputs)
    return results, run_id
```

---

## Pattern 5: get_runtime()

**v0.12 (original)**:

```python
from kailash.runtime import get_runtime

runtime = get_runtime()   # LocalRuntime or AsyncLocalRuntime depending on context
results, run_id = runtime.execute(wf)
```

**v2 (new)**:

```python
import kailash

# Always use Runtime directly — no need for context-detection helper
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)
result = runtime.execute(wf)
results = result["results"]
run_id  = result["run_id"]
```

---

## Pattern 6: Custom Nodes

**v0.12 (original — class-based)**:

```python
from kailash.nodes.base import BaseNode   # does NOT exist in v2

class UppercaseNode(BaseNode):
    def run(self, inputs):
        return {"result": inputs["text"].upper()}
```

**v2 (new — callback-based)**:

```python
import kailash

def uppercase(inputs: dict) -> dict:
    return {"result": inputs.get("text", "").upper()}

registry = kailash.NodeRegistry()
registry.register_callback(
    "UppercaseNode",   # type name string
    uppercase,         # callable: (dict) -> dict
    ["text"],          # input names
    ["result"],        # output names
)
# Must register BEFORE Runtime(registry)
runtime = kailash.Runtime(registry)
```

There is no class-based node inheritance in the Python binding. All custom Python nodes use `register_callback`.

---

## Pattern 7: NodeRegistry Import Path

**v0.12 (original)**:

```python
from kailash.nodes.base import NodeRegistry   # still works in v2 (re-export)
```

**v2 (preferred)**:

```python
from kailash import NodeRegistry   # direct import
# or
import kailash
registry = kailash.NodeRegistry()
```

---

## Pattern 8: Database / DataFlow

**v0.12 (original)**:

```python
from kailash import DataFlow

db = DataFlow(database_url="postgresql://...")

@db.model
class User:
    id: int
    name: str
    email: str

# Generated nodes: CreateUser, ReadUser, ListUser, etc.
builder.add_node("CreateUser", "create_user")
```

**v2 (full DataFlow API available)**:

DataFlow is fully available in the Python binding with both Rust-backed types and Python compat helpers:

```python
from kailash.dataflow import DataFlow, ModelDefinition, FieldType, FieldDef
from kailash.dataflow import db, F, with_tenant

# Option A: Rust-backed DataFlow API
df = DataFlow(database_url="postgresql://user:pass@localhost/mydb")
model = ModelDefinition("User", "users")
model.add_field(FieldDef("name", FieldType.Text, required=True))
model.add_field(FieldDef("email", FieldType.Text, required=True))
df.register_model(model)

# Option B: Python compat decorator (mirrors v0.12 @db.model)
@db.model
class User:
    id: int
    name: str
    email: str

# Filter builder
users = db.query("User", F.name == "Alice")

# Multi-tenancy
with with_tenant("tenant-123"):
    users = db.query("User")
```

---

## Pattern 9: Nexus / API Server

**v0.12 (original)**:

```python
from kailash import Nexus

app = Nexus()

@app.handler("greet")
async def greet(name: str):
    return {"message": f"Hello, {name}!"}

app.start()
```

**v2 (full Nexus API available)**:

Nexus is fully available in the Python binding:

```python
from kailash.nexus import NexusApp, NexusAuthPlugin, SessionStore

app = NexusApp()

@app.handler("greet")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

app.start()
# API:  http://localhost:3000/greet
# CLI:  kailash greet --name World
```

---

## Pattern 10: Enterprise (RBAC, ABAC, Audit)

**v0.12 (original)**:

```python
# Enterprise features were not available in v0.12
```

**v2 (full Enterprise API)**:

```python
from kailash.enterprise import (
    RbacEvaluator, Role, Permission, User,
    AbacEvaluator, AuditLogger, CombinedEvaluator,
    requires_permission, audit_action, tenant_scoped,
)

# RBAC
evaluator = RbacEvaluator()
role = Role("admin", permissions=[Permission("users", "read"), Permission("users", "write")])
evaluator.add_role(role)

# Decorators
@requires_permission("users", "read")
async def list_users():
    ...

@audit_action("user.created")
async def create_user(name: str):
    ...

@tenant_scoped
async def get_data():
    ...
```

---

## Pattern 11: Kaizen Agents

**v0.12 (original)**:

```python
from kaizen.api import Agent

agent = Agent(model=os.environ.get("LLM_MODEL", "gpt-5"))
result = await agent.run("What is the capital of France?")
```

**v2 (full Kaizen API)**:

```python
from kailash.kaizen import BaseAgent, Agent, AgentConfig, LlmClient, CostTracker
from kailash.kaizen import HookManager, Signature
from kailash.kaizen.agents import SimpleQAAgent, ReActAgent, RAGAgent
from kailash.kaizen.pipelines import SequentialPipeline, ParallelPipeline

# Simple agent
agent = Agent(AgentConfig(model=os.environ.get("LLM_MODEL", "gpt-5")))
result = await agent.run("What is the capital of France?")

# Agent subclasses
qa = SimpleQAAgent(model=os.environ.get("LLM_MODEL", "gpt-5"))
react = ReActAgent(model=os.environ.get("LLM_MODEL", "gpt-5"), tools=[...])

# Pipelines
pipeline = SequentialPipeline([agent1, agent2])
result = await pipeline.run("complex task")
```

---

## Complete Migration Example

**Before (v0.12)**:

```python
from kailash.runtime import LocalRuntime
from kailash.workflow.builder import WorkflowBuilder

builder = WorkflowBuilder()
builder.add_node("MathOperationsNode", "calc")
builder.add_node("NoOpNode", "out")
builder.connect("calc", "result", "out", "data")
wf = builder.build()

runtime = LocalRuntime()
results, run_id = runtime.execute(wf, {
    "operation": "multiply",
    "a": 6,
    "b": 7,
})
print(results["calc"]["result"])   # 42
print(run_id)
```

**After (v2)**:

```python
import kailash

registry = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()
builder.add_node("MathOperationsNode", "calc")
builder.add_node("NoOpNode", "out")
builder.connect("calc", "result", "out", "data")
wf = builder.build(registry)

runtime = kailash.Runtime(registry)
result = runtime.execute(wf, {
    "operation": "multiply",
    "a": 6,
    "b": 7,
})
print(result["results"]["calc"]["result"])   # 42
print(result["run_id"])
```

---

## Suppress Deprecation Warnings During Migration

If you need to run mixed old/new code while migrating incrementally:

```python
import warnings

with warnings.catch_warnings():
    warnings.simplefilter("ignore", DeprecationWarning)
    # ... old v0.12 code here ...
```

Or at the process level (suppresses all DeprecationWarnings — use with care):

```python
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, module="kailash")
```

---

## Summary: All Breaking Changes

| v0.12 pattern                      | v2 replacement                                    | Notes                 |
| ---------------------------------- | ------------------------------------------------- | --------------------- |
| `LocalRuntime()`                   | `Runtime(NodeRegistry())`                         | Registry now explicit |
| `builder.build()`                  | `builder.build(registry)`                         | Registry required     |
| `results, run_id = rt.execute(wf)` | `result = rt.execute(wf)`                         | Dict, not tuple       |
| `AsyncLocalRuntime`                | `asyncio.to_thread(runtime.execute, wf, inputs)`  | Sync wrapper          |
| `get_runtime()`                    | `Runtime(NodeRegistry())`                         | Always sync           |
| `class MyNode(BaseNode)`           | `register_callback("MyNode", fn, ins, outs)`      | No inheritance        |
| `DataFlow`, `@db.model`            | `from kailash.dataflow import db, F, with_tenant` | Full API available    |
| `Nexus`                            | `from kailash.nexus import NexusApp`              | Full API available    |
| `Kaizen`                           | `from kailash.kaizen import BaseAgent, Agent`     | Full API available    |
| `Enterprise`                       | `from kailash.enterprise import RbacEvaluator`    | New in v2             |
