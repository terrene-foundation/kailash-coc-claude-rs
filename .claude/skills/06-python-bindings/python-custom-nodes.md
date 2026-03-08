# Custom Python Nodes

Register Python callables as workflow node types using `register_callback`.

## Usage

`/python-custom-nodes` — Complete patterns for custom Python nodes in the Rust-backed binding

---

## Overview

The Python binding does not support class-based node inheritance. All custom Python logic is registered as a workflow node type via `registry.register_callback()`. The Rust executor calls the Python function synchronously within the workflow execution engine.

---

## Basic Pattern

```python
import kailash

# 1. Define the callback
#    Signature: (dict) -> dict
#    - Input: dict mapping input names to Python values
#    - Output: dict mapping output names to Python values
def uppercase(inputs: dict) -> dict:
    text = inputs.get("text", "")
    return {"result": text.upper()}

# 2. Register BEFORE creating Runtime
registry = kailash.NodeRegistry()
registry.register_callback(
    "UppercaseNode",   # type name — used in add_node()
    uppercase,         # callable
    ["text"],          # declared input parameter names
    ["result"],        # declared output parameter names
)

# 3. Build workflow using the custom type
builder = kailash.WorkflowBuilder()
builder.add_node("UppercaseNode", "upper")
workflow = builder.build(registry)

# 4. Execute
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {"text": "hello world"})
print(result["results"]["upper"]["result"])   # "HELLO WORLD"
```

---

## Input/Output Dict Semantics

The callback receives all values from workflow inputs and any connected upstream nodes as a flat dict. It must return a dict whose keys match (or are a subset of) the declared output names.

```python
def process(inputs: dict) -> dict:
    # Access by name — values are Python native types
    name     = inputs.get("name", "anonymous")    # str or None
    count    = inputs.get("count", 0)             # int or None
    data     = inputs.get("data", [])             # list or None
    metadata = inputs.get("metadata", {})         # dict or None

    # Return declared outputs — extra keys are ignored by the executor
    return {
        "greeting": f"Hello, {name}!",
        "total":    count + 1,
    }

registry = kailash.NodeRegistry()
registry.register_callback(
    "GreetingNode",
    process,
    ["name", "count", "data", "metadata"],   # declared inputs
    ["greeting", "total"],                   # declared outputs
)
```

---

## Value Types in Callbacks

All Python/Rust type conversions are transparent. Values arrive as native Python types:

| Input Python type | What you get in `inputs` dict                                |
| ----------------- | ------------------------------------------------------------ |
| `None`            | `None`                                                       |
| `bool`            | `True` / `False`                                             |
| `int`             | Python `int`                                                 |
| `float`           | Python `float`                                               |
| `str`             | Python `str`                                                 |
| `bytes`           | Python `bytes`                                               |
| `list`            | Python `list` (elements recursively converted)               |
| `dict`            | Python `dict` (keys are `str`, values recursively converted) |

Return values follow the same mapping in reverse. Nested structures work correctly.

---

## Error Handling

Python exceptions raised inside a callback are caught by the Rust executor and converted to a workflow node error. The workflow execution fails at that node.

```python
def safe_divide(inputs: dict) -> dict:
    a = inputs.get("a", 0)
    b = inputs.get("b", 1)

    if not isinstance(a, (int, float)):
        raise TypeError(f"'a' must be numeric, got {type(a).__name__}")
    if b == 0:
        raise ValueError("Cannot divide by zero")

    return {"quotient": a / b, "remainder": a % b}

registry = kailash.NodeRegistry()
registry.register_callback("SafeDivideNode", safe_divide, ["a", "b"], ["quotient", "remainder"])
```

The exception type and message are propagated as the workflow error. There is no retry logic at the callback level — implement that in the callback itself if needed.

---

## Multi-Output Callbacks

Return all declared output keys for downstream nodes to consume:

```python
def text_stats(inputs: dict) -> dict:
    text = inputs.get("text", "")
    words = text.split()
    return {
        "word_count":  len(words),
        "char_count":  len(text),
        "line_count":  text.count("\n") + 1,
        "upper":       text.upper(),
    }

registry = kailash.NodeRegistry()
registry.register_callback(
    "TextStatsNode",
    text_stats,
    ["text"],
    ["word_count", "char_count", "line_count", "upper"],
)

# Downstream nodes can connect to any of the four outputs
builder = kailash.WorkflowBuilder()
builder.add_node("TextStatsNode", "stats")
builder.add_node("NoOpNode", "word_sink")
builder.add_node("NoOpNode", "char_sink")
builder.connect("stats", "word_count", "word_sink", "data")
builder.connect("stats", "char_count", "char_sink", "data")
```

---

## Using External Libraries

The callback has full access to the Python process — import any installed library:

```python
import json
import re
from datetime import datetime

def parse_log_entry(inputs: dict) -> dict:
    line = inputs.get("line", "")

    # Parse structured log entry
    pattern = r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}) \[(\w+)\] (.+)"
    match = re.match(pattern, line)
    if not match:
        return {"timestamp": None, "level": "UNKNOWN", "message": line, "valid": False}

    ts_str, level, message = match.groups()
    return {
        "timestamp": ts_str,
        "level":     level,
        "message":   message,
        "valid":     True,
    }

# Use with pandas, numpy, scikit-learn, etc.
try:
    import numpy as np

    def normalize(inputs: dict) -> dict:
        values = inputs.get("values", [])
        arr = np.array(values, dtype=float)
        if arr.std() == 0:
            return {"normalized": values, "mean": float(arr.mean()), "std": 0.0}
        normalized = ((arr - arr.mean()) / arr.std()).tolist()
        return {
            "normalized": normalized,
            "mean":       float(arr.mean()),
            "std":        float(arr.std()),
        }
except ImportError:
    pass  # numpy not available
```

---

## Stateful Callbacks via Closures

The callback can capture external state through closures:

```python
import kailash
from collections import Counter

# Shared mutable state — use threading.Lock for thread safety in concurrent workflows
call_counter: Counter = Counter()

def counting_node_factory(node_name: str):
    """Returns a callback that tracks its own call count."""
    def callback(inputs: dict) -> dict:
        call_counter[node_name] += 1
        return {
            "data":       inputs.get("data"),
            "call_count": call_counter[node_name],
        }
    return callback

registry = kailash.NodeRegistry()
registry.register_callback(
    "CountedNodeA",
    counting_node_factory("a"),
    ["data"],
    ["data", "call_count"],
)
```

Warning: the Rust executor may run nodes concurrently. Use `threading.Lock` around shared mutable state:

```python
import threading

lock = threading.Lock()
state: dict = {}

def thread_safe_accumulate(inputs: dict) -> dict:
    key   = inputs.get("key", "default")
    value = inputs.get("value", 0)
    with lock:
        state[key] = state.get(key, 0) + value
        total = state[key]
    return {"key": key, "total": total}
```

---

## Registration Constraint: Before Runtime

`register_callback` uses `Arc::get_mut` internally. Once the registry `Arc` has more than one reference holder (i.e., after `Runtime(registry)` is called), registration will raise `RuntimeError`.

```python
import kailash

registry = kailash.NodeRegistry()

# CORRECT order:
registry.register_callback("MyNode", my_fn, ["x"], ["y"])   # register first
runtime = kailash.Runtime(registry)                           # then create runtime

# WRONG order (raises RuntimeError):
registry2 = kailash.NodeRegistry()
runtime2 = kailash.Runtime(registry2)
registry2.register_callback("MyNode", my_fn, ["x"], ["y"])  # RuntimeError!
```

---

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

def test_double_node_zero_input(registry_with_transform):
    reg = registry_with_transform

    builder = kailash.WorkflowBuilder()
    builder.add_node("DoubleNode", "double")
    wf = builder.build(reg)

    runtime = kailash.Runtime(reg)
    result = runtime.execute(wf, {"value": 0})
    assert result["results"]["double"]["result"] == 0

def test_double_node_missing_input(registry_with_transform):
    reg = registry_with_transform

    builder = kailash.WorkflowBuilder()
    builder.add_node("DoubleNode", "double")
    wf = builder.build(reg)

    runtime = kailash.Runtime(reg)
    # Missing "value" key — callback uses .get("value", 0) default
    result = runtime.execute(wf, {})
    assert result["results"]["double"]["result"] == 0
```

---

## Combining Custom and Built-In Nodes

Custom callback nodes and built-in Rust nodes work together in the same workflow and share the same registry:

```python
import kailash

def enrich(inputs: dict) -> dict:
    data = inputs.get("data", {})
    data["enriched"] = True
    data["source"] = "python_callback"
    return {"data": data}

registry = kailash.NodeRegistry()
registry.register_callback("EnrichNode", enrich, ["data"], ["data"])

builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://api.example.com/items",
    "method": "GET",
})
builder.add_node("EnrichNode", "enrich")      # custom Python node
builder.add_node("NoOpNode", "output")         # built-in Rust node
builder.connect("fetch",  "response_body", "enrich", "data")
builder.connect("enrich", "data",          "output", "data")

workflow = builder.build(registry)
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {})
```

---

## What Is NOT Supported

- **Async callbacks**: The callback must be a synchronous function. The Rust executor calls it synchronously inside an async context using a thread pool. Avoid `asyncio.run()` inside the callback; use `asyncio.get_event_loop().run_until_complete()` if unavoidable (risk of deadlock in async contexts).
- **Class-based nodes**: There is no `BaseNode` class to inherit from. Use `register_callback`.
- **Node metadata**: Cannot declare required/optional input status or parameter types in the Python binding — all declared inputs are treated as optional with `None` default.
- **Streaming output**: Callbacks must return a complete dict. Streaming is not supported via the Python callback interface.
