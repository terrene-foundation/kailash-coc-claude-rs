---
name: mcp-transports-quick
description: "MCP transport configuration patterns (STDIO, HTTP, WebSocket). Use when asking 'MCP transport', 'stdio mcp', 'websocket mcp', 'HTTP transport', 'mcp connection', or 'mcp server setup'."
---

# MCP Transports Quick Reference

Configure MCP server connections using STDIO, HTTP, or WebSocket transports.

> **Skill Metadata**
> Category: `mcp`
> Priority: `HIGH`
> Related Skills: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md), [`mcp-authentication`](mcp-authentication.md)
> Related Subagents: `mcp-specialist` (server implementation, troubleshooting)

## Quick Reference

- **STDIO**: Local process communication (fastest, recommended for development)
- **HTTP**: Remote servers, production deployments (stateless)
- **WebSocket**: Real-time bidirectional communication (stateful connections)
- **Transport Selection**: Choose based on deployment model and latency requirements

## Transport Patterns

### STDIO Transport (Recommended for Local Development)

```python
import kailash
import os

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# STDIO: Launch MCP server as subprocess
builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Get weather for NYC"}],
    "mcp_servers": [{
        "name": "weather",
        "transport": "stdio",
        "command": "python",
        "args": ["-m", "weather_mcp_server"]
    }],
    "auto_discover_tools": True
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

**When to Use STDIO:**

- Local development and testing
- Desktop applications
- CLI tools
- Single-machine deployments
- Lowest latency requirements

### HTTP Transport (Production Deployments)

```python
builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Search documents"}],
    "mcp_servers": [{
        "name": "doc_search",
        "transport": "http",
        "url": "https://api.company.com/mcp/search",
        "headers": {
            "Authorization": "Bearer ${API_TOKEN}",
            "X-Tenant-ID": "tenant_123"
        },
        "timeout": 30
    }],
    "auto_discover_tools": True
})
```

**When to Use HTTP:**

- Production deployments
- Microservices architecture
- Cloud-hosted MCP servers
- Load-balanced environments
- Stateless operations

### WebSocket Transport (Real-Time Communication)

```python
builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Monitor system metrics"}],
    "mcp_servers": [{
        "name": "metrics",
        "transport": "websocket",
        "url": "wss://metrics.company.com/mcp",
        "connection_params": {
            "heartbeat_interval": 30,
            "reconnect_attempts": 3,
            "reconnect_delay": 5
        }
    }],
    "auto_discover_tools": True
})
```

**When to Use WebSocket:**

- Real-time streaming data
- Long-running operations with progress updates
- Bidirectional communication
- Event-driven architectures

## Configuration Patterns

### Multiple Transports in One Workflow

```python
builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Analyze weather and documents"}],
    "mcp_servers": [
        {
            "name": "weather",
            "transport": "stdio",
            "command": "python",
            "args": ["-m", "weather_mcp"]
        },
        {
            "name": "docs",
            "transport": "http",
            "url": "https://api.company.com/mcp/docs",
            "headers": {"Authorization": "Bearer ${API_TOKEN}"}
        },
        {
            "name": "metrics",
            "transport": "websocket",
            "url": "wss://metrics.company.com/mcp"
        }
    ],
    "auto_discover_tools": True
})
```

### Transport with Retry Configuration

```python
# HTTP with retry logic
builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Search"}],
    "mcp_servers": [{
        "name": "search",
        "transport": "http",
        "url": "https://api.company.com/mcp/search",
        "retry_config": {
            "max_retries": 3,
            "backoff_factor": 2.0,
            "retry_on": [502, 503, 504]
        },
        "timeout": 60
    }]
})
```

### Environment-Based Transport Configuration

```python
import os

# Use environment variable to switch transports
transport_config = {
    "development": {
        "transport": "stdio",
        "command": "python",
        "args": ["-m", "mcp_server"]
    },
    "production": {
        "transport": "http",
        "url": os.getenv("MCP_SERVER_URL"),
        "headers": {"Authorization": f"Bearer {os.getenv('MCP_API_KEY')}"}
    }
}

env = os.getenv("ENV", "development")

builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Process data"}],
    "mcp_servers": [{
        "name": "processor",
        **transport_config[env]
    }]
})
```

## Transport Comparison

| Feature            | STDIO           | HTTP        | WebSocket  |
| ------------------ | --------------- | ----------- | ---------- |
| **Latency**        | Lowest          | Medium      | Low-Medium |
| **Scalability**    | Single machine  | High        | Medium     |
| **State**          | Process-bound   | Stateless   | Stateful   |
| **Best For**       | Local dev       | Production  | Real-time  |
| **Complexity**     | Low             | Medium      | High       |
| **Load Balancing** | No              | Yes         | Limited    |
| **Reconnection**   | Process restart | Per-request | Automatic  |

## Common Patterns

### Pattern 1: Development to Production

```python
# Development: STDIO for fast iteration
dev_config = {
    "transport": "stdio",
    "command": "python",
    "args": ["-m", "mcp_server", "--debug"]
}

# Production: HTTP with authentication
prod_config = {
    "transport": "http",
    "url": "https://mcp.company.com/api",
    "headers": {"Authorization": f"Bearer {os.getenv('MCP_TOKEN')}"},
    "timeout": 30
}

