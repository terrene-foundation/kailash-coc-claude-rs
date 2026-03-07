---
name: cheatsheets
description: "Quick reference cheatsheets for Kailash SDK patterns, nodes, workflows, and best practices. Use when asking about 'quick tips', 'cheat sheet', 'quick reference', 'common mistakes', 'node selection', 'workflow patterns library', 'cycle patterns', 'production patterns', 'performance optimization', 'monitoring', 'security config', 'multi-tenancy', 'distributed transactions', 'saga pattern', 'custom nodes', 'PythonCode data science', 'ollama integration', 'directoryreader patterns', or 'environment variables'."
---

# Kailash Patterns - Quick Reference Cheatsheets

Comprehensive collection of quick reference guides, common patterns, and best practices for Kailash SDK development.

## Overview

This skill provides quick access to:
- Common workflow patterns and anti-patterns
- Node selection and usage guides
- Production-ready patterns
- Performance and optimization tips
- Security and enterprise patterns
- Integration cheatsheets

## Quick Reference Guides

### Essential Guides
- **[kailash-quick-tips](kailash-quick-tips.md)** - Essential tips for Kailash development
- **[common-mistakes-catalog](common-mistakes-catalog.md)** - Common pitfalls and solutions
- **[node-selection-guide](node-selection-guide.md)** - Choosing the right nodes
- **[workflow-patterns-library](workflow-patterns-library.md)** - Comprehensive pattern library
- **[README](README.md)** - Cheatsheets overview

### Node References
- **[admin-nodes-reference](admin-nodes-reference.md)** - Admin and management nodes
- **[asyncsql-advanced](asyncsql-advanced.md)** - AsyncSQL node patterns
- **[pythoncode-data-science](pythoncode-data-science.md)** - Data science with PythonCode
- **[directoryreader-patterns](directoryreader-patterns.md)** - File system patterns
- **[ollama-integration](ollama-integration.md)** - Local LLM integration
- **[query-builder](query-builder.md)** - Query construction patterns
- **[query-routing](query-routing.md)** - Intelligent query routing

### Production & Enterprise
- **[production-patterns](production-patterns.md)** - Production-ready patterns
- **[production-readiness](production-readiness.md)** - Production checklist
- **[performance-optimization](performance-optimization.md)** - Performance tuning
- **[monitoring-alerting](monitoring-alerting.md)** - Monitoring and alerting
- **[resilience-patterns](resilience-patterns.md)** - Resilience and fault tolerance
- **[security-config](security-config.md)** - Security configuration
- **[multi-tenancy-patterns](multi-tenancy-patterns.md)** - Multi-tenant architectures

### Enterprise Patterns
- **[distributed-transactions](distributed-transactions.md)** - Distributed transaction patterns
- **[saga-pattern](saga-pattern.md)** - Saga pattern for long transactions
- **[enterprise-mcp](enterprise-mcp.md)** - Enterprise MCP patterns
- **[a2a-coordination](a2a-coordination.md)** - Agent-to-agent coordination
- **[mcp-resource-subscriptions](mcp-resource-subscriptions.md)** - MCP resource patterns

### Development Tools
- **[custom-node-guide](custom-node-guide.md)** - Creating custom nodes
- **[developer-tools](developer-tools.md)** - Developer tooling
- **[node-initialization](node-initialization.md)** - Node initialization patterns
- **[env-variables](env-variables.md)** - Environment variable management
- **[validation-testing](validation-testing.md)** - Validation and testing patterns
- **[visualization](visualization.md)** - Workflow visualization

### Workflow Management
- **[workflow-composition](workflow-composition.md)** - Composing complex workflows
- **[workflow-design-process](workflow-design-process.md)** - Design process guide
- **[workflow-api-deployment](workflow-api-deployment.md)** - Deploying workflows as APIs
- **[workflow-export](workflow-export.md)** - Export and import patterns

### Integration Patterns
- **[data-integration](data-integration.md)** - Data integration patterns
- **[integration-mastery](integration-mastery.md)** - Advanced integration techniques

## Quick Patterns

### Basic Workflow
```python
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "node_id", {"param": "value"})
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Common Node Selection
```python
# Data processing
builder.add_node("PythonCode", "transform", {"code": "..."})

# API calls
builder.add_node("HTTPRequest", "api", {"url": "...", "method": "GET"})

# AI/LLM
builder.add_node("LLMNode", "chat", {"model": "gpt-4", "prompt": "..."})
```

### Cyclic Pattern
```python
builder.add_node("LoopNode", "loop", {"max_iterations": 5})
builder.add_node("ProcessNode", "process", {})
builder.add_connection("loop", "item", "process", "input")
builder.add_connection("process", "output", "loop", "feedback")
```

## CRITICAL Gotchas

| Rule | Why |
|------|-----|
| ❌ NEVER use raw SQL | Use DataFlow instead |
| ✅ ALWAYS call `.build()` | Before `rt.execute()` |
| ❌ NEVER use relative imports | Use absolute imports |
| ❌ NEVER mock in Tier 2-3 | Use real infrastructure |

## When to Use This Skill

Use this skill when you need:
- Quick reference for common patterns
- Solution to a specific problem
- Best practices for production
- Node selection guidance
- Performance optimization tips
- Security configuration help
- Multi-tenancy patterns
- Cyclic workflow help

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core SDK fundamentals
- **[07-development-guides](../development-guides/SKILL.md)** - Detailed development guides
- **[08-nodes-reference](../nodes/SKILL.md)** - Node reference documentation
- **[09-workflow-patterns](../workflows/SKILL.md)** - Industry workflow patterns
- **[17-gold-standards](../../17-gold-standards/SKILL.md)** - Mandatory best practices

## Support

For cheatsheet-related questions, invoke:
- `pattern-expert` - Pattern selection and usage
- `sdk-navigator` - Find specific patterns in documentation
- `framework-advisor` - Choose appropriate patterns for your use case
