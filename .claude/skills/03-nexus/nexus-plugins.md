---
skill: nexus-middleware
description: Middleware configuration and extending Nexus with CORS, rate limiting, health checks, and preset-based tower middleware stacks
priority: MEDIUM
tags: [nexus, middleware, cors, rate-limiting, health-check, presets]
---

# Nexus Middleware & Configuration

Configure NexusApp middleware via built-in methods and preset-based tower middleware stacks.

## Architecture Note

NexusApp does **not** have a plugin system. There is no `NexusPlugin` base class, no `app.add_plugin()` method, and no plugin lifecycle. Instead, NexusApp provides:

1. **Built-in middleware methods** for common needs (CORS, rate limiting, health checks)
2. **Preset-based configuration** that selects tower middleware stacks server-side
3. **The `@app.handler()` decorator** for registering workflow handlers

## Built-in Middleware Methods

### CORS

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()

# Enable CORS with default settings
app.add_cors()

# CORS is configured server-side via tower-http CorsLayer
```

### Rate Limiting

```python
app = NexusApp()

# Enable rate limiting
app.add_rate_limit(max_requests=100, window_seconds=60)
```

### Health Check

```python
app = NexusApp()

# Add a health check endpoint
app.health_check()

# Returns {"status": "healthy"} at the health endpoint
```

## Handler Registration

Handlers are the core extension point for NexusApp. Use the `@app.handler()` decorator:

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler()
def greet(name: str) -> str:
    return f"Hello, {name}!"

@app.handler()
def process_data(data: dict, format: str = "json") -> dict:
    # Business logic here
    return {"processed": True, "format": format}
```

## Preset-Based Middleware Configuration

NexusApp uses `NexusConfig` with a `preset` parameter to configure tower middleware stacks server-side. Presets bundle common middleware combinations:

```python
from kailash.nexus import NexusApp, NexusConfig

# No middleware
app = NexusApp(config=NexusConfig(preset="none"))

# Lightweight: basic CORS + health check
app = NexusApp(config=NexusConfig(preset="lightweight"))

# Standard: CORS + rate limiting + health check
app = NexusApp(config=NexusConfig(preset="standard"))

# SaaS: Standard + auth + session management
app = NexusApp(config=NexusConfig(preset="saas"))

# Enterprise: SaaS + audit logging + tenant isolation
app = NexusApp(config=NexusConfig(preset="enterprise"))
```

### Preset Middleware Summary

| Preset        | CORS | Rate Limit | Health Check | Auth | Audit | Tenancy |
| ------------- | ---- | ---------- | ------------ | ---- | ----- | ------- |
| `none`        | -    | -          | -            | -    | -     | -       |
| `lightweight` | Yes  | -          | Yes          | -    | -     | -       |
| `standard`    | Yes  | Yes        | Yes          | -    | -     | -       |
| `saas`        | Yes  | Yes        | Yes          | Yes  | -     | -       |
| `enterprise`  | Yes  | Yes        | Yes          | Yes  | Yes   | Yes     |

## Authentication

Authentication is configured via `NexusAuthPlugin`:

```python
from kailash.nexus import NexusApp, NexusAuthPlugin

app = NexusApp()
auth = NexusAuthPlugin()

# Auth plugin configures JWT validation, RBAC, and SSO
# Applied to the axum router as tower middleware server-side
```

## Complete Example

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(preset="standard"))
app.add_cors()
app.add_rate_limit(max_requests=1000, window_seconds=60)
app.health_check()

@app.handler()
def analyze(text: str) -> dict:
    builder = kailash.WorkflowBuilder()
    reg = kailash.NodeRegistry()
    builder.add_node("LLMNode", "llm", {
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
        "prompt": f"Analyze: {text}"
    })
    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf)
    return result
```

## What NexusApp Does NOT Support

| Feature                      | Status                                  |
| ---------------------------- | --------------------------------------- |
| `app.add_plugin()`           | Does not exist                          |
| `NexusPlugin` base class     | Does not exist                          |
| Plugin lifecycle hooks       | Does not exist                          |
| `on_workflow_started` events | Does not exist                          |
| Custom plugin classes        | Use `@app.handler()` or presets instead |
| `PluginManager`              | Does not exist                          |

## Related Skills

- [nexus-quickstart](nexus-quickstart.md) - Getting started with Nexus
- [nexus-security-best-practices](nexus-security-best-practices.md) - Security configuration
- [nexus-production-deployment](nexus-production-deployment.md) - Production setup
