---
name: connection-patterns
description: "Node connection patterns with 4-parameter syntax for data flow mapping. Use when asking 'connect nodes', 'connect', 'connection syntax', '4 parameters', 'data flow', 'port mapping', 'fan-out', 'fan-in', 'nested data', 'dot notation', or 'workflow connections'."
---

# Connection Patterns

Essential patterns for connecting workflow nodes using the 4-parameter connection syntax with data flow mapping.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `CRITICAL`

## Quick Reference

- **Syntax**: `connect(source, source_output, target, target_input)`
- **CRITICAL**: Always use 4 parameters (source + output → target + input)
- **Dot Notation**: Access nested fields: `"result.metrics.accuracy"`
- **Fan-Out**: One source → multiple targets
- **Fan-In**: Multiple sources → one target

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# Add nodes
builder.add_node("CSVProcessorNode", "reader", {"file_path": "data.csv"})
builder.add_node("EmbeddedPythonNode", "processor", {"code": "result = len(data)"})

# ✅ CORRECT: 4-parameter connection
builder.connect("reader", "data", "processor", "data")
#                      ^source  ^output   ^target    ^input

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Linear Pipeline**: Sequential data processing
- **Conditional Routing**: Split data based on conditions
- **Fan-Out**: Broadcast data to multiple processors
- **Fan-In**: Merge data from multiple sources
- **Nested Data Access**: Extract specific fields from complex outputs

## Connection Types

### Type 1: Direct Mapping (Most Common)

```python
builder = kailash.WorkflowBuilder()

builder.add_node("CSVProcessorNode", "reader", {"file_path": "input.csv"})
builder.add_node("EmbeddedPythonNode", "processor", {"code": "result = len(data)"})
builder.add_node("JSONTransformNode", "writer", {"file_path": "output.json"})

# Sequential connections
builder.connect("reader", "data", "processor", "data")
builder.connect("processor", "result", "writer", "data")
```

### Type 2: Port Name Mapping

```python
# Different port names - explicit mapping
builder.add_node("HTTPRequestNode", "api", {"url": "https://api.example.com"})
builder.add_node("EmbeddedPythonNode", "process", {"code": "result = {'parsed': data}"})

# Map 'response' output to 'data' input
builder.connect("api", "response", "process", "data")
```

### Type 3: Dot Notation for Nested Data

```python
# Extract nested fields from complex outputs
builder.add_node("EmbeddedPythonNode", "analyzer", {
    "code": """
result = {
    'summary': 'Analysis complete',
    'metrics': {
        'accuracy': 0.95,
        'confidence': 0.87
    },
    'metadata': {
        'timestamp': '2024-01-01',
        'version': '1.0'
    }
}
"""
})

builder.add_node("EmbeddedPythonNode", "reporter", {
    "code": "result = f'Accuracy: {accuracy}'"
})

# Extract nested field
builder.connect("analyzer", "result.metrics.accuracy", "reporter", "accuracy")
```

### Type 4: Fan-Out (One-to-Many)

```python
# Send same data to multiple processors
builder.add_node("CSVProcessorNode", "reader", {"file_path": "data.csv"})

# Parallel processors
builder.add_node("EmbeddedPythonNode", "validator", {"code": "result = {'valid': True}"})
builder.add_node("EmbeddedPythonNode", "logger", {"code": "result = {'logged': True}"})
builder.add_node("EmbeddedPythonNode", "analyzer", {"code": "result = {'analyzed': True}"})

# Fan-out: reader → multiple targets
builder.connect("reader", "data", "validator", "data")
builder.connect("reader", "data", "logger", "data")
builder.connect("reader", "data", "analyzer", "data")
```

### Type 5: Fan-In with MergeNode

```python
# Combine multiple data sources
builder.add_node("CSVProcessorNode", "source1", {"file_path": "data1.csv"})
builder.add_node("JSONTransformNode", "source2", {"file_path": "data2.json"})
builder.add_node("HTTPRequestNode", "source3", {"url": "https://api.example.com"})

builder.add_node("MergeNode", "merger", {})

# Fan-in: multiple sources → merger
builder.connect("source1", "data", "merger", "input1")
builder.connect("source2", "data", "merger", "input2")
builder.connect("source3", "response", "merger", "input3")

# Process merged data
builder.add_node("EmbeddedPythonNode", "processor", {"code": "result = {'count': 3}"})
builder.connect("merger", "result", "processor", "data")
```

