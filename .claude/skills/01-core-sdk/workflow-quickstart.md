---
name: workflow-quickstart
description: "Create basic Kailash workflows with WorkflowBuilder. Use when asking 'create workflow', 'workflow template', 'basic workflow', 'how to start', 'workflow setup', 'make workflow', 'build workflow', or 'new workflow'."
---

# Workflow Quick Start

Create basic Kailash workflows using WorkflowBuilder pattern with string-based nodes and 4-parameter connections.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `CRITICAL`
> Related Skills: [`connection-patterns`](../connection-patterns.md), [`node-patterns-common`](../node-patterns-common.md), [`runtime-execution`](../runtime-execution.md), [`param-passing-quick`](../param-passing-quick.md)
> Related Subagents: `pattern-expert` (complex workflows), `sdk-navigator` (finding nodes)

## Quick Reference

- **Import**: `import kailash` -- Rust-backed, all types from one import
- **Pattern**: `WorkflowBuilder() -> add_node() -> connect() -> build()`
- **CRITICAL**: Always call `.build()` before execution
- **Node API**: String-based (e.g., `"CSVProcessorNode"`) not instance-based

## Basic Workflow

Available via `pip install kailash-enterprise`. All types come from a single `import kailash`.

```python
import kailash

# 1. Create registry and builder
reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# 2. Add nodes (string-based, ALWAYS)
builder.add_node("CSVProcessorNode", "reader", {
    "action": "read", "source_path": "data.csv"
})

builder.add_node("EmbeddedPythonNode", "processor", {
    "code": "result = {'count': len(data)}"
})

# 3. Connect nodes (4 parameters: source, source_output, target, target_input)
builder.connect("reader", "rows", "processor", "data")

# 4. Build workflow (pass registry for validation)
wf = builder.build(reg)

# 5. Execute
rt = kailash.Runtime(reg)
result = rt.execute(wf)

# result is a dict: {"results": {...}, "run_id": "...", "metadata": {...}}
print(result["results"]["processor"]["count"])
```

## Common Use Cases

- **Data Processing**: Read files, transform data, write results
- **API Integration**: Fetch data from APIs, process, store in database
- **AI Workflows**: LLM agents with pre/post-processing steps
- **ETL Pipelines**: Extract, transform, load data workflows
- **Business Logic**: Multi-step business processes

## Enhanced API Patterns

### Auto ID Generation

```python
builder = kailash.WorkflowBuilder()

# Auto-generate node IDs for rapid prototyping
reader_id = builder.add_node_auto_id("CSVProcessorNode", {"action": "read", "source_path": "data.csv"})
processor_id = builder.add_node_auto_id("EmbeddedPythonNode", {"code": "result = len(input_data)"})

# Use returned IDs for connections
builder.connect(reader_id, "rows", processor_id, "input_data")
```

### Flexible API Styles

All these patterns are equivalent and work correctly:

```python
# 1. Current/Preferred Pattern
builder.add_node("EmbeddedPythonNode", "processor", {"code": "..."})

# 2. Keyword-Only Pattern
builder.add_node(type_name="EmbeddedPythonNode", node_id="processor", config={"code": "..."})

# 3. Mixed Pattern (common in existing code)
builder.add_node("EmbeddedPythonNode", node_id="processor", config={"code": "..."})

# 4. Auto ID Pattern (returns generated ID)
processor_id = builder.add_node_auto_id("EmbeddedPythonNode", {"code": "..."})
```

## Key Parameters / Options

### add_node(type_name, node_id, config)

| Parameter   | Type | Required | Description                                               |
| ----------- | ---- | -------- | --------------------------------------------------------- |
| `type_name` | str  | Yes      | Node class name as string (e.g., "CSVProcessorNode")      |
| `node_id`   | str  | Yes\*    | Unique identifier for this node (\*optional with auto-ID) |
| `config`    | dict | No       | Node configuration parameters (defaults to None)          |

### connect(source, source_output, target, target_input)

| Parameter       | Type | Required | Description                   |
| --------------- | ---- | -------- | ----------------------------- |
| `source`        | str  | Yes      | Source node ID                |
| `source_output` | str  | Yes      | Output field name from source |
| `target`        | str  | Yes      | Target node ID                |
| `target_input`  | str  | Yes      | Input field name on target    |

## Common Mistakes

### ❌ Mistake 1: Missing .build() Call

```python
# Wrong - missing .build()
result = rt.execute(workflow)  # ERROR!
```

### ✅ Fix: Always Call .build()

```python
# Correct
result = rt.execute(builder.build(reg))  # ✓
```

### ❌ Mistake 2: Wrong Connection Parameters (Only 3)

```python
# Wrong - only 3 parameters (deprecated)
builder.connect("reader", "processor", "data")
```

### ✅ Fix: Use 4 Parameters

```python
# Correct - 4 parameters (source + output → target + input)
builder.connect("reader", "rows", "processor", "data")
```

### ❌ Mistake 3: Instance-Based Nodes

```python
# Wrong - node classes are not importable in the Rust-backed package
# from kailash.nodes import CSVProcessorNode  # ERROR: no such module
builder.add_node("reader", CSVProcessorNode(source_path="data.csv"))
```

### ✅ Fix: String-Based Nodes

```python
# Correct - string-based (production pattern)
builder.add_node("CSVProcessorNode", "reader", {"action": "read", "source_path": "data.csv"})
```

### ❌ Mistake 4: Wrong Execution Pattern

```python
# Wrong - builder doesn't have execute() method
builder.execute(rt)  # ERROR!
```

### ✅ Fix: Runtime Executes Workflow

