---
name: mcp-advanced-patterns
description: "Advanced MCP patterns including multi-server config, authentication, tool execution, and progress reporting. Use for 'advanced MCP', 'MCP authentication', 'multi-server MCP'."
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

## MCP Server Authentication

Use NexusAuthPlugin to secure your MCP server endpoint:

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash import JwtConfig

app = NexusApp()

# Secure MCP endpoint with JWT auth
auth = NexusAuthPlugin.basic_auth(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"])
)
app.add_plugin(auth)

# Register MCP tools -- auth applies to all channels including MCP
@app.handler(name="admin_operation", description="Admin-only operation")
async def admin_operation(action: str) -> dict:
    return {"action": action, "status": "completed"}
```

## MCP Tool Execution via LLMNode

```python
import kailash

builder = kailash.WorkflowBuilder()

# LLMNode with MCP server access
builder.add_node("LLMNode", "agent", {
    "model": os.environ["LLM_MODEL"],
    "prompt": "Search for Python tutorials",
    "mcp_servers": [
        {
            "name": "search",
            "transport": "stdio",
            "command": "python",
            "args": ["-m", "search_server"]
        }
    ]
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Structured Tool Output

Define tools with structured output schemas via Nexus handler parameters:

```python
import kailash
from kailash.nexus import NexusApp, HandlerParam

app = NexusApp()

# Define handler with explicit parameters
app.register(
    "search",
    search_handler,
    params=[
        HandlerParam("query", required=True),
        HandlerParam("limit", required=False),
    ],
    description="Search for items"
)

async def search_handler(query: str, limit: int = 10) -> dict:
    return {"results": ["item1", "item2"], "count": 2}
```

## Progress Reporting

Track long-running operations through EventBus:

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()
bus = app.event_bus()

@app.handler(name="long_process", description="Long-running process")
async def long_process(steps: int = 10) -> dict:
    for i in range(steps):
        bus.publish("progress", {
            "step": i + 1,
            "total": steps,
            "percentage": (i + 1) * 100 // steps
        })
    return {"completed": True, "steps": steps}

# Client subscribes to progress events
bus.subscribe(lambda e: print(f"Progress: {e}") if e.get("type") == "progress" else None)
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
- [ ] Authentication configured via NexusAuthPlugin
- [ ] Error handling implemented in handlers
- [ ] Monitoring via EventBus subscriptions
- [ ] Transport configuration complete

<!-- Trigger Keywords: advanced MCP, MCP authentication, multi-server MCP, structured tools, progress reporting, MCP tool execution -->
