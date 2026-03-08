---
name: dataflow-custom-nodes
description: "Extend DataFlow with custom nodes beyond the auto-generated 11. Use when asking 'custom dataflow nodes', 'extend dataflow', or 'custom operations'."
---

# Custom DataFlow Nodes

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> Related Skills: [`dataflow-specialist`](dataflow-specialist.md)

## Add Custom Workflow Nodes

DataFlow auto-generates 11 nodes per model, but you can add custom business logic:

```python
import kailash

df = kailash.DataFlow("sqlite:///app.db")

@db.model
class User:
    id: str
    email: str
    status: str

# Use auto-generated nodes
builder = kailash.WorkflowBuilder()
builder.add_node("UserCreateNode", "create_user", {
    "email": "{{input.email}}",
    "status": "active"
})

# Add custom business logic node
builder.add_node("HTTPRequestNode", "send_welcome_email", {
    "url": "https://api.sendgrid.com/mail/send",
    "method": "POST",
    "body": {
        "to": "{{create_user.email}}",
        "subject": "Welcome!",
        "template": "welcome"
    }
})

# Add custom validation node
builder.add_node("ConditionalNode", "check_domain", {
    "condition": "{{create_user.email}}.endswith('@company.com')",
    "true_branch": "internal_user",
    "false_branch": "external_user"
})

builder.connect("create_user", "email", "send_welcome_email", "to")
builder.connect("send_welcome_email", "result", "check_domain", "input")
```

## Custom Aggregation Nodes

```python
# Use DataFlow nodes + custom aggregation
builder.add_node("UserListNode", "get_users", {
    "filters": {"status": "active"}
})

# Custom aggregation with TransformNode
builder.add_node("TransformNode", "calculate_metrics", {
    "input": "{{get_users.users}}",
    "transformation": """
        total = len(input)
        domains = {}
        for user in input:
            domain = user['email'].split('@')[1]
            domains[domain] = domains.get(domain, 0) + 1
        return {'total': total, 'domains': domains}
    """
})

builder.connect("get_users", "users", "calculate_metrics", "input")
```

## Best Practices

1. **Use auto-generated nodes first** - Don't reinvent CRUD
2. **Add business logic nodes** - API calls, validations, notifications
3. **Compose workflows** - Combine DataFlow + Core SDK nodes
4. **Keep models simple** - DataFlow handles data, custom nodes handle logic

<!-- Trigger Keywords: custom dataflow nodes, extend dataflow, custom operations, dataflow business logic -->
