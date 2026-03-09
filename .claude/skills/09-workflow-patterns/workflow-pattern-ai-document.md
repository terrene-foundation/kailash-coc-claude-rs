---
name: workflow-pattern-ai-document
description: "AI document processing patterns (OCR, extraction, analysis). Use when asking 'AI document', 'document AI', 'OCR workflow', or 'intelligent document processing'."
---

# AI Document Processing Patterns

AI-powered document analysis, extraction, and classification workflows.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `MEDIUM`
> Related Skills: [`workflow-pattern-rag`](workflow-pattern-rag.md), [`nodes-ai-reference`](../08-nodes-reference/nodes-ai-reference.md)

## Pattern: Invoice Processing with AI

```python
import os
import kailash

builder = kailash.WorkflowBuilder()

# 1. Read document
builder.add_node("PDFReaderNode", "read_invoice", {
    "file_path": "{{input.invoice_path}}"
})

# 2. OCR extraction
builder.add_node("LLMNode", "extract_fields", {
    "model": os.environ.get("DEFAULT_VISION_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "Extract: invoice_number, date, amount, vendor from this invoice"
})

# 3. Validate extracted data — use SchemaValidatorNode
builder.add_node("SchemaValidatorNode", "validate", {
    "schema": {
        "invoice_number": "string",
        "date": "date",
        "amount": "decimal",
        "vendor": "string"
    }
})

# 4. Store in database
builder.add_node("SQLQueryNode", "store", {
    "query": "INSERT INTO invoices (number, date, amount, vendor) VALUES (?, ?, ?, ?)",
    "params": "{{validate.valid}}"
})

builder.connect("read_invoice", "text", "extract_fields", "prompt")
builder.connect("extract_fields", "response", "validate", "data")
builder.connect("validate", "valid", "store", "body")

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

<!-- Trigger Keywords: AI document, document AI, OCR workflow, intelligent document processing, invoice extraction -->
