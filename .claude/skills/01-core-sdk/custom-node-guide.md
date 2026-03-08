# Custom Node Guide Skill

Full implementation guide for custom Kailash nodes using `register_callback`.

## Usage

`/custom-node-guide` -- Complete reference for creating custom Python nodes via `register_callback`

## Custom Nodes via register_callback

In the Rust-backed `kailash-enterprise` package, custom Python nodes are created using `register_callback` on a `NodeRegistry`. There is no class-based node inheritance.

```python
import kailash

def uppercase(inputs: dict) -> dict:
    """Transform text to uppercase."""
    text = inputs.get("text", "")
    result = text.upper()
    return {"result": result, "length": len(result)}

registry = kailash.NodeRegistry()
registry.register_callback(
    "UppercaseNode",    # type name string
    uppercase,          # callable: (dict) -> dict
    ["text"],           # input names
    ["result", "length"],  # output names
)

# Must register BEFORE creating Runtime
rt = kailash.Runtime(registry)
```

## Callback Function Signature

The callback function receives a `dict` of inputs and must return a `dict` of outputs:

```python
def my_node(inputs: dict) -> dict:
    # Extract inputs
    value = inputs.get("value", "")
    threshold = inputs.get("threshold", 0)

    # Process
    result = process(value, threshold)

    # Return outputs as dict
    return {"result": result, "status": "ok"}
```

### Input/Output Types

Values in the input/output dicts can be:
- `str` -- text data
- `int` -- integer numbers
- `float` -- floating point numbers
- `bool` -- boolean values
- `list` -- arrays of values
- `dict` -- nested objects
- `None` -- null values
- `bytes` -- binary data

## Using Custom Nodes in Workflows

```python
import kailash

# Define custom node functions
def text_transform(inputs: dict) -> dict:
    text = inputs.get("text", "")
    operation = inputs.get("operation", "uppercase")
    if operation == "uppercase":
        return {"result": text.upper()}
    elif operation == "lowercase":
        return {"result": text.lower()}
    elif operation == "trim":
        return {"result": text.strip()}
    else:
        raise ValueError(f"Unknown operation: {operation}")

# Register
reg = kailash.NodeRegistry()
reg.register_callback(
    "TextTransformNode",
    text_transform,
    ["text", "operation"],
    ["result"],
)

# Build workflow using custom node
builder = kailash.WorkflowBuilder()
builder.add_node("TextTransformNode", "upper", {"operation": "uppercase"})

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf, {"text": "hello world"})
print(result["results"]["upper"]["result"])  # "HELLO WORLD"
```

## Error Handling in Custom Nodes

Raise exceptions to signal errors. The runtime will catch them and report the failure.

```python
def validated_node(inputs: dict) -> dict:
    # Validate required input
    if "text" not in inputs:
        raise ValueError("Missing required input: text")

    text = inputs["text"]
    if not isinstance(text, str):
        raise TypeError(f"Expected string for 'text', got {type(text).__name__}")

    if len(text) > 10000:
        raise ValueError(f"Text too long: {len(text)} chars (max 10000)")

    return {"result": text.upper()}
```

## Custom Node with External I/O

```python
import os
import json
import urllib.request

def http_request_node(inputs: dict) -> dict:
    """Make an HTTP request and return the JSON response."""
    url = inputs.get("url")
    if not url:
        raise ValueError("Missing required input: url")

    method = inputs.get("method", "GET")

    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")

    # Add auth header from environment
    api_key = os.environ.get("API_KEY")
    if api_key:
        req.add_header("Authorization", f"Bearer {api_key}")

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            body = json.loads(response.read())
            return {
                "response": body,
                "status": response.status,
            }
    except Exception as e:
        raise RuntimeError(f"HTTP request failed: {e}")

reg = kailash.NodeRegistry()
reg.register_callback(
    "HTTPRequestNode",
    http_request_node,
    ["url", "method"],
    ["response", "status"],
)
```

## Testing Custom Nodes

Test the callback function directly -- no special test framework needed:

```python
import pytest

def test_uppercase_transforms_text():
    result = text_transform({"text": "hello", "operation": "uppercase"})
    assert result["result"] == "HELLO"

def test_lowercase_transforms_text():
    result = text_transform({"text": "HELLO", "operation": "lowercase"})
    assert result["result"] == "hello"

def test_missing_text_uses_default():
    result = text_transform({"operation": "uppercase"})
    assert result["result"] == ""

def test_unknown_operation_raises():
    with pytest.raises(ValueError, match="Unknown operation"):
        text_transform({"text": "hello", "operation": "reverse"})
```

## Integration Test with Workflow

```python
def test_custom_node_in_workflow():
    reg = kailash.NodeRegistry()
    reg.register_callback(
        "TextTransformNode",
        text_transform,
        ["text", "operation"],
        ["result"],
    )

    builder = kailash.WorkflowBuilder()
    builder.add_node("TextTransformNode", "upper", {"operation": "uppercase"})

    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf, {"text": "hello"})

    assert result["results"]["upper"]["result"] == "HELLO"
```

## Verify

```bash
pip install kailash-enterprise
pytest tests/ -v
```
