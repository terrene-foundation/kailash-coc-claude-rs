---
name: dataflow-compliance
description: "GDPR compliance patterns in DataFlow. Use when asking 'GDPR dataflow', 'data compliance', or 'right to be forgotten'."
---

# DataFlow GDPR Compliance

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`

## GDPR Delete (Right to be Forgotten)

```python
import kailash

df = kailash.DataFlow("postgresql://localhost/app")

@db.model
class User:
    id: str
    email: str
    gdpr_deleted: bool = False

# GDPR deletion workflow
builder = kailash.WorkflowBuilder()

# 1. Mark as deleted (soft delete)
builder.add_node("UpdateUser", "mark_deleted", {
    "id": "{{input.user_id}}",
    "gdpr_deleted": True,
    "email": "[REDACTED]"
})

# 2. Anonymize related data
builder.add_node("SQLQueryNode", "anonymize_logs", {
    "query": "UPDATE audit_logs SET user_email = '[REDACTED]' WHERE user_id = ?",
    "parameters": ["{{input.user_id}}"]
})

# 3. Delete from external systems
builder.add_node("HTTPRequestNode", "delete_external", {
    "url": "https://analytics.example.com/users/{{input.user_id}}",
    "method": "DELETE"
})

builder.connect("mark_deleted", "result", "anonymize_logs", "user_id")
builder.connect("anonymize_logs", "result", "delete_external", "trigger")
```

<!-- Trigger Keywords: GDPR dataflow, data compliance, right to be forgotten, data privacy -->
