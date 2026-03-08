---
name: nodes-logic-reference
description: "Logic nodes reference (Switch, Merge, Conditional). Use when asking 'Switch node', 'Merge node', 'conditional', 'routing', or 'logic nodes'."
---

# Logic Nodes Reference

Complete reference for control flow and logic nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `MEDIUM`
> Related Skills: [`switchnode-patterns`](../../01-core-sdk/switchnode-patterns.md), [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (control flow patterns)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available logic nodes: SwitchNode, MergeNode,
#   ConditionalRouterNode, LoopNode, WhileNode
```

## Switch Node

### SwitchNode
```python
import kailash

builder = kailash.WorkflowBuilder()

# Boolean routing (true_output/false_output)
builder.add_node("SwitchNode", "router", {
    "condition_field": "score",
    "operator": ">=",
    "value": 80
})

# Multi-case routing (case_X outputs)
builder.add_node("SwitchNode", "status_router", {
    "condition_field": "status",
    "cases": ["active", "inactive", "pending"]
})
```

### ⚠️ Dot Notation Limitation

SwitchNode outputs are **mutually exclusive** (one is always `None`). Dot notation behavior depends on execution mode:

**✅ skip_branches mode** (recommended): Dot notation works - inactive branches skipped
```python
import kailash

builder.connect("router", "true_output.name", "processor", "name")
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
```

**⚠️ route_data mode**: Avoid dot notation - connect full output
```python
import kailash

builder.connect("router", "true_output", "processor", "data")
# Extract field in code: name = data.get('name') if data else None
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
```

## Merge Node

### MergeNode
```python
builder.add_node("MergeNode", "combine", {
    "strategy": "all",  # or "any", "first"
    "input_sources": ["branch_a", "branch_b", "branch_c"]
})
```

## Conditional Router

### ConditionalRouterNode
```python
builder.add_node("ConditionalRouterNode", "conditional", {
    "filter": [
        {"condition": "age > 18", "route": "adult_flow"},
        {"condition": "age < 13", "route": "child_flow"},
        {"condition": "True", "route": "default_flow"}  # Default
    ]
})
```

## Loop Nodes

### LoopNode
```python
builder.add_node("LoopNode", "loop", {
    "iterations": 5,
    "body": "process_item"
})
```

### WhileNode
```python
builder.add_node("WhileNode", "while_loop", {
    "condition": "count < 100",
    "body": "increment_counter"
})
```

## Related Skills

- **SwitchNode Patterns**: [`switchnode-patterns`](../../01-core-sdk/switchnode-patterns.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: Switch node, Merge node, conditional, routing, logic nodes, SwitchNode, MergeNode, ConditionalRouterNode -->
