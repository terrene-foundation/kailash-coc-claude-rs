---
name: nodes-code-reference
description: "Code execution nodes reference (EmbeddedPythonNode, EmbeddedJSNode, SubprocessNode, CodeValidationNode). Use when asking 'PythonCode', 'code node', 'JavaScript node', 'execute code', or 'code validation'."
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
# Available code nodes: EmbeddedPythonNode, EmbeddedJSNode,
#   SubprocessNode, CodeValidationNode
```

## PythonCode Node

### EmbeddedPythonNode

```python
import kailash

builder = kailash.WorkflowBuilder()

# Option 1: code string with function definition
builder.add_node("EmbeddedPythonNode", "custom", {
    "code": """
def custom_logic(input_data):
    result = input_data * 2
    return {"result": result}
""",
    "input_data": 10
})

# Option 2: inline code string (use sparingly)
builder.add_node("EmbeddedPythonNode", "code", {
    "code": "result = input_data * 2",
    "input_data": 10
})
```

## JavaScript Node

### EmbeddedJSNode

```python
builder.add_node("EmbeddedJSNode", "js_code", {
    "code": "const result = input_data * 2; result;",
    "input_data": 10
})
```

## Subprocess Node

### SubprocessNode

```python
builder.add_node("SubprocessNode", "shell", {
    "command": "echo",
    "args": ["hello", "world"]
})
```

## Code Validation Node

### CodeValidationNode

```python
builder.add_node("CodeValidationNode", "validate", {
    "code": "def hello(): pass",
    "language": "python"  # Supports: python, rust, javascript, json, yaml, toml
})
```

## When to Use EmbeddedPythonNode

**✅ Appropriate uses:**

- Ollama/local LLM integration
- Complex custom business logic
- Temporary prototyping

**❌ Avoid for:**

- File I/O (use CSVProcessorNode, etc.)
- HTTP requests (use HTTPRequestNode)
- Database queries (use SQLQueryNode)
- Data transformation (use FilterNode, DataMapperNode)

## Related Skills

- **PythonCode Best Practices**: [`pythoncode-best-practices`](../../01-core-sdk/pythoncode-best-practices.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: PythonCode, code node, JavaScript node, execute code, code validation, EmbeddedPythonNode, EmbeddedJSNode, SubprocessNode, CodeValidationNode -->
