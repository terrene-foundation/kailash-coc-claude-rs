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
#   ConditionalNode, LoopNode
```

## Switch Node

### SwitchNode

SwitchNode matches the `condition` input against `cases` keys and routes to the matching branch.

- **Config**: `cases` (Object mapping condition values to branch names), `default_branch` (optional String)
- **Input**: `condition` (String, required) -- the value to match against cases
- **Input**: `data` (Any, optional) -- data to forward
- **Outputs**: `matched` (String -- the branch name), `data` (forwarded input)

```python
import kailash

builder = kailash.WorkflowBuilder()

# Multi-case routing with SwitchNode
builder.add_node("SwitchNode", "status_router", {
    "cases": {"active": "active_handler", "inactive": "inactive_handler", "pending": "pending_handler"},
    "default_branch": "inactive_handler"
})

# Connect condition input and use outputs
builder.connect("source", "status", "status_router", "condition")
builder.connect("status_router", "data", "next_step", "input")
# status_router "matched" output contains the branch name string
```

### ConditionalNode (Value Selection)

ConditionalNode selects between two values based on a boolean condition. It has THREE inputs (`condition`, `if_value`, `else_value`) and ONE output (`result`):

```python
import kailash

builder = kailash.WorkflowBuilder()

# ConditionalNode: no config needed. Inputs: condition, if_value, else_value. Output: result.
builder.add_node("ConditionalNode", "router", {})

# Connect the boolean condition and two candidate values
builder.connect("source", "is_high", "router", "condition")
builder.connect("source", "high_msg", "router", "if_value")
builder.connect("source", "low_msg", "router", "else_value")

# ConditionalNode outputs "result" (the selected value), NOT "true_output"/"false_output"
builder.connect("router", "result", "next_step", "data")
```

For multi-branch routing to different handlers, use **SwitchNode** instead (see above).

## Merge Node

### MergeNode

MergeNode combines inputs from multiple branches. Output port: `"merged"`.

```python
builder.add_node("MergeNode", "combine", {})
# Output: builder.connect("combine", "merged", "next_step", "data")
```

## Conditional Routing Note

ConditionalNode takes NO config params -- it is purely input-driven:
- Inputs: `condition`, `if_value`, `else_value` (via connections)
- Output: `result` (the selected value)

For multi-way routing with discrete values, use **SwitchNode**:

```python
builder.add_node("SwitchNode", "multi_route", {
    "cases": {"child": "child_flow", "teen": "teen_flow", "adult": "adult_flow"},
    "default_branch": "default_flow"
})
```

## Loop Nodes

### LoopNode

LoopNode iterates over items in an array. It does NOT support condition-based looping or iteration counts -- it processes each item in the input array.

- **Input**: `items` (Array, required) -- the array to iterate over
- **Input**: `max_iterations` (Integer, optional, default: 100) -- maximum number of iterations
- **Output**: `results` (Array) -- accumulated items from the loop
- **Output**: `count` (Integer) -- number of iterations performed

```python
builder.add_node("LoopNode", "loop", {})

# Connect the array input
builder.connect("source", "items_array", "loop", "items")

# Access outputs
builder.connect("loop", "results", "next_step", "data")
builder.connect("loop", "count", "next_step", "total")
```

## Related Skills

- **SwitchNode Patterns**: [`switchnode-patterns`](../../01-core-sdk/switchnode-patterns.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: Switch node, Merge node, conditional, routing, logic nodes, SwitchNode, MergeNode, ConditionalNode -->
