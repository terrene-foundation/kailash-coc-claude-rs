---
name: nodes-data-reference
description: "Data nodes reference (CSV, JSON, Excel, XML). Use when asking 'CSV node', 'JSON node', 'Excel', 'data nodes', 'file reader', or 'data I/O'."
---

# Data Nodes Reference

Complete reference for file I/O and data processing nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `HIGH`
> Related Skills: [`nodes-database-reference`](nodes-database-reference.md), [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (data workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available data nodes: CSVProcessorNode, FileWriterNode, FileReaderNode,
#   JSONTransformNode (expression-based transform), ExcelReaderNode (feature: excel),
#   PDFReaderNode (feature: pdf), XMLParserNode
```

## CSV Nodes

### CSVProcessorNode

```python
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("CSVProcessorNode", "reader", {
    "action": "read",
    "source_path": "data/users.csv",
    "delimiter": ",",
    "encoding": "utf-8"
})
```

### FileWriterNode

```python
builder.add_node("FileWriterNode", "writer", {
    "path": "output/results.csv",
    "data": [],  # From previous node
    "headers": ["id", "name", "email"]
})
```

## JSON Nodes

### JSONTransformNode (Expression-Based Transform)

JSONTransformNode transforms JSON data using dot-notation path expressions. It does NOT read or write files.

- **Input**: `data` (required) -- the data to transform
- **Input**: `expression` (required) -- dot-notation path expression (e.g., `"@.name"`, `"@.items[0]"`)
- **Output**: `result` -- the transformed data

```python
builder.add_node("JSONTransformNode", "extract_name", {
    "expression": "@.users[0].name"
})
builder.connect("source", "data", "extract_name", "data")
# Output: result contains the extracted value
```

### FileReaderNode (Read JSON Files)

To read JSON files, use FileReaderNode:

```python
builder.add_node("FileReaderNode", "json_reader", {
    "path": "config/settings.json"
})
```

### FileWriterNode (Write JSON Files)

To write JSON files, use FileWriterNode:

```python
builder.add_node("FileWriterNode", "json_writer", {
    "path": "output/data.json"
})
```

## Document Processing

### PDFReaderNode ⭐

```python
# PDF document processing (use PDFReaderNode for PDF files)
builder.add_node("PDFReaderNode", "doc_processor", {
    "file_path": "documents/report.pdf",
    "extract_metadata": True
})
```

**Supported Formats**: PDF (feature-gated, requires `pdf` feature)

## Text Nodes

### FileReaderNode (for text files)

```python
builder.add_node("FileReaderNode", "text_reader", {
    "path": "data/content.txt"
})
```

## Excel Nodes

### ExcelReaderNode

```python
builder.add_node("ExcelReaderNode", "excel_reader", {
    "file_path": "data/sales.xlsx",
    "sheet_name": "Q4_2024"
})
```

## Related Skills

- **Database Nodes**: [`nodes-database-reference`](nodes-database-reference.md)
- **Transform Nodes**: [`nodes-transform-reference`](nodes-transform-reference.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: CSV node, JSON node, Excel, data nodes, file reader, data I/O, CSVProcessorNode, JSONTransformNode -->
