---
name: production-readiness
description: "Production readiness checklist and patterns. Use when asking 'production ready', 'deploy workflows', 'production checklist', 'production patterns', or 'deployment readiness'."
---

# Production Readiness

Production Readiness for production-ready workflows.

> **Skill Metadata**
> Category: `production`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Production Readiness
- **Category**: production
- **Priority**: HIGH
- **Trigger Keywords**: production ready, deploy workflows, production checklist, production patterns

## Core Pattern

```python

# Production Readiness implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Production-Readiness Core Functionality**: Primary operations and common patterns
- **Integration Patterns**: Connect with other nodes, workflows, external systems
- **Error Handling**: Robust error handling with retries, fallbacks, and logging
- **Performance**: Optimization techniques, caching, batch operations, async execution
- **Production Use**: Enterprise-grade patterns with monitoring, security, and reliability

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For patterns**: See [`workflow-patterns-library`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:
- **pattern-expert**: Complex patterns, multi-node workflows
- **sdk-navigator**: Error resolution, parameter issues
- **testing-specialist**: Comprehensive testing strategies

## Quick Tips

- 💡 **Tip 1**: Follow best practices from documentation
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference examples for complex cases

## Keywords for Auto-Trigger

<!-- Trigger Keywords: production ready, deploy workflows, production checklist, production patterns -->
