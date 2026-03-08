---
name: kaizen-tools
description: "Tool system for Kaizen agents. Use when asking about defining tools, ToolDef, ToolRegistry, ToolParam, tool parameters, handler functions, or tool schemas."
---

# Kaizen Tools: Agent Tool System

The Kaizen tool system allows agents to call external functions. Tools are defined with `ToolDef`, registered in a `ToolRegistry`, and executed via `call()`.

## Core Types

| Type           | Import                                    | Purpose                                                 |
| -------------- | ----------------------------------------- | ------------------------------------------------------- |
| `ToolDef`      | `from kailash.kaizen import ToolDef`      | Tool definition: name, description, handler, parameters |
| `ToolParam`    | `from kailash.kaizen import ToolParam`    | Parameter definition with type and required flag        |
| `ToolRegistry` | `from kailash.kaizen import ToolRegistry` | Registry of tools by name                               |

## Creating a Tool

```python
from kailash.kaizen import ToolDef, ToolParam

def calculator(args):
    a = args["a"]
    b = args["b"]
    op = args["op"]
    if op == "add":
        return a + b
    elif op == "subtract":
        return a - b
    elif op == "multiply":
        return a * b
    else:
        raise ValueError(f"Unknown operation: {op}")

tool = ToolDef(
    name="calculator",
    description="Performs basic arithmetic",
    handler=calculator,   # NOTE: use handler=, NOT callback=
    params=[
        ToolParam(name="a", param_type="integer", required=True),
        ToolParam(name="b", param_type="integer", required=True),
        ToolParam(
            name="op",
            param_type="string",
            description="Operation to perform",
            required=True,
        ),
    ],
)
```

**IMPORTANT**: Use `handler=` for the callable, NOT `callback=`.

## ToolParam

```python
from kailash.kaizen import ToolParam

param = ToolParam(
    name="query",
    param_type="string",     # "string" (default), "integer", "float", "boolean", "object", "array"
    description="Search query",
    required=True,
)

# Properties (read-only)
print(param.name)          # "query"
print(param.param_type)    # "string"
print(param.description)   # "Search query"
print(param.required)      # True
```

## Registering Tools

```python
from kailash.kaizen import ToolRegistry, ToolDef, ToolParam

registry = ToolRegistry()

registry.register(ToolDef(
    name="search",
    description="Search the web",
    handler=lambda args: {"results": f"Found: {args['query']}"},
    params=[ToolParam(name="query", required=True)],
))

registry.register(ToolDef(
    name="calculator",
    description="Math operations",
    handler=calculator,
    params=[
        ToolParam(name="a", param_type="integer", required=True),
        ToolParam(name="b", param_type="integer", required=True),
        ToolParam(name="op", param_type="string", required=True),
    ],
))

# Query the registry
print(registry.count())               # 2
print(registry.list_tools())          # ["search", "calculator"]

tool = registry.get("calculator")     # Returns ToolDef or None
assert tool is not None
```

## Calling Tools

```python
# Call a tool directly
tool = registry.get("calculator")
result = tool.call({"a": 10, "b": 5, "op": "add"})
# result == 15
```

## Schema Generation

Tool definitions generate provider-specific JSON schemas:

```python
tool = registry.get("calculator")

# OpenAI format
schema = tool.to_openai_schema()
# {"type": "function", "function": {"name": "calculator", "parameters": {...}}}

# Anthropic format
schema = tool.to_anthropic_schema()
# {"name": "calculator", "input_schema": {"type": "object", ...}}
```

## Tools with BaseAgent

```python
from kailash.kaizen import BaseAgent, ToolRegistry, ToolDef, ToolParam

class ToolAgent(BaseAgent):
    name = "tool-agent"

    def execute(self, input_text: str) -> dict:
        # Look up tool by name
        tool = self.tools.get("search")
        if tool:
            result = tool.call({"query": input_text})
            return {"response": str(result)}
        return {"response": "No tools available"}


# Register tools
tools = ToolRegistry()
tools.register(ToolDef(
    name="search",
    description="Search for information",
    handler=lambda args: f"Results for: {args['query']}",
    params=[ToolParam(name="query", required=True)],
))

agent = ToolAgent()
agent.tools = tools

result = agent.run("latest Rust news")
```

## Stateful Tool Handler

For tools that need shared state across invocations:

```python
from kailash.kaizen import ToolDef, ToolParam

class DatabaseTool:
    def __init__(self):
        self.cache = {}

    def query(self, args):
        query = args["query"]

        # Check cache first
        if query in self.cache:
            return self.cache[query]

        # Execute query and cache result
        result = f"DB result for: {query}"
        self.cache[query] = result
        return result


db_tool = DatabaseTool()

tool = ToolDef(
    name="database_query",
    description="Query the database",
    handler=db_tool.query,
    params=[ToolParam(name="query", required=True)],
)
```

## Key Points

- **`ToolDef(handler=...)`** -- use `handler=` kwarg, NOT `callback=`
- **`ToolParam`** -- supports types: `"string"`, `"integer"`, `"float"`, `"boolean"`, `"object"`, `"array"`
- **`ToolRegistry`** -- `register()`, `get()`, `list_tools()`, `count()`
- **`tool.call(args_dict)`** -- execute a tool with a dict of arguments
- **Schema generation** -- `to_openai_schema()` and `to_anthropic_schema()` for LLM integration

<!-- Trigger Keywords: tool, ToolDef, ToolRegistry, ToolParam, tool parameter, handler, function calling, tool schema -->
