---
name: kailash-quick-tips
description: "Quick tips and best practices for Kailash SDK development. Use when asking 'quick tips', 'best practices', 'tips', 'SDK tips', 'workflow tips', 'Kailash tips', or 'development tips'."
---

# Kailash SDK Quick Tips

Kailash SDK Quick Tips guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `patterns`
> Priority: `MEDIUM`

## Quick Reference

- **Primary Use**: Kailash SDK Quick Tips
- **Category**: patterns
- **Priority**: MEDIUM
- **Trigger Keywords**: quick tips, best practices, tips, SDK tips, workflow tips, Kailash tips

## Core Pattern

The API is Rust-backed. All types come from a single `import kailash`.

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "node_id", {"param": "value"})
builder.connect("node1", "output", "node2", "input")
wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
# result is dict: {"results": {...}, "run_id": "...", "metadata": {...}}
```

**Framework Types** (all from `import kailash`):

| Framework  | Key Types |
|------------|-----------|
| Core       | `NodeRegistry`, `WorkflowBuilder`, `Runtime` |
| DataFlow   | `DataFlow`, `ModelDefinition`, `FieldDef`, `FieldType`, `FilterCondition` |
| Nexus      | `Nexus`, `NexusConfig`, `Preset`, `HandlerParam`, `McpServer` |
| Kaizen     | `Agent`, `AgentConfig`, `LlmClient`, `CostTracker`, `ToolDef`, `ToolRegistry` |
| Enterprise | `RbacEvaluator`, `AbacEvaluator`, `AuditLogger`, `TenantRegistry` |
| Trust      | `TrustLevel`, `TrustPosture`, `EatpPosture`, `VerificationConfig` |

## Common Use Cases

- **Kailash-Quick-Tips Core Functionality**: Primary operations and common patterns
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

- 💡 **Tip 1**: Always follow Kailash SDK Quick Tips best practices
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference documentation for details

## Keywords for Auto-Trigger

<!-- Trigger Keywords: quick tips, best practices, tips, SDK tips, workflow tips, Kailash tips -->
