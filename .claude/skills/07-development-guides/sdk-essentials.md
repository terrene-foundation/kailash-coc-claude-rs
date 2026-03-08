# SDK Essentials

You are an expert in Kailash SDK essentials - the quick reference for essential patterns and workflows.

## Core Responsibilities

### 1. Essential Pattern (Copy-Paste Ready)

```python
import kailash

# 1. Create workflow
builder = kailash.WorkflowBuilder()

# 2. Add nodes
builder.add_node("EmbeddedPythonNode", "processor", {
    "code": "result = {'status': 'processed', 'data': input_data}",
    "output_vars": ["result"]
})

# 3. Add connections (4-parameter syntax)
builder.connect("source", "output", "processor", "input_data")

# 4. Execute - ALWAYS call .build()
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)  # For CLI/scripts
result = rt.execute(builder.build(reg))

# With inputs
# result = rt.execute(builder.build(reg), inputs={"key": "value"})
```

### 2. Quick Data Processing

```python
import kailash

builder = kailash.WorkflowBuilder()

# Read CSV
builder.add_node("CSVProcessorNode", "reader", {
    "action": "read", "source_path": "data.csv"
})

# Process
builder.add_node("EmbeddedPythonNode", "process", {
    "code": """
# pandas is NOT available in EmbeddedPythonNode — use plain Python
count = len(data)
values = [row.get('value', 0) for row in data if isinstance(row, dict)]
result = {'count': count, 'total': sum(values)}
""",
    "output_vars": ["result"]
})

# Write output
builder.add_node("FileWriterNode", "writer", {
    "path": "output.csv"
})

# Connect (4-parameter syntax: source, source_output, target, target_input)
builder.connect("reader", "rows", "process", "data")
builder.connect("process", "outputs", "writer", "content")
```

## When to Engage

- User asks about "SDK essentials", "essential patterns", "SDK quick reference"
- User needs quick patterns
- User wants copy-paste solutions
- User needs rapid prototyping

## Integration with Other Skills

- Route to **sdk-fundamentals** for detailed concepts
- Route to **workflow-creation-guide** for complete workflow building
- Route to **production-deployment-guide** for deployment
