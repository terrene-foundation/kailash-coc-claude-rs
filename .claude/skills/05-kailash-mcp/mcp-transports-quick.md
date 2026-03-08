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

## Architecture Note

MCP client connections (connecting to external MCP servers, discovering and executing tools) are handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes. `LLMNode` supports tool calling via the `tools` parameter but does not have an `mcp_servers` parameter.

For building MCP servers, use the `McpApplication` class from `kailash.mcp`.

## Quick Reference

- **STDIO**: Local process communication (fastest, recommended for development)
- **HTTP**: Remote servers, production deployments (stateless)
- **WebSocket**: Real-time bidirectional communication (stateful connections)
- **Transport Selection**: Choose based on deployment model and latency requirements

## Server-Side Transport Patterns (McpApplication)

### STDIO Transport (Recommended for Local Development)

```python
from kailash.mcp import McpApplication

app = McpApplication("weather-server", "1.0")

@app.tool(name="get_weather", description="Get weather for a city")
def get_weather(city: str) -> str:
    return f'{{"city": "{city}", "temp": 22}}'

# STDIO transport (default) -- best for local development
server = app.server
# server.set_transport(STDIO)  # Default, no change needed
```

**When to Use STDIO:**

- Local development and testing
- Desktop applications (e.g., Claude Desktop)
- CLI tools
- Single-machine deployments
- Lowest latency requirements

### HTTP/SSE Transport (Production Deployments)

```python
from kailash.mcp import McpApplication
from kailash.nexus.mcp import SSE, HTTP
import os

app = McpApplication("doc-server", "1.0")

@app.tool(name="search_docs", description="Search documents")
def search_docs(query: str) -> str:
    return f'{{"results": ["{query} result"]}}'

server = app.server

# SSE transport for production
server.set_transport(SSE)
server.set_sse_config({
    "port": int(os.getenv("MCP_PORT", "8080")),
    "path": "/mcp",
})
```

**When to Use HTTP/SSE:**

- Production deployments
- Microservices architecture
- Cloud-hosted MCP servers
- Load-balanced environments
- Stateless operations

### WebSocket Transport (Real-Time Communication)

```python
server = kailash.MCPServer(name="realtime-server")

# Best for: Real-time communication, streaming
if __name__ == "__main__":
    server.run(
        transport="websocket",
        host="0.0.0.0",
        port=8001
    )
```

**When to Use WebSocket:**

- Real-time streaming data
- Long-running operations with progress updates
- Bidirectional communication
- Event-driven architectures

## Client-Side Transport Configuration (Kaizen Agents)

MCP client connections are configured in Kaizen agents. These config dicts are passed to the agent's MCP client setup:

### STDIO Client

```python
# Kaizen agent MCP client config -- STDIO
mcp_client_config = {
    "name": "weather",
    "transport": "stdio",
    "command": "python",
    "args": ["-m", "weather_mcp_server"]
}
```

### HTTP Client

```python
# Kaizen agent MCP client config -- HTTP
mcp_client_config = {
    "name": "doc_search",
    "transport": "http",
    "url": "https://api.company.com/mcp/search",
    "headers": {
        "Authorization": f"Bearer {os.getenv('API_TOKEN')}",
        "X-Tenant-ID": "tenant_123"
    },
    "timeout": 30
}
```

### WebSocket Client

```python
# Kaizen agent MCP client config -- WebSocket
mcp_client_config = {
    "name": "metrics",
    "transport": "websocket",
    "url": "wss://metrics.company.com/mcp",
    "connection_params": {
        "heartbeat_interval": 30,
        "reconnect_attempts": 3,
        "reconnect_delay": 5
    }
}
```

### Multiple Transports

```python
# Kaizen agent with multiple MCP server connections
mcp_server_configs = [
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
        "headers": {"Authorization": f"Bearer {os.getenv('API_TOKEN')}"}
    },
    {
        "name": "metrics",
        "transport": "websocket",
        "url": "wss://metrics.company.com/mcp"
    }
]
```

## Configuration Patterns

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
config = transport_config[env]
```

### Development to Production

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

## McpApplication vs Kaizen Agent MCP Client

| Feature   | `McpApplication`                    | Kaizen Agent MCP Client     |
| --------- | ----------------------------------- | --------------------------- |
| Role      | MCP server (serves tools/resources) | MCP client (consumes tools) |
| Pattern   | `@app.tool()` / `@app.resource()`   | Config dict                 |
| Transport | STDIO / SSE / HTTP                  | STDIO / HTTP / WebSocket    |
| Best for  | Building MCP servers                | Connecting to MCP servers   |

## Best Practices

1. **Use STDIO for development** - Fastest iteration, easier debugging
2. **Use HTTP for production** - Scalable, load-balanced, stateless
3. **Use WebSocket for streaming** - Real-time data, progress updates
4. **Always set timeouts** - Prevent hanging connections
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

## Version Notes

- McpApplication decorator-based server with transport configuration
- Enhanced MCP transport support across STDIO, HTTP/SSE, and WebSocket

<!-- Trigger Keywords: MCP transport, stdio, websocket, HTTP transport, mcp connection, mcp server setup, mcp stdio, mcp http, mcp websocket, transport configuration, mcp deployment, McpApplication transport, SSE transport -->
