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

# 1. List CSV files
builder.add_node("FileListNode", "list_files", {
    "directory": "data/input",
    "pattern": "*.csv"
})

# 2. Process each file
builder.add_node("MapNode", "process_files", {
    "input": "{{list_files.files}}",
    "workflow": "process_single_csv"
})

# 3. Merge results
builder.add_node("MergeNode", "merge_results", {
    "inputs": "{{process_files.results}}",
    "strategy": "combine"
})

# 4. Write consolidated output
builder.add_node("FileWriterNode", "write_output", {
    "path": "data/output/consolidated.csv",
    "data": "{{merge_results.combined}}",
    "headers": ["id", "name", "value"]
})

builder.connect("list_files", "files", "process_files", "input")
builder.connect("process_files", "results", "merge_results", "inputs")
builder.connect("merge_results", "combined", "write_output", "content")

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
    "extract_metadata": True,
    "preserve_structure": True,
    "page_numbers": True
})

# 2. Extract tables
builder.add_node("TransformNode", "extract_tables", {
    "input": "{{extract_pdf.content}}",
    "transformation": "extract_tables()"
})

# 3. Extract text
builder.add_node("TransformNode", "extract_text", {
    "input": "{{extract_pdf.content}}",
    "transformation": "extract_text()"
})

# 4. Analyze with AI
builder.add_node("LLMNode", "analyze_document", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "prompt": "Summarize this document: {{extract_text.text}}"
})

# 5. Save results — use FileWriterNode for writing files
builder.add_node("FileWriterNode", "save_results", {
    "path": "output/{{input.pdf_name}}_analysis.json"
})

builder.connect("extract_pdf", "content", "extract_tables", "input")
builder.connect("extract_pdf", "content", "extract_text", "input")
builder.connect("extract_text", "text", "analyze_document", "prompt")
builder.connect("analyze_document", "response", "save_results", "content")
```

## Pattern 3: File Format Conversion

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Read source file
builder.add_node("ConditionalNode", "detect_format", {
    "condition": "{{input.file_ext}}",
    "branches": {
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
builder.add_node("TransformNode", "normalize", {
    "input": "{{read_csv.rows || read_json.data || read_excel.data}}",
    "transformation": "normalize_to_dict_list()"
})

# 4. Write in target format
builder.add_node("ConditionalNode", "write_format", {
    "condition": "{{input.target_format}}",
    "branches": {
        "csv": "write_csv",
        "json": "write_json",
        "parquet": "write_parquet"
    }
})

builder.connect("detect_format", "result", "normalize", "input")
builder.connect("normalize", "data", "write_format", "input")
```

## Pattern 4: Watch Folder Automation

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Watch directory for new files
builder.add_node("FileWatchNode", "watch_folder", {
    "directory": "data/inbox",
    "pattern": "*.pdf",
    "event": "created"
})

# 2. Validate file
builder.add_node("FileValidateNode", "validate", {
    "file_path": "{{watch_folder.file_path}}",
    "min_size": 1024,  # 1KB minimum
    "max_size": 10485760,  # 10MB maximum
    "extensions": [".pdf"]
})

# 3. Process document
builder.add_node("PDFReaderNode", "process", {
    "file_path": "{{validate.file_path}}"
})

# 4. Move to processed folder
builder.add_node("FileMoveNode", "move_file", {
    "source": "{{validate.file_path}}",
    "destination": "data/processed/{{watch_folder.filename}}"
})

# 5. On error, move to failed folder
builder.add_node("FileMoveNode", "move_failed", {
    "source": "{{validate.file_path}}",
    "destination": "data/failed/{{watch_folder.filename}}"
})

builder.connect("watch_folder", "file_path", "validate", "file_path")
builder.connect("validate", "file_path", "process", "file_path")
builder.connect("process", "result", "move_file", "source")
# Use RetryNode for error handling
builder.add_node("RetryNode", "retry_process", {"max_retries": 3})
builder.connect("retry_process", "output", "move_failed", "source")
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
