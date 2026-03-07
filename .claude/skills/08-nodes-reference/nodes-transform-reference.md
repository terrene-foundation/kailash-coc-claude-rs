---
name: nodes-transform-reference
description: "Transformation nodes reference (DataTransformer, Filter, Map, Sort). Use when asking 'transform node', 'DataTransformer', 'data transform', 'filter data', or 'map node'."
---

# Transformation Nodes Reference

Complete reference for data transformation and processing nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `MEDIUM`
> Related Skills: [`nodes-data-reference`](nodes-data-reference.md), [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (transformation workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available transform nodes: FilterNode, DataTransformer,
#   AggregationNode, TextSplitterNode
```

## Filter Node

### FilterNode
```python
import kailash

builder = kailash.WorkflowBuilder()

builder.add_node("FilterNode", "filter", {
    "condition": "age > 18 and status == 'active'",
    "data": []  # From previous node
})
```

## Data Transformer

### DataTransformer
```python
builder.add_node("DataTransformer", "transform", {
    "transformations": [
        {"field": "price", "operation": "multiply", "value": 1.1},
        {"field": "name", "operation": "upper"}
    ],
    "data": []  # From previous node
})
```

## Aggregation

### AggregationNode
```python
builder.add_node("AggregationNode", "aggregate", {
    "group_by": ["category"],
    "aggregations": [
        {"field": "price", "operation": "sum"},
        {"field": "quantity", "operation": "avg"}
    ],
    "data": []  # From previous node
})
```

## Text Processing

### TextSplitterNode
```python
builder.add_node("TextSplitterNode", "splitter", {
    "chunk_size": 1000,
    "chunk_overlap": 100,
    "separator": "\n\n"
})
```

## Related Skills

- **Data Nodes**: [`nodes-data-reference`](nodes-data-reference.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: transform node, DataTransformer, data transform, filter data, map node, FilterNode, AggregationNode -->
