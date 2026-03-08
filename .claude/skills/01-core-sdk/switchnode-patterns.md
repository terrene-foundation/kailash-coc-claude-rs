---
name: switchnode-patterns
description: "Conditional data routing with SwitchNode (multi-case) and ConditionalNode (true/false). Use when asking 'SwitchNode', 'conditional routing', 'if else workflow', 'route data', 'conditional logic', 'switch patterns', 'branch workflow', 'conditional flow', or 'routing patterns'."
---

# SwitchNode & ConditionalNode Routing

Guide to conditional routing with SwitchNode (multi-case matching) and ConditionalNode (true/false branching).

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **SwitchNode**: Multi-case routing. Config: `cases` (Object mapping values to branch names), `default_branch` (optional). Input: `condition` (value to match). Outputs: `matched` (branch name), `data` (forwarded).
- **ConditionalNode**: True/false branching. Config: `condition` (expression). Outputs: `true_output`, `false_output`.
- **Category**: core-sdk
- **Priority**: HIGH

## SwitchNode Pattern (Multi-Case Routing)

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# SwitchNode matches the "condition" input against case keys
builder.add_node("SwitchNode", "switch", {
    "cases": {"active": "active_handler", "inactive": "inactive_handler"},
    "default_branch": "inactive_handler"
})

# SwitchNode outputs: "matched" (branch name string) and "data" (forwarded input)
builder.connect("source", "status", "switch", "condition")
builder.connect("switch", "data", "active_processor", "input")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## ConditionalNode Pattern (True/False Branching)

For simple true/false branching, use **ConditionalNode** instead of SwitchNode:

```python
builder.add_node("ConditionalNode", "check", {
    "condition": "score > 80"
})

# ConditionalNode outputs: "true_output" and "false_output"
builder.connect("check", "true_output", "high_handler", "data")
builder.connect("check", "false_output", "low_handler", "data")
```

## Common Use Cases

- **Multi-case routing**: Route by status, type, or category using SwitchNode `cases`
- **Binary branching**: True/false decisions using ConditionalNode
- **Default handling**: Always set `default_branch` on SwitchNode for unmatched cases
- **Error Handling**: Route errors to dedicated handlers
- **Production Readiness**: Health checks, monitoring, logging, metrics collection for enterprise deployments

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For connections**: See [`connection-patterns`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:
- Complex implementation needed
- Production deployment required
- Deep analysis necessary
- Enterprise patterns needed

## Quick Tips

- SwitchNode `cases` maps condition values to branch names -- the `condition` input is matched against case keys
- SwitchNode outputs are `matched` (branch name) and `data` (forwarded input) -- NOT `true_output`/`false_output`
- For true/false branching, use ConditionalNode instead of SwitchNode
- Always set `default_branch` on SwitchNode to handle unmatched conditions

## Keywords for Auto-Trigger

<!-- Trigger Keywords: SwitchNode, conditional routing, if else workflow, route data, conditional logic -->
