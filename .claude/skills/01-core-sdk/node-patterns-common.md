---
name: node-patterns-common
description: "Common node usage patterns with copy-paste templates for CSV, JSON, PythonCode, LLM, HTTP, and data transformation. Use when asking 'node examples', 'how to use nodes', 'CSVReader', 'PythonCodeNode', 'LLMAgent', 'HTTPRequest', 'data transformation', 'common patterns', 'node templates', or 'workflow examples'."
---

# Common Node Patterns

Copy-paste ready templates for the most frequently used Kailash SDK nodes with working examples.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **PythonCodeNode**: Custom Python logic, most flexible
- **CSVReaderNode**: Read CSV files with pandas
- **JSONWriterNode**: Write JSON output
- **HTTPRequestNode**: API calls (GET/POST)
- **LLMAgentNode**: AI/LLM integration
- **SwitchNode**: Conditional routing

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# PythonCodeNode - most common pattern
builder.add_node("PythonCodeNode", "processor", {
    "code": """
# Process data
processed = [item for item in data if item['score'] > 0.8]
result = {'filtered': processed, 'count': len(processed)}
"""
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Data I/O**: Read/write CSV, JSON, Excel files
- **Data Processing**: Filter, transform, aggregate data
- **API Integration**: HTTP requests to external services
- **AI/LLM**: Process data with AI models
- **Conditional Logic**: Route data based on conditions

## Node Patterns

### Pattern 1: CSV Reading and Writing
```python
builder = kailash.WorkflowBuilder()

# Read CSV file
builder.add_node("CSVReaderNode", "reader", {
    "file_path": "input.csv",
    "delimiter": ",",
    "has_header": True
})

# Process data
builder.add_node("PythonCodeNode", "process", {
    "code": """
import pandas as pd
df = pd.DataFrame(data)
df['total'] = df['quantity'] * df['price']
result = df.to_dict('records')
"""
})

# Write results
builder.add_node("CSVWriterNode", "writer", {
    "file_path": "output.csv"
})

builder.add_connection("reader", "data", "process", "data")
builder.add_connection("process", "result", "writer", "data")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Pattern 2: PythonCodeNode with Filtering
```python
builder = kailash.WorkflowBuilder()

# Data source
builder.add_node("PythonCodeNode", "source", {
    "code": """
result = [
    {'name': 'Alice', 'score': 0.9},
    {'name': 'Bob', 'score': 0.3},
    {'name': 'Charlie', 'score': 0.85}
]
"""
})

# Filter high scores
builder.add_node("PythonCodeNode", "filter", {
    "code": """
filtered = [item for item in data if item.get('score', 0) > 0.8]
result = {'items': filtered, 'count': len(filtered)}
"""
})

builder.add_connection("source", "result", "filter", "data")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(f"Filtered {result["results"]['filter']['result']['count']} items")
```

### Pattern 3: HTTP API Requests
```python
builder = kailash.WorkflowBuilder()

# GET request
builder.add_node("HTTPRequestNode", "api_get", {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {"Authorization": "Bearer TOKEN"},
    "timeout": 30
})

# Process response
builder.add_node("PythonCodeNode", "process", {
    "code": """
import json
data = json.loads(response) if isinstance(response, str) else response
result = {
    'items': data.get('items', []),
    'count': len(data.get('items', []))
}
"""
})

builder.add_connection("api_get", "response", "process", "response")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Pattern 4: LLM Agent Integration
```python
builder = kailash.WorkflowBuilder()

# Prepare data for LLM
builder.add_node("PythonCodeNode", "prep", {
    "code": """
text = "Quarterly revenue increased by 15%."
result = {'text': text, 'task': 'analyze'}
"""
})

# LLM processing
builder.add_node("LLMAgentNode", "llm", {
    "model": "gpt-3.5-turbo",
    "system_prompt": "You are a business analyst. Analyze the given text.",
    "temperature": 0.1,
    "max_tokens": 200
})

# Post-process
builder.add_node("PythonCodeNode", "post", {
    "code": """
llm_response = llm_result.get('response', '')
result = {
    'analysis': llm_response,
    'confidence': 0.9
}
"""
})

builder.add_connection("prep", "result.text", "llm", "prompt")
builder.add_connection("llm", "result", "post", "llm_result")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Pattern 5: Conditional Routing with SwitchNode
```python
builder = kailash.WorkflowBuilder()

# Data source
builder.add_node("PythonCodeNode", "source", {
    "code": "result = {'score': 85, 'type': 'test'}"
})

# Router
builder.add_node("SwitchNode", "router", {
    "condition_field": "score",
    "operator": ">",
    "value": 80
})

# High score handler
builder.add_node("PythonCodeNode", "high_handler", {
    "code": "result = {'status': 'high_score', 'score': score}"
})

# Low score handler
builder.add_node("PythonCodeNode", "low_handler", {
    "code": "result = {'status': 'low_score', 'score': score}"
})

builder.add_connection("source", "result", "router", "data")
builder.add_connection("router", "true", "high_handler", "score")
builder.add_connection("router", "false", "low_handler", "score")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Pattern 6: Data Transformation
```python
builder = kailash.WorkflowBuilder()

# Source data
builder.add_node("CSVReaderNode", "reader", {
    "file_path": "users.csv"
})

# Transform
builder.add_node("PythonCodeNode", "transform", {
    "code": """
import pandas as pd
df = pd.DataFrame(data)
# Add calculated columns
df['full_name'] = df['first_name'] + ' ' + df['last_name']
df['age'] = 2024 - df['birth_year']
# Filter and sort
df = df[df['age'] >= 18].sort_values('age', ascending=False)
result = df.to_dict('records')
"""
})

# Output
builder.add_node("JSONWriterNode", "output", {
    "file_path": "transformed.json",
    "indent": 2
})

builder.add_connection("reader", "data", "transform", "data")
builder.add_connection("transform", "result", "output", "data")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Mistakes

### ❌ Mistake 1: Wrong Result Access for PythonCodeNode
```python
# Wrong - Missing 'result' nesting
value = result["results"]['processor']['count']  # KeyError
```

### ✅ Fix: Use Correct Nesting
```python
# Correct - PythonCodeNode wraps output in 'result'
value = result["results"]['processor']['result']['count']  # ✓
```

### ❌ Mistake 2: Not Handling First Iteration in Cycles
```python
# Wrong - Assuming parameters exist
builder.add_node("PythonCodeNode", "proc", {
    "code": "value = input_value + 1; result = {'value': value}"
})
```

### ✅ Fix: Use try/except for Cycles
```python
# Correct - Handle first iteration
builder.add_node("PythonCodeNode", "proc", {
    "code": """
try:
    value = input_value
except NameError:
    value = 0  # First iteration default
result = {'value': value + 1}
"""
})
```

### ❌ Mistake 3: Incorrect Port Names in Connections
```python
# Wrong - Using wrong output port name
builder.add_connection("csv_reader", "output", "processor", "input")
```

### ✅ Fix: Use Correct Port Names
```python
# Correct - CSVReaderNode outputs to 'data' port
builder.add_connection("csv_reader", "data", "processor", "data")
```

## Related Patterns

- **For connections**: See [`connection-patterns`](#)
- **For parameter passing**: See [`param-passing-quick`](#)
- **For error handling**: See [`error-handling-patterns`](#)
- **For node selection**: See [`decide-node-for-task`](#)
- **Complete node catalog**: See [`nodes-quick-index`](#)

## When to Escalate to Subagent

Use `sdk-navigator` subagent when:
- Finding specific nodes for your use case
- Exploring all 110+ available nodes
- Understanding node capabilities

Use `pattern-expert` subagent when:
- Designing complex multi-node workflows
- Optimizing workflow patterns
- Creating reusable workflow components

## Quick Tips

- 💡 **PythonCodeNode is your friend**: Use it for quick transformations and logic
- 💡 **Always wrap in 'result'**: PythonCodeNode expects `result = {...}`
- 💡 **Check port names**: Each node has specific input/output ports
- 💡 **Use pandas for data**: Import pandas in PythonCodeNode for data manipulation
- 💡 **Test incrementally**: Build workflows node by node, test each connection

## Version Notes

- String-based nodes are the recommended pattern (all examples use this pattern)

## Keywords for Auto-Trigger

<!-- Trigger Keywords: node examples, how to use nodes, CSVReader, PythonCodeNode, LLMAgent, HTTPRequest, data transformation, common patterns, node templates, workflow examples, CSV patterns, JSON patterns, API patterns, LLM patterns, node usage -->
