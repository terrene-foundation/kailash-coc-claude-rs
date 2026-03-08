---
name: mcp-structured-tools
description: "MCP structured tools with JSON Schema validation. Use when asking 'structured tools', 'JSON schema', 'tool validation', 'mcp parameters', or 'tool input validation'."
---

# MCP Structured Tools

Define MCP tools with JSON Schema validation for reliable parameter handling.

> **Skill Metadata**
> Category: `mcp`
> Priority: `MEDIUM`
> Related Skills: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md), [`mcp-resources`](mcp-resources.md)
> Related Subagents: `mcp-specialist` (complex schemas, validation logic)

## Architecture Note

MCP tool schemas are defined on MCP servers (built with `McpApplication` or `McpServer`). MCP client connections for tool discovery and execution are handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes.

For workflow-level tool calling, `LLMNode` supports the `tools` parameter with standard function-calling tool definitions. Provider is auto-detected from the model name.

## Quick Reference

- **JSON Schema**: Define tool input/output contracts
- **Validation**: Automatic parameter validation before tool execution
- **Type Safety**: Strongly-typed tool parameters
- **Documentation**: Self-documenting tool interfaces

## LLMNode with Tool Definitions

```python
import kailash
import os

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# LLMNode with tool definitions for function calling
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "messages": [{"role": "user", "content": "Get weather for NYC and London"}],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather for a city",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "city": {
                            "type": "string",
                            "description": "City name"
                        },
                        "units": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"],
                            "default": "celsius"
                        }
                    },
                    "required": ["city"]
                }
            }
        }
    ]
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# The LLM returns tool_calls in the response for your code to handle
tool_calls = result["results"]["agent"].get("tool_calls", [])
```

## MCP Server Tool Schemas

When building MCP servers, define tool schemas for structured input validation:

```python
from kailash.mcp import McpApplication
from kailash import ToolParam

app = McpApplication("weather-server", "1.0")

@app.tool("get_weather", "Get current weather for a city", params=[
    ToolParam("city", "string", description="City name", required=True),
    ToolParam("units", "string", description="Temperature units"),
])
def get_weather(params):
    """Get weather data with validated parameters."""
    city = params.get("city", "")
    units = params.get("units", "celsius")
    return f'{{"city": "{city}", "temp": 22, "units": "{units}"}}'
```

## Advanced Schema Patterns

### Nested Objects and Arrays (Tool Definitions for LLMNode)

```python
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "messages": [{"role": "user", "content": "Create a new contact"}],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "create_contact",
                "description": "Create a new contact",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "email": {
                            "type": "string",
                            "format": "email"
                        },
                        "phones": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "type": {
                                        "type": "string",
                                        "enum": ["mobile", "work", "home"]
                                    },
                                    "number": {"type": "string", "pattern": "^\\+?[0-9]{10,15}$"}
                                },
                                "required": ["type", "number"]
                            }
                        },
                        "address": {
                            "type": "object",
                            "properties": {
                                "street": {"type": "string"},
                                "city": {"type": "string"},
                                "zip": {"type": "string", "pattern": "^[0-9]{5}$"}
                            }
                        }
                    },
                    "required": ["name", "email"]
                }
            }
        }
    ]
})
```

### Conditional Schemas

```python
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "messages": [{"role": "user", "content": "Process payment"}],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "process_payment",
                "description": "Process payment with different methods",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount": {"type": "number", "minimum": 0.01},
                        "currency": {"type": "string", "enum": ["USD", "EUR", "GBP"]},
                        "method": {
                            "type": "string",
                            "enum": ["card", "bank_transfer", "paypal"]
                        }
                    },
                    "required": ["amount", "currency", "method"],
                    "allOf": [
                        {
                            "if": {"properties": {"method": {"const": "card"}}},
                            "then": {
                                "properties": {
                                    "card_number": {"type": "string", "pattern": "^[0-9]{16}$"},
                                    "cvv": {"type": "string", "pattern": "^[0-9]{3,4}$"}
                                },
                                "required": ["card_number", "cvv"]
                            }
                        },
                        {
                            "if": {"properties": {"method": {"const": "bank_transfer"}}},
                            "then": {
                                "properties": {
                                    "account_number": {"type": "string"},
                                    "routing_number": {"type": "string"}
                                },
                                "required": ["account_number", "routing_number"]
                            }
                        }
                    ]
                }
            }
        }
    ]
})
```

## Best Practices

### 1. Descriptive Properties

```python
{
    "name": "search_products",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query (e.g., 'laptop 15 inch')",
                "minLength": 1
            },
            "price_range": {
                "type": "object",
                "description": "Optional price filter",
                "properties": {
                    "min": {"type": "number", "description": "Minimum price in USD"},
                    "max": {"type": "number", "description": "Maximum price in USD"}
                }
            }
        },
        "required": ["query"]
    }
}
```

### 2. Default Values

```python
{
    "name": "get_data",
    "parameters": {
        "type": "object",
        "properties": {
            "page": {"type": "integer", "default": 1, "minimum": 1},
            "page_size": {"type": "integer", "default": 20, "minimum": 1, "maximum": 100},
            "sort_order": {"type": "string", "enum": ["asc", "desc"], "default": "asc"}
        }
    }
}
```

### 3. Validation Constraints

```python
{
    "name": "create_user",
    "parameters": {
        "type": "object",
        "properties": {
            "username": {
                "type": "string",
                "minLength": 3,
                "maxLength": 20,
                "pattern": "^[a-zA-Z0-9_]+$"
            },
            "email": {
                "type": "string",
                "format": "email"
            },
            "age": {
                "type": "integer",
                "minimum": 18,
                "maximum": 120
            }
        },
        "required": ["username", "email"]
    }
}
```

## Related Patterns

- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)
- **MCP Resources**: [`mcp-resources`](mcp-resources.md)

## When to Escalate to Subagent

Use `mcp-specialist` subagent when:

- Implementing complex conditional schemas (oneOf, anyOf, allOf)
- Creating reusable schema libraries
- Building schema validation middleware
- Troubleshooting validation failures

## Quick Tips

- Always include descriptions for better LLM understanding
- Use enums to constrain valid values
- Set reasonable min/max constraints
- Provide default values when possible
- Use format validators (email, date, uri)

<!-- Trigger Keywords: structured tools, JSON schema, tool validation, mcp parameters, tool input validation, schema validation, mcp types, parameter types -->
