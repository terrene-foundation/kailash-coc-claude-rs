---
name: nodes-code-reference
description: "Code execution nodes reference (PythonCode, Shell). Use when asking 'PythonCode', 'code node', 'Shell node', 'execute code', or 'script execution'."
---

# Code Execution Nodes Reference

Complete reference for code execution nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `HIGH`
> Related Skills: [`pythoncode-best-practices`](../../01-core-sdk/pythoncode-best-practices.md), [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (code patterns)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available code nodes: PythonCodeNode (use sparingly!),
#   MCPToolNode, ScriptRunnerNode
```

## PythonCode Node

### PythonCodeNode
```python
import kailash

builder = kailash.WorkflowBuilder()

# Option 1: code string with function definition
builder.add_node("PythonCodeNode", "custom", {
    "code": """
def custom_logic(input_data):
    result = input_data * 2
    return {"result": result}
""",
    "input_data": 10
})

# Option 2: inline code string (use sparingly)
builder.add_node("PythonCodeNode", "code", {
    "code": "result = input_data * 2",
    "input_data": 10
})
```

## MCP Tool Node

### MCPToolNode
```python
builder.add_node("MCPToolNode", "mcp_tool", {
    "mcp_server": "weather",
    "tool_name": "get_weather",
    "parameters": {"city": "NYC"}
})
```

## When to Use PythonCodeNode

**✅ Appropriate uses:**
- Ollama/local LLM integration
- Complex custom business logic
- Temporary prototyping

**❌ Avoid for:**
- File I/O (use CSVReaderNode, etc.)
- HTTP requests (use HTTPRequestNode)
- Database queries (use AsyncSQLDatabaseNode)
- Data transformation (use FilterNode, DataTransformer)

## Related Skills

- **PythonCode Best Practices**: [`pythoncode-best-practices`](../../01-core-sdk/pythoncode-best-practices.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: PythonCode, code node, Shell node, execute code, script execution, PythonCodeNode -->