config = prod_config if os.getenv("ENV") == "production" else dev_config
```

### Pattern 2: Graceful Fallback

```python
builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Get data"}],
    "mcp_servers": [
        {
            "name": "primary",
            "transport": "http",
            "url": "https://primary.api.com/mcp",
            "timeout": 5
        },
        {
            "name": "fallback",
            "transport": "http",
            "url": "https://backup.api.com/mcp",
            "timeout": 10
        }
    ]
})
# IterativeLLMNode automatically tries fallback if primary fails
```

## Troubleshooting

### STDIO Issues

```python
# Issue: Process not found
# Solution: Use absolute paths
builder.add_node("IterativeLLMNode", "agent", {
    "mcp_servers": [{
        "name": "server",
        "transport": "stdio",
        "command": "/usr/bin/python3",  # Absolute path
        "args": ["-m", "mcp_server"],
        "env": {"PYTHONPATH": "/path/to/modules"}  # Set environment
    }]
})
```

### HTTP Issues

```python
# Issue: Connection timeout
# Solution: Increase timeout and add retry
builder.add_node("IterativeLLMNode", "agent", {
    "mcp_servers": [{
        "name": "server",
        "transport": "http",
        "url": "https://slow-api.com/mcp",
        "timeout": 120,  # Longer timeout
        "retry_config": {
            "max_retries": 5,
            "backoff_factor": 3.0
        }
    }]
})
```

### WebSocket Issues

```python
# Issue: Connection drops
# Solution: Configure reconnection
builder.add_node("IterativeLLMNode", "agent", {
    "mcp_servers": [{
        "name": "server",
        "transport": "websocket",
        "url": "wss://api.com/mcp",
        "connection_params": {
            "heartbeat_interval": 15,  # More frequent heartbeat
            "reconnect_attempts": 10,
            "reconnect_delay": 2,
            "ping_timeout": 5
        }
    }]
})
```

## Best Practices

1. **Use STDIO for development** - Fastest iteration, easier debugging
2. **Use HTTP for production** - Scalable, load-balanced, stateless
3. **Use WebSocket for streaming** - Real-time data, progress updates
4. **Always set timeouts** - Prevent hanging workflows
5. **Configure retries** - Handle transient failures gracefully
6. **Use environment variables** - Keep credentials secure
7. **Test transport switching** - Ensure dev/prod parity

## Related Patterns

- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)
- **Authentication**: [`mcp-authentication`](mcp-authentication.md)
- **Testing**: [`mcp-testing-patterns`](mcp-testing-patterns.md)

## When to Escalate to Subagent

Use `mcp-specialist` subagent when:

- Implementing custom MCP server with multiple transports
- Troubleshooting transport-specific connection issues
- Configuring production load balancing and failover
- Implementing custom transport protocols
- Performance tuning for high-throughput scenarios

## Quick Tips

- Start with STDIO in development for fastest iteration
- Switch to HTTP for production deployments
- Use WebSocket only when real-time bidirectional communication is required
- Always configure timeouts to prevent hanging
- Test transport failover scenarios

## McpApplication Transport Configuration (Phase 17)

The `McpApplication` class from `kailash.mcp` provides a decorator-based MCP server with configurable transports:

```python
from kailash.mcp import McpApplication, prompt_argument

app = McpApplication("my-server", "1.0")

@app.tool(name="search", description="Search the web")
def search(query: str) -> str:
    return f"Results for {query}"

@app.resource(uri="config://settings", name="Settings")
def get_settings() -> str:
    return '{"theme": "dark"}'

@app.prompt(name="summarize", description="Summarize text")
def summarize_prompt(text: str) -> str:
    return f"Please summarize: {text}"
```

### Transport Selection

```python
from kailash.nexus.mcp import STDIO, SSE, HTTP

server = app.server

# STDIO transport (default -- for local development)
server.set_transport(STDIO)

# SSE transport (for web clients)
server.set_transport(SSE)
server.set_sse_config({"port": 8080, "path": "/mcp"})

# HTTP transport (for REST clients)
server.set_transport(HTTP)
server.set_http_config({"port": 8080, "path": "/mcp"})
```

### McpApplication vs IterativeLLMNode

| Feature   | `McpApplication`                    | `IterativeLLMNode` mcp_servers |
| --------- | ----------------------------------- | ------------------------------ |
| Role      | MCP server (serves tools/resources) | MCP client (consumes tools)    |
| Pattern   | `@app.tool()` / `@app.resource()`   | Config dict                    |
| Transport | STDIO / SSE / HTTP                  | STDIO / HTTP / WebSocket       |
| Best for  | Building MCP servers                | Connecting to MCP servers      |

### Production Deployment

```python
import os
from kailash.mcp import McpApplication
from kailash.nexus.mcp import SSE

app = McpApplication("production-server", "1.0")

@app.tool(name="query", description="Query the database")
def query(sql: str) -> str:
    # Execute query using DataFlow
    return '{"rows": []}'

server = app.server
server.set_transport(SSE)
server.set_sse_config({
    "port": int(os.getenv("MCP_PORT", "8080")),
    "path": os.getenv("MCP_PATH", "/mcp"),
})
```

## Version Notes

- Real MCP tool execution in IterativeLLMNode
- Enhanced MCP transport support across STDIO, HTTP, and WebSocket
- McpApplication decorator-based server with transport configuration (Phase 17)

<!-- Trigger Keywords: MCP transport, stdio, websocket, HTTP transport, mcp connection, mcp server setup, mcp stdio, mcp http, mcp websocket, transport configuration, mcp deployment, McpApplication transport, SSE transport -->
