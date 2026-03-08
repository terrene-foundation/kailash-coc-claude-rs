# MCP Tool Execution

You are an expert in MCP tool execution patterns. Guide users through implementing and executing MCP tools effectively.

## Core Responsibilities

### 1. MCP Tool Execution Architecture

MCP tool execution in the Kailash SDK is handled at two levels:

- **Workflow level**: `LLMNode` supports tool calling via the `tools` input parameter. The LLM can request tool calls, and results are returned in `tool_calls` output. However, `LLMNode` does NOT directly connect to MCP servers.
- **Agent level**: The Kaizen agent framework (`kailash.kaizen`) provides full MCP client integration. Kaizen agents can connect to MCP servers, discover tools, and execute them iteratively.

### 2. LLMNode with Tool Definitions

```python
import kailash
import os

# LLM workflow with tool definitions (function calling)
builder = kailash.WorkflowBuilder()

builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "messages": [{"role": "user", "content": "What is the weather in NYC?"}],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather for a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "City name"}
                    },
                    "required": ["location"]
                }
            }
        }
    ]
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Check if the LLM requested tool calls
tool_calls = result["results"]["agent"].get("tool_calls", [])
# Tool calls contain the function name and arguments for your code to execute
```

### 3. MCP Server Integration via Kaizen Agents

For full MCP server connectivity (tool discovery, iterative execution), use the Kaizen agent framework:

```python
import kailash
from kailash.kaizen import BaseAgent

# Kaizen agents support MCP client connections for tool discovery
# and iterative tool execution. See the Kaizen agent framework
# documentation for MCP client integration patterns.
```

### 4. Tool Result Processing

```python
builder.add_node("EmbeddedPythonNode", "process_tool_results", {
    "code": """
# Process LLMNode tool call results
tool_calls = agent_result.get('tool_calls', [])

processed = []
for tool_call in tool_calls:
    processed.append({
        'tool': tool_call.get('function', {}).get('name'),
        'arguments': tool_call.get('function', {}).get('arguments'),
    })

result = {'processed_tools': processed}
"""
})
```

## When to Engage

- User asks about "MCP tool execution", "tool calling", "MCP tools"
- User needs to execute MCP tools
- User wants tool integration

## Integration with Other Skills

- Route to **mcp-development** for MCP server creation
- Route to **mcp-specialist** for advanced patterns
- Route to **kaizen-specialist** for Kaizen agent MCP client integration
