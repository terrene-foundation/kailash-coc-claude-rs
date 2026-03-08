---
skill: nexus-sessions
description: Workflow state management across API, CLI, and MCP channels
priority: HIGH
tags: [nexus, sessions, state, multi-channel]
---

# Nexus Session Management

Workflow execution state management across API, CLI, and MCP channels.

## Core Concept

Nexus workflows are stateless by default. Each `rt.execute()` call is independent. For stateful workflows, use:

- **Workflow inputs/outputs**: Pass state between executions via `inputs`
- **EventBus**: Track lifecycle events with `app._nexus.event_bus()`
- **DataFlow**: Persist state in a database

## Workflow Execution Across Channels

### API Channel

```python
import requests

# Execute workflow via HTTP API
response = requests.post(
    "http://localhost:3000/workflows/process/execute",
    json={
        "inputs": {"user_id": "123", "action": "start"}
    },
    headers={"Authorization": "Bearer <token>"}
)

result = response.json()
run_id = result["run_id"]  # Track this execution
```

### CLI Channel

```bash
# Same workflow via CLI
nexus run process --user_id 123 --action start
```

### MCP Channel

```python
# Same workflow via MCP tool call
client.call_tool("process", {
    "user_id": "123",
    "action": "start"
})
```

## Tracking Executions with EventBus

The Rust-backed EventBus provides pub/sub for lifecycle tracking:

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()
bus = app._nexus.event_bus()

# Subscribe to all events
bus.subscribe(lambda event: print(f"Event: {event}"))

# Subscribe to specific event types
app._nexus.on("workflow_started", lambda event: print(f"Started: {event}"))
app._nexus.on("workflow_completed", lambda event: print(f"Completed: {event}"))

# Publish custom events
bus.publish("user_action", {"user_id": "123", "action": "login"})
```

## Stateful Workflows with DataFlow

For persistent state across executions, store state in DataFlow:

```python
import os
import kailash
from kailash.dataflow import db

df = kailash.DataFlow(os.environ["DATABASE_URL"], auto_migrate=True)

@db.model
class WorkflowSession:
    id: str
    workflow_name: str
    status: str
    step: int
    user_id: str

df.register_model(WorkflowSession._model_definition)

# Save state during workflow execution
builder = kailash.WorkflowBuilder()
builder.add_node("CreateWorkflowSession", "save_state", {
    "workflow_name": "multi_step",
    "status": "in_progress",
    "step": 1,
    "user_id": "user-123"
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Resume: query state in next execution
builder2 = kailash.WorkflowBuilder()
builder2.add_node("ListWorkflowSession", "get_state", {
    "filter": {"user_id": "user-123", "workflow_name": "multi_step"}
})
```

## Authentication

Use NexusAuthPlugin to secure all channels:

```python
import os
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig

app = NexusApp()
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"])
)
# All channels (API, CLI, MCP) now require valid JWT
```

## Best Practices

1. **Design for statelessness** -- avoid session state when possible
2. **Use DataFlow for persistent state** -- store workflow state in the database
3. **Track with EventBus** -- subscribe to lifecycle events for monitoring
4. **Use run_id for correlation** -- each execution returns a unique run_id
5. **Authenticate all channels** -- use NexusAuthPlugin for security
6. **Use inputs for continuation** -- pass prior results as inputs to next execution

## Related Skills

- [nexus-multi-channel](#) - Multi-channel architecture
- [nexus-enterprise-features](#) - Authentication and security
- [nexus-event-system](#) - EventBus pub/sub
- [nexus-production-deployment](#) - Production deployment
