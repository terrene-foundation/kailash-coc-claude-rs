---
name: nexus-essential-patterns
description: "Essential patterns: middleware, routers, plugins, event bus on low-level Nexus. NexusApp convenience methods."
---

# Nexus Essential Patterns (kailash-rs)

Quick-reference code patterns for common Nexus operations across both layers.

## Basic Setup (NexusApp)

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=3000))

@app.handler("greet", description="Greet a user")
async def greet(name: str) -> dict:
    return {"message": f"Hello, {name}!"}

app.start()
```

## Handler Registration

### Decorator (NexusApp)

```python
@app.handler("process", description="Process data")
async def process(data: str, mode: str = "default") -> dict:
    return {"result": data, "mode": mode}
```

### Imperative (NexusApp)

```python
async def analyze(text: str) -> dict:
    return {"length": len(text)}

app.register("analyze", analyze)
app.register_handler("analyze_v2", analyze)
```

### Low-Level (Nexus)

```python
from kailash.nexus import Nexus

nexus = Nexus(config=NexusConfig(port=3000))
nexus.handler("greet", greet_func)
nexus.register("process", process_func)
```

## Custom Endpoints (NexusApp)

```python
@app.endpoint("/api/v1/users/{user_id}", methods=["GET"])
async def get_user(user_id: str):
    return {"user_id": user_id}

@app.endpoint("/api/v1/search", methods=["GET", "POST"])
async def search(q: str = "", limit: int = 10):
    return {"query": q, "limit": limit}
```

## CORS and Rate Limiting (NexusApp)

```python
app.add_cors(origins=["https://example.com"])
app.add_rate_limit(max_requests=100, window_secs=60)
```

## Middleware (Low-Level Nexus)

```python
from kailash.nexus import Nexus, NexusConfig, MiddlewareConfig

nexus = Nexus(config=NexusConfig(port=3000))
nexus.set_middleware(MiddlewareConfig(...))
```

## Router Inclusion (Low-Level Nexus)

```python
from kailash.nexus import Nexus, NexusRouter

nexus = Nexus(config=NexusConfig(port=3000))
nexus.include_router(legacy_router)
```

## Plugin System (Low-Level Nexus)

```python
from kailash.nexus import Nexus, NexusAuthPlugin, JwtConfig
import os

nexus = Nexus(config=NexusConfig(port=3000))

auth = NexusAuthPlugin.basic_auth(
    jwt=JwtConfig(secret=os.environ["JWT_SECRET"]),
)
nexus.add_plugin(auth)
```

## Event Bus (Low-Level Nexus)

```python
from kailash.nexus import Nexus

nexus = Nexus(config=NexusConfig(port=3000))

# Get event bus
bus = nexus.event_bus()

# Subscribe to events
nexus.subscribe("workflow.complete", on_complete_callback)
nexus.on("error", on_error_callback)
```

## Preset System

```python
from kailash.nexus import NexusApp, Nexus, NexusConfig, Preset

# Via NexusApp
app = NexusApp(config=NexusConfig(port=3000), preset="enterprise")

# Via low-level Nexus
nexus = Nexus(preset=Preset.saas())
```

## Workflow Registration (Low-Level Nexus)

```python
import kailash
from kailash.nexus import Nexus, NexusConfig

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "process", {
    "code": "result = {'status': 'ok'}",
    "output_vars": ["result"],
})

nexus = Nexus(config=NexusConfig(port=3000))
nexus.register_workflow("process", builder.build(reg))
```

## Introspection

```python
# NexusApp
print(app.get_endpoints())
print(app.get_registered_handlers())
print(app.health_check())

# Nexus (low-level)
print(nexus.workflow_count())
print(nexus.list_workflows())
print(nexus.handler_count())
print(nexus.get_registered_handlers())
print(nexus.plugin_count())
print(nexus.plugin_names())
```

## Layer Quick Reference

| Feature                 | NexusApp | Nexus (Low-Level) |
| ----------------------- | -------- | ----------------- |
| `@handler()` decorator  | Yes      | No                |
| `@endpoint()` decorator | Yes      | No                |
| `add_cors()`            | Yes      | No                |
| `add_rate_limit()`      | Yes      | No                |
| `set_middleware()`      | No       | Yes               |
| `include_router()`      | No       | Yes               |
| `add_plugin()`          | No       | Yes               |
| `event_bus()`           | No       | Yes               |
| `subscribe()` / `on()`  | No       | Yes               |
| `register_workflow()`   | No       | Yes               |
| Introspection counts    | Limited  | Full              |

## Key Differences from kailash-py

| Aspect       | kailash-py                                | kailash-rs                                         |
| ------------ | ----------------------------------------- | -------------------------------------------------- |
| Entry point  | `from nexus import Nexus`                 | `from kailash.nexus import NexusApp` (recommended) |
| Two layers   | Single `Nexus` class                      | `NexusApp` (high-level) + `Nexus` (low-level)      |
| Middleware   | `app.add_middleware(CORSMiddleware, ...)` | `nexus.set_middleware(MiddlewareConfig(...))`      |
| Plugin       | `app.add_plugin(auth)`                    | `nexus.add_plugin(auth)`                           |
| CORS         | `Nexus(cors_origins=[...])` constructor   | `app.add_cors(origins=[...])` method               |
| Default port | 8000                                      | 3000                                               |

## Related Skills

- [nexus-comparison](nexus-comparison.md) - When to use NexusApp vs Nexus
- [nexus-handler-support](nexus-handler-support.md) - Handler patterns
- [nexus-config-options](nexus-config-options.md) - Configuration reference
- [nexus-security-best-practices](nexus-security-best-practices.md) - Auth patterns
