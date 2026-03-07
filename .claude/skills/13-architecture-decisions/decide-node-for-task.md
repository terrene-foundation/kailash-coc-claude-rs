---
name: decide-node-for-task
description: "Select appropriate nodes from 110+ options for specific tasks and use cases. Use when asking 'which node', 'node for task', 'choose node', 'node selection', 'what node', or 'node recommendation'."
---

# Decision: Node Selection

Decision: Node Selection guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `CRITICAL`

## Quick Reference

- **Primary Use**: Decision: Node Selection
- **Category**: cross-cutting
- **Priority**: CRITICAL
- **Trigger Keywords**: which node, node for task, choose node, node selection, what node

## Core Pattern

```python
import kailash

# Decide Node For Task implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters
# Reference: decide-node-for-task

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Decide-Node-For-Task Core Functionality**: Primary operations and common patterns
- **Integration Patterns**: Connect with other nodes, workflows, external systems
- **Error Handling**: Robust error handling with retries, fallbacks, and logging
- **Performance**: Optimization techniques, caching, batch operations, async execution
- **Production Use**: Enterprise-grade patterns with monitoring, security, and reliability

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

- 💡 **Tip 1**: Always follow Decision: Node Selection best practices
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference documentation for details

## Keywords for Auto-Trigger

<!-- Trigger Keywords: which node, node for task, choose node, node selection, what node -->