```python
# Correct - runtime executes workflow
rt.execute(builder.build(reg))  # ✓
```

## Related Patterns

- **For node connections**: [`connection-patterns`](../connection-patterns.md)
- **For parameter passing**: [`param-passing-quick`](../param-passing-quick.md)
- **For runtime options**: [`runtime-execution`](../runtime-execution.md)
- **For common nodes**: [`node-patterns-common`](../node-patterns-common.md)
- **For cyclic workflows**: [`workflow-pattern-cyclic`](../../09-workflow-patterns/workflow-pattern-cyclic.md)
- **For code templates**: See `14-code-templates/` skills

## When to Escalate to Subagent

Use `pattern-expert` subagent when:

- Implementing complex cyclic workflows
- Designing multi-path conditional logic
- Debugging advanced parameter passing issues
- Creating custom nodes from scratch
- Optimizing workflow performance

Use `sdk-navigator` subagent when:

- Need to find specific nodes for your use case
- Looking for workflow examples in specific domains (finance, healthcare, etc.)
- Exploring advanced features and enterprise patterns

## Documentation References

### Primary Sources

- **Essential Pattern**: [`CLAUDE.md` (lines 106-137)](../../../CLAUDE.md#L106-L137)

## Examples

### Example 1: Simple CSV Processing

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# Read CSV file
builder.add_node("CSVProcessorNode", "read_data", {
    "action": "read", "source_path": "input.csv"
})

# Transform data with EmbeddedPythonNode
builder.add_node("EmbeddedPythonNode", "transform", {
    "code": """
import pandas as pd
df = pd.DataFrame(data)
df['total'] = df['quantity'] * df['price']
result = df.to_dict('records')
"""
})

# Write results
builder.add_node("FileWriterNode", "write_data", {
    "path": "output.csv"
})

# Connect the pipeline
builder.connect("read_data", "rows", "transform", "data")
builder.connect("transform", "result", "write_data", "content")

# Execute
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(f"Processed {len(result["results"]['transform']['result']['result'])} records")  # Nested 'result' keys
```

### Example 2: Data Processing ETL

```python
builder = kailash.WorkflowBuilder()

# Extract (simulate data source)
builder.add_node("EmbeddedPythonNode", "extract", {
    "code": "result = {'data': [{'amount': 150}, {'amount': 50}, {'amount': 200}]}"
})

# Transform (filter and process)
builder.add_node("EmbeddedPythonNode", "transform", {
    "code": """
data = input_data.get('data', [])
filtered = [item for item in data if item.get('amount', 0) > 100]
transformed = [{'id': i, 'total': item['amount'] * 1.1} for i, item in enumerate(filtered)]
result = transformed
"""
})

# Load (save results)
builder.add_node("EmbeddedPythonNode", "load", {
    "code": "result = {'saved': len(input_data), 'status': 'complete'}"
})

# Connect the pipeline
builder.connect("extract", "result", "transform", "input_data")
builder.connect("transform", "result", "load", "input_data")

# Execute
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(f"Processed {result["results"]['load']['result']['saved']} items")
```

### Example 3: API Data Collection

```python
builder = kailash.WorkflowBuilder()

# Fetch from API
builder.add_node("HTTPRequestNode", "fetch_data", {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {"Authorization": "Bearer TOKEN"}
})

# Process response
builder.add_node("EmbeddedPythonNode", "extract", {
    "code": """
import json
data = json.loads(response)
result = [item for item in data['items'] if item['active']]
"""
})

# Store in database
builder.add_node("SQLQueryNode", "store", {
    "connection_string": "postgresql://localhost/db",
    "query": "INSERT INTO data_table (json_data) VALUES (:data)",
    "params": {"data": "${extract.result}"}
})

builder.connect("fetch_data", "body", "extract", "response")
builder.connect("extract", "result", "store", "data")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Troubleshooting

| Issue                                                                 | Cause                                               | Solution                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `AttributeError: 'WorkflowBuilder' object has no attribute 'execute'` | Calling `.execute()` on workflow instead of runtime | Use `rt.execute(builder.build(reg))` — see `15-error-troubleshooting/` skills |
| `Node 'X' not found in workflow`                                      | Node ID mismatch in connections                     | Verify node IDs match exactly between `add_node()` and `connect()`            |
| `TypeError: connect() takes 5 positional arguments but 4 were given`  | Using old 3-parameter syntax                        | Update to 4 parameters: `(source, source_output, target, target_input)`       |
| `ValidationError: Missing required parameter 'X'`                     | Node config missing required fields                 | Check node documentation or use `node-patterns-common` for examples           |

## Quick Tips

- 💡 **Always build first**: Call `.build()` before `.execute()` - this is the #1 mistake
- 💡 **String-based nodes**: Use `"CSVProcessorNode"` (string), not `CSVProcessorNode()` (instance)
- 💡 **Unique node IDs**: Each node needs a unique ID within the workflow (or use auto-ID)
- 💡 **4-parameter connections**: Source (node + output) → Target (node + input)
- 💡 **Nested output access**: Use dot notation: `"result.data"` for nested fields
- 💡 **Check examples**: Browse the workflow pattern skills for domain-specific examples

## Version Notes

- Rust-backed engine via `import kailash`
- String-based nodes are the production pattern
- Auto ID generation available for rapid prototyping

<!-- Trigger Keywords: create workflow, workflow template, basic workflow, how to start, workflow setup, make workflow, build workflow, new workflow, workflow example, workflow quickstart, WorkflowBuilder, workflow pattern, create kailash workflow, how to create workflow -->
