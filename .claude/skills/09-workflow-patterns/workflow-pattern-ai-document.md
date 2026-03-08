---
name: workflow-pattern-ai-document
description: "AI document processing patterns (OCR, extraction, analysis). Use when asking 'AI document', 'document AI', 'OCR workflow', or 'intelligent document processing'."
---

# AI Document Processing Patterns

AI-powered document analysis, extraction, and classification workflows.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `MEDIUM`
> Related Skills: [`workflow-pattern-rag`](workflow-pattern-rag.md), [`nodes-ai-reference`](../nodes/nodes-ai-reference.md)

## Pattern: Invoice Processing with AI

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Read document
builder.add_node("PDFReaderNode", "read_invoice", {
    "file_path": "{{input.invoice_path}}"
})

# 2. OCR extraction
builder.add_node("LLMNode", "extract_fields", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_VISION_MODEL", "gpt-5"),
    "prompt": "Extract: invoice_number, date, amount, vendor from this invoice",
    "image": "{{read_invoice.content}}"
})

# 3. Validate extracted data
builder.add_node("DataValidationNode", "validate", {
    "input": "{{extract_fields.data}}",
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
    "parameters": "{{validate.valid_data}}"
})

builder.connect("read_invoice", "content", "extract_fields", "image")
builder.connect("extract_fields", "data", "validate", "input")
builder.connect("validate", "valid_data", "store", "parameters")

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

<!-- Trigger Keywords: AI document, document AI, OCR workflow, intelligent document processing, invoice extraction -->
