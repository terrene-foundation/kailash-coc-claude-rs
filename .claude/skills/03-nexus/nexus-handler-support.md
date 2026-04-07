---
name: nexus-handler-support
description: "Handler patterns: decorator vs imperative, HandlerParam, auto_params extraction from function signatures."
---

# Nexus Handler Support (kailash-rs)

Handler registration patterns for NexusApp and low-level Nexus.

## Decorator Pattern (NexusApp)

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet", description="Greet a user")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

@app.handler("calculate")
def add(a: int, b: int) -> dict:
    return {"sum": a + b}
```

- Async and sync functions both supported
- Parameters derived automatically from function signature
- Type annotations map to input schema for MCP and CLI
- Default values become optional parameters

## Imperative Pattern (NexusApp)

```python
async def process(data: dict, mode: str = "default") -> dict:
    return {"result": data, "mode": mode}

app.register("process", process)
# or
app.register_handler("process", process)
```

## Low-Level Pattern (Nexus)

```python
from kailash.nexus import Nexus

nexus = Nexus()
nexus.handler("greet", greet_func)
nexus.register("process", process_func)
nexus.register_handler("analyze", analyze_func)
```

## HandlerParam for Parameter Metadata

Use `HandlerParam` to provide explicit parameter metadata when auto-derivation from the function signature is insufficient:

```python
from kailash.nexus import NexusApp, HandlerParam

app = NexusApp()

@app.handler("search", description="Search documents", params=[
    HandlerParam(name="query", param_type="string", required=True, description="Search query"),
    HandlerParam(name="limit", param_type="integer", required=False, description="Max results"),
])
async def search(query: str, limit: int = 10) -> dict:
    return {"query": query, "limit": limit}
```

`HandlerParam` fields:

- `name` -- parameter name (matches function argument)
- `param_type` -- type string: `"string"`, `"integer"`, `"number"`, `"boolean"`, `"object"`, `"array"`
- `required` -- whether the parameter is required (default: inferred from signature)
- `description` -- human-readable description (used in MCP tool schema, CLI help)

## Auto-Parameter Extraction

When no explicit `params` list is provided, parameters are derived from the function signature:

```python
@app.handler("example")
async def example(
    name: str,           # required, type "string"
    count: int,          # required, type "integer"
    ratio: float = 0.5,  # optional, type "number"
    active: bool = True, # optional, type "boolean"
    data: dict = None,   # optional, type "object"
) -> dict:
    return {"name": name, "count": count}
```

**Type mapping**:

| Python Type      | Param Type            |
| ---------------- | --------------------- |
| `str`            | `"string"`            |
| `int`            | `"integer"`           |
| `float`          | `"number"`            |
| `bool`           | `"boolean"`           |
| `dict`           | `"object"`            |
| `list`           | `"array"`             |
| Complex generics | `"string"` (fallback) |

## Custom REST Endpoints (NexusApp)

For HTTP-specific routes that bypass multi-channel deployment:

```python
@app.endpoint("/api/v1/users/{user_id}", methods=["GET"])
async def get_user(user_id: str):
    return {"user_id": user_id}

@app.endpoint("/api/v1/search", methods=["GET", "POST"])
async def search(q: str = "", limit: int = 10):
    return {"query": q, "limit": limit}
```

`@app.endpoint()` creates HTTP-only routes. `@app.handler()` creates multi-channel handlers (API + CLI + MCP).

## Best Practices

1. Use `@app.handler()` for multi-channel handlers (most cases)
2. Use `@app.endpoint()` for HTTP-specific routes
3. Add `description` for MCP tool discovery and CLI help
4. Use explicit `HandlerParam` when auto-derivation is insufficient
5. Keep handler functions focused -- one responsibility per handler
6. Use plain types (`list`, `dict`) instead of complex generics (`List[dict]`)