### Type 6: Multi-Input Processing

```python
# Custom multi-input node
builder.add_node("CSVProcessorNode", "customers", {"file_path": "customers.csv"})
builder.add_node("CSVProcessorNode", "orders", {"file_path": "orders.csv"})

builder.add_node("EmbeddedPythonNode", "join", {
    "code": """
customers_data = customers if customers else []
orders_data = orders if orders else []

# Join logic
result = {
    'customers': len(customers_data),
    'orders': len(orders_data),
    'combined': customers_data + orders_data
}
"""
})

# Multiple inputs to same node
builder.connect("customers", "data", "join", "customers")
builder.connect("orders", "data", "join", "orders")
```

### Type 7: Complex Nested Extraction

```python
builder.add_node("LLMNode", "llm", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "system_prompt": "Analyze data"
})

builder.add_node("EmbeddedPythonNode", "metrics_reporter", {
    "code": """
report = {
    'accuracy': accuracy,
    'summary': summary,
    'confidence': confidence
}
result = report
"""
})

# Extract multiple nested fields
builder.connect("llm", "result.metrics.accuracy", "metrics_reporter", "accuracy")
builder.connect("llm", "result.summary", "metrics_reporter", "summary")
builder.connect("llm", "result.confidence", "metrics_reporter", "confidence")
```

## Common Mistakes

### ❌ Mistake 1: Using 3-Parameter Syntax (Deprecated)

```python
# Wrong - Old 3-parameter syntax
builder.connect("reader", "processor", "data")  # DEPRECATED
```

### ✅ Fix: Use 4-Parameter Syntax

```python
# Correct - Modern 4-parameter syntax
builder.connect("reader", "data", "processor", "data")
```

### ❌ Mistake 2: Wrong Port Names

```python
# Wrong - Using non-existent ports
builder.connect("csv_reader", "output", "processor", "input")  # Error
```

### ✅ Fix: Use Correct Port Names

```python
# Correct - CSVProcessorNode outputs to 'data' port
builder.connect("csv_reader", "data", "processor", "data")
```

### ❌ Mistake 3: Missing Dot Notation for Nested Data

```python
# Wrong - Trying to pass entire result when you need one field
builder.connect("analyzer", "result", "reporter", "accuracy")  # Gets dict, not number
```

### ✅ Fix: Use Dot Notation

```python
# Correct - Extract specific field
builder.connect("analyzer", "result.accuracy", "reporter", "accuracy")
```

### ❌ Mistake 4: Incorrect Node IDs

```python
# Wrong - Node ID mismatch
builder.add_node("CSVProcessorNode", "csv_reader", {})
builder.connect("reader", "data", "processor", "data")  # Error: 'reader' not found
```

### ✅ Fix: Match Node IDs Exactly

```python
# Correct - Consistent node IDs
builder.add_node("CSVProcessorNode", "csv_reader", {})
builder.connect("csv_reader", "data", "processor", "data")
```

## Related Patterns

- **For workflow creation**: See [`workflow-quickstart`](#)
- **For parameter passing**: See [`param-passing-quick`](#)
- **For node patterns**: See [`node-patterns-common`](#)
- **For cyclic workflows**: See [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md)

## When to Escalate to Subagent

Use `pattern-expert` subagent when:

- Designing complex connection patterns
- Implementing advanced data flow
- Debugging connection issues
- Optimizing workflow architecture

Use `sdk-navigator` subagent when:

- Finding node port names
- Understanding node input/output structure
- Resolving connection errors

## Quick Tips

- 💡 **Always 4 parameters**: Source node + output port → Target node + input port
- 💡 **Check port names**: Verify ports exist on nodes before connecting
- 💡 **Use dot notation**: Access nested data with `"result.field.subfield"`
- 💡 **Plan data flow**: Map out connections before coding
- 💡 **Test incrementally**: Add connections one at a time, verify each works

## Version Notes

- 4-parameter connection syntax is the standard pattern
- Dot notation is supported for nested field access

## Keywords for Auto-Trigger

<!-- Trigger Keywords: connect nodes, connect, connection syntax, 4 parameters, data flow, port mapping, fan-out, fan-in, nested data, dot notation, workflow connections, node connections, data mapping, connection patterns -->
