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

## Architecture Note

MCP resources are defined on MCP servers (built with `McpApplication`). MCP client connections that consume resources are handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes.

## Quick Reference

- **Resources**: Named entities exposing structured data (documents, databases, APIs)
- **Templates**: Parameterized resource definitions
- **Subscriptions**: Real-time resource change notifications
- **URIs**: Unique identifiers for resource access

## McpApplication Resource Decorator

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

## Client-Side Resource Access (Kaizen Agents)

Kaizen agents can access MCP resources from connected MCP servers. Resources are configured as part of the MCP client connection:

```python
# Kaizen agent MCP client config with resource access
mcp_client_config = {
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
}
```

## Resource Templates

Resource templates allow parameterized resource access:

```python
# Server-side template definition
@app.resource(uri="db://users/{user_id}/profile", name="User Profile")
def get_user_profile(user_id: str) -> str:
    return f'{{"user_id": "{user_id}", "name": "User {user_id}"}}'

@app.resource(uri="db://orders/{order_id}", name="Order Details")
def get_order(order_id: str) -> str:
    return f'{{"order_id": "{order_id}", "status": "shipped"}}'

# Client can request: db://users/123/profile
```

## Resource Subscriptions

For real-time resource updates, use WebSocket transport with subscription-enabled resources:

```python
# Kaizen agent MCP client config with subscriptions
mcp_client_config = {
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
}
```

## McpApplication vs Kaizen Agent MCP Client

| Feature  | `McpApplication`              | Kaizen Agent MCP Client            |
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
