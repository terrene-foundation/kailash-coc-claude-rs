# MCP Transport Layers

You are an expert in MCP transport configuration for Kailash.

## Core Responsibilities

### Transport Overview

MCP servers in Kailash are served through **Nexus** (multi-channel platform). The `McpServer` class itself does NOT have a `run()` method — use `NexusApp` to expose MCP tools via HTTP/SSE.

### 1. Serving MCP via NexusApp

```python
import kailash
from kailash.nexus import NexusApp, NexusConfig

# Register tools on McpServer
server = kailash.McpServer("my-server", "1.0.0")
server.register_tool("echo", "Echo input", lambda args: {"echo": args.get("text", "")})

# Serve via NexusApp (exposes API + CLI + MCP channels)
app = NexusApp(NexusConfig(port=3000))

@app.handler(name="echo", description="Echo input text")
async def echo(text: str = "") -> dict:
    return {"echo": text}

app.start()  # Blocks, serves on localhost:3000
```

### 2. MCP Client Configuration

MCP client connections (connecting to external MCP servers) are handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes. Kaizen agents configure MCP server connections as part of their agent setup:

```python
# Kaizen agent MCP client configuration
mcp_server_configs = [
    {
        "name": "cli-server",
        "transport": "stdio",
        "command": "python",
        "args": ["mcp_server.py"]
    },
    {
        "name": "api-server",
        "transport": "http",
        "url": "http://localhost:3000"
    }
]
# Pass these configs to a Kaizen agent for MCP tool discovery and execution
```

### 3. McpApplication Transport (Python Compat)

`McpApplication` accepts transport config but `run()` raises `RuntimeError` (standalone transport not yet available):

```python
from kailash.mcp import McpApplication

app = McpApplication("my-server", "1.0.0")

@app.tool("greet", "Greet a user")
def greet(params):
    return {"message": f"Hello {params['name']}"}

# app.run()  # -> RuntimeError: standalone transport not available
# Use NexusApp.start() instead to serve MCP tools
```

## When to Engage

- User asks about "MCP transport", "serve MCP", "HTTP MCP"
- User needs transport configuration
- User has connection questions

## Integration with Other Skills

- Route to **mcp-development** for MCP basics
- Route to **mcp-specialist** for advanced patterns
- Route to **kaizen-specialist** for Kaizen agent MCP client integration
