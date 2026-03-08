---
name: nodes-file-reference
description: "File nodes reference (FileReader, FileWriter, Directory). Use when asking 'file node', 'FileReader', 'FileWriter', 'directory reader', or 'file operations'."
---

# File Nodes Reference

Complete reference for file system operation nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `MEDIUM`
> Related Skills: [`nodes-data-reference`](nodes-data-reference.md), [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (file workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available file nodes: FileReaderNode, FileWriterNode, DirectoryReaderNode
```

## File Reader

### FileReaderNode

```python
import kailash

builder = kailash.WorkflowBuilder()

builder.add_node("FileReaderNode", "reader", {
    "path": "/path/to/file.txt",
    "encoding": "utf-8"
})
```

## File Writer

### FileWriterNode

```python
builder.add_node("FileWriterNode", "writer", {
    "path": "/path/to/output.txt",
    "content": "File content here",
    "mode": "w"  # 'w' (write) or 'a' (append)
})
```

## Directory Operations

### DirectoryReaderNode

```python
builder.add_node("DirectoryReaderNode", "dir_reader", {
    "directory_path": "/path/to/directory",
    "pattern": "*.txt",
    "recursive": True
})
```

## Related Skills

- **Data Nodes**: [`nodes-data-reference`](nodes-data-reference.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: file node, FileReader, FileWriter, directory reader, file operations, FileReaderNode, FileWriterNode -->
