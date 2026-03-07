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
builder.add_node("DatabaseExecuteNode", "create_task", {
    "query": "INSERT INTO tasks (title, description, status) VALUES (?, ?, 'pending')",
    "parameters": ["{{input.title}}", "{{input.description}}"]
})

# 2. Notify approver
builder.add_node("APICallNode", "notify_approver", {
    "url": "https://api.slack.com/messages",
    "method": "POST",
    "body": {"text": "New task needs approval: {{input.title}}"}
})

# 3. Wait for approval
builder.add_node("WaitForEventNode", "wait_approval", {
    "event_type": "task_approved",
    "timeout": 86400  # 24 hours
})

# 4. Update status
builder.add_node("DatabaseExecuteNode", "update_status", {
    "query": "UPDATE tasks SET status = 'approved' WHERE id = ?",
    "parameters": ["{{create_task.task_id}}"]
})

builder.add_connection("create_task", "task_id", "notify_approver", "task_id")
builder.add_connection("notify_approver", "result", "wait_approval", "trigger")
builder.add_connection("wait_approval", "event_data", "update_status", "parameters")
```

<!-- Trigger Keywords: project workflow, task automation, approval workflow, project management -->
