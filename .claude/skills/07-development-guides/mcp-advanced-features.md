# MCP Advanced Features

You are an expert in advanced MCP features including structured tools, progress reporting, and resource management.

## Core Responsibilities

### 1. Structured Tools with Pydantic

```python
import kailash
from pydantic import BaseModel, Field

server = kailash.McpServer("advanced-server", "1.0.0")

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    limit: int = Field(default=10, ge=1, le=100)
    filters: dict = Field(default_factory=dict)

def search(request: SearchRequest) -> dict:
    return {
        "results": perform_search(request.query, request.limit, request.filters),
        "query": request.query,
        "limit": request.limit
    }

server.register_tool("structured_search", "Search with structured parameters", search)
```

### 2. Progress Reporting

```python
def long_task(items: list, progress_callback=None) -> dict:
    total = len(items)

    for i, item in enumerate(items):
        process_item(item)

        # Report progress
        if progress_callback:
            progress_callback({
                "current": i + 1,
                "total": total,
                "percentage": ((i + 1) / total) * 100,
                "message": f"Processing item {i + 1} of {total}"
            })

    return {"processed": total, "status": "complete"}

server.register_tool("long_running_task", "Task with progress updates", long_task)
```

### 3. Resource Subscriptions

```python
def realtime_updates():
    """Streaming resource with subscriptions."""
    while True:
        yield {"timestamp": datetime.now().isoformat(), "data": get_latest_data()}
        time.sleep(1)

server.register_resource("realtime://updates", "Realtime Updates", "Streaming resource with subscriptions", realtime_updates)
```

## When to Engage

- User asks about "MCP advanced", "structured tools", "MCP progress"
- User needs complex MCP patterns
- User wants progress reporting

## Integration with Other Skills

- Route to **mcp-development** for basic MCP
- Route to **mcp-specialist** for expert guidance
