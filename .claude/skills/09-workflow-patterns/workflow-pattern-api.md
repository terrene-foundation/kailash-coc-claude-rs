---
name: workflow-pattern-api
description: "API integration workflow patterns (REST, GraphQL, webhooks). Use when asking 'API workflow', 'REST integration', 'API orchestration', 'webhook', or 'API automation'."
---

# API Integration Workflow Patterns

Patterns for integrating and orchestrating APIs in workflows.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `HIGH`
> Related Skills: [`nodes-api-reference`](../nodes/nodes-api-reference.md), [`nexus-specialist`](../../03-nexus/nexus-specialist.md)
> Related Subagents: `nexus-specialist` (API platform), `pattern-expert` (API workflows)

## Quick Reference

API patterns enable:
- **REST APIs** - GET, POST, PUT, DELETE operations
- **GraphQL** - Query and mutation execution
- **Webhooks** - Event-driven integrations
- **Authentication** - OAuth, API keys, JWT
- **Rate limiting** - Backoff and throttling
- **Error handling** - Retries and fallbacks

## Pattern 5: Webhook Receiver Workflow

```python
import kailash

builder = kailash.WorkflowBuilder()
reg = kailash.NodeRegistry()

# 1. Validate webhook signature
builder.add_node("TransformNode", "validate_signature", {
    "input": "{{input.signature}}",
    "expected": "{{secrets.webhook_secret}}",
    "transformation": "hmac_sha256(input.body, expected)"
})

builder.add_node("ConditionalNode", "check_signature", {
    "condition": "{{validate_signature.result}} == {{input.signature}}",
    "true_branch": "process",
    "false_branch": "reject"
})

# 2. Parse webhook payload
builder.add_node("TransformNode", "parse_payload", {
    "input": "{{input.body}}",
    "transformation": "json.loads(value)"
})

# 3. Route by event type
builder.add_node("ConditionalNode", "route_event", {
    "condition": "{{parse_payload.event_type}}",
    "branches": {
        "user.created": "create_user",
        "user.updated": "update_user",
        "user.deleted": "delete_user"
    }
})

# 4. Process each event type
builder.add_node("DatabaseExecuteNode", "create_user", {
    "query": "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
    "parameters": "{{parse_payload.data}}"
})

builder.add_node("DatabaseExecuteNode", "update_user", {
    "query": "UPDATE users SET name = ?, email = ? WHERE id = ?",
    "parameters": "{{parse_payload.data}}"
})

builder.add_node("DatabaseExecuteNode", "delete_user", {
    "query": "DELETE FROM users WHERE id = ?",
    "parameters": ["{{parse_payload.data.id}}"]
})

builder.connect("validate_signature", "result", "check_signature", "condition")
builder.connect("check_signature", "output_true", "parse_payload", "input")
builder.connect("parse_payload", "event_type", "route_event", "condition")

# Build and execute
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Best Practices

1. **Authentication** - Store credentials in secrets
2. **Timeouts** - Set reasonable timeout values
3. **Retry logic** - Implement exponential backoff
4. **Rate limiting** - Respect API limits
5. **Error handling** - Graceful degradation
6. **Logging** - Track all API calls
7. **Validation** - Verify responses
8. **Parallel calls** - Use for independent APIs

## Common Pitfalls

- **No retry logic** - Transient failures kill workflows
- **Missing timeouts** - Hanging requests
- **Hard-coded credentials** - Security risks
- **No rate limiting** - API bans
- **Blocking parallel calls** - Slow execution
- **Poor error messages** - Hard to debug

## Related Skills

- **API Nodes**: [`nodes-api-reference`](../nodes/nodes-api-reference.md)
- **Nexus Platform**: [`nexus-specialist`](../../03-nexus/nexus-specialist.md)
- **Error Handling**: [`gold-error-handling`](../../17-gold-standards/gold-error-handling.md)

<!-- Trigger Keywords: API workflow, REST integration, API orchestration, webhook, API automation, GraphQL -->
