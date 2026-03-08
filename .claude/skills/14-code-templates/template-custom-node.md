---
name: template-custom-node
description: "Generate Kailash custom node template. Use when requesting 'custom node template', 'create custom node', 'extend node', 'node development', or 'custom node boilerplate'."
---

# Custom Node Template

Template for creating custom Kailash SDK nodes with `register_callback()` and proper workflow integration.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)
> Related Subagents: `pattern-expert` (advanced node development)

## Basic Custom Node Template

```python
"""Custom Node Implementation"""

import kailash
from typing import Dict, Any

# --- Define handler function ---

def custom_processing_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Custom node for [specific purpose].

    Args:
        inputs: Dict containing input_data, operation, and options

    Returns:
        Dict with processing results
    """
    # Extract parameters from inputs dict
    input_data = inputs.get("input_data", {})
    operation = inputs.get("operation", "transform")
    options = inputs.get("options", {})

    # Implement your custom logic
    if operation == "transform":
        result = _transform_data(input_data, options)
    elif operation == "validate":
        result = _validate_data(input_data, options)
    else:
        raise ValueError(f"Unknown operation: {operation}")

    return result


def _transform_data(data: dict, options: dict) -> dict:
    """Transform data logic."""
    transformed = {k.upper(): v for k, v in data.items()}
    return {
        "transformed": transformed,
        "status": "success",
        "operation": "transform"
    }


def _validate_data(data: dict, options: dict) -> dict:
    """Validate data logic."""
    valid = all(k and v for k, v in data.items())
    return {
        "valid": valid,
        "status": "success",
        "operation": "validate"
    }


# --- Register custom node ---

reg = kailash.NodeRegistry()

reg.register_callback(
    "CustomProcessingNode",          # node type name
    custom_processing_handler,       # handler function
    ["input_data", "operation", "options"],  # input parameter names
    ["transformed", "status", "operation", "valid"]  # output parameter names
)
```

## Usage in Workflow

```python
# Use in workflow (registry already has the custom node registered)
builder = kailash.WorkflowBuilder()

builder.add_node("CustomProcessingNode", "custom", {
    "input_data": {"name": "test", "value": 123},
    "operation": "transform"
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

print(result["results"]["custom"])  # Custom node output
```

## Advanced Template with Validation

```python
from pydantic import BaseModel, Field
from typing import Dict, Any

class CustomNodeContract(BaseModel):
    """Parameter contract for validation."""
    input_data: dict = Field(description="Input data")
    threshold: float = Field(ge=0.0, le=1.0, default=0.5)
    operation: str = Field(pattern="^(filter|transform|aggregate)$")


def advanced_handler(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Custom node with Pydantic validation."""
    # Validate with Pydantic
    validated = CustomNodeContract(**inputs)

    # Execute logic
    if validated.operation == "filter":
        return _filter(validated.input_data, validated.threshold)
    elif validated.operation == "transform":
        return {"transformed": validated.input_data}
    elif validated.operation == "aggregate":
        return {"aggregated": validated.input_data}
    else:
        raise ValueError(f"Unknown operation: {validated.operation}")


def _filter(data: dict, threshold: float) -> dict:
    """Filter implementation."""
    return {"filtered": data, "threshold": threshold}


reg = kailash.NodeRegistry()
reg.register_callback(
    "AdvancedCustomNode",
    advanced_handler,
    ["input_data", "threshold", "operation"],
    ["filtered", "threshold", "transformed", "aggregated"]
)
```

## Related Patterns

- **Node development**: [`custom-node-guide`](../../06-cheatsheets/custom-node-guide.md)
- **Gold standard**: [`gold-custom-nodes`](../../17-gold-standards/gold-custom-nodes.md)

## When to Escalate

Use `pattern-expert` when:

- Complex custom node architecture
- Performance optimization
- Advanced parameter handling

## Quick Tips

- Always register custom nodes via `reg.register_callback(name, handler, inputs, outputs)`
- Use Pydantic for complex input validation inside the handler
- Handler receives a single `inputs` dict and returns a single output dict
- Declare all input/output parameter names in the registration call

<!-- Trigger Keywords: custom node template, create custom node, extend node, node development, custom node boilerplate, custom node example, develop node -->
