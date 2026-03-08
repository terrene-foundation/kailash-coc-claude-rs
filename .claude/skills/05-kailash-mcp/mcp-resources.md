---
name: mcp-resources
description: "MCP resource templates, subscriptions, and URIs. Use when asking 'MCP resources', 'resource template', 'subscriptions', 'mcp uri', or 'resource management'."
---

# MCP Resources

Manage MCP resources with templates, subscriptions, and URI-based access.

> **Skill Metadata**
> Category: `mcp`
> Priority: `MEDIUM`
> Related Skills: [`mcp-structured-tools`](mcp-structured-tools.md), [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)
> Related Subagents: `mcp-specialist` (resource lifecycles, subscriptions)

## Quick Reference

- **Resources**: Named entities exposing structured data (documents, databases, APIs)
- **Templates**: Parameterized resource definitions
- **Subscriptions**: Real-time resource change notifications
- **URIs**: Unique identifiers for resource access

## Basic Resource Access

```python
import kailash
import os

builder = kailash.WorkflowBuilder()

builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Get document content"}],
    "mcp_servers": [{
        "name": "docs",
        "transport": "http",
        "url": "https://api.company.com/mcp",
        "resources": [
            {
                "uri": "doc://company/reports/2024/annual",
                "name": "Annual Report 2024",
                "mimeType": "application/pdf"
            }
        ]
    }]
})
```

## Resource Templates

```python
builder.add_node("IterativeLLMNode", "agent", {
    "mcp_servers": [{
        "name": "db",
        "transport": "http",
        "url": "https://db-api.com/mcp",
        "resource_templates": [
            {
                "uriTemplate": "db://users/{user_id}/profile",
                "name": "User Profile",
                "description": "Get user profile by ID",
                "mimeType": "application/json"
            },
            {
                "uriTemplate": "db://orders/{order_id}",
                "name": "Order Details",
                "mimeType": "application/json"
            }
        ]
    }]
})

# Agent can request: db://users/123/profile
```

## Resource Subscriptions

```python
builder.add_node("IterativeLLMNode", "agent", {
    "mcp_servers": [{
        "name": "metrics",
        "transport": "websocket",
        "url": "wss://metrics-api.com/mcp",
        "resources": [
            {
                "uri": "metrics://system/cpu",
                "name": "CPU Metrics",
                "subscriptions": {
                    "enabled": True,
                    "update_interval": 5  # seconds
                }
            },
            {
                "uri": "metrics://system/memory",
                "name": "Memory Metrics",
                "subscriptions": {
                    "enabled": True,
                    "update_interval": 10
                }
            }
        ]
    }]
})
```

## McpApplication Resource Decorator (Phase 17)

The `McpApplication` class from `kailash.mcp` provides a decorator-based API for defining MCP resources:

```python
from kailash.mcp import McpApplication

app = McpApplication("my-server", "1.0")

@app.resource(uri="config://settings", name="Settings")
def get_settings() -> str:
    return '{"theme": "dark", "language": "en"}'

@app.resource(uri="data://users", name="User List")
def get_users() -> str:
    return '[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}]'

@app.resource(uri="status://health", name="Health Status")
def get_health() -> str:
    return '{"status": "healthy", "uptime": 3600}'
```

### McpApplication vs IterativeLLMNode Resources

| Feature  | `McpApplication`              | `IterativeLLMNode` mcp_servers     |
| -------- | ----------------------------- | ---------------------------------- |
| Role     | MCP server (serves resources) | MCP client (consumes resources)    |
| Pattern  | `@app.resource()` decorator   | Config dict with `resources`       |
| Best for | Building MCP servers          | Connecting to existing MCP servers |

## Related Patterns

- **Structured Tools**: [`mcp-structured-tools`](mcp-structured-tools.md)
- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)

## When to Escalate

Use `mcp-specialist` for complex resource lifecycles and subscription management.

<!-- Trigger Keywords: MCP resources, resource template, subscriptions, mcp uri, resource management, McpApplication resource -->
