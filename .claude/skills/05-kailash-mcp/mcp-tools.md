---
name: mcp-tools
description: "MCP tool and resource patterns. Use when asking 'MCP tool schema', 'tool handler', 'tool testing', 'MCP error handling', 'JSON Schema MCP'."
---

# MCP Tool Patterns

Patterns for defining, registering, and testing MCP tools in the Kailash Python SDK. Tools are the primary way AI agents interact with your application through MCP.

## Tool Registration with Schema

### Basic Tool

```python
from kailash import McpServer

server = McpServer("tools-server")

def search_handler(args: dict) -> dict:
    query = args.get("query", "")
    limit = args.get("limit", 10)
    include_meta = args.get("include_metadata", False)
    return {
        "results": [],
        "query": query,
        "limit": limit,
        "metadata_included": include_meta,
    }

server.register_tool(
    "search",
    "Searches documents by query",
    search_handler,
    schema={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results (default: 10)",
            },
            "include_metadata": {
                "type": "boolean",
                "description": "Whether to include document metadata",
            },
        },
        "required": ["query"],
    },
)
```

### Tool with Enum Parameters

```python
server.register_tool(
    "format",
    "Formats text in a specified style",
    lambda args: {
        "formatted": {
            "uppercase": args.get("text", "").upper(),
            "lowercase": args.get("text", "").lower(),
        }.get(args.get("style", "uppercase"), args.get("text", ""))
    },
    schema={
        "type": "object",
        "properties": {
            "text": {
                "type": "string",
                "description": "Text to format",
            },
            "style": {
                "type": "string",
                "enum": ["uppercase", "lowercase", "title_case", "snake_case"],
                "description": "Formatting style to apply",
            },
        },
        "required": ["text", "style"],
    },
)
```

### Tool with Nested Objects

```python
server.register_tool(
    "create_user",
    "Creates a new user account",
    lambda args: {
        "id": "usr_123",
        "name": args.get("name", ""),
        "email": args.get("email", ""),
        "created": True,
    },
    schema={
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": "Full name"},
            "email": {"type": "string", "description": "Email address"},
            "preferences": {
                "type": "object",
                "properties": {
                    "theme": {"type": "string", "enum": ["light", "dark"]},
                    "notifications": {"type": "boolean"},
                },
                "description": "User preferences",
            },
        },
        "required": ["name", "email"],
    },
)
```

## Decorator-Based Registration

Using `McpApplication` for cleaner syntax:

```python
from kailash.mcp import McpApplication
from kailash import ToolParam

app = McpApplication("tools-app")

@app.tool("search", "Searches documents by query", params=[
    ToolParam("query", "string", description="The search query", required=True),
    ToolParam("limit", "integer", description="Max results", required=False),
])
def search(params: dict) -> dict:
    query = params.get("query", "")
    limit = params.get("limit", 10)
    return {"results": [], "query": query, "limit": limit}

@app.tool("divide", "Divides two numbers", params=[
    ToolParam("numerator", "float", description="Numerator", required=True),
    ToolParam("denominator", "float", description="Denominator", required=True),
])
def divide(params: dict) -> dict:
    num = params["numerator"]
    den = params["denominator"]
    if den == 0:
        raise ValueError("Division by zero")
    return {"result": num / den}

print(f"Registered {app.tool_count} tools")
```

## Error Handling in Handlers

Tool handlers can raise exceptions to signal failures.

```python
from kailash import McpServer

server = McpServer("safe-server")

def divide_handler(args: dict) -> dict:
    num = args.get("numerator")
    den = args.get("denominator")

    if num is None:
        raise ValueError("numerator must be provided")
    if den is None:
        raise ValueError("denominator must be provided")
    if den == 0:
        raise ValueError("division by zero")

    return {"result": num / den}

server.register_tool(
    "divide",
    "Divides two numbers",
    divide_handler,
    schema={
        "type": "object",
        "properties": {
            "numerator": {"type": "number"},
            "denominator": {"type": "number"},
        },
        "required": ["numerator", "denominator"],
    },
)
```

## Tool with Shared State

```python
from kailash.mcp import McpApplication

app = McpApplication("stateful-app")

# Shared state via closure
_store: dict = {}

@app.tool("set_value", "Stores a key-value pair", params=[
    ToolParam("key", "string", description="Key"),
    ToolParam("value", "string", description="Value"),
])
def set_value(params: dict) -> dict:
    key = params["key"]
    _store[key] = params["value"]
    return {"stored": key}

@app.tool("get_value", "Retrieves a value by key", params=[
    ToolParam("key", "string", description="Key"),
])
def get_value(params: dict) -> dict:
    key = params["key"]
    return {"key": key, "value": _store.get(key)}
```

## Testing Tools

### Direct Testing

```python
import pytest
from kailash import McpServer

def test_add_tool():
    server = McpServer("test")

    def add(args):
        return {"sum": args["a"] + args["b"]}

    server.register_tool(
        "add", "Adds numbers", add,
        schema={
            "type": "object",
            "properties": {
                "a": {"type": "number"},
                "b": {"type": "number"},
            },
            "required": ["a", "b"],
        },
    )

    assert server.tool_count() == 1

def test_tool_handler_directly():
    """Test the handler function in isolation."""
    def multiply(args):
        return {"result": args["a"] * args["b"]}

    result = multiply({"a": 6, "b": 7})
    assert result["result"] == 42

def test_tool_error_handling():
    def divide(args):
        if args.get("b", 0) == 0:
            raise ValueError("division by zero")
        return {"result": args["a"] / args["b"]}

    with pytest.raises(ValueError, match="division by zero"):
        divide({"a": 1, "b": 0})

    result = divide({"a": 10, "b": 2})
    assert result["result"] == 5.0
```

### Testing McpApplication

```python
import pytest
from kailash.mcp import McpApplication
from kailash import ToolParam

def test_mcp_app_registration():
    app = McpApplication("test-app")

    @app.tool("echo", "Echo input")
    def echo(params):
        return params

    assert app.tool_count == 1
    assert app.name == "test-app"

def test_mcp_app_with_params():
    app = McpApplication("calc")

    @app.tool("add", "Add numbers", params=[
        ToolParam("a", "float", description="First"),
        ToolParam("b", "float", description="Second"),
    ])
    def add(params):
        return {"sum": params["a"] + params["b"]}

    # The decorated function is still callable directly
    result = add({"a": 1, "b": 2})
    assert result["sum"] == 3
```

## ToolParam Type Mapping

`ToolParam` types map to JSON Schema types in the tool's input schema:

| `ToolParam` type | JSON Schema `type` |
| ---------------- | ------------------ |
| `"string"`       | `"string"`         |
| `"integer"`      | `"integer"`        |
| `"int"`          | `"integer"`        |
| `"float"`        | `"number"`         |
| `"number"`       | `"number"`         |
| `"bool"`         | `"boolean"`        |
| `"boolean"`      | `"boolean"`        |
| `"object"`       | `"object"`         |
| `"array"`        | `"array"`          |
| `"list"`         | `"array"`          |

<!-- Trigger Keywords: MCP tool, tool schema, JSON Schema, tool handler, tool testing, tool registration, MCP error handling, ToolParam -->
