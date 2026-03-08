---
name: switchnode-patterns
description: "Conditional data routing with SwitchNode (multi-case) and ConditionalNode (value selection). Use when asking 'SwitchNode', 'conditional routing', 'if else workflow', 'route data', 'conditional logic', 'switch patterns', 'branch workflow', 'conditional flow', or 'routing patterns'."
---

# SwitchNode & ConditionalNode Routing

Guide to conditional routing with SwitchNode (multi-case matching) and ConditionalNode (boolean value selection).

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **SwitchNode**: Multi-case routing. Config: `cases` (Object mapping values to branch names), `default_branch` (optional). Input: `condition` (value to match). Outputs: `matched` (branch name), `data` (forwarded).
- **ConditionalNode**: Value selection based on boolean condition. No config. Inputs: `condition` (boolean), `if_value`, `else_value`. Output: `result` (the selected value).
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

## ConditionalNode Pattern (Value Selection)

ConditionalNode selects between two values based on a boolean condition. It takes THREE inputs (`condition`, `if_value`, `else_value`) and outputs ONE value (`result`). There is no expression parser -- `condition` is evaluated for truthiness at runtime.

```python
# No config needed for ConditionalNode
builder.add_node("ConditionalNode", "check", {})

# Connect the whole outputs from an EmbeddedPythonNode -- port names are flat, no dot-path resolution
builder.connect("evaluator", "outputs", "check", "condition")
builder.connect("evaluator", "outputs", "check", "if_value")
builder.connect("evaluator", "outputs", "check", "else_value")

# ConditionalNode outputs "result" (the selected value)
builder.connect("check", "result", "handler", "data")
```

**Note**: ConditionalNode does NOT route to different downstream nodes. It selects a value. For routing to different handlers, use **SwitchNode** above.

## Common Use Cases

- **Multi-case routing**: Route by status, type, or category using SwitchNode `cases`
- **Value selection**: Choose between two values based on a boolean using ConditionalNode
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
- SwitchNode outputs are `matched` (branch name) and `data` (forwarded input)
- ConditionalNode selects a value (output: `result`), it does NOT route to different handlers
- For multi-branch routing, use SwitchNode. For value selection, use ConditionalNode
- Always set `default_branch` on SwitchNode to handle unmatched conditions

## Keywords for Auto-Trigger

<!-- Trigger Keywords: SwitchNode, conditional routing, if else workflow, route data, conditional logic -->
