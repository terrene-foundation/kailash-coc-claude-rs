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

### ConditionalNode (True/False Branching)

For simple true/false branching, use **ConditionalNode** instead of SwitchNode:

```python
import kailash

builder = kailash.WorkflowBuilder()

builder.add_node("ConditionalNode", "router", {
    "condition": "score >= 80"
})

# ConditionalNode outputs: "true_output" and "false_output"
builder.connect("router", "true_output", "high_processor", "data")
builder.connect("router", "false_output", "low_processor", "data")
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

### ConditionalNode (Multi-Condition)

ConditionalNode can also be used with multiple conditions for routing:

```python
builder.add_node("ConditionalNode", "conditional", {
    "condition": "age > 18"
})
# Use SwitchNode for multi-way routing with discrete values
builder.add_node("SwitchNode", "multi_route", {
    "cases": {"child": "child_flow", "teen": "teen_flow", "adult": "adult_flow"},
    "default_branch": "default_flow"
})
```

## Loop Nodes

### LoopNode

```python
builder.add_node("LoopNode", "loop", {
    "iterations": 5,
    "body": "process_item"
})

# LoopNode also supports condition-based looping
builder.add_node("LoopNode", "while_loop", {
    "condition": "count < 100",
    "body": "increment_counter"
})
```

## Related Skills

- **SwitchNode Patterns**: [`switchnode-patterns`](../../01-core-sdk/switchnode-patterns.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: Switch node, Merge node, conditional, routing, logic nodes, SwitchNode, MergeNode, ConditionalNode -->
