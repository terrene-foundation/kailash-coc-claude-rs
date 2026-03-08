---
name: template-mcp-server
description: "Generate Kailash MCP server template. Use when requesting 'MCP server template', 'create MCP server', 'MCP server boilerplate', 'Model Context Protocol server', or 'MCP server example'."
---

# MCP Server Template

Production-ready MCP server template using Kailash SDK's `McpApplication` decorator API.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`mcp-integration-guide`](../../06-cheatsheets/mcp-integration-guide.md)
> Related Subagents: `mcp-specialist` (enterprise MCP), `pattern-expert`

## Basic MCP Server Template

```python
"""Basic MCP Server using Kailash SDK"""

from kailash.mcp import McpApplication, ToolParam

# McpApplication wraps the Rust-backed McpServer with a decorator API
app = McpApplication("my-server", version="1.0.0")

# @app.tool(name, description) -- handler receives a params dict
@app.tool("process_data", "Process data with specified operation", params=[
    ToolParam("data", "string", description="Input data", required=True),
    ToolParam("operation", "string", description="Operation to apply"),
])
def process_data(params):
    data = params.get("data", "")
    operation = params.get("operation", "uppercase")

    if operation == "uppercase":
        result = data.upper()
    elif operation == "lowercase":
        result = data.lower()
    else:
        result = data

    return {
        "result": result,
        "operation": operation,
        "input_length": len(data)
    }

@app.tool("search_database", "Search database and return results", params=[
    ToolParam("query", "string", description="Search query", required=True),
    ToolParam("limit", "integer", description="Max results to return"),
])
def search_database(params):
    query = params.get("query", "")
    limit = params.get("limit", 10)

    results = [
        {"id": 1, "title": f"Result for: {query}"},
        {"id": 2, "title": f"Another result for: {query}"}
    ]

    return {
        "results": results[:limit],
        "count": len(results),
        "query": query
    }

# Access underlying McpServer
print(app)  # McpApplication(name='my-server', tools=2)
print(app.tool_count)  # 2
```

**Note**: `McpApplication.run()` is not yet available (standalone MCP transport pending). To serve MCP tools, use the Nexus multi-channel platform:

```python
from kailash.nexus import NexusApp

nexus = NexusApp()
nexus.start()
```

## Production MCP Server Template

```python
"""Production MCP Server with Authentication and Resources"""

import os
import logging

from kailash.mcp import McpApplication, ToolParam

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create server
app = McpApplication("production-server", version="1.0.0")

# Configure authentication -- api_keys or jwt_secret (not a separate class)
app.require_auth(
    api_keys=[os.environ["MCP_API_KEY"]],
)

# Register tools -- @app.tool(name, description, params=[...])
@app.tool("process_data", "Process data with caching", params=[
    ToolParam("data", "string", description="Input data", required=True),
])
def process_data(params):
    data = params.get("data", "")
    logger.info(f"Processing data: {data[:50]}...")
    return {"result": data.upper()}

@app.tool("admin_operation", "Admin-only operation", params=[
    ToolParam("action", "string", description="Admin action", required=True),
])
def admin_operation(params):
    action = params.get("action", "")
    logger.info(f"Admin action: {action}")
    return {"action": action, "status": "completed"}

# Register resources -- handler receives uri: str
@app.resource(uri="status://health", name="Health Status")
def get_health(uri: str) -> str:
    return '{"status": "healthy"}'

logger.info(f"Server ready: {app.tool_count} tools, {app.resource_count} resources")
```

## Authentication Options

`McpApplication` provides `require_auth()` for authentication:

```python
# API key authentication
app.require_auth(api_keys=["my-secret-key-1", "my-secret-key-2"])

# JWT authentication
app.require_auth(jwt_secret=os.environ["JWT_SECRET"], jwt_issuer="https://my-domain.com")

# Both methods simultaneously
app.require_auth(
    api_keys=[os.environ["MCP_API_KEY"]],
    jwt_secret=os.environ["JWT_SECRET"],
)
```

**Note**: There is no `APIKeyAuth` class. Authentication is configured via `app.require_auth()`.

## Related Patterns

- **MCP integration**: [`mcp-integration-guide`](../../06-cheatsheets/mcp-integration-guide.md)
- **MCP resources**: [`mcp-resources`](../../05-kailash-mcp/mcp-resources.md)
- **Advanced MCP**: [`mcp-advanced-features`](../../05-kailash-mcp/mcp-advanced-features.md)

## When to Escalate

Use `mcp-specialist` subagent when:

- Enterprise MCP architecture
- Multi-transport configuration
- Advanced features (structured tools, resources, progress)
- Production deployment

## API Quick Reference

| Method | Signature | Notes |
|--------|-----------|-------|
| Constructor | `McpApplication(name, version="1.0.0", transport=None, host=None, port=None)` | |
| Tool decorator | `@app.tool(name, description, params=None)` | Handler receives `params` dict |
| Resource decorator | `@app.resource(uri, name, description="", mime_type="text/plain")` | Handler receives `uri: str` |
| Prompt decorator | `@app.prompt(name, description="", arguments=None)` | Handler receives `arguments` dict |
| Auth | `app.require_auth(api_keys=None, jwt_secret=None, jwt_issuer=None)` | At least one method required |
| Properties | `app.tool_count`, `app.resource_count`, `app.prompt_count`, `app.server` | |

<!-- Trigger Keywords: MCP server template, create MCP server, MCP server boilerplate, Model Context Protocol server, MCP server example, MCP template, production MCP server -->
