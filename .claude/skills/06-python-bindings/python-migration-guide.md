# Migration Guide (Pure Python SDK to kailash-enterprise)

Migrate from the original kailash Python SDK (v0.12) to the Rust-backed Python bindings.

---

## Background

The `kailash` package name is shared between two implementations:

|                       | Original Python SDK         | kailash-enterprise                                                                |
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
```

**Current**:

```python
import kailash

registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)

# With config:
config = kailash.RuntimeConfig(debug=True, max_concurrent_nodes=4)
runtime = kailash.Runtime(registry, config)
```

Key change: registry is now explicit.

---

## Pattern 2: Workflow Build

**v0.12 (original)**:

```python
from kailash.workflow.builder import WorkflowBuilder

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "n1")
wf = builder.build()        # no registry arg
```

**Current**:

```python
import kailash

registry = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NoOpNode", "n1")
wf = builder.build(registry)         # registry required
```

---

## Pattern 3: Execute and Read Results

**v0.12 (original)**:

```python
results, run_id = runtime.execute(wf, {"key": "value"})
print(results["n1"]["data"])
```

**Current**:

```python
result = runtime.execute(wf, {"key": "value"})
results = result["results"]
run_id  = result["run_id"]
print(results["n1"]["data"])
```

The node output data is identical. Only the envelope changes from a tuple to a dict.

---

## Pattern 4: Custom Nodes

**v0.12 (original -- class-based)**:

```python
from kailash.nodes.base import BaseNode

class UppercaseNode(BaseNode):
    def run(self, inputs):
        return {"result": inputs["text"].upper()}
```

**Current (callback-based)**:

```python
import kailash

def uppercase(inputs: dict) -> dict:
    return {"result": inputs.get("text", "").upper()}

registry = kailash.NodeRegistry()
registry.register_callback(
    "UppercaseNode",
    uppercase,
    ["text"],
    ["result"],
)
runtime = kailash.Runtime(registry)
```

---

## Pattern 5: Database / DataFlow

**v0.12 (original)**:

```python
from kailash import DataFlow

db = DataFlow(database_url="postgresql://...")

@db.model
class User:
    id: int
    name: str
    email: str
```

**Current (full DataFlow API)**:

```python
from kailash.dataflow import db, F, with_tenant
import kailash

# Option A: Builder API
df = kailash.DataFlow("postgresql://user:pass@localhost/mydb")
model = kailash.ModelDefinition("User", "users")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
df.register_model(model)

# Option B: Python compat decorator
@db.model
class User:
    id: int
    name: str
    email: str

users = db.query("User", F.name == "Alice")

with with_tenant("tenant-123"):
    users = db.query("User")
```

---

## Pattern 6: Nexus / API Server

**v0.12 (original)**:

```python
from kailash import Nexus

app = Nexus()

@app.handler("greet")
async def greet(name: str):
    return {"message": f"Hello, {name}!"}

app.start()
```

**Current (full Nexus API)**:

```python
from kailash.nexus import NexusApp, NexusAuthPlugin

app = NexusApp()

@app.handler("greet")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

app.start()
```

---

## Pattern 7: Enterprise (RBAC, ABAC, Audit)

**v0.12**: Enterprise features were not available.

**Current**:

```python
from kailash.enterprise import (
    CombinedEvaluator,
    requires_permission, audit_action, tenant_scoped,
    set_current_user, set_current_tenant,
)

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

## Pattern 8: Kaizen Agents

**v0.12 (original)**:

```python
from kaizen.api import Agent

agent = Agent(model=os.environ.get("LLM_MODEL", "gpt-4o"))
result = await agent.run("What is the capital of France?")
```

**Current (full Kaizen API)**:

```python
import os
from kailash.kaizen import BaseAgent, Agent, AgentConfig, LlmClient
from kailash.kaizen.agents import SimpleQAAgent, ReActAgent, RAGAgent
from kailash.kaizen.pipelines import SequentialPipeline, ParallelPipeline

agent = Agent(AgentConfig(model=os.environ.get("LLM_MODEL", "gpt-4o")))
result = await agent.run("What is the capital of France?")

qa = SimpleQAAgent(model=os.environ.get("LLM_MODEL", "gpt-4o"))
react = ReActAgent(model=os.environ.get("LLM_MODEL", "gpt-4o"), tools=[...])

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
```

**After (current)**:

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

## Summary: All Breaking Changes

| v0.12 pattern                      | Current replacement                                |
| ---------------------------------- | -------------------------------------------------- |
| `LocalRuntime()`                   | `kailash.Runtime(kailash.NodeRegistry())`          |
| `builder.build()`                  | `builder.build(registry)`                          |
| `results, run_id = rt.execute(wf)` | `result = rt.execute(wf)` (dict)                   |
| `AsyncLocalRuntime`                | `asyncio.to_thread(runtime.execute, wf, inputs)`   |
| `get_runtime()`                    | `kailash.Runtime(kailash.NodeRegistry())`          |
| `class MyNode(BaseNode)`           | `register_callback("MyNode", fn, ins, outs)`       |
| `DataFlow`, `@db.model`            | `from kailash.dataflow import db, F, with_tenant`  |
| `Nexus`                            | `from kailash.nexus import NexusApp`               |
| `Kaizen`                           | `from kailash.kaizen import BaseAgent, Agent`      |
| `Enterprise`                       | `from kailash.enterprise import CombinedEvaluator` |
