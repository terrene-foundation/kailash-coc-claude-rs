---
name: node-patterns-common
description: "Common node usage patterns with copy-paste templates for CSV, JSON, PythonCode, LLM, HTTP, and data transformation. Use when asking 'node examples', 'how to use nodes', 'CSVReader', 'EmbeddedPythonNode', 'LLMAgent', 'HTTPRequest', 'data transformation', 'common patterns', 'node templates', or 'workflow examples'."
---

# Common Node Patterns

Copy-paste ready templates for the most frequently used Kailash SDK nodes with working examples.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **EmbeddedPythonNode**: Custom Python logic, most flexible
- **CSVProcessorNode**: Read/write CSV files
- **JSONTransformNode**: Transform JSON data with expressions
- **HTTPRequestNode**: API calls (GET/POST)
- **LLMNode**: AI/LLM integration
- **SwitchNode**: Conditional routing

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# EmbeddedPythonNode - most common pattern
builder.add_node("EmbeddedPythonNode", "processor", {
    "code": """
# Process data
processed = [item for item in data if item['score'] > 0.8]
result = {'filtered': processed, 'count': len(processed)}
""",
    "output_vars": ["result"]
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
builder.add_node("CSVProcessorNode", "reader", {
    "action": "read",
    "source_path": "input.csv",
    "delimiter": ",",
    "has_headers": True
})

# Process data
builder.add_node("EmbeddedPythonNode", "process", {
    "code": """
result = [
    {**row, 'total': row.get('quantity', 0) * row.get('price', 0)}
    for row in (data if isinstance(data, list) else [])
]
""",
    "output_vars": ["result"]
})

# Write results
builder.add_node("FileWriterNode", "writer", {
    "path": "output.csv"
})

builder.connect("reader", "rows", "process", "data")
builder.connect("process", "outputs", "writer", "content")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Pattern 2: EmbeddedPythonNode with Filtering

```python
builder = kailash.WorkflowBuilder()

# Data source
builder.add_node("EmbeddedPythonNode", "source", {
    "code": """
result = [
    {'name': 'Alice', 'score': 0.9},
    {'name': 'Bob', 'score': 0.3},
    {'name': 'Charlie', 'score': 0.85}
]
""",
    "output_vars": ["result"]
})

# Filter high scores
builder.add_node("EmbeddedPythonNode", "filter", {
    "code": """
filtered = [item for item in data if item.get('score', 0) > 0.8]
result = {'items': filtered, 'count': len(filtered)}
""",
    "output_vars": ["result"]
})

builder.connect("source", "outputs", "filter", "data")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(f"Filtered {result['results']['filter']['outputs']['result']['count']} items")
```

### Pattern 3: HTTP API Requests

```python
builder = kailash.WorkflowBuilder()

# GET request
builder.add_node("HTTPRequestNode", "api_get", {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {"Authorization": "Bearer TOKEN"},
    "timeout_ms": 30000
})

# Process response
builder.add_node("EmbeddedPythonNode", "process", {
    "code": """
import json
data = json.loads(body) if isinstance(body, str) else body
result = {
    'items': data.get('items', []),
    'count': len(data.get('items', []))
}
""",
    "output_vars": ["result"]
})

builder.connect("api_get", "body", "process", "body")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Pattern 4: LLM Agent Integration

```python
builder = kailash.WorkflowBuilder()

# Prepare data for LLM
builder.add_node("EmbeddedPythonNode", "prep", {
    "code": """
text = "Quarterly revenue increased by 15%."
result = {'text': text, 'task': 'analyze'}
""",
    "output_vars": ["result"]
})

# LLM processing
builder.add_node("LLMNode", "llm", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "system_prompt": "You are a business analyst. Analyze the given text.",
    "temperature": 0.1,
    "max_tokens": 200
})

# Post-process
builder.add_node("EmbeddedPythonNode", "post", {
    "code": """
llm_response = llm_result.get('response', '')
result = {
    'analysis': llm_response,
    'confidence': 0.9
}
""",
    "output_vars": ["result"]
})

builder.connect("prep", "outputs", "llm", "prompt")
builder.connect("llm", "response", "post", "llm_result")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Pattern 5: Conditional Selection with ConditionalNode

ConditionalNode selects between two values based on a boolean condition. It has THREE inputs (`condition`, `if_value`, `else_value`) and ONE output (`result`). There is no expression parser -- `condition` is evaluated for truthiness at runtime.

```python
builder = kailash.WorkflowBuilder()

# Data source that computes a boolean condition and two candidate values
builder.add_node("EmbeddedPythonNode", "source", {
    "code": """
score = 85
result = {
    'is_high': score > 80,
    'high_msg': {'status': 'high_score', 'score': score},
    'low_msg': {'status': 'low_score', 'score': score}
}
""",
    "output_vars": ["result"]
})

# ConditionalNode: no config needed. Inputs: condition, if_value, else_value. Output: result.
builder.add_node("ConditionalNode", "router", {})

# Process the selected result
builder.add_node("EmbeddedPythonNode", "handler", {
    "code": "result = {'handled': selected}",
    "output_vars": ["result"]
})

# Connect the boolean condition and two candidate values
builder.connect("source", "outputs", "router", "condition")
builder.connect("source", "outputs", "router", "if_value")
builder.connect("source", "outputs", "router", "else_value")

# ConditionalNode outputs "result" (the selected value), NOT "true_output"/"false_output"
builder.connect("router", "result", "handler", "selected")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

For multi-branch routing to different handlers, use **SwitchNode** instead (see `switchnode-patterns`).

### Pattern 6: Data Transformation

```python
builder = kailash.WorkflowBuilder()

# Source data
builder.add_node("CSVProcessorNode", "reader", {
    "action": "read", "source_path": "users.csv"
})

# Transform
builder.add_node("EmbeddedPythonNode", "transform", {
    "code": """
transformed = []
for row in (data if isinstance(data, list) else []):
    full_name = row.get('first_name', '') + ' ' + row.get('last_name', '')
    age = 2024 - row.get('birth_year', 2024)
    if age >= 18:
        transformed.append({**row, 'full_name': full_name, 'age': age})
# Sort by age descending
transformed.sort(key=lambda r: r.get('age', 0), reverse=True)
result = transformed
""",
    "output_vars": ["result"]
})

# Output — use FileWriterNode for writing files
builder.add_node("FileWriterNode", "output", {
    "path": "transformed.json"
})

builder.connect("reader", "rows", "transform", "data")
builder.connect("transform", "outputs", "output", "content")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Mistakes

### ❌ Mistake 1: Wrong Result Access for EmbeddedPythonNode

```python
# Wrong - Missing 'outputs' nesting
value = result["results"]['processor']['count']  # KeyError
```

### ✅ Fix: Use Correct Nesting

```python
# Correct - EmbeddedPythonNode wraps output in 'outputs', then by output_vars name
value = result["results"]['processor']['outputs']['result']['count']  # ✓
```

### ❌ Mistake 2: Not Handling First Iteration in Cycles

```python
# Wrong - Assuming parameters exist
builder.add_node("EmbeddedPythonNode", "proc", {
    "code": "value = input_value + 1; result = {'value': value}",
    "output_vars": ["result"]
})
```

### ✅ Fix: Use try/except for Cycles

```python
# Correct - Handle first iteration
builder.add_node("EmbeddedPythonNode", "proc", {
    "code": """
try:
    value = input_value
except NameError:
    value = 0  # First iteration default
result = {'value': value + 1}
""",
    "output_vars": ["result"]
})
```

### ❌ Mistake 3: Incorrect Port Names in Connections

```python
# Wrong - Using wrong output port name
builder.connect("csv_reader", "output", "processor", "input")
```

### ✅ Fix: Use Correct Port Names

```python
# Correct - CSVProcessorNode outputs to 'rows' port
builder.connect("csv_reader", "rows", "processor", "data")
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
- Exploring all 139+ available nodes
- Understanding node capabilities

Use `pattern-expert` subagent when:

- Designing complex multi-node workflows
- Optimizing workflow patterns
- Creating reusable workflow components

## Quick Tips

- 💡 **EmbeddedPythonNode is your friend**: Use it for quick transformations and logic
- 💡 **Always include `output_vars`**: EmbeddedPythonNode config MUST include `"output_vars": ["var1", ...]` listing variable names to extract
- 💡 **Check port names**: Each node has specific input/output ports
- 💡 **Use standard library**: EmbeddedPythonNode supports `json`, `math`, `collections`, `itertools`, `re` -- NOT `pandas` or `numpy`
- 💡 **Test incrementally**: Build workflows node by node, test each connection

## Version Notes

- String-based nodes are the recommended pattern (all examples use this pattern)

## Keywords for Auto-Trigger

<!-- Trigger Keywords: node examples, how to use nodes, CSVReader, EmbeddedPythonNode, LLMAgent, HTTPRequest, data transformation, common patterns, node templates, workflow examples, CSV patterns, JSON patterns, API patterns, LLM patterns, node usage -->
