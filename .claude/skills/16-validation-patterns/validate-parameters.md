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
    "provider": "openai",
    "model": "gpt-4",
    "prompt": "Hello"
})

# Invalid: Missing required 'prompt'
# builder.add_node("LLMNode", "llm2", {
#     "provider": "openai",
#     "model": "gpt-4"
# })  # Error!

# Validate at build time
reg = kailash.NodeRegistry()
builder.build(reg)  # Raises error if parameters invalid
```

## Validation Methods (Internal)

Runtime uses ValidationMixin for validation logic:

```python
# ValidationMixin provides 5 validation methods:
# 1. validate_workflow() - Validates complete workflow structure
# 2. _validate_connection_contracts() - Validates connection parameter contracts
# 3. _validate_conditional_execution_prerequisites() - Validates conditional node setup
# 4. _validate_switch_results() - Validates SwitchNode output structure
# 5. _validate_conditional_execution_results() - Validates conditional execution results
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
from typing import Dict, Any

class ValidatedNode(Node):
    def get_parameters(self) -> Dict[str, NodeParameter]:
        """Define parameter validation contract."""
        return {
            "file_path": NodeParameter(
                type=str,
                required=True,
                description="Path to input file"
            ),
            "threshold": NodeParameter(
                type=int,
                required=False,
                default=100,
                description="Processing threshold"
            )
        }

    def run(self, **kwargs) -> Dict[str, Any]:
        # Parameters are pre-validated by runtime
        file_path = kwargs["file_path"]  # Guaranteed to exist
        threshold = kwargs.get("threshold", 100)  # Has default

        # Business logic validation
        if threshold < 0:
            raise ValueError("threshold must be non-negative")

        return {"result": process(file_path, threshold)}
```

## Validation Errors

### Missing Required Parameters

```python
# Error: Missing 'file_path'
builder.add_node("CSVReaderNode", "reader", {
    "delimiter": ","  # file_path is required!
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
builder.add_node("CSVReaderNode", "reader", {
    "file_path": "data.csv",
    "unknown_param": "value"  # Not defined in node contract
})
# Raises: WorkflowValidationError
```

## Connection Validation

ValidationMixin validates connection contracts:

```python
# Valid: Output type matches input type
builder.add_node("CSVReaderNode", "reader", {"file_path": "data.csv"})
builder.add_node("DataTransformerNode", "transformer", {})
builder.add_connection("reader", "data", "transformer", "input_data")

# Invalid: Type mismatch
# builder.add_connection("reader", "metadata", "transformer", "input_data")
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

### Internal Implementation
- `src/kailash/runtime/mixins/validation.py` - ValidationMixin (523 lines)
- Provides validation logic for Runtime

## Quick Tips

- Validation happens at `builder.build(reg)` and `rt.execute()`
- Define parameter contracts with `get_parameters()` in custom nodes
- Use required=True for mandatory parameters
- Add business logic validation in `run()` method
- Runtime validates workflows at build time and execution time

<!-- Trigger Keywords: validate parameters, check node params, parameter validation, node parameters -->
