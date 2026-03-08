---
name: pythoncode-best-practices
description: "Best practices for EmbeddedPythonNode including result wrapping, from_function decorator, and common patterns. Use when asking 'EmbeddedPythonNode', 'Python code', 'custom logic', 'from_function', 'result wrapping', 'PythonCode patterns', 'code node', 'Python in workflow', or 'code best practices'."
---

# EmbeddedPythonNode Best Practices

EmbeddedPythonNode Best Practices guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `CRITICAL`

## Quick Reference

- **Primary Use**: EmbeddedPythonNode Best Practices
- **Category**: core-sdk
- **Priority**: CRITICAL
- **Trigger Keywords**: EmbeddedPythonNode, Python code, custom logic, from_function, result wrapping

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

# Pythoncode Best Practices implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Pythoncode-Best-Practices Core Functionality**: Primary operations and common patterns
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

- 💡 **Tip 1**: Always follow EmbeddedPythonNode Best Practices best practices
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference documentation for details

## Keywords for Auto-Trigger

<!-- Trigger Keywords: EmbeddedPythonNode, Python code, custom logic, from_function, result wrapping -->
