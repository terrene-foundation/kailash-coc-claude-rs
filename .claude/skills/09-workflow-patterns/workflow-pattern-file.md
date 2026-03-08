---
name: workflow-pattern-file
description: "File processing workflow patterns (CSV, JSON, PDF, batch). Use when asking 'file processing', 'batch file', 'document workflow', or 'file automation'."
---

# File Processing Workflow Patterns

Patterns for automated file processing, transformation, and batch operations.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `MEDIUM`
> Related Skills: [`nodes-data-reference`](../nodes/nodes-data-reference.md), [`workflow-pattern-etl`](workflow-pattern-etl.md)
> Related Subagents: `pattern-expert` (file workflows)

## Quick Reference

File processing patterns:

- **Batch file processing** - Process multiple files
- **File transformation** - Convert formats
- **Document extraction** - PDF, DOCX to text
- **Archive management** - ZIP, unzip, organize

## Pattern 1: Batch CSV Processing

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. List CSV files — use EmbeddedPythonNode for directory listing
builder.add_node("EmbeddedPythonNode", "list_files", {
    "code": """
import os
files = [f for f in os.listdir('data/input') if f.endswith('.csv')]
    """,
    "output_vars": ["files"]
})

# 2. Process each file
builder.add_node("EmbeddedPythonNode", "process_files", {
    "code": """
import csv, io
results = []
for f in files:
    # Process each CSV file
    results.append({'file': f, 'status': 'processed'})
result = {'results': results}
""",
    "output_vars": ["result"]
})

# 3. Merge results
builder.add_node("MergeNode", "merge_results", {})

# 4. Write consolidated output
builder.add_node("FileWriterNode", "write_output", {
    "path": "data/output/consolidated.csv"
})

builder.connect("list_files", "outputs", "process_files", "inputs")
builder.connect("process_files", "outputs", "merge_results", "input_1")
builder.connect("merge_results", "merged", "write_output", "content")

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Pattern 2: PDF Document Extraction

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Read PDF document
builder.add_node("PDFReaderNode", "extract_pdf", {
    "file_path": "{{input.pdf_path}}",
    "extract_metadata": True
})

# 2. Extract tables
builder.add_node("EmbeddedPythonNode", "extract_tables", {
    "code": "result = extract_tables(content)",
    "output_vars": ["result"]
})

# 3. Extract text
builder.add_node("EmbeddedPythonNode", "extract_text", {
    "code": "result = extract_text(content)",
    "output_vars": ["result"]
})

# 4. Analyze with AI
builder.add_node("LLMNode", "analyze_document", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "Summarize this document: {{extract_text.text}}"
})

# 5. Save results — use FileWriterNode for writing files
builder.add_node("FileWriterNode", "save_results", {
    "path": "output/{{input.pdf_name}}_analysis.json"
})

builder.connect("extract_pdf", "text", "extract_tables", "inputs")
builder.connect("extract_pdf", "text", "extract_text", "inputs")
builder.connect("extract_text", "text", "analyze_document", "prompt")
builder.connect("analyze_document", "response", "save_results", "content")
```

## Pattern 3: File Format Conversion

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Detect format and route — use SwitchNode for multi-branch routing
builder.add_node("SwitchNode", "detect_format", {
    "cases": {
        ".csv": "read_csv",
        ".json": "read_json",
        ".xlsx": "read_excel"
    }
})

# 2. Read different formats
builder.add_node("CSVProcessorNode", "read_csv", {
    "action": "read",
    "source_path": "{{input.file_path}}"
})

builder.add_node("FileReaderNode", "read_json", {
    "file_path": "{{input.file_path}}"
})

builder.add_node("ExcelReaderNode", "read_excel", {
    "file_path": "{{input.file_path}}"
})

# 3. Normalize to common format
builder.add_node("EmbeddedPythonNode", "normalize", {
    "code": "result = normalize_to_dict_list(input)",
    "output_vars": ["result"]
})

# 4. Write in target format — use SwitchNode for multi-branch routing
builder.add_node("SwitchNode", "write_format", {
    "cases": {
        "csv": "write_csv",
        "json": "write_json",
        "parquet": "write_parquet"
    }
})

builder.connect("detect_format", "matched", "normalize", "inputs")
builder.connect("normalize", "outputs", "write_format", "input")
```

## Pattern 4: Watch Folder Automation

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Receive file via webhook (no FileWatchNode exists — use WebhookNode or poll)
builder.add_node("WebhookNode", "watch_folder", {
    "path": "/files/new",
    "method": "POST"
})

# 2. Validate file — use SchemaValidatorNode for validation
builder.add_node("SchemaValidatorNode", "validate", {
    "schema": {
        "file_path": "string",
        "file_size": "integer"
    }
})

# 3. Process document
builder.add_node("PDFReaderNode", "process", {
    "file_path": "{{validate.valid}}"
})

# 4. Move to processed folder — use EmbeddedPythonNode for file operations
builder.add_node("EmbeddedPythonNode", "move_file", {
    "code": """
import os
os.rename(source, destination)
moved = True
    """,
    "output_vars": ["moved"]
})

# 5. On error, move to failed folder
builder.add_node("EmbeddedPythonNode", "move_failed", {
    "code": """
import os
os.rename(source, destination)
moved = True
    """,
    "output_vars": ["moved"]
})

builder.connect("watch_folder", "body", "validate", "data")
builder.connect("validate", "valid", "process", "file_path")
builder.connect("process", "text", "move_file", "inputs")
# Use RetryNode for error handling
builder.add_node("RetryNode", "retry_process", {"max_retries": 3})
builder.connect("retry_process", "output", "move_failed", "inputs")
```

## Best Practices

1. **Error handling** - Move failed files to error folder
2. **File validation** - Check size, format, permissions
3. **Atomic operations** - Write to temp, then move
4. **Progress tracking** - Log processed files
5. **Cleanup** - Delete temp files
6. **Batch size** - Process in manageable chunks

## Common Pitfalls

- **No error handling** - Lost files on failures
- **Memory issues** - Loading large files entirely
- **Race conditions** - Multiple processors on same file
- **Missing validation** - Processing invalid files
- **No cleanup** - Accumulating temp files

## Related Skills

- **Data Nodes**: [`nodes-data-reference`](../nodes/nodes-data-reference.md)
- **ETL Patterns**: [`workflow-pattern-etl`](workflow-pattern-etl.md)

<!-- Trigger Keywords: file processing, batch file, document workflow, file automation, CSV processing, PDF extraction -->
