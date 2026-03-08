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
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"])
)

# Register MCP tools -- auth applies to all channels including MCP
@app.handler(name="admin_operation", description="Admin-only operation")
async def admin_operation(action: str) -> dict:
    return {"action": action, "status": "completed"}
```

## LLMNode with Tool Calling

`LLMNode` supports tool calling via the `tools` parameter. Provider is auto-detected from the model name. For full MCP server connectivity (tool discovery, iterative execution), use the **Kaizen agent framework** (`kailash.kaizen`).

```python
import kailash
import os

builder = kailash.WorkflowBuilder()

# LLMNode with tool definitions for function calling
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "prompt": "Search for Python tutorials",
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "search",
                "description": "Search for tutorials",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"}
                    },
                    "required": ["query"]
                }
            }
        }
    ]
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# The LLM may return tool_calls in its response for your code to handle
tool_calls = result["results"]["agent"].get("tool_calls", [])
```

## Structured Tool Output

Define tools with structured output schemas via Nexus handler parameters:

```python
import kailash
from kailash.nexus import NexusApp, HandlerParam

app = NexusApp()

# Define handler function first
async def search_handler(query: str, limit: int = 10) -> dict:
    return {"results": ["item1", "item2"], "count": 2}

# Register with explicit parameters
app.register(
    "search",
    search_handler,
    params=[
        HandlerParam("query", required=True),
        HandlerParam("limit", required=False),
    ],
    description="Search for items"
)
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

## MCP Client Integration

MCP client connections (connecting to external MCP servers, discovering tools, and executing them iteratively) are handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes like `LLMNode`. See the `kaizen-specialist` for Kaizen agent MCP client patterns.

## Production Readiness Checklist

- [ ] Authentication configured via NexusAuthPlugin
- [ ] Error handling implemented in handlers
- [ ] Monitoring via EventBus subscriptions
- [ ] Transport configuration complete

<!-- Trigger Keywords: advanced MCP, MCP authentication, multi-server MCP, structured tools, progress reporting, MCP tool execution -->
