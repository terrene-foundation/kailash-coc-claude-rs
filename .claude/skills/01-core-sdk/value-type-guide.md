# Value Type Guide Skill

Working with the Kailash Value type system in Python -- the universal data type for all workflow data.

## Usage

`/value-type-guide` -- Quick reference for Value types, node inputs/outputs, and common patterns

## Value Conversion (Python <-> Kailash)

Kailash `Value` types are transparently converted to/from Python:

| Kailash          | Python  |
| ---------------- | ------- |
| `Value::Null`    | `None`  |
| `Value::Bool`    | `bool`  |
| `Value::Integer` | `int`   |
| `Value::Float`   | `float` |
| `Value::String`  | `str`   |
| `Value::Bytes`   | `bytes` |
| `Value::Array`   | `list`  |
| `Value::Object`  | `dict`  |

In Python, you work with native types directly. The Rust binding handles conversion automatically.

## Creating Inputs

```python
from kailash import NodeRegistry, WorkflowBuilder, Runtime

registry = NodeRegistry()
runtime = Runtime(registry)

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "passthrough")
workflow = builder.build(registry)

# All Python types convert to Value automatically
result = runtime.execute(workflow, {
    "null_val": None,
    "bool_val": True,
    "int_val": 42,
    "float_val": 3.14159,
    "str_val": "hello world",
    "bytes_val": b"\x00\x01\x02\x03",
    "list_val": [1, 2, 3],
    "dict_val": {"name": "Alice", "age": 30},
})
```

## Accessing Results

```python
# Execute returns a dict with "run_id", "results", and "metadata"
result = runtime.execute(workflow, {"data": "hello"})

# Access the run ID
run_id = result["run_id"]

# Access node outputs: result["results"]["<node_id>"]["<output_name>"]
node_output = result["results"]["passthrough"]["data"]

# All outputs are native Python types
assert isinstance(node_output, str)  # strings come back as str
```

## Node Input/Output Patterns

### In Custom Callback Nodes

```python
def my_node(inputs: dict) -> dict:
    """Custom node that processes data."""
    # Required string input
    text = inputs.get("text", "")
    if not text:
        raise ValueError("Missing required input: text")

    # Optional integer input with default
    max_length = inputs.get("max_length", 256)

    # Optional boolean with default
    enabled = inputs.get("enabled", True)

    # Build output dict
    result = text[:max_length] if enabled else text
    return {
        "result": result,
        "length": len(result),
    }

registry.register_callback(
    "MyNode", my_node,
    inputs=["text", "max_length", "enabled"],
    outputs=["result", "length"],
)
```

### Passing Config Values

```python
builder = WorkflowBuilder()

# Config values are passed as a dict
builder.add_node("TextTransformNode", "upper", {
    "operation": "uppercase",     # str
})

builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://api.example.com/data",   # str
    "method": "GET",                          # str
    "timeout_ms": 30000,                       # int (milliseconds)
})
```

## Nested Data Structures

```python
# Nested dicts and lists work naturally
result = runtime.execute(workflow, {
    "user": {
        "name": "Alice",
        "age": 30,
        "active": True,
    },
    "tags": ["admin", "user"],
    "scores": [9.5, 8.7, 10.0],
    "metadata": {
        "nested": {
            "deeply": {
                "value": 42
            }
        }
    },
})

# Access nested results the same way
user = result["results"]["node_id"]["user"]
assert user["name"] == "Alice"
```

## JSON Interop

```python
import json

# Python dicts are the JSON interchange format
# Kailash handles all conversion automatically

# Serialize workflow to JSON
json_str = builder.to_json()
data = json.loads(json_str)
print(json.dumps(data, indent=2))

# Load workflow from JSON
restored = WorkflowBuilder.from_json(json_str)
```

## Common Patterns

### Type Checking in Callbacks

```python
def typed_node(inputs: dict) -> dict:
    data = inputs.get("data")

    if isinstance(data, str):
        return {"result": data.upper(), "type": "string"}
    elif isinstance(data, (int, float)):
        return {"result": data * 2, "type": "number"}
    elif isinstance(data, list):
        return {"result": len(data), "type": "array"}
    elif isinstance(data, dict):
        return {"result": list(data.keys()), "type": "object"}
    elif data is None:
        return {"result": None, "type": "null"}
    else:
        return {"result": str(data), "type": "unknown"}
```

### Binary Data

```python
# Pass binary data as bytes
result = runtime.execute(workflow, {
    "image_data": b"\x89PNG\r\n\x1a\n...",
    "file_content": open("data.bin", "rb").read(),
})
```

## Verify

```bash
python -c "
from kailash import NodeRegistry, WorkflowBuilder, Runtime

registry = NodeRegistry()
runtime = Runtime(registry)

builder = WorkflowBuilder()
builder.add_node('NoOpNode', 'n1')
workflow = builder.build(registry)

# Test all value types
result = runtime.execute(workflow, {
    'null': None,
    'bool': True,
    'int': 42,
    'float': 3.14,
    'str': 'hello',
    'list': [1, 2, 3],
    'dict': {'a': 1},
})
assert 'run_id' in result
print('OK')
"
```
