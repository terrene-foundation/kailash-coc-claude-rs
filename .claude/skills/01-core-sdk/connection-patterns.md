---
name: connection-patterns
description: "Node connection patterns with 4-parameter syntax for data flow mapping. Use when asking 'connect nodes', 'connect', 'connection syntax', '4 parameters', 'data flow', 'port mapping', 'fan-out', 'fan-in', 'nested data', or 'workflow connections'."
---

# Connection Patterns

Essential patterns for connecting workflow nodes using the 4-parameter connection syntax with data flow mapping.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `CRITICAL`

## Quick Reference

- **Syntax**: `connect(source, source_output, target, target_input)`
- **CRITICAL**: Always use 4 parameters (source + output → target + input)
- **Port names are flat**: Use the actual output port name (e.g., `"outputs"`, `"rows"`, `"body"`)
- **Fan-Out**: One source → multiple targets
- **Fan-In**: Multiple sources → one target

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# Add nodes
builder.add_node("CSVProcessorNode", "reader", {"action": "read", "source_path": "data.csv"})
builder.add_node("EmbeddedPythonNode", "processor", {"code": "result = len(data)", "output_vars": ["result"]})

# ✅ CORRECT: 4-parameter connection
builder.connect("reader", "rows", "processor", "data")
#                      ^source  ^output   ^target    ^input

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Linear Pipeline**: Sequential data processing
- **Conditional Routing**: Split data based on conditions
- **Fan-Out**: Broadcast data to multiple processors
- **Fan-In**: Merge data from multiple sources
- **Multi-Input**: Multiple sources feeding different input ports on one node

## Connection Types

### Type 1: Direct Mapping (Most Common)

```python
builder = kailash.WorkflowBuilder()

builder.add_node("CSVProcessorNode", "reader", {"action": "read", "source_path": "input.csv"})
builder.add_node("EmbeddedPythonNode", "processor", {"code": "result = len(data)", "output_vars": ["result"]})
builder.add_node("FileWriterNode", "writer", {"path": "output.json"})

# Sequential connections
builder.connect("reader", "rows", "processor", "data")
builder.connect("processor", "outputs", "writer", "data")
```

### Type 2: Port Name Mapping

```python
# Different port names - explicit mapping
builder.add_node("HTTPRequestNode", "api", {"url": "https://api.example.com"})
builder.add_node("EmbeddedPythonNode", "process", {"code": "result = {'parsed': data}", "output_vars": ["result"]})

# Map 'body' output to 'data' input
builder.connect("api", "body", "process", "data")
```

### Type 3: Nested Data via Intermediate Node

The runtime does a direct key lookup on port names -- there is no dot-path resolution. To extract nested fields, use an intermediate EmbeddedPythonNode.

```python
# Analyzer outputs a complex structure
builder.add_node("EmbeddedPythonNode", "analyzer", {
    "code": """
result = {
    'summary': 'Analysis complete',
    'metrics': {
        'accuracy': 0.95,
        'confidence': 0.87
    }
}
""",
    "output_vars": ["result"]
})

# Intermediate node to extract the nested field
builder.add_node("EmbeddedPythonNode", "extractor", {
    "code": """
accuracy = data.get('result', {}).get('metrics', {}).get('accuracy', 0)
result = accuracy
""",
    "output_vars": ["result"]
})

builder.add_node("EmbeddedPythonNode", "reporter", {
    "code": "result = f'Accuracy: {accuracy}'",
    "output_vars": ["result"]
})

# Pass whole outputs to extractor, then extracted value to reporter
builder.connect("analyzer", "outputs", "extractor", "data")
builder.connect("extractor", "outputs", "reporter", "accuracy")
```

### Type 4: Fan-Out (One-to-Many)

```python
# Send same data to multiple processors
builder.add_node("CSVProcessorNode", "reader", {"action": "read", "source_path": "data.csv"})

# Parallel processors
builder.add_node("EmbeddedPythonNode", "validator", {"code": "result = {'valid': True}", "output_vars": ["result"]})
builder.add_node("EmbeddedPythonNode", "logger", {"code": "result = {'logged': True}", "output_vars": ["result"]})
builder.add_node("EmbeddedPythonNode", "analyzer", {"code": "result = {'analyzed': True}", "output_vars": ["result"]})

# Fan-out: reader → multiple targets
builder.connect("reader", "rows", "validator", "data")
builder.connect("reader", "rows", "logger", "data")
builder.connect("reader", "rows", "analyzer", "data")
```

### Type 5: Fan-In with MergeNode

