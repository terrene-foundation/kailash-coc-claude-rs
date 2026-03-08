# Custom Python Nodes

Register Python callables as workflow node types using `register_callback`.

## Basic Pattern

```python
import kailash

def uppercase(inputs: dict) -> dict:
    text = inputs.get("text", "")
    return {"result": text.upper()}

registry = kailash.NodeRegistry()
registry.register_callback(
    "UppercaseNode",   # type name -- used in add_node()
    uppercase,         # callable
    ["text"],          # declared input parameter names
    ["result"],        # declared output parameter names
)

builder = kailash.WorkflowBuilder()
builder.add_node("UppercaseNode", "upper")
workflow = builder.build(registry)

runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {"text": "hello world"})
print(result["results"]["upper"]["result"])   # "HELLO WORLD"
```

## Value Types in Callbacks

All Python/Rust type conversions are transparent:

| Python type | What you get in `inputs` dict                             |
| ----------- | --------------------------------------------------------- |
| `None`      | `None`                                                    |
| `bool`      | `True` / `False`                                          |
| `int`       | Python `int`                                              |
| `float`     | Python `float`                                            |
| `str`       | Python `str`                                              |
| `bytes`     | Python `bytes`                                            |
| `list`      | Python `list` (elements recursively converted)            |
| `dict`      | Python `dict` (string keys, values recursively converted) |

## Error Handling

Python exceptions are caught by the Rust executor and converted to a workflow node error:

```python
def safe_divide(inputs: dict) -> dict:
    a = inputs.get("a", 0)
    b = inputs.get("b", 1)
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return {"quotient": a / b, "remainder": a % b}

registry.register_callback("SafeDivideNode", safe_divide, ["a", "b"], ["quotient", "remainder"])
```

## Stateful Callbacks

Use `threading.Lock` for thread safety in concurrent workflows:

```python
import threading

lock = threading.Lock()
state: dict = {}

def thread_safe_accumulate(inputs: dict) -> dict:
    key = inputs.get("key", "default")
    value = inputs.get("value", 0)
    with lock:
        state[key] = state.get(key, 0) + value
        total = state[key]
    return {"key": key, "total": total}
```

## Registration Constraint: Before Runtime

`register_callback` must be called **before** `Runtime(registry)`. Once the registry is shared with the runtime, registration raises `RuntimeError`.

```python
registry = kailash.NodeRegistry()
registry.register_callback("MyNode", my_fn, ["x"], ["y"])   # register first
runtime = kailash.Runtime(registry)                           # then create runtime
```

## Combining Custom and Built-In Nodes

Custom callback nodes and built-in nodes work together in the same workflow:

```python
def enrich(inputs: dict) -> dict:
    data = inputs.get("data", {})
    data["enriched"] = True
    return {"data": data}

registry = kailash.NodeRegistry()
registry.register_callback("EnrichNode", enrich, ["data"], ["data"])

builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {"url": "https://api.example.com/items", "method": "GET"})
builder.add_node("EnrichNode", "enrich")
builder.add_node("NoOpNode", "output")
builder.connect("fetch", "body", "enrich", "data")
builder.connect("enrich", "data", "output", "data")

workflow = builder.build(registry)
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {})
```

## What Is NOT Supported

- **Async callbacks**: Must be synchronous. Use `requests` not `aiohttp`.
- **Class-based nodes**: No `BaseNode` to inherit from. Use `register_callback`.
- **Node metadata**: Cannot declare required/optional input status in the binding.
- **Streaming output**: Callbacks must return a complete dict.

## Testing Custom Nodes

```python
import kailash
import pytest

def my_transform(inputs: dict) -> dict:
    return {"result": inputs.get("value", 0) * 2}

@pytest.fixture
def registry_with_transform():
    reg = kailash.NodeRegistry()
    reg.register_callback("DoubleNode", my_transform, ["value"], ["result"])
    return reg

def test_double_node(registry_with_transform):
    reg = registry_with_transform
    builder = kailash.WorkflowBuilder()
    builder.add_node("DoubleNode", "double")
    wf = builder.build(reg)
    runtime = kailash.Runtime(reg)
    result = runtime.execute(wf, {"value": 21})
    assert result["results"]["double"]["result"] == 42
```
