---
name: nexus-quickstart
description: "Nexus in 5 minutes: deploy workflows as API + CLI + MCP simultaneously. Use when asking 'nexus quickstart', 'nexus getting started', 'first nexus server', or 'multi-channel deployment'."
---

# Nexus Quickstart Skill

Nexus in 5 minutes: deploy workflows as API + CLI + MCP simultaneously.

## Usage

`/nexus-quickstart` -- Fastest path to a running Nexus API server with authentication

## What Nexus Does

Nexus is a multi-channel deployment platform. Register a handler once; it becomes available as:

- HTTP API endpoint (`POST /api/{handler_name}`)
- CLI command (`nexus {handler_name} --arg value`)
- MCP tool (via `/mcp/sse` for AI agent integration)

## Minimal Server

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet")
async def greet(name: str = "World") -> dict:
    return {"message": f"Hello, {name}!"}

app.start()
# API:  POST http://localhost:3000/greet     {"name": "Alice"}
# CLI:  kailash greet --name Alice
# MCP:  GET  http://localhost:3000/mcp/sse
```

## Handler Pattern

Handlers are async functions decorated with `@app.handler()`. Parameters are auto-extracted from the function signature.

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("process")
async def process(text: str, max_len: int = 256, enabled: bool = True) -> dict:
    if not enabled:
        return {"result": "processing disabled"}

    truncated = len(text) > max_len
    result = text[:max_len]
    return {"result": result, "truncated": truncated}
```

## Handler with Workflow

```python
import kailash
from kailash.nexus import NexusApp

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("TextTransformNode", "upper", {"operation": "uppercase"})
wf = builder.build(reg)
rt = kailash.Runtime(reg)

app = NexusApp()

@app.handler("transform")
async def transform(text: str) -> dict:
    result = rt.execute(wf, {"text": text})
    output = result["results"]["upper"]["result"]
    return {"result": output}

app.start()
```

## Preset Middleware

```python
from kailash.nexus import NexusApp, preset_to_middleware

# Apply middleware presets
app = NexusApp(preset="standard")

# Available presets:
# "none"        - No middleware (development only)
# "lightweight" - Permissive CORS + request logging
# "standard"    - Strict CORS + rate limiting + logging + body limit
# "saas"        - Standard + security response headers
# "enterprise"  - SaaS + stricter rate limits, body limits, headers
```

## Adding Auth

```python
from kailash.nexus import NexusApp, NexusAuthPlugin
import os

app = NexusApp()

# Add JWT authentication
auth = NexusAuthPlugin(jwt_secret_key=os.environ["JWT_SECRET"])
app.use(auth)

@app.handler("protected")
async def protected(name: str) -> dict:
    return {"message": f"Hello, {name}!"}

app.start()
```

## Custom Port and Config

```python
from kailash.nexus import NexusApp

# Default: 0.0.0.0:3000
app = NexusApp()
app.start()

# Custom port
app = NexusApp(port=8080)
app.start()

# Custom host and port
app = NexusApp(host="127.0.0.1", port=9000)
app.start()
```

## MCP Integration

When MCP is enabled (the default), all registered handlers are automatically exposed as MCP tools via SSE.

For Claude Desktop, add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-service": {
      "url": "http://localhost:3000/mcp/sse"
    }
  }
}
```

## Verify

```bash
pip install kailash-enterprise
pytest tests/test_nexus.py -v
```

<!-- Trigger Keywords: nexus quickstart, getting started, first nexus server, multi-channel, NexusApp, handler registration, preset middleware, Nexus start -->
