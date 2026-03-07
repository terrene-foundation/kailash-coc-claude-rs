---
name: gold-absolute-imports
description: "Absolute imports standard requiring full module paths, never relative imports. Use when asking 'absolute imports', 'import standards', 'import validation', 'no relative imports', 'import rules', or 'import gold standard'."
---

# Gold Standard: Absolute Imports

Gold Standard: Absolute Imports guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Gold Standard: Absolute Imports
- **Category**: gold-standards
- **Priority**: HIGH
- **Trigger Keywords**: absolute imports, import standards, import validation, no relative imports

## Core Pattern

```python
import kailash

# Gold Absolute Imports implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters
# Reference: gold-absolute-imports

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Gold-Absolute-Imports Core Functionality**: Primary operations and common patterns
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

- 💡 **Tip 1**: Always follow Gold Standard: Absolute Imports best practices
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference documentation for details

## Keywords for Auto-Trigger

<!-- Trigger Keywords: absolute imports, import standards, import validation, no relative imports -->
