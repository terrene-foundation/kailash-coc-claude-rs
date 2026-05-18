---
name: nexus-comparison
description: "Nexus vs NexusApp comparison for kailash-rs. When to use each layer."
---

# Nexus vs NexusApp (kailash-rs)

kailash-rs provides two Nexus layers. Default to `NexusApp` for application code.

## Architecture

```
NexusApp (Python wrapper — kailash.nexus.app)
  └── Nexus (Rust/PyO3 binding — kailash._kailash)
```

## When to Use Each

| Need                                    | Use        | Why                                                     |
| --------------------------------------- | ---------- | ------------------------------------------------------- |
| Handler registration with decorators    | `NexusApp` | `@app.handler()`, `@app.endpoint()`                     |
| CORS, rate limiting convenience         | `NexusApp` | `add_cors()`, `add_rate_limit()`                        |
| Custom REST endpoints                   | `NexusApp` | `@app.endpoint("/path", methods=["GET"])`               |
| Most application code                   | `NexusApp` | Higher-level, Flask-like API                            |
| Middleware configuration                | `Nexus`    | `set_middleware(MiddlewareConfig)`                      |
| Router inclusion                        | `Nexus`    | `include_router(NexusRouter)`                           |
| Plugin system                           | `Nexus`    | `add_plugin(plugin)`                                    |
| Event bus / subscriptions               | `Nexus`    | `event_bus()`, `subscribe()`, `on()`                    |
| Preset-only setup                       | `Nexus`    | `Nexus(preset=Preset(...))`                             |
| Introspection (workflow/handler counts) | `Nexus`    | `workflow_count()`, `handler_count()`, `plugin_names()` |

## API Comparison

### NexusApp (Recommended)

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=3000))

# Decorator-based handler registration
@app.handler("greet", description="Greet a user")
async def greet(name: str) -> dict:
    return {"message": f"Hello, {name}!"}

# Custom REST endpoint
@app.endpoint("/api/status", methods=["GET"])
async def status():
    return {"status": "ok"}

# Convenience methods
app.add_cors(origins=["https://example.com"])
app.add_rate_limit(max_requests=100, window_secs=60)

# Imperative registration
app.register("process", process_func)
app.register_handler("analyze", analyze_func)

# Inspection
print(app.get_endpoints())
print(app.get_registered_handlers())
print(app.health_check())

app.start()
```

### Nexus (Low-Level)

```python
from kailash.nexus import Nexus, NexusConfig, MiddlewareConfig, Preset

nexus = Nexus(config=NexusConfig(port=3000))

# Imperative handler registration
nexus.handler("greet", greet_func)
nexus.register("process", process_func)
nexus.register_handler("analyze", analyze_func)

# Workflow registration
nexus.register_workflow("pipeline", workflow)

# Middleware and plugins
nexus.set_middleware(MiddlewareConfig(...))
nexus.add_plugin(auth_plugin)
nexus.include_router(api_router)

# Event system
bus = nexus.event_bus()
nexus.subscribe("workflow.complete", callback)
nexus.on("error", error_handler)

# Introspection
print(nexus.workflow_count())
print(nexus.list_workflows())
print(nexus.handler_count())
print(nexus.get_registered_handlers())
print(nexus.plugin_count())
print(nexus.plugin_names())

nexus.start()  # or nexus.run() or nexus.serve()
```

## Decision Summary

```
Need decorators or convenience methods?
  YES -> NexusApp
  NO  -> Need middleware/plugins/events?
           YES -> Nexus (low-level)
           NO  -> NexusApp (still the default)
```

Most applications should use `NexusApp`. Drop to `Nexus` only when you need direct access to middleware configuration, the plugin system, the event bus, or router inclusion.
