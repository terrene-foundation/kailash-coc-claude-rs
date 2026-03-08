---
name: development-guides
description: "Comprehensive development guides for advanced Kailash SDK features including custom node development, MCP development, async patterns, testing strategies, production deployment, RAG systems, security patterns, monitoring, and SDK internals. Use when asking about 'development guide', 'advanced features', 'custom node development', 'async node development', 'MCP development', 'production deployment', 'testing strategies', 'RAG implementation', 'security patterns', 'monitoring setup', 'circuit breaker', 'compliance', 'edge computing', or 'SDK internals'."
---

# Kailash Patterns - Development Guides

Comprehensive guides for advanced Kailash SDK development, covering custom development, production deployment, testing, and enterprise features.

## Overview

In-depth guides for:

- Custom node and workflow development
- Advanced SDK features
- Production deployment strategies
- Comprehensive testing approaches
- Enterprise security and compliance
- Monitoring and observability
- SDK internals and architecture

## Core Development

### SDK Fundamentals

- **[sdk-fundamentals](sdk-fundamentals.md)** - Core SDK concepts and architecture
- **[sdk-essentials](sdk-essentials.md)** - Essential SDK patterns
- **[feature-discovery](feature-discovery.md)** - Discovering SDK features
- **[advanced-features](advanced-features.md)** - Advanced SDK capabilities

### Custom Development

- **[custom-development](custom-development.md)** - Custom component development
- **[async-node-development](async-node-development.md)** - Building async nodes
- **[node-execution-internals](node-execution-internals.md)** - Node execution mechanics
- **[parameter-passing-comprehensive](parameter-passing-comprehensive.md)** - Advanced parameter patterns

### Workflow Development

- **[workflow-creation-guide](workflow-creation-guide.md)** - Complete workflow creation guide
- **[intelligent-query-routing](intelligent-query-routing.md)** - Query routing strategies

## MCP Development

### MCP Implementation

- **[mcp-development](mcp-development.md)** - MCP server development
- **[mcp-advanced-features](mcp-advanced-features.md)** - Advanced MCP features
- **[mcp-tool-execution](mcp-tool-execution.md)** - MCP tool patterns
- **[mcp-transport-layers](mcp-transport-layers.md)** - Transport implementation
- **[resource-registry](resource-registry.md)** - MCP resource management

## Testing & Quality

### Testing Strategies

- **[testing-best-practices](testing-best-practices.md)** - Testing best practices
- **[test-organization](test-organization.md)** - Test organization strategies
- **[production-testing](production-testing.md)** - Production testing approaches
- **[regression-testing](regression-testing.md)** - Regression testing patterns

## Production & Operations

### Deployment

- **[production-deployment-guide](production-deployment-guide.md)** - Production deployment guide
- **[edge-computing](edge-computing.md)** - Edge deployment patterns
- **[durable-gateway](durable-gateway.md)** - Durable gateway patterns

### Monitoring & Observability

- **[monitoring-enterprise](monitoring-enterprise.md)** - Enterprise monitoring
- **[metrics-collection](metrics-collection.md)** - Metrics and telemetry

### Resilience

- **[resilience-enterprise](resilience-enterprise.md)** - Enterprise resilience patterns
- **[circuit-breaker](circuit-breaker.md)** - Circuit breaker implementation

## Enterprise & Security

### Security

- **[security-patterns-enterprise](security-patterns-enterprise.md)** - Enterprise security patterns
- **[compliance-patterns](compliance-patterns.md)** - Compliance and governance

## AI & RAG

### RAG Development

- **[rag-comprehensive](rag-comprehensive.md)** - Comprehensive RAG guide

## Quick Patterns

### Custom Node Development

```python
import kailash

# Custom logic via EmbeddedPythonNode — no subclassing needed
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "custom_node", {
    "code": """
data = input_data.get("data")
result = {"output": process(data)}
""",
    "output_vars": ["result"]
})
```

### Async Node Pattern

```python
import kailash

# Async is handled by the runtime — use HTTPRequestNode for async I/O
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "async_node", {
    "url": "https://api.example.com/data",
    "method": "GET"
})
```

### MCP Server Setup

```python
import kailash

server = kailash.McpServer("my-server", "1.0.0")

def my_tool(param: str) -> dict:
    return {"result": f"Processed: {param}"}

server.register_tool("my_tool", "Process a parameter", my_tool)

server.run(transport="stdio")
```

## CRITICAL Warnings

| Rule                                                      | Reason                     |
| --------------------------------------------------------- | -------------------------- |
| ❌ NEVER override `__init__` without `super().__init__()` | Breaks node initialization |
| ✅ ALWAYS handle errors in async nodes                    | Prevents hanging           |
| ❌ NEVER use blocking I/O in async nodes                  | Blocks event loop          |
| ✅ ALWAYS register MCP tools before start                 | Required for discovery     |

## When to Use This Skill

Use this skill when you need:

- In-depth understanding of SDK features
- Custom node or workflow development guidance
- Production deployment strategies
- Comprehensive testing approaches
- MCP server implementation details
- Enterprise security patterns
- Monitoring and observability setup
- RAG system implementation
- Advanced async patterns

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core SDK fundamentals
- **[06-cheatsheets](../cheatsheets/SKILL.md)** - Quick reference patterns
- **[08-nodes-reference](../nodes/SKILL.md)** - Node reference
- **[17-gold-standards](../../17-gold-standards/SKILL.md)** - Best practices

## Support

For development guide questions, invoke:

- `pattern-expert` - Implementation patterns and workflows
- `testing-specialist` - Testing strategies and best practices
- `deployment-specialist` - Production deployment guidance
- `mcp-specialist` - MCP server development
