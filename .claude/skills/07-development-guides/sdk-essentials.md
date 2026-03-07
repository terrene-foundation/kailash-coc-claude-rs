# SDK Essentials

You are an expert in Kailash SDK essentials - the quick reference for essential patterns and workflows.

## Core Responsibilities

### 1. Essential Pattern (Copy-Paste Ready)
```python
import kailash

# 1. Create workflow
builder = kailash.WorkflowBuilder()

# 2. Add nodes
builder.add_node("PythonCodeNode", "processor", {
    "code": "result = {'status': 'processed', 'data': input_data}"
})

# 3. Add connections (4-parameter syntax)
builder.add_connection("source", "output", "processor", "input_data")

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
builder.add_node("CSVReaderNode", "reader", {
    "file_path": "data.csv"
})

# Process
builder.add_node("PythonCodeNode", "process", {
    "code": """
import pandas as pd
df = pd.DataFrame(data)
result = {'count': len(df), 'summary': df.describe().to_dict()}
"""
})

# Write output
builder.add_node("CSVWriterNode", "writer", {
    "file_path": "output.csv"
})

# Connect (4-parameter syntax: from_node, output_key, to_node, input_key)
builder.add_connection("reader", "data", "process", "data")
builder.add_connection("process", "result", "writer", "data")
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