```python
# Combine multiple data sources
builder.add_node("CSVProcessorNode", "source1", {"action": "read", "source_path": "data1.csv"})
builder.add_node("FileReaderNode", "source2", {"path": "data2.json"})
builder.add_node("HTTPRequestNode", "source3", {"url": "https://api.example.com"})

builder.add_node("MergeNode", "merger", {})

# Fan-in: multiple sources → merger
builder.connect("source1", "rows", "merger", "input1")
builder.connect("source2", "content", "merger", "input2")
builder.connect("source3", "body", "merger", "input3")

# Process merged data
builder.add_node("EmbeddedPythonNode", "processor", {"code": "result = {'count': 3}", "output_vars": ["result"]})
builder.connect("merger", "merged", "processor", "data")
```

### Type 6: Multi-Input Processing

```python
# Custom multi-input node
builder.add_node("CSVProcessorNode", "customers", {"action": "read", "source_path": "customers.csv"})
builder.add_node("CSVProcessorNode", "orders", {"action": "read", "source_path": "orders.csv"})

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
""",
    "output_vars": ["result"]
})

# Multiple inputs to same node
builder.connect("customers", "rows", "join", "customers")
builder.connect("orders", "rows", "join", "orders")
```

### Type 7: Multi-Field Extraction via Intermediate Node

The runtime does a direct key lookup -- `"outputs.result.metrics.accuracy"` will NOT resolve. To extract multiple fields from a complex output, use an intermediate EmbeddedPythonNode that unpacks the structure.

```python
# EmbeddedPythonNode outputs via port 'outputs', with named vars from output_vars
builder.add_node("EmbeddedPythonNode", "analyzer", {
    "code": """
result = {
    'metrics': {'accuracy': 0.95, 'f1_score': 0.91},
    'summary': 'Analysis complete',
    'confidence': 0.87
}
""",
    "output_vars": ["result"]
})

# Intermediate node to unpack nested fields into separate output vars
builder.add_node("EmbeddedPythonNode", "unpack", {
    "code": """
r = data.get('result', {})
accuracy = r.get('metrics', {}).get('accuracy', 0)
summary = r.get('summary', '')
confidence = r.get('confidence', 0)
""",
    "output_vars": ["accuracy", "summary", "confidence"]
})

builder.add_node("EmbeddedPythonNode", "metrics_reporter", {
    "code": """
report = {
    'accuracy': accuracy,
    'summary': summary,
    'confidence': confidence
}
result = report
""",
    "output_vars": ["result"]
})

# Pass whole outputs to unpacker, then individual fields to reporter
builder.connect("analyzer", "outputs", "unpack", "data")
builder.connect("unpack", "outputs", "metrics_reporter", "accuracy")
builder.connect("unpack", "outputs", "metrics_reporter", "summary")
builder.connect("unpack", "outputs", "metrics_reporter", "confidence")
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
builder.connect("reader", "rows", "processor", "data")
```

### ❌ Mistake 2: Wrong Port Names

```python
# Wrong - Using non-existent ports
builder.connect("csv_reader", "output", "processor", "input")  # Error
```

### ✅ Fix: Use Correct Port Names

```python
# Correct - CSVProcessorNode outputs to 'rows' port
builder.connect("csv_reader", "rows", "processor", "data")
```

### ❌ Mistake 3: Using Dot Notation in Port Names

```python
# Wrong - runtime does a direct key lookup, no dot-path resolution
builder.connect("analyzer", "outputs.result.accuracy", "reporter", "accuracy")  # Key not found!
```

### ✅ Fix: Use Actual Port Name + Intermediate Node

```python
# Correct - pass the whole output, extract in the receiving node's code
builder.connect("analyzer", "outputs", "extractor", "data")
# Then in extractor's code: accuracy = data['result']['accuracy']
```

### ❌ Mistake 4: Incorrect Node IDs

```python
# Wrong - Node ID mismatch
builder.add_node("CSVProcessorNode", "csv_reader", {})
builder.connect("reader", "rows", "processor", "data")  # Error: 'reader' not found
```

### ✅ Fix: Match Node IDs Exactly

```python
# Correct - Consistent node IDs
builder.add_node("CSVProcessorNode", "csv_reader", {})
builder.connect("csv_reader", "rows", "processor", "data")
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
- 💡 **No dot notation**: Port names are flat strings -- use an intermediate node to extract nested fields
- 💡 **Plan data flow**: Map out connections before coding
- 💡 **Test incrementally**: Add connections one at a time, verify each works

## Version Notes

- 4-parameter connection syntax is the standard pattern
- Port names are flat strings -- use intermediate nodes for nested field extraction

## Keywords for Auto-Trigger

<!-- Trigger Keywords: connect nodes, connect, connection syntax, 4 parameters, data flow, port mapping, fan-out, fan-in, nested data, workflow connections, node connections, data mapping, connection patterns -->
