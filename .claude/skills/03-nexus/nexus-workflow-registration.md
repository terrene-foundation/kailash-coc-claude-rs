---
name: nexus-workflow-registration
description: "Registration patterns for handlers and workflows in kailash-rs Nexus."
---

# Nexus Workflow Registration (kailash-rs)

Register handlers and workflows for multi-channel deployment (API + CLI + MCP) via a single call.

## Registration Methods

| Method                                 | Layer    | Use Case                          |
| -------------------------------------- | -------- | --------------------------------- |
| `@app.handler("name")`                 | NexusApp | Python functions (preferred)      |
| `app.register("name", func)`           | NexusApp | Imperative handler registration   |
| `app.register_handler("name", func)`   | NexusApp | Explicit handler registration     |
| `nexus.handler("name", func)`          | Nexus    | Low-level handler registration    |
| `nexus.register("name", func)`         | Nexus    | Low-level imperative registration |
| `nexus.register_handler("name", func)` | Nexus    | Low-level explicit registration   |
| `nexus.register_workflow("name", wf)`  | Nexus    | Built workflow objects            |

## Handler Registration (Preferred -- NexusApp)

```python
from kailash.nexus import NexusApp

app = NexusApp()

# Decorator pattern
@app.handler("greet", description="Greet a user")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

@app.handler("search_users")
async def search_users(query: str, limit: int = 10) -> dict:
    from my_app.services import UserService
    return {"users": await UserService().search(query, limit)}

app.start()
```

Benefits: full Python access (no sandbox), auto parameter derivation from signature, async/sync support, IDE support, docstrings as descriptions.

### Imperative Registration (NexusApp)

```python
async def process_order(order_id: str, priority: str = "normal") -> dict:
    return {"processed": order_id, "priority": priority}

app.register("process_order", process_order)
# or
app.register_handler("process_order", process_order)
```

## Low-Level Registration (Nexus)

```python
from kailash.nexus import Nexus, NexusConfig

nexus = Nexus(config=NexusConfig(port=3000))

# Handler registration
nexus.handler("greet", greet_func)
nexus.register("process", process_func)
nexus.register_handler("analyze", analyze_func)
```

## Workflow Registration (Nexus)

For registering built workflow objects from WorkflowBuilder:

```python
import kailash
from kailash.nexus import Nexus, NexusConfig

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "fetch", {
    "code": "result = {'status': 'ok'}",
    "output_vars": ["result"],
})

nexus = Nexus(config=NexusConfig(port=3000))
nexus.register_workflow("data-fetcher", builder.build(reg))
nexus.start()

# Internally creates:
#   API  -> POST /api/data-fetcher
#   CLI  -> nexus run data-fetcher
#   MCP  -> tool data-fetcher
```

## Introspection

```python
# NexusApp
print(app.get_registered_handlers())
print(app.get_endpoints())
print(app.health_check())

# Nexus (low-level)
print(nexus.workflow_count())
print(nexus.list_workflows())
print(nexus.handler_count())
print(nexus.get_registered_handlers())
```

## Key Differences from kailash-py

| Aspect                | kailash-py                               | kailash-rs                                                       |
| --------------------- | ---------------------------------------- | ---------------------------------------------------------------- |
| Preferred method      | `@app.handler()` on `Nexus`              | `@app.handler()` on `NexusApp`                                   |
| Workflow registration | `app.register("name", workflow.build())` | `nexus.register_workflow("name", workflow)` on low-level `Nexus` |
| Auto-discovery        | `Nexus(auto_discovery=True/False)`       | Not applicable                                                   |
| Import                | `from nexus import Nexus`                | `from kailash.nexus import NexusApp`                             |

## Best Practices

1. Prefer `@app.handler()` on `NexusApp` for most cases
2. Use low-level `Nexus` only when you need workflow objects, middleware, or plugins
3. Use descriptive handler names -- they become API paths, CLI commands, and MCP tools
4. Add `description` parameter for MCP tool discovery

## Related Skills

- [nexus-handler-support](nexus-handler-support.md) - Handler parameter patterns
- [nexus-comparison](nexus-comparison.md) - Nexus vs NexusApp
- [nexus-essential-patterns](nexus-essential-patterns.md) - Middleware, routers, plugins
