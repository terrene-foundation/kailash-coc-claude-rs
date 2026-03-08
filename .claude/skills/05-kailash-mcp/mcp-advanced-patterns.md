---
name: mcp-advanced-patterns
description: "Advanced MCP patterns including multi-server config, JWT auth, service discovery, structured tools, and progress reporting. Use for 'advanced MCP', 'MCP discovery', 'MCP authentication', 'MCP registry'."
---

# Advanced MCP Patterns

> **Skill Metadata**
> Category: `mcp`
> Priority: `HIGH`
> Note: Real MCP execution is the default behavior

## Multi-Server Configuration

```python
mcp_servers = [
    # HTTP server with auth
    {
        "name": "weather-service",
        "transport": "http",
        "url": "http://localhost:8081",
        "headers": {"API-Key": "demo-key"}
    },
    # STDIO server
    {
        "name": "calculator",
        "transport": "stdio",
        "command": "python",
        "args": ["-m", "mcp_calc_server"]
    },
    # External NPX server
    {
        "name": "file-system",
        "transport": "stdio",
        "command": "npx",
        "args": ["@modelcontextprotocol/server-filesystem", "./output"]
    }
]
```

## JWT Authentication

```python
import kailash

jwt_auth = kailash.JWTAuth(
    secret_key="your-secret-key",
    algorithm="HS256"
)

server = kailash.MCPServer("jwt-server", auth_provider=jwt_auth)

@server.tool(required_permission="admin")
async def admin_operation(action: str) -> dict:
    return {"action": action, "status": "completed"}
```

## Service Discovery Patterns

### Registry-Based Discovery

```python
import kailash

registry = kailash.ServiceRegistry()

# Register server with capabilities
await registry.register_server({
    "id": "data-processor-001",
    "name": "data-processor",
    "transport": "stdio",
    "endpoint": "python -m data_processor",
    "capabilities": ["tools", "data_processing"],
    "metadata": {"version": "1.0", "priority": 10}
})

# Discover by capability
tools_servers = await registry.discover_servers(capability="tools")
```

### Convenience Functions

```python
import kailash

# Auto-discover servers
servers = await kailash.discover_mcp_servers(capability="tools")

# Get client for specific capability
client = await kailash.get_mcp_client("database")
```

## Structured Tools with Validation

```python
import kailash

@kailash.structured_tool(
    output_schema={
        "type": "object",
        "properties": {
            "results": {"type": "array"},
            "count": {"type": "integer"}
        },
        "required": ["results", "count"]
    }
)
def search_tool(query: str) -> dict:
    return {"results": ["item1", "item2"], "count": 2}
```

## Resource Templates and Subscriptions

```python
import kailash

template = kailash.ResourceTemplate(
    uri_template="files://{path}",
    name="File Access",
    description="Access files by path"
)

# Subscribe to resource changes
subscription = await template.subscribe(
    uri="files://documents/report.pdf",
    callback=lambda change: print(f"File changed: {change}")
)
```

## Progress Reporting

```python
import kailash

progress = kailash.ProgressManager()

# Long-running operation with progress
token = progress.start_progress("processing", total=100)
for i in range(100):
    await progress.update_progress(token, progress=i, status=f"Step {i}")
await progress.complete_progress(token)
```

## MCP Execution Mode

### Real vs Mock Execution

```python
# Default: Real MCP execution
builder.add_node("LLMNode", "agent", {
    "mcp_servers": [config]  # Real execution by default
})

# Explicit mock for testing only
builder.add_node("LLMNode", "agent", {
    "mcp_servers": [config],
    "use_real_mcp": False  # Only for testing
})
```

- **Real MCP execution is the default** (`use_real_mcp=True`)
- Mock behavior requires explicit `use_real_mcp=False`
- Set `KAILASH_USE_REAL_MCP=false` for global mock behavior

## Production Readiness Checklist

- [ ] Real MCP execution enabled (default)
- [ ] Proper authentication configured
- [ ] Tool discovery enabled
- [ ] Error handling implemented
- [ ] Monitoring and metrics enabled
- [ ] Transport configuration complete

<!-- Trigger Keywords: advanced MCP, MCP discovery, MCP authentication, MCP registry, JWT MCP, multi-server MCP, structured tools, progress reporting, MCP subscription -->
