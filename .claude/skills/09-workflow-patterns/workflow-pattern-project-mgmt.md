---
name: workflow-pattern-project-mgmt
description: "Project management workflow patterns (tasks, approvals, notifications). Use when asking 'project workflow', 'task automation', or 'approval workflow'."
---

# Project Management Workflow Patterns

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `MEDIUM`

## Pattern: Task Approval Workflow

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Create task
builder.add_node("SQLQueryNode", "create_task", {
    "query": "INSERT INTO tasks (title, description, status) VALUES (?, ?, 'pending')",
    "params": ["{{input.title}}", "{{input.description}}"]
})

# 2. Notify approver
builder.add_node("HTTPRequestNode", "notify_approver", {
    "url": "https://api.slack.com/messages",
    "method": "POST",
    "body": {"text": "New task needs approval: {{input.title}}"}
})

# 3. Wait for approval — use WebhookNode to receive callback
builder.add_node("WebhookNode", "wait_approval", {
    "path": "/tasks/approval",
    "method": "POST"
})

# 4. Update status
builder.add_node("SQLQueryNode", "update_status", {
    "query": "UPDATE tasks SET status = 'approved' WHERE id = ?",
    "params": ["{{create_task.rows}}"]
})

builder.connect("create_task", "rows", "notify_approver", "body")
builder.connect("notify_approver", "body", "wait_approval", "data")
builder.connect("wait_approval", "body", "update_status", "body")
```

<!-- Trigger Keywords: project workflow, task automation, approval workflow, project management -->
