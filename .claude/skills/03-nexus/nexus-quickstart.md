---
name: nexus-quickstart
description: "Zero-config NexusApp setup and basic handler/workflow registration. Start here for all Nexus applications."
---

# Nexus Quickstart (kailash-rs)

Zero-configuration platform deployment. Get running in 30 seconds.

## Instant Start

```python
from kailash.nexus import NexusApp

app = NexusApp()
app.start()
```

That gives you:

- API Server on `http://localhost:3000`
- Health Check at `http://localhost:3000/health`
- MCP Server for AI agent integration

## Add Your First Handler (Recommended)

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet", description="Greet a user")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

app.start()
```

## Register a Workflow (Low-Level Nexus)

```python
from kailash.nexus import Nexus, NexusConfig
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "fetch", {
    "code": "result = {'status': 'ok'}",
    "output_vars": ["result"],
})

nexus = Nexus(config=NexusConfig(port=3000))
nexus.register_workflow("fetch-data", builder.build(reg))
nexus.start()
```

## Test All Three Channels

**API (HTTP)**:

```bash
curl -X POST http://localhost:3000/api/greet \
  -H "Content-Type: application/json" \
  -d '{"name": "World"}'
```

**CLI**:

```bash
nexus run greet --name World
```

**MCP** (for AI agents):

```json
{
  "method": "tools/call",
  "params": { "name": "greet", "arguments": { "name": "World" } }
}
```

## Custom Port Configuration

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=8080))
app.start()
```

## Common Issues

### Import Errors

```bash
pip install kailash  # kailash-rs bundles Nexus
```

### Port Conflicts

```python
app = NexusApp(config=NexusConfig(port=8001))
```

## Key Differences from kailash-py

| Aspect                | kailash-py                               | kailash-rs                                                       |
| --------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Recommended entry     | `from nexus import Nexus`                | `from kailash.nexus import NexusApp`                             |
| Import path           | `nexus` (standalone package)             | `kailash.nexus` (bundled)                                        |
| Default port          | 8000                                     | 3000                                                             |
| Low-level access      | Same `Nexus` class                       | `Nexus` (Rust binding), `NexusApp` (Python wrapper)              |
| Workflow registration | `app.register("name", workflow.build())` | `nexus.register_workflow("name", workflow)` on low-level `Nexus` |

## Next Steps

- Add handlers: See [nexus-handler-support](nexus-handler-support.md)
- Compare Nexus vs NexusApp: See [nexus-comparison](nexus-comparison.md)
- Use multiple channels: See [nexus-multi-channel](nexus-multi-channel.md)
- Add authentication: See [nexus-security-best-practices](nexus-security-best-practices.md)

## Key Takeaways

- Use `NexusApp` for most cases -- it provides decorators and convenience methods
- Use low-level `Nexus` for middleware, routers, plugins, and event bus
- Single registration creates API + CLI + MCP
- Default host is `0.0.0.0`, default port is `3000`
