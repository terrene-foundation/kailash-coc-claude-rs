---
skill: nexus-quickstart
description: Zero-config Nexus() setup and basic workflow registration. Start here for all Nexus applications.
priority: CRITICAL
tags: [nexus, quickstart, zero-config, setup]
---

# Nexus Quickstart

Zero-configuration platform deployment. Get running in 30 seconds.

## Instant Start

```python
import kailash
from kailash.nexus import NexusApp

# Zero configuration required
app = NexusApp()
app.start()
```

That's it! You now have:

- API Server on `http://localhost:8000`
- Health Check at `http://localhost:8000/health`
- MCP Server on port 3001

## Add Your First Workflow

```python
import kailash

reg = kailash.NodeRegistry()
from kailash.nexus import NexusApp

# Create platform
app = NexusApp()

# Create workflow
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://httpbin.org/json",
    "method": "GET"
})

# Register once, available everywhere
app.register("fetch-data", builder.build(reg))  # Must call .build()

# Start platform
app.start()
```

## Test All Three Channels

**API (HTTP)**:

```bash
curl -X POST http://localhost:8000/workflows/fetch-data/execute
```

**CLI**:

```bash
nexus run fetch-data
```

**MCP** (for AI agents):

```json
{
  "method": "tools/call",
  "params": { "name": "fetch-data", "arguments": {} }
}
```

## Critical Patterns

### Always Call .build()

```python
# CORRECT
app.register("workflow-name", builder.build(reg))

# WRONG - Will fail
app.register("workflow-name", workflow)
```

### Correct Parameter Order

```python
# CORRECT - name first, workflow second
app.register("name", builder.build(reg))

# WRONG - reversed
app.register(builder.build(reg), "name")
```

## Common Issues

### Port Conflicts

```python
from kailash.nexus import NexusApp, NexusConfig

# Use custom port if default is taken
app = NexusApp(NexusConfig(port=8001))
```

### Import Errors

```bash
pip install kailash-enterprise  # Nexus included
```

### Workflow Not Found

```python
# Ensure .build() is called
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "test", {"code": "result = {'ok': True}"})
app.register("test", builder.build(reg))  # Don't forget .build()
```

## Handler Pattern (Recommended)

For simple workflows, use `@app.handler()` instead of WorkflowBuilder:

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet", description="Greeting handler")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

app.start()
```

See [nexus-handler-support](nexus-handler-support.md) for full details.

## Next Steps

- **Use handlers** (recommended): See [nexus-handler-support](nexus-handler-support.md)
- Add parameters: See [nexus-workflow-registration](nexus-workflow-registration.md)
- Use multiple channels: See [nexus-multi-channel](nexus-multi-channel.md)
- Integrate DataFlow: See [nexus-dataflow-integration](nexus-dataflow-integration.md)
- Add authentication: See [nexus-auth-plugin](nexus-auth-plugin.md)

## Key Takeaways

- Zero configuration: Just `NexusApp()` and go
- Always call `.build()` before registration (or use `@app.handler()`)
- Single registration creates API + CLI + MCP
- Default ports: 8000 (API), 3001 (MCP)
- `cors_allow_credentials=False` by default (security)
