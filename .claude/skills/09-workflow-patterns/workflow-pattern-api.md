---
name: workflow-pattern-api
description: "API integration workflow patterns (REST, GraphQL, webhooks). Use when asking 'API workflow', 'REST integration', 'API orchestration', 'webhook', or 'API automation'."
---

# API Integration Workflow Patterns

Patterns for integrating and orchestrating APIs in workflows.

> **Note**: `{{...}}` values in node configs below are illustrative placeholders.
> Actual data flows via `builder.connect()` — template syntax does NOT work at runtime.

## Quick Reference

API patterns enable:

- **REST APIs** - GET, POST, PUT, DELETE operations
- **GraphQL** - Query and mutation execution
- **Webhooks** - Event-driven integrations
- **Authentication** - OAuth, API keys, JWT
- **Rate limiting** - Backoff and throttling
- **Error handling** - Retries and fallbacks

## Pattern 1: REST API Orchestration

```python
import os
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# 1. Authenticate
builder.add_node("HTTPRequestNode", "auth", {
    "url": "https://api.example.com/auth/token",
    "method": "POST",
    "body": {
        "client_id": os.environ["CLIENT_ID"],
        "client_secret": os.environ["CLIENT_SECRET"],
    },
})

# 2. Get user data
builder.add_node("HTTPRequestNode", "get_user", {
    "url": "https://api.example.com/users/{{input.user_id}}",
    "method": "GET",
    "headers": {
        "Authorization": "Bearer {{auth.body}}",
    },
})

# 3. Update user profile
builder.add_node("HTTPRequestNode", "update_profile", {
    "url": "https://api.example.com/users/{{input.user_id}}/profile",
    "method": "PUT",
    "headers": {
        "Authorization": "Bearer {{auth.body}}",
    },
    "body": "{{input.profile_data}}",
})

# 4. Trigger webhook
builder.add_node("HTTPRequestNode", "notify_webhook", {
    "url": "{{input.webhook_url}}",
    "method": "POST",
    "body": {
        "event": "profile_updated",
        "user_id": "{{input.user_id}}",
    },
})

builder.connect("auth", "body", "get_user", "headers")
builder.connect("get_user", "body", "update_profile", "body")
builder.connect("update_profile", "body", "notify_webhook", "body")

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf, {
    "user_id": "12345",
    "profile_data": {"name": "John Doe"},
    "webhook_url": "https://webhook.site/...",
})
```

## Pattern 2: Parallel API Calls

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# Fetch data from multiple APIs in parallel
builder.add_node("HTTPRequestNode", "api_weather", {
    "url": "https://api.weather.com/current/{{input.city}}",
    "method": "GET",
})

builder.add_node("HTTPRequestNode", "api_news", {
    "url": "https://api.news.com/headlines/{{input.city}}",
    "method": "GET",
})

builder.add_node("HTTPRequestNode", "api_events", {
    "url": "https://api.events.com/search?location={{input.city}}",
    "method": "GET",
})

# Merge results — MergeNode takes no config, output is "merged"
builder.add_node("MergeNode", "merge_results", {})

# No connections between parallel nodes - they run simultaneously
builder.connect("api_weather", "body", "merge_results", "input_1")
builder.connect("api_news", "body", "merge_results", "input_2")
builder.connect("api_events", "body", "merge_results", "input_3")
```

## Pattern 3: GraphQL API Integration

```python
import os
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

builder.add_node("HTTPRequestNode", "graphql_query", {
    "url": "https://api.example.com/graphql",
    "method": "POST",
    "headers": {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {os.environ['API_TOKEN']}",
    },
    "body": {
        "query": """
            query GetUser($id: ID!) {
                user(id: $id) {
                    id
                    name
                    email
                    posts { id title createdAt }
                }
            }
        """,
        "variables": {"id": "{{input.user_id}}"},
    },
})
```

## Pattern 4: Webhook Receiver with Nexus

```python
from kailash.nexus import NexusApp
import kailash

reg = kailash.NodeRegistry()
app = NexusApp(preset="standard")

@app.handler("webhook")
async def handle_webhook(event_type: str, data: dict, signature: str) -> dict:
    # Validate webhook signature
    import hmac, hashlib, os
    expected = hmac.new(
        os.environ["WEBHOOK_SECRET"].encode(),
        str(data).encode(),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(signature, expected):
        return {"error": "Invalid signature"}

    # Route by event type
    builder = kailash.WorkflowBuilder()
    if event_type == "user.created":
        builder.add_node("CreateUser", "create", {})
    elif event_type == "user.updated":
        builder.add_node("UpdateUser", "update", {})

    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf, data)
    return result["results"]

app.start()
```

## Best Practices

1. **Authentication** - Store credentials in environment variables, never hardcode
2. **Timeouts** - Set reasonable timeout values
3. **Retry logic** - Implement exponential backoff
4. **Rate limiting** - Respect API limits
5. **Error handling** - Graceful degradation with fallbacks
6. **Logging** - Track all API calls
7. **Validation** - Verify responses before processing
8. **Parallel calls** - Use for independent APIs

## Common Pitfalls

- **No retry logic** - Transient failures kill workflows
- **Missing timeouts** - Hanging requests block execution
- **Hard-coded credentials** - Security risk, use `.env`
- **No rate limiting** - API bans and throttling
- **Blocking parallel calls** - Sequential when parallel is possible

## Related Skills

- **Nexus Platform**: [`03-nexus`](../../03-nexus/SKILL.md)
- **Error Handling**: [`17-gold-standards/gold-error-handling`](../../17-gold-standards/gold-error-handling.md)

<!-- Trigger Keywords: API workflow, REST integration, API orchestration, webhook, API automation, GraphQL -->
