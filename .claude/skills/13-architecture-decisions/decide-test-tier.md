---
name: decide-test-tier
description: "Choose test tier (unit, integration, e2e) based on scope and dependencies. Use when asking 'test tier', 'unit vs integration', 'test type', 'which test', 'test strategy', or 'test level'."
---

# Decision: Test Tier Selection

Decision: Test Tier Selection guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `MEDIUM`

## Quick Reference

- **Primary Use**: Decision: Test Tier Selection
- **Category**: cross-cutting
- **Priority**: MEDIUM
- **Trigger Keywords**: test tier, unit vs integration, test type, which test, test strategy

## Core Pattern

```python
import kailash

# Decide Test Tier implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters
# Reference: decide-test-tier

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Decide-Test-Tier Core Functionality**: Primary operations and common patterns
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

- 💡 **Tip 1**: Always follow Decision: Test Tier Selection best practices
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference documentation for details

## Keywords for Auto-Trigger

<!-- Trigger Keywords: test tier, unit vs integration, test type, which test, test strategy -->
