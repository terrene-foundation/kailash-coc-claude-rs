---
name: validate-parameters
description: "Validate node parameters. Use when asking 'validate parameters', 'check node params', or 'parameter validation'."
---

# Validate Node Parameters

> **Skill Metadata**
> Category: `validation`
> Priority: `HIGH`

## Parameter Validation

```python
import kailash

builder = kailash.WorkflowBuilder()

# Valid: All required parameters
builder.add_node("LLMNode", "llm1", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "Hello"
})

# Invalid: Missing required 'prompt'
# builder.add_node("LLMNode", "llm2", {
#     "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o")
# })  # Error!

# Validate at build time
reg = kailash.NodeRegistry()
builder.build(reg)  # Raises error if parameters invalid
```

## Validation Methods

Validation is built into the WorkflowBuilder and Runtime:

```python
# builder.build(reg) validates:
# 1. Workflow structure (DAG validity, no orphan nodes)
# 2. Connection contracts (output→input parameter compatibility)
# 3. Required parameters are provided
# 4. Node types exist in the registry
# 5. No duplicate node IDs
```

### Runtime Validation

```python

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

# Validation happens at execution time
try:
    result = rt.execute(builder.build(reg))
except WorkflowValidationError as e:
    print(f"Validation failed: {e}")
```

## Custom Node Parameter Validation

Define parameter contracts for validation:

```python
import kailash

def validated_handler(inputs):
    """Custom node with parameter validation."""
    file_path = inputs.get("file_path")
    if not file_path:
        raise ValueError("file_path is required")

    threshold = inputs.get("threshold", 100)

    # Business logic validation
    if threshold < 0:
        raise ValueError("threshold must be non-negative")

    return {"result": process(file_path, threshold)}

registry = kailash.NodeRegistry()
registry.register_callback(
    "ValidatedNode", validated_handler,
    ["file_path", "threshold"],  # inputs
    ["result"]                   # outputs
)
```

## Validation Errors

### Missing Required Parameters

```python
# Error: Missing 'action' and 'source_path'
builder.add_node("CSVProcessorNode", "reader", {
    "delimiter": ","  # action and source_path are required!
})
# Raises: WorkflowValidationError
```

### Invalid Parameter Types

```python
# Error: Wrong type for 'threshold'
builder.add_node("FilterNode", "filter", {
    "threshold": "100"  # Should be int, not str
})
# Raises: WorkflowValidationError
```

### Unknown Parameters

```python
# Error: Unknown parameter 'unknown_param'
builder.add_node("CSVProcessorNode", "reader", {
    "action": "read",
    "source_path": "data.csv",
    "unknown_param": "value"  # Not defined in node contract
})
# Raises: WorkflowValidationError
```

## Connection Validation

The builder validates connection contracts at build time:

```python
# Valid: Output type matches input type
builder.add_node("CSVProcessorNode", "reader", {"action": "read", "source_path": "data.csv"})
builder.add_node("DataMapperNode", "transformer", {})
builder.connect("reader", "rows", "transformer", "input_data")

# Invalid: Type mismatch
# builder.connect("reader", "metadata", "transformer", "input_data")
# Raises: WorkflowValidationError (if contracts enforce types)
```

## Common Validation Issues

1. **Missing required parameters** - Provide all required parameters
2. **Invalid parameter types** - Match parameter types to node contract
3. **Unknown parameters** - Only use declared parameters
4. **Invalid parameter values** - Validate business logic constraints
5. **Connection type mismatches** - Ensure compatible types

## Related Patterns

- **For parameter passing**: See [`gold-parameter-passing`](#)
- **For runtime execution**: See [`runtime-execution`](#)
- **For workflow basics**: See [`workflow-quickstart`](#)

## Documentation References

### Implementation

- Validation is built into `WorkflowBuilder.build(reg)` and `Runtime.execute()`
- No separate validation module needed — validation is integrated into the build/execute pipeline

## Quick Tips

- Validation happens at `builder.build(reg)` and `rt.execute()`
- Define parameter contracts with `get_parameters()` in custom nodes
- Use required=True for mandatory parameters
- Add business logic validation in `run()` method
- Runtime validates workflows at build time and execution time

<!-- Trigger Keywords: validate parameters, check node params, parameter validation, node parameters -->
