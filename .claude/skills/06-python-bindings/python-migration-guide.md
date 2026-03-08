# Migration Guide (Pure Python SDK to kailash-enterprise)

Migrate from the original kailash Python SDK (v0.12) to the Rust-backed Python bindings.

---

## Background

The `kailash` package name is shared between two implementations:

|                       | Original Python SDK         | Rust-backed Python Bindings                                                       |
| --------------------- | --------------------------- | --------------------------------------------------------------------------------- |
| Implementation        | Pure Python                 | Rust core via PyO3                                                                |
| Install               | `pip install kailash` (old) | `pip install kailash-enterprise`                                                  |
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

**Current (Rust-backed)**:

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

**Current (Rust-backed)**:

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

**Current (Rust-backed)**:

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

**Current (Rust-backed, recommended)**:

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

**Current (using compat class -- still emits DeprecationWarning)**:

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

**Current (Rust-backed)**:

```python
import kailash

# Always use Runtime directly -- no need for context-detection helper
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)
result = runtime.execute(wf)
results = result["results"]
run_id  = result["run_id"]
```

---

## Pattern 6: Custom Nodes

**v0.12 (original -- class-based)**:

```python
from kailash.nodes.base import BaseNode   # does NOT exist in current API

class UppercaseNode(BaseNode):
    def run(self, inputs):
        return {"result": inputs["text"].upper()}
```

**Current (Rust-backed -- callback-based)**:

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
from kailash.nodes.base import NodeRegistry   # still works (re-export)
```

**Current (preferred)**:

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

db = DataFlow("postgresql://...")

@db.model
class User:
    id: int
    name: str
    email: str

# Generated nodes: CreateUser, ReadUser, ListUser, etc.
builder.add_node("CreateUser", "create_user")
```

**Current (full DataFlow API available)**:

DataFlow is fully available in the Python binding with both Rust-backed types and Python compat helpers:

```python
from kailash.dataflow import DataFlow, ModelDefinition, FieldType, FieldDef
from kailash.dataflow import db, F, with_tenant

# Option A: Rust-backed DataFlow API
df = DataFlow("postgresql://user:pass@localhost/mydb")
model = ModelDefinition("User", "users")
model.field("name", FieldType.text())   # field(name, field_type, ...)
model.field("email", FieldType.text())  # FieldDef has no public constructor

# Option B: Python compat decorator (mirrors v0.12 @db.model)
@db.model
class User:
    id: int
    name: str
    email: str

# Filter builder
f = F("name") == "Alice"  # F() uses call syntax, not attribute access

# Multi-tenancy (requires base QueryInterceptor + tenant_id)
from kailash.dataflow import TenantContext, QueryInterceptor
base_ctx = TenantContext("default")
base = QueryInterceptor(base_ctx)
with with_tenant(base, "tenant-123") as scoped:
    result = scoped.intercept_query("SELECT * FROM users")
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

**Current (full Nexus API available)**:

Nexus is fully available in the Python binding:

```python
from kailash.nexus import NexusApp, NexusAuthPlugin, SessionStore

app = NexusApp()

@app.handler("greet")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

app.start()
# API:  http://localhost:8000/greet
# CLI:  kailash greet --name World
```

---

## Pattern 10: Enterprise (RBAC, ABAC, Audit)

**v0.12 (original)**:

```python
# Enterprise features were not available in v0.12
```

**Current (full Enterprise API)**:

```python
from kailash.enterprise import (
    RbacEvaluator, Role, Permission, User,
    AbacEvaluator, AuditLogger, CombinedEvaluator,
    requires_permission, audit_action, tenant_scoped,
)

# RBAC
evaluator = RbacEvaluator()
role = Role("admin").with_permission(Permission("users", "read")).with_permission(Permission("users", "write"))
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

agent = Agent(model=os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"))
result = await agent.run("What is the capital of France?")
```

**Current (full Kaizen API)**:

```python
from kailash.kaizen import BaseAgent, Agent, AgentConfig, LlmClient, CostTracker
from kailash.kaizen import HookManager, Signature
from kailash.kaizen.agents import SimpleQAAgent, ReActAgent, RAGAgent
from kailash.kaizen.pipelines import SequentialPipeline, ParallelPipeline

# Simple agent
agent = Agent(AgentConfig(model=os.environ.get("DEFAULT_LLM_MODEL", "gpt-5")))
result = await agent.run("What is the capital of France?")

# Agent subclasses
qa = SimpleQAAgent(model=os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"))
react = ReActAgent(model=os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"), tools=[...])

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

**After (kailash-enterprise)**:

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

Or at the process level (suppresses all DeprecationWarnings -- use with care):

```python
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, module="kailash")
```

---

## Summary: All Breaking Changes

| v0.12 pattern                      | Current replacement                               | Notes                 |
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
| `Enterprise`                       | `from kailash.enterprise import RbacEvaluator`    | New                   |
