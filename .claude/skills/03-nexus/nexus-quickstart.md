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

# Zero configuration required
nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.start()
```

That's it! You now have:

- API Server on `http://localhost:8000`
- Health Check at `http://localhost:8000/health`
- MCP Server on port 3001

## Add Your First Workflow

```python
import kailash

reg = kailash.NodeRegistry()

# Create platform
nexus = kailash.Nexus(kailash.NexusConfig(port=8000))

# Create workflow
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://httpbin.org/json",
    "method": "GET"
})

# Register once, available everywhere
nexus.register("fetch-data", builder.build(reg))  # Must call .build()

# Start platform
nexus.start()
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
# Use custom ports if defaults are taken
app = kailash.Nexus(api_port=8001, mcp_port=3002)
```

### Import Errors

```bash
pip install kailash-enterprise  # Nexus included
```

### Workflow Not Found

```python
# Ensure .build() is called
builder = kailash.WorkflowBuilder()
builder.add_node("PythonCodeNode", "test", {"code": "result = {'ok': True}"})
app.register("test", builder.build(reg))  # Don't forget .build()
```

## Handler Pattern (Recommended)

For simple workflows, use `@app.handler()` instead of WorkflowBuilder:

```python
import kailash

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))

@nexus.handler("greet", description="Greeting handler")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

nexus.start()
```

See [nexus-handler-support](nexus-handler-support.md) for full details.

## Next Steps

- **Use handlers** (recommended): See [nexus-handler-support](nexus-handler-support.md)
- Add parameters: See [nexus-workflow-registration](nexus-workflow-registration.md)
- Use multiple channels: See [nexus-multi-channel](nexus-multi-channel.md)
- Integrate DataFlow: See [nexus-dataflow-integration](nexus-dataflow-integration.md)
- Add authentication: See [nexus-auth-plugin](nexus-auth-plugin.md)

## Key Takeaways

- Zero configuration: Just `Nexus()` and go
- Always call `.build()` before registration (or use `@app.handler()`)
- Single registration creates API + CLI + MCP
- Default ports: 8000 (API), 3001 (MCP)
- `cors_allow_credentials=False` by default (security)
