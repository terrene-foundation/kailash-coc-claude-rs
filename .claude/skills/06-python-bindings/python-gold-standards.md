# Python Binding Gold Standards

Compliance checklist for code using `kailash-enterprise`.

## 1. Registry Creation

```python
# GOLD STANDARD
import kailash
registry = kailash.NodeRegistry()
```

- Always create a registry first
- One registry per application (reuse across workflows)
- Register all custom callbacks before creating Runtime

## 2. Workflow Building

```python
# GOLD STANDARD
builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "unique_id", {"key": "value"})
builder.connect("source_node", "source_output", "target_node", "target_input")
workflow = builder.build(registry)  # registry REQUIRED
```

- String-based node types: `"NodeType"` not `NodeType()`
- Unique string IDs for each node
- Config as plain Python dict
- 4-parameter connections: source_node, source_output, target_node, target_input
- Always pass registry to `build()`

## 3. Execution

```python
# GOLD STANDARD
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {"input_key": "value"})
output = result["results"]["node_id"]["output_key"]
run_id = result["run_id"]
metadata = result["metadata"]
```

- Runtime requires registry
- `execute()` returns a dict with keys: `"results"`, `"run_id"`, `"metadata"`
- Reuse runtime across executions

## 4. Custom Nodes

```python
# GOLD STANDARD
def my_processor(inputs):
    data = inputs.get("data", "")
    return {"result": data.upper()}

registry.register_callback(
    "MyProcessorNode",     # unique type name
    my_processor,          # synchronous callable
    ["data"],              # input parameter names
    ["result"]             # output parameter names
)
```

- Synchronous functions only (no async)
- Plain dict input, plain dict output
- Register before creating Runtime
- Use `threading.Lock` for stateful callbacks

## 5. Import Patterns

```python
# GOLD STANDARD -- core
import kailash

# GOLD STANDARD -- frameworks
from kailash.dataflow import DataFlowConfig, ModelDefinition, FieldType
from kailash.enterprise import RbacEvaluator, AbacEvaluator, Role, Permission
from kailash.kaizen import LlmClient, ToolRegistry, ToolDef, ToolParam
from kailash.nexus import Nexus, NexusConfig, HandlerParam

# NEVER
from kailash._kailash import ...  # internal module
```

## 6. Error Handling

```python
# GOLD STANDARD
try:
    result = runtime.execute(workflow, inputs)
except RuntimeError as e:
    logger.error("Workflow failed: %s", e)
    raise
```

- Catch `RuntimeError` for workflow execution failures
- Catch `TypeError` for invalid config values
- Catch `ValueError` for invalid node configurations
- Never silently swallow errors

## 7. Environment Variables

```python
# GOLD STANDARD
import os
from dotenv import load_dotenv
load_dotenv()

api_key = os.environ["OPENAI_API_KEY"]  # never hardcode
model = os.environ["LLM_MODEL"]  # from .env
```

## 8. Testing

```python
# GOLD STANDARD
import kailash
import pytest

class TestMyWorkflow:
    def setup_method(self):
        self.registry = kailash.NodeRegistry()
        self.runtime = kailash.Runtime(self.registry)

    def test_basic_execution(self):
        builder = kailash.WorkflowBuilder()
        builder.add_node("NoOpNode", "n", {})
        workflow = builder.build(self.registry)
        result = self.runtime.execute(workflow, {"data": "test"})
        assert "n" in result["results"]
        assert isinstance(result["run_id"], str)
```

- Real execution, no mocking of kailash internals
- Assert on actual results

## Anti-Patterns (NEVER do these)

| Anti-Pattern                             | Gold Standard                            |
| ---------------------------------------- | ---------------------------------------- |
| `builder.build()` without registry       | `builder.build(registry)`                |
| `results, run_id = runtime.execute(...)` | `result = runtime.execute(...)` (dict)   |
| `from kailash._kailash import X`         | `import kailash`                         |
| `MyNode()` class instantiation           | `builder.add_node("MyNode", "id", {})`   |
| `builder.connect("a", "b")` (2 params)   | `builder.connect("a", "out", "b", "in")` |
| Async callback                           | Synchronous callback                     |
| Register after Runtime                   | Register before Runtime                  |
| Hardcoded API key                        | `os.environ["API_KEY"]`                  |
| Mocking kailash internals in tests       | Real execution                           |
