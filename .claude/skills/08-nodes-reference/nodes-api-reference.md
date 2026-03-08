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
# Available API nodes: HTTPRequestNode, GraphQLNode, WebSocketNode
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

### HTTPRequestNode (POST)

```python
builder.add_node("HTTPRequestNode", "post_api", {
    "url": "https://api.example.com/users",
    "method": "POST",
    "json": {"name": "John", "email": "john@example.com"},
    "timeout_ms": 30000
})
```

## GraphQL Nodes

### GraphQLNode

```python
builder.add_node("GraphQLNode", "graphql", {
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

<!-- Trigger Keywords: API node, HTTP, REST, GraphQL, API request, HTTPRequestNode, GraphQLNode -->
