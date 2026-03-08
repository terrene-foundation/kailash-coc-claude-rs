---
name: validate-connections
description: "Validate workflow connections. Use when asking 'validate workflow', 'check connections', or 'workflow validation'."
---

# Validate Workflow Connections

> **Skill Metadata**
> Category: `validation`
> Priority: `HIGH`

## Validation Checks

```python
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "node1", {})
builder.add_node("JSONTransformNode", "node2", {})

# ✅ Valid connection (4-parameter pattern)
builder.connect("node1", "result", "node2", "input")

# ❌ Invalid: node doesn't exist
# builder.connect("node1", "node3")  # Error!

# Validate workflow
reg = kailash.NodeRegistry()
built = builder.build(reg)  # Raises error if invalid
```

## Common Issues

1. **Missing connections** - Isolated nodes
2. **Invalid node IDs** - Typos in connections
3. **Circular dependencies** - A → B → A
4. **Unreachable nodes** - No path from start

<!-- Trigger Keywords: validate workflow, check connections, workflow validation, connection errors -->
