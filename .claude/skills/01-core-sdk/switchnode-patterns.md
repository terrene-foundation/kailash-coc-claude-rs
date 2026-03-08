---
name: switchnode-patterns
description: "Conditional data routing with SwitchNode using conditions and operators. Use when asking 'SwitchNode', 'conditional routing', 'if else workflow', 'route data', 'conditional logic', 'switch patterns', 'branch workflow', 'conditional flow', or 'routing patterns'."
---

# SwitchNode Conditional Routing

SwitchNode Conditional Routing guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: SwitchNode Conditional Routing
- **Category**: core-sdk
- **Priority**: HIGH
- **Trigger Keywords**: SwitchNode, conditional routing, if else workflow, route data, conditional logic

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

# Basic SwitchNode conditional routing
builder = kailash.WorkflowBuilder()

builder.add_node("SwitchNode", "switch", {
    "condition_field": "status",
    "operator": "==",
    "value": "active"
})

# Connect both branches
builder.connect("switch", "true_output", "active_processor", "input")
builder.connect("switch", "false_output", "inactive_processor", "input")

# Use skip_branches mode for best performance
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## ⚠️ Dot Notation: Execution Mode Dependent

SwitchNode outputs are **mutually exclusive** - when `true_output` has data, `false_output` is `None`, and vice versa.

### ✅ skip_branches Mode (Recommended)
**Dot notation works perfectly** - inactive branches are automatically skipped:

```python
# Dot notation on SwitchNode outputs
builder.connect("switch", "true_output.name", "processor", "name")
builder.connect("switch", "false_output.name", "alt_processor", "name")

# Use skip_branches mode (default for new code)
rt = kailash.Runtime(reg)
# Only the active branch executes - inactive is skipped intelligently
```

**Why it works**: Runtime detects `None` values and skips nodes automatically.

### ⚠️ route_data Mode
**Avoid dot notation** - connect full output and extract fields in node code:

```python
# Connect full output (no dot notation)
builder.connect("switch", "true_output", "processor", "data")

# Extract field INSIDE node code
builder.add_node("EmbeddedPythonNode", "processor", {
    "code": """
if data is not None:
    name = data.get('name', 'Unknown')
    result = f'Processing: {name}'
else:
    result = 'No data (inactive branch)'
"""
})

rt = kailash.Runtime(reg)
```

**Why avoid**: Accessing `None.field_name` fails navigation. Node receives empty input and raises NameError.

## Common Use Cases

- **Switchnode-Patterns Workflows**: Pre-built patterns for common use cases with best practices built-in
- **Composition Patterns**: Combine multiple workflows, create reusable sub-workflows, build complex orchestrations
- **Error Handling**: Built-in retry logic, fallback paths, compensation actions for resilient workflows
- **Performance Optimization**: Parallel execution, batch operations, async patterns for high-throughput processing
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

- 💡 **Tip 1**: Always follow SwitchNode Conditional Routing best practices
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference documentation for details

## Keywords for Auto-Trigger

<!-- Trigger Keywords: SwitchNode, conditional routing, if else workflow, route data, conditional logic -->
