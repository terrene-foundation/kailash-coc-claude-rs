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
builder.add_node("DatabaseQueryNode", "get_item", {
    "query": "SELECT * FROM production_items WHERE batch_id = ?",
    "parameters": ["{{input.batch_id}}"]
})

# 2. Run quality tests
builder.add_node("APICallNode", "quality_test", {
    "url": "{{sensors.quality_api}}",
    "method": "POST",
    "body": {"item_id": "{{get_item.id}}"}
})

# 3. Evaluate results
builder.add_node("ConditionalNode", "check_quality", {
    "condition": "{{quality_test.score}} >= 95",
    "true_branch": "approve",
    "false_branch": "reject"
})

# 4. Update inventory
builder.add_node("DatabaseExecuteNode", "approve", {
    "query": "UPDATE production_items SET status = 'approved', quality_score = ? WHERE id = ?",
    "parameters": ["{{quality_test.score}}", "{{get_item.id}}"]
})

builder.add_node("DatabaseExecuteNode", "reject", {
    "query": "UPDATE production_items SET status = 'rejected', rejection_reason = ? WHERE id = ?",
    "parameters": ["{{quality_test.failure_reason}}", "{{get_item.id}}"]
})

builder.add_connection("get_item", "id", "quality_test", "item_id")
builder.add_connection("quality_test", "score", "check_quality", "condition")
builder.add_connection("check_quality", "output_true", "approve", "trigger")
builder.add_connection("check_quality", "output_false", "reject", "trigger")
```

<!-- Trigger Keywords: manufacturing workflow, production line, quality control, inventory management -->
