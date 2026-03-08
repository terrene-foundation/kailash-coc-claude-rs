---
name: kaizen-tools
description: "Tool system for Kaizen agents. Use when asking about defining tools, ToolDef, ToolRegistry, ToolParam, tool parameters, handler functions, or tool schemas."
---

# Kaizen Tools: Agent Tool System

The Kaizen tool system allows agents to call external functions. Tools are defined with `ToolDef`, registered in a `ToolRegistry`, and invoked through the agent's TAOD execution loop.

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

## Tool Invocation

**Known limitation**: `PyToolDef` does not expose `handler` as a Python-accessible getter, and there is no `call()` method. Tools are invoked through the agent's TAOD execution loop, not called directly from Python.

```python
# Tools are invoked by the agent runtime during execution, not directly.
# The agent's TAOD loop (think/act/observe/decide) handles tool dispatch.

# To access tool metadata (name, description, params) for inspection:
tool = registry.get("calculator")
print(tool.name)           # "calculator"
print(tool.description)    # "Performs basic arithmetic"
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

`BaseAgent.tool_registry` is a **read-only property**. Use `register_tool()` to add tools:

```python
from kailash.kaizen import BaseAgent, ToolDef, ToolParam

class ToolAgent(BaseAgent):
    name = "tool-agent"

    def execute(self, input_text: str) -> dict:
        # The agent's TAOD loop invokes tools automatically.
        # Access tool_registry for inspection if needed:
        tools = self.tool_registry.list_tools()
        return {"response": f"Available tools: {tools}"}


agent = ToolAgent()

# Register tools via register_tool() (tool_registry is read-only)
agent.register_tool(
    "search",
    lambda args: f"Results for: {args['query']}",
    "Search for information",
    [{"name": "query", "param_type": "string", "required": True}],
)

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
- **`tool_registry` is read-only** -- use `agent.register_tool(name, func, description, params)` to add tools. `params` is `list[dict]` with keys: `name`, `param_type`, `description`, `required`
- **Tool invocation** -- tools are invoked by the agent's TAOD loop, not called directly from Python
- **Schema generation** -- `to_openai_schema()` and `to_anthropic_schema()` for LLM integration

<!-- Trigger Keywords: tool, ToolDef, ToolRegistry, ToolParam, tool parameter, handler, function calling, tool schema -->
