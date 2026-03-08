---
name: mcp-transports
description: "MCP transport options: STDIO, SSE, HTTP. Use when asking 'MCP transport', 'SSE transport', 'stdio transport', 'HTTP transport', 'serve MCP tools'."
---

# MCP Transports

MCP uses JSON-RPC 2.0 as its wire protocol. The transport layer handles how messages are sent and received. The Kailash Python SDK provides transport constants and configuration, but standalone MCP serving requires the Nexus multi-channel platform.

## Transport Summary

| Transport | Constant | Best For                                    |
| --------- | -------- | ------------------------------------------- |
| **STDIO** | `STDIO`  | Local tools, Claude Desktop, editor plugins |
| **SSE**   | `SSE`    | Browser/web clients, Nexus auto-integration |
| **HTTP**  | `HTTP`   | Web services, remote servers                |

## Transport Constants

```python
from kailash.nexus.mcp import STDIO, SSE, HTTP

print(STDIO)  # "stdio"
print(SSE)    # "sse"
print(HTTP)   # "http"
```

## Configuring Transports on McpServer

```python
from kailash import McpServer

# Set transport at construction
server = McpServer("my-server", transport="sse")
print(f"Transport: {server.transport()}")  # "sse"

# Configure SSE binding
server.set_sse_config("0.0.0.0", 3000)

# Switch transport
server.set_transport("http")
server.set_http_config("0.0.0.0", 8080)

# Query current config
config = server.get_transport_config()
print(f"Config: {config}")  # {"host": "0.0.0.0", "port": 8080}
```

## Serving MCP Tools via Nexus

The Python MCP server cannot serve transports standalone. Use Nexus, which automatically exposes all registered handlers as MCP tools.

### Basic Nexus with MCP

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet")
def greet(inputs: dict) -> dict:
    name = inputs.get("name", "World")
    return {"message": f"Hello, {name}!"}

@app.handler("add")
def add(inputs: dict) -> dict:
    return {"result": inputs["a"] + inputs["b"]}

# All handlers are automatically available as:
#   POST /api/greet     (HTTP API)
#   POST /api/add       (HTTP API)
#   MCP tool "greet"    (via /mcp/message)
#   MCP tool "add"      (via /mcp/message)
app.start()
```

### Nexus with MCP Configuration

```python
from kailash import Nexus, NexusConfig

config = NexusConfig(
    host="0.0.0.0",
    port=3000,
    enable_mcp=True,  # default is True
)

nexus = Nexus(config=config)

nexus.handler("process", lambda inputs: {"result": inputs.get("data", "")})

# MCP routes are automatically included:
#   POST /mcp/message  -- JSON-RPC endpoint
#   GET  /mcp/sse      -- SSE status endpoint
nexus.start()
```

## McpApplication Transport Configuration

`McpApplication` wraps `McpServer` and can be configured with a transport, though standalone serving raises an error directing you to use Nexus instead.

```python
from kailash.mcp import McpApplication
from kailash.nexus.mcp import SSE, HTTP

# Configure with a transport
app = McpApplication("my-app", transport="sse", host="0.0.0.0", port=3000)

@app.tool("echo", "Echo input")
def echo(params: dict) -> dict:
    return params

# Access the configured server
print(f"Transport: {app.server.transport()}")
print(f"Config: {app.server.get_transport_config()}")

# Attempting to run standalone will raise RuntimeError
# with guidance to use Nexus instead:
# app.run()  # -> RuntimeError
```

## Re-Exports from kailash.nexus.mcp

The `kailash.nexus.mcp` module re-exports key MCP types for convenience:

```python
from kailash.nexus.mcp import (
    McpServer,          # Rust-backed MCP server
    McpApplication,     # Decorator-based wrapper
    STDIO,              # Transport constant: "stdio"
    SSE,                # Transport constant: "sse"
    HTTP,               # Transport constant: "http"
    prompt_argument,    # Prompt argument helper
)
```

## Authentication with Transports

```python
from kailash.mcp import McpApplication

app = McpApplication("secure-app", transport="sse")

@app.tool("protected", "A protected tool")
def protected(params: dict) -> dict:
    return {"secret": "data"}

# Add authentication
app.require_auth(api_keys=["my-secret-key"])

# Or JWT auth
app.require_auth(jwt_secret="my-jwt-secret", jwt_issuer="my-issuer")
```

## Important Notes

1. **McpServer(name, version)**: `name` is required. `version` defaults to `"1.0.0"`.
2. **No standalone serving**: `McpApplication.run()` raises `RuntimeError`. Use Nexus to serve MCP tools over the network.
3. **Nexus auto-integration**: When `enable_mcp=True` (default), all Nexus handlers become MCP tools automatically.
4. **Transport constants**: Import `STDIO`, `SSE`, `HTTP` from `kailash.nexus.mcp`.
5. **prompt_argument**: Import from `kailash.mcp` or `kailash.nexus.mcp`.

<!-- Trigger Keywords: MCP transport, SSE transport, stdio transport, HTTP transport, serve MCP, Nexus MCP, transport constants, McpApplication run -->
