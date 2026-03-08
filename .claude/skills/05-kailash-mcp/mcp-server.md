---
name: mcp-server
description: "MCP server patterns with the Kailash Python SDK. Use when asking 'MCP server', 'register MCP tool', 'MCP resources', 'McpServer setup', 'McpApplication'."
---

# MCP Server

The Kailash Python SDK provides two ways to build MCP servers:

1. **`McpServer`** -- Rust-backed server with imperative registration
2. **`McpApplication`** -- Pythonic wrapper with `@decorator` support

**Important**: The Python MCP server cannot serve transports standalone (no `run()` method). To serve MCP tools over a network, use the Nexus multi-channel platform which includes MCP support automatically.

## McpServer (Imperative API)

```python
from kailash import McpServer

# Create a server -- name is required, version defaults to "1.0.0"
server = McpServer("calculator-server", version="2.0.0")

# Register a tool
def add_handler(args: dict) -> dict:
    a = args.get("a", 0)
    b = args.get("b", 0)
    return {"sum": a + b}

server.register_tool(
    "add",
    "Adds two numbers",
    add_handler,
    schema={
        "type": "object",
        "properties": {
            "a": {"type": "number", "description": "First number"},
            "b": {"type": "number", "description": "Second number"},
        },
        "required": ["a", "b"],
    },
)

print(f"Server: {server.name} v{server.version}")
print(f"Tools: {server.tool_count()}")
```

## McpApplication (Decorator API)

```python
from kailash.mcp import McpApplication, prompt_argument
from kailash import ToolParam

app = McpApplication("my-app", version="1.0.0")

# Register a tool with decorator
@app.tool("greet", "Greet a user", params=[
    ToolParam("name", "string", description="Name to greet"),
])
def greet(params: dict) -> dict:
    name = params.get("name", "World")
    return {"message": f"Hello, {name}!"}

@app.tool("add", "Add two numbers", params=[
    ToolParam("a", "float", description="First number"),
    ToolParam("b", "float", description="Second number"),
])
def add(params: dict) -> dict:
    return {"result": params["a"] + params["b"]}

print(f"App: {app.name} (tools: {app.tool_count})")
# Access underlying McpServer via app.server
```

## Registering Resources

### Static Resources

```python
from kailash import McpServer

server = McpServer("docs-server")

server.register_resource(
    uri="file:///config.json",
    name="Configuration",
    content='{"database": "postgres://localhost/mydb", "port": 3000}',
    description="Application configuration file",
    mime_type="application/json",
)

server.register_resource(
    uri="file:///readme",
    name="README",
    content="Welcome to the project.",
    description="Project documentation",
    mime_type="text/plain",
)

print(f"Resources: {server.resource_count()}")
```

### Dynamic Resources (Decorator)

```python
from kailash.mcp import McpApplication

app = McpApplication("dynamic-server")

@app.resource("file:///status", "System Status",
              description="Live system status", mime_type="application/json")
def get_status(uri: str) -> str:
    import json
    return json.dumps({"status": "healthy", "uptime": 3600})

print(f"Resources: {app.resource_count}")
```

## Registering Prompts

### With McpServer

```python
from kailash import McpServer

server = McpServer("prompt-server")

def code_review_handler(args: dict) -> list:
    language = args.get("language", "Python")
    return [
        {"role": "user", "content": f"Please review this {language} code."},
    ]

server.register_prompt(
    "code-review",
    code_review_handler,
    description="Code review prompt",
    arguments=[
        {"name": "language", "required": True, "description": "Programming language"},
    ],
)

print(f"Prompts: {server.prompt_count()}")
```

### With McpApplication (Decorator)

```python
from kailash.mcp import McpApplication, prompt_argument

app = McpApplication("prompt-app")

@app.prompt("code-review", description="Code review prompt",
            arguments=[
                prompt_argument("language", description="The programming language"),
                prompt_argument("style", description="Review style", required=False),
            ])
def code_review(arguments: dict) -> list:
    lang = arguments.get("language", "Python")
    style = arguments.get("style", "thorough")
    return [
        {"role": "user",
         "content": f"Review this {lang} code ({style} review)."},
    ]

print(f"Prompts: {app.prompt_count}")
```

## Transport Configuration

McpServer supports three transport types: `"stdio"`, `"sse"`, and `"http"`.

```python
from kailash import McpServer

# Transport is set at construction or via set_transport()
server = McpServer("my-server", transport="sse")
print(f"Transport: {server.transport()}")

# Configure SSE binding
server.set_sse_config("0.0.0.0", 3000)

# Or switch to HTTP
server.set_transport("http")
server.set_http_config("0.0.0.0", 8080)

# Get current config
config = server.get_transport_config()
print(f"Config: {config}")  # {"host": "0.0.0.0", "port": 8080}
```

**Note**: Transport configuration is stored but standalone serving is not available in the Python binding. Use Nexus to serve MCP tools:

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet")
def greet(inputs: dict) -> dict:
    return {"message": f"Hello, {inputs.get('name', 'World')}!"}

# Nexus serves handlers as both HTTP API and MCP tools
app.start()
# POST /api/greet (HTTP) and MCP tool "greet" via /mcp/message
```

## Authentication

```python
from kailash.mcp import McpApplication

app = McpApplication("secure-app")

# API key authentication
app.require_auth(api_keys=["my-secret-key-1", "my-secret-key-2"])

# JWT authentication
app.require_auth(jwt_secret="my-jwt-secret", jwt_issuer="my-issuer")

# Or via the McpServer directly
server = app.server
server.with_auth({
    "enabled": True,
    "methods": [
        {"type": "api_key", "keys": ["key1", "key2"]},
        {"type": "jwt", "secret": "secret", "issuer": "my-app"},
    ],
})

# Authenticate a request
result = server.authenticate("Bearer my-secret-key-1")
print(f"Authenticated: {result['authenticated']}")
```

## Resource Management

```python
from kailash import McpServer

server = McpServer("managed-server")

# Register resources
server.register_resource("file:///a", "Resource A", "Content A")
server.register_resource("file:///b", "Resource B", "Content B")
print(f"Count: {server.resource_count()}")  # 2

# List resources
resources = server.list_resources()
for r in resources:
    print(f"  {r['uri']}: {r['name']}")

# Read a resource -- returns a dict with keys: uri, mimeType, text
resource = server.read_resource("file:///a")
print(f"URI: {resource['uri']}, Content: {resource['text']}")

# Remove a resource
removed = server.remove_resource("file:///a")
print(f"Removed: {removed}")  # True
```

<!-- Trigger Keywords: MCP server, McpServer, McpApplication, register tool, register resource, register prompt, MCP setup, prompt_argument -->
