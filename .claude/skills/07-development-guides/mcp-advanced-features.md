# MCP Advanced Features

You are an expert in advanced MCP features including structured tools, progress reporting, and resource management.

## Core Responsibilities

### 1. Structured Tools with Pydantic

The `McpServer.register_tool()` handler receives a **dict** (not a Pydantic model).
Parse inside the handler:

```python
import kailash
from pydantic import BaseModel, Field

server = kailash.McpServer("advanced-server", "1.0.0")

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    limit: int = Field(default=10, ge=1, le=100)
    filters: dict = Field(default_factory=dict)

def search(args: dict) -> dict:
    # Parse dict into Pydantic model inside the handler
    request = SearchRequest(**args)
    return {
        "results": perform_search(request.query, request.limit, request.filters),
        "query": request.query,
        "limit": request.limit
    }

server.register_tool("structured_search", "Search with structured parameters", search)
```

### 2. Progress Reporting via NexusApp EventBus

For long-running operations, use the NexusApp EventBus to report progress:

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()
bus = app._nexus.event_bus()

@app.handler(name="long_process", description="Long-running process")
async def long_process(steps: int = 10) -> dict:
    for i in range(steps):
        process_item(i)
        bus.publish("progress", {
            "step": i + 1,
            "total": steps,
            "percentage": (i + 1) * 100 // steps
        })
    return {"processed": steps, "status": "complete"}
```

### 3. Dynamic Resources

Use `register_dynamic_resource()` (NOT `register_resource()`) for handler-based resources.
`register_resource()` takes static content; `register_dynamic_resource()` takes a handler.

```python
server = kailash.McpServer("resource-server", "1.0.0")

# Static resource -- content is a string, no handler
server.register_resource(
    "config://settings",
    "Settings",
    '{"version": "1.0.0"}',  # static content string
    description="Server settings"
)

# Dynamic resource -- handler receives uri string, returns string
def get_users(uri: str) -> str:
    users = fetch_users_from_db()
    return json.dumps({"users": users, "count": len(users)})

server.register_dynamic_resource(
    "database://users",
    "User Database",
    get_users,
    description="Access user data"
)
```

## When to Engage

- User asks about "MCP advanced", "structured tools", "MCP progress"
- User needs complex MCP patterns
- User wants progress reporting

## Integration with Other Skills

- Route to **mcp-development** for basic MCP
- Route to **mcp-specialist** for expert guidance
