---
name: gold-parameter-passing
description: "Parameter passing standard with three methods, explicit parameter declaration, parameter scoping, and enterprise security patterns. Use when asking 'parameter standard', 'parameter gold', 'parameter validation', 'parameter security', or 'parameter compliance'."
---

# Gold Standard: Parameter Passing

Parameter passing compliance standard with three methods, automatic unwrapping, and security patterns.

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `CRITICAL`

## Quick Reference

- **Primary Use**: Parameter Passing Compliance Standard
- **Category**: gold-standards
- **Priority**: CRITICAL
- **Trigger Keywords**: parameter standard, parameter gold, parameter validation, parameter security, parameter scoping

## Three Methods of Parameter Passing

### Method 1: Node Configuration (Most Reliable)

```python
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("CSVProcessorNode", "reader", {
    "file_path": "data.csv",
    "delimiter": ",",
    "has_header": True
})
```

**Use when**: Static values, test fixtures, default settings

### Method 2: Workflow Connections (Dynamic Data Flow)

```python
builder.add_node("CSVProcessorNode", "reader", {"file_path": "data.csv"})
builder.add_node("DataTransformerNode", "transformer", {})

# Pass data between nodes (4-parameter syntax)
builder.connect("reader", "data", "transformer", "input_data")
```

**Use when**: Dynamic data flow, pipelines, transformations

### Method 3: Runtime Parameters (User Input)

```python

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(
    builder.build(reg),
    inputs={
        "reader": {"file_path": "custom.csv"},
        "transformer": {"operation": "normalize"}
    }
)
```

**Use when**: User input, environment overrides, dynamic values

## Parameter Scoping

**Node-specific parameters are automatically unwrapped:**

```python
# What you pass to runtime:
parameters = {
    "api_key": "global-key",      # Global param (all nodes)
    "node1": {"value": 10},        # Node-specific for node1
    "node2": {"value": 20}         # Node-specific for node2
}

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
rt.execute(builder.build(reg), inputs=parameters)

# What node1 receives (unwrapped automatically):
{
    "api_key": "global-key",       # Global param
    "value": 10                     # Unwrapped from nested dict
}
# node1 does NOT receive node2's parameters (isolated)
```

**Scoping Rules:**

1. **Parameters filtered by node ID**: Only relevant params passed to each node
2. **Node-specific params unwrapped**: Contents extracted from nested dict
3. **Global params included**: Top-level non-node-ID keys go to all nodes
4. **Other nodes' params excluded**: Prevents parameter leakage

## Explicit Parameter Declaration (Security)

Custom nodes must declare input and output parameters explicitly via `register_callback()`:

```python
reg = kailash.NodeRegistry()

def csv_processor(inputs):
    """Process CSV file with explicit parameter handling."""
    file_path = inputs["file_path"]        # Required - must be provided
    delimiter = inputs.get("delimiter", ",")  # Optional with default
    return {"data": process_file(file_path, delimiter)}

# Declare ALL expected inputs and outputs at registration time
reg.register_callback(
    "CSVProcessor",
    csv_processor,
    ["file_path", "delimiter"],   # input parameter names (explicit declaration)
    ["data"]                       # output parameter names
)

# Pass parameters via config dict
builder.add_node("CSVProcessor", "reader", {
    "file_path": "data.csv",
    "delimiter": ","
})
```

**Why explicit declaration?**

- **Security**: Only declared inputs are passed to the handler
- **Compliance**: Enables parameter tracking and auditing
- **Debugging**: Clear parameter expectations at registration time
- **Testing**: Testable parameter contracts
- **Isolation**: Automatic scoping prevents data leakage

## Parameter Naming

### Using "metadata" as a Parameter Name

You can use `metadata` as a parameter name in custom nodes:

```python
reg = kailash.NodeRegistry()

def custom_handler(inputs):
    data = inputs["data"]
    metadata = inputs.get("metadata")
    processed = data.upper()
    return {"data": processed, "metadata": metadata}

reg.register_callback(
    "CustomNode",
    custom_handler,
    ["data", "metadata"],       # "metadata" is a valid parameter name
    ["data", "metadata"]
)

# Pass metadata via config dict
builder.add_node("CustomNode", "node1", {
    "data": "hello",
    "metadata": {"source": "api", "version": 2}
})
```

### Reserved Names

The only reserved parameter name is `_node_id`:

```python
# ❌ Do not use _node_id as input or output name
reg.register_callback("MyNode", handler, ["_node_id"], ["result"])
```

## Common Pitfalls

### Pitfall 1: Empty Input Declaration

```python
# WRONG - No inputs declared
reg.register_callback("BadNode", handler, [], ["result"])
# Handler receives empty inputs dict!

# CORRECT - Explicit input declaration
reg.register_callback("GoodNode", handler, ["config"], ["result"])
```

### Pitfall 2: Using Class-Based Node Pattern (Does NOT Exist)

```python
# WRONG - No Node base class, no get_parameters(), no NodeParameter in Rust binding
class MyNode(Node):                         # ❌ Node class doesn't exist
    def get_parameters(self):               # ❌ get_parameters() doesn't exist
        return {"param": NodeParameter(...)}  # ❌ NodeParameter doesn't exist

# CORRECT - Use register_callback()
def my_handler(inputs):
    return {"result": inputs.get("param", "")}

reg.register_callback("MyNode", my_handler, ["param"], ["result"])
```

## Validation Errors

**Validation failures now raise ValueError:**

```python
try:
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
except ValueError as e:
    print(f"Configuration error: {e}")

try:
    builder.build(reg)  # Validates parameters
except ValueError as e:  # Missing required parameters
    print(f"Parameter error: {e}")
```

## Related Patterns

- **For runtime execution**: See [`runtime-execution`](../01-core-sdk/runtime-execution.md)
- **For workflow basics**: See [`workflow-quickstart`](../01-core-sdk/workflow-quickstart.md)
- **For quick reference**: See [`param-passing-quick`](../01-core-sdk/param-passing-quick.md)

## Documentation References

### Internal Implementation

- `src/kailash/runtime/local.py:1621-1640` - Parameter scoping implementation

## Quick Tips

- Use Method 1 (node configuration) for tests - most reliable
- Use Method 2 (connections) for dynamic data flow between nodes
- Use Method 3 (runtime parameters) for user input and overrides
- Always declare inputs/outputs explicitly via `register_callback()`
- Parameter scoping prevents data leakage automatically
- Validation errors raise ValueError

## Keywords for Auto-Trigger

<!-- Trigger Keywords: parameter standard, parameter gold, parameter validation, parameter security, parameter scoping, parameter compliance, parameter isolation, unwrap parameters -->
