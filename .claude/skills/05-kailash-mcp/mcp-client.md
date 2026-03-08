---
name: mcp-client
description: "MCP client patterns with the Kailash Python SDK. Use when asking 'MCP client', 'connect to MCP server', 'discover tools', 'call MCP tool', 'agent MCP integration'."
---

# MCP Client

The Kailash Kaizen framework includes MCP client capabilities for connecting AI agents to MCP servers. The Python SDK exposes tool discovery and registration through the `ToolRegistry` and `ToolDef` types.

## Tool Discovery and Registration

MCP tools discovered from servers can be registered in a `ToolRegistry` for use by Kaizen agents.

```python
from kailash import ToolRegistry, ToolDef, ToolParam

# Create a tool registry
registry = ToolRegistry()

# Manually register a tool definition (simulating MCP discovery)
tool = ToolDef(
    "search",
    "Search documents by query",
    lambda args: {"results": [], "query": args.get("query", "")},
    [
        ToolParam("query", "string", description="The search query", required=True),
        ToolParam("limit", "integer", description="Max results", required=False),
    ],
)

registry.register(tool)
print(f"Registered tools: {registry.list_tools()}")
```

## ToolRegistry API

```python
from kailash import ToolRegistry, ToolDef

registry = ToolRegistry()

# Register a tool
tool = ToolDef("echo", "Echo input", lambda args: args)
registry.register(tool)

# Check if a tool exists
assert registry.get("echo") is not None

# Get a tool by name
found = registry.get("echo")
print(f"Tool: {found.name} - {found.description}")

# List all tools
names = registry.list_tools()
print(f"All tools: {names}")

# Count tools
print(f"Tool count: {registry.count()}")
```

## ToolDef and ToolParam

```python
from kailash import ToolDef, ToolParam

# Create a tool with typed parameters
def calculator(args: dict) -> dict:
    a = args.get("a", 0)
    b = args.get("b", 0)
    op = args.get("operation", "add")
    if op == "add":
        return {"result": a + b}
    elif op == "multiply":
        return {"result": a * b}
    return {"error": f"Unknown operation: {op}"}

tool = ToolDef(
    "calculator",
    "Performs arithmetic operations",
    calculator,
    [
        ToolParam("a", "float", description="First number", required=True),
        ToolParam("b", "float", description="Second number", required=True),
        ToolParam("operation", "string", description="Operation to perform", required=False),
    ],
)

# Inspect tool properties
print(f"Name: {tool.name}")
print(f"Description: {tool.description}")
print(f"  Parameter count: {tool.param_count}")
```

## JSON Schema Type Mapping

When tools are discovered from an MCP server, JSON Schema types map to `ToolParam` types:

| JSON Schema `type` | `ToolParam` type |
| ------------------ | ---------------- |
| `"string"`         | `"string"`       |
| `"integer"`        | `"integer"`      |
| `"number"`         | `"float"`        |
| `"boolean"`        | `"bool"`         |
| `"object"`         | `"object"`       |
| `"array"`          | `"array"`        |
| unknown/missing    | `"string"`       |

## Convenience Helpers

```python
from kailash.mcp import create_tool, tool_param

# create_tool is a shortcut for ToolDef construction
tool = create_tool(
    "greet",
    "Greet a user",
    lambda args: {"message": f"Hello, {args.get('name', 'World')}!"},
    [tool_param("name", "string", "Name to greet", required=True)],
)

print(f"Created: {tool.name}")
```

## Using Tools with Kaizen Agents

MCP tools registered in a `ToolRegistry` can be used by Kaizen agents as part of their tool execution loop.

```python
from kailash import ToolRegistry, ToolDef, ToolParam

# Build a registry of available tools
registry = ToolRegistry()

registry.register(ToolDef(
    "search_docs",
    "Search documentation",
    lambda args: {"results": [f"Result for: {args['query']}"]},
    [ToolParam("query", "string", description="Search query", required=True)],
))

registry.register(ToolDef(
    "get_weather",
    "Get current weather",
    lambda args: {"temperature": 72, "city": args.get("city", "unknown")},
    [ToolParam("city", "string", description="City name", required=True)],
))

# List available tools for an agent
for name in registry.list_tools():
    tool = registry.get(name)
    print(f"  {tool.name}: {tool.description}")
```

<!-- Trigger Keywords: MCP client, ToolRegistry, discover tools, call tool, MCP agent, tool registry, ToolDef, ToolParam -->
