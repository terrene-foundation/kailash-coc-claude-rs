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
builder.add_node("CSVReaderNode", "load", {"file_path": "data.csv"})

# 2. Remove duplicates
builder.add_node("DeduplicateNode", "dedupe", {
    "input": "{{load.data}}",
    "key_fields": ["email"]
})

# 3. Validate schema
builder.add_node("DataValidationNode", "validate", {
    "input": "{{dedupe.data}}",
    "schema": {"email": "email", "age": "integer"}
})

# 4. Clean fields
builder.add_node("TransformNode", "clean", {
    "input": "{{validate.valid_data}}",
    "transformations": [
        {"field": "email", "operation": "lowercase"},
        {"field": "name", "operation": "trim"}
    ]
})

# 5. Aggregate metrics
builder.add_node("AggregateNode", "aggregate", {
    "input": "{{clean.data}}",
    "group_by": ["country"],
    "aggregations": {"count": "COUNT(*)", "avg_age": "AVG(age)"}
})

builder.add_connection("load", "data", "dedupe", "input")
builder.add_connection("dedupe", "data", "validate", "input")
builder.add_connection("validate", "valid_data", "clean", "input")
builder.add_connection("clean", "data", "aggregate", "input")
```

<!-- Trigger Keywords: data pipeline, data processing, data transformation, data cleaning, data quality -->
