---
name: workflow-industry-manufacturing
description: "Manufacturing workflows (production, quality, inventory). Use when asking 'manufacturing workflow', 'production line', 'quality control', or 'inventory management'."
---

# Manufacturing Industry Workflows

> **Skill Metadata**
> Category: `industry-workflows`
> Priority: `MEDIUM`

## Pattern: Quality Control Workflow

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Production item check
builder.add_node("SQLQueryNode", "get_item", {
    "query": "SELECT * FROM production_items WHERE batch_id = ?",
    "params": ["{{input.batch_id}}"]
})

# 2. Run quality tests
builder.add_node("HTTPRequestNode", "quality_test", {
    "url": "{{sensors.quality_api}}",
    "method": "POST",
    "body": {"batch_id": "{{input.batch_id}}"}
})

# 3. Evaluate results — ConditionalNode takes no config; condition via connections
builder.add_node("ConditionalNode", "check_quality", {})

# 4. Update inventory
builder.add_node("SQLQueryNode", "approve", {
    "query": "UPDATE production_items SET status = 'approved', quality_score = ? WHERE batch_id = ?",
    "params": ["{{quality_test.body}}", "{{input.batch_id}}"]
})

builder.add_node("SQLQueryNode", "reject", {
    "query": "UPDATE production_items SET status = 'rejected', rejection_reason = ? WHERE batch_id = ?",
    "params": ["{{quality_test.body}}", "{{input.batch_id}}"]
})

builder.connect("get_item", "rows", "quality_test", "body")
builder.connect("quality_test", "body", "check_quality", "condition")
builder.connect("check_quality", "result", "approve", "body")
builder.connect("check_quality", "result", "reject", "body")
```

<!-- Trigger Keywords: manufacturing workflow, production line, quality control, inventory management -->
