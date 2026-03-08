---
name: gold-custom-nodes
description: "Gold standard for custom node development. Use when asking 'create custom node', 'custom node standard', or 'node development'."
---

# Gold Standard: Custom Node Development

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `MEDIUM`

## Custom Node Template

```python
import kailash

reg = kailash.NodeRegistry()

def my_custom_processor(inputs):
    """Custom node for specific business logic.

    Process input data with custom configuration.

    Args:
        inputs: Dict with input parameters (input_data, config, metadata)

    Returns:
        Dict with output results
    """
    input_data = inputs.get("input_data", "")
    config = inputs.get("config", {})
    metadata = inputs.get("metadata")

    # Your custom logic here
    result = _process(input_data, config)

    return {
        "result": result,
        "metadata": metadata  # Pass through metadata if needed
    }

def _process(data: str, config: dict) -> str:
    """Process the input data."""
    return data.upper()

# Register the custom node
reg.register_callback(
    "MyCustomProcessor",       # node type name
    my_custom_processor,       # handler function
    ["input_data", "config", "metadata"],  # input parameter names
    ["result", "metadata"]     # output parameter names
)

# Use in workflow
builder = kailash.WorkflowBuilder()
builder.add_node("MyCustomProcessor", "proc1", {
    "input_data": "hello world",
    "config": {"uppercase": True}
})

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
print(result["results"]["proc1"])
```

## Gold Standard Checklist

- [ ] Handler function defined with `inputs` dict parameter
- [ ] Registered via `reg.register_callback(name, handler, inputs_list, outputs_list)`
- [ ] All input parameter names declared in `inputs_list`
- [ ] All output keys declared in `outputs_list`
- [ ] Type hints for helper methods
- [ ] Docstrings for handler and helper functions
- [ ] Error handling for invalid inputs
- [ ] Unit tests for handler logic
- [ ] Integration test in workflow

## Correct vs Incorrect Patterns

### Correct: register_callback()

```python
reg = kailash.NodeRegistry()

def process_data(inputs):
    data = inputs.get("data", "")
    return {"result": data.upper()}

reg.register_callback(
    "DataProcessor",
    process_data,
    ["data"],
    ["result"]
)
```

### Incorrect: Class-based Node (does NOT exist in Rust binding)

```python
# WRONG - No Node base class, no get_parameters(), no NodeParameter
class MyNode(Node):                          # ❌ Node class doesn't exist
    def get_parameters(self):                # ❌ get_parameters() doesn't exist
        return {
            "data": NodeParameter(...)       # ❌ NodeParameter doesn't exist
        }
    def run(self, **kwargs):                 # ❌ Not how custom nodes work
        pass
```

## Parameter Naming

### Available Parameter Names

Parameters are declared as string lists in `register_callback()`:

```python
reg.register_callback(
    "MyNode",
    handler_fn,
    ["id", "metadata", "data", "config"],  # Any names except reserved
    ["result", "status"]
)
```

### Reserved Names (Do Not Use)

The only reserved name is `_node_id` (internal identifier):

```python
# ❌ Do not use _node_id as input or output name
reg.register_callback("MyNode", handler_fn, ["_node_id"], ["result"])
```

### Passing Parameters to Custom Nodes

Parameters are passed via config dict in `add_node()`:

```python
builder.add_node("MyNode", "node1", {
    "id": "item-123",
    "metadata": {"source": "api"},
    "data": "payload"
})
```

Or via runtime parameters:

```python
result = rt.execute(wf, inputs={
    "node1": {"data": "override_payload"}
})
```

## Documentation

- **Custom Nodes**: See `register_callback()` in Core SDK patterns

<!-- Trigger Keywords: create custom node, custom node standard, node development, custom node gold standard -->
