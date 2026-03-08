---
name: workflow-pattern-data
description: "Data processing pipeline patterns (clean, transform, aggregate). Use when asking 'data pipeline', 'data processing', 'data transformation', or 'data cleaning'."
---

# Data Processing Pipeline Patterns

Patterns for data cleaning, transformation, and aggregation workflows.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `HIGH`
> Related Skills: [`workflow-pattern-etl`](workflow-pattern-etl.md), [`nodes-transform-reference`](../nodes/nodes-transform-reference.md)

## Pattern: Data Quality Pipeline

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Load data
builder.add_node("CSVProcessorNode", "load", {"action": "read", "source_path": "data.csv"})

# 2. Remove duplicates — use ArrayOperationsNode for deduplication
builder.add_node("ArrayOperationsNode", "dedupe", {
    "operation": "unique",
    "key_fields": ["email"]
})

# 3. Validate schema — use SchemaValidatorNode
builder.add_node("SchemaValidatorNode", "validate", {
    "schema": {"email": "email", "age": "integer"}
})

# 4. Clean fields
builder.add_node("EmbeddedPythonNode", "clean", {
    "code": """
for row in data:
    row['email'] = row['email'].lower()
    row['name'] = row['name'].strip()
result = data
    """,
    "output_vars": ["result"]
})

# 5. Aggregate metrics — use EmbeddedPythonNode for aggregation
builder.add_node("EmbeddedPythonNode", "aggregate", {
    "code": """
from collections import defaultdict
groups = defaultdict(lambda: {'count': 0, 'total_age': 0})
for row in data:
    groups[row['country']]['count'] += 1
    groups[row['country']]['total_age'] += row.get('age', 0)
aggregated = [{'country': k, 'count': v['count'], 'avg_age': v['total_age']/v['count']} for k, v in groups.items()]
    """,
    "output_vars": ["aggregated"]
})

builder.connect("load", "rows", "dedupe", "input")
builder.connect("dedupe", "result", "validate", "data")
builder.connect("validate", "valid", "clean", "inputs")
builder.connect("clean", "outputs", "aggregate", "inputs")
```

<!-- Trigger Keywords: data pipeline, data processing, data transformation, data cleaning, data quality -->
