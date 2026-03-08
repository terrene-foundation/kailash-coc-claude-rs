# MCP Tool Execution

You are an expert in MCP tool execution patterns. Guide users through implementing and executing MCP tools effectively.

## Core Responsibilities

### 1. Tool Execution Pattern

```python
import kailash

# LLM workflow with MCP tools
builder = kailash.WorkflowBuilder()

builder.add_node("IterativeLLMNode", "agent", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "messages": [{"role": "user", "content": "Search for Python tutorials"}],
    "mcp_servers": [
        {
            "name": "search-server",
            "transport": "stdio",
            "command": "python",
            "args": ["search_mcp_server.py"]
        }
    ],
    "auto_discover_tools": True,  # Automatically discover MCP tools
    "max_iterations": 5
})

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### 2. Manual Tool Invocation

```python
builder.add_node("EmbeddedPythonNode", "call_mcp_tool", {
    "code": """
# Manually invoke MCP tool
mcp_client = get_mcp_client("search-server")

tool_result = mcp_client.call_tool(
    tool_name="search",
    parameters={"query": "Python tutorials", "limit": 5}
)

result = {'tool_result': tool_result}
"""
})
```

### 3. Tool Result Processing

```python
builder.add_node("EmbeddedPythonNode", "process_tool_results", {
    "code": """
# Process MCP tool results
tool_outputs = agent_result.get('tool_calls', [])

processed = []
for tool_call in tool_outputs:
    processed.append({
        'tool': tool_call['tool'],
        'result': tool_call['result'],
        'success': tool_call.get('success', True)
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
