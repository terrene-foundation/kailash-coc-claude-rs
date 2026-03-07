---
name: nodes-api-reference
description: "API nodes reference (HTTP, REST, GraphQL). Use when asking 'API node', 'HTTP', 'REST', 'GraphQL', or 'API request'."
---

# API Nodes Reference

Complete reference for HTTP, REST, and GraphQL API operations.

> **Skill Metadata**
> Category: `nodes`
> Priority: `HIGH`
> Related Skills: [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (API workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available API nodes: HTTPRequestNode, AsyncHTTPRequestNode,
#   RESTClientNode, AsyncRESTClientNode, GraphQLClientNode
```

## HTTP Nodes

### HTTPRequestNode
```python
import kailash

builder = kailash.WorkflowBuilder()

builder.add_node("HTTPRequestNode", "api_call", {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {
        "Authorization": "Bearer ${API_TOKEN}",
        "Content-Type": "application/json"
    },
    "params": {"page": 1, "limit": 100}
})
```

### AsyncHTTPRequestNode
```python
builder.add_node("AsyncHTTPRequestNode", "async_api", {
    "url": "https://api.example.com/users",
    "method": "POST",
    "json": {"name": "John", "email": "john@example.com"},
    "timeout": 30
})
```

## REST Nodes

### RESTClientNode
```python
builder.add_node("RESTClientNode", "rest_api", {
    "base_url": "https://api.example.com",
    "endpoint": "/users/123",
    "method": "GET",
    "auth": {"type": "bearer", "token": "${API_TOKEN}"}
})
```

## GraphQL Nodes

### GraphQLClientNode
```python
builder.add_node("GraphQLClientNode", "graphql", {
    "url": "https://api.example.com/graphql",
    "query": """
        query GetUser($id: ID!) {
            user(id: $id) {
                id
                name
                email
            }
        }
    """,
    "variables": {"id": "123"}
})
```

## Related Skills

- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: API node, HTTP, REST, GraphQL, API request, HTTPRequestNode, RESTClientNode, GraphQLClientNode -->
