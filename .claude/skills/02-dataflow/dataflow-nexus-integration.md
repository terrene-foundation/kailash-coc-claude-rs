---
name: dataflow-nexus-integration
description: "Integrate DataFlow with Nexus for multi-channel APIs. Use when DataFlow Nexus, Nexus blocking, Nexus integration, or prevent blocking startup."
---

# DataFlow + Nexus Integration

Configuration patterns for integrating DataFlow with Nexus for multi-channel APIs.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `CRITICAL`
> Related Skills: [`nexus-quickstart`](#), [`dataflow-models`](#)
> Related Subagents: `dataflow-specialist`, `nexus-specialist`

## Quick Reference

- `auto_migrate=True` (default) works in Docker
- Use `NexusApp()` from `kailash.nexus` for Nexus platform
- **Integration**: DataFlow nodes must be manually registered as workflows with Nexus

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

# Step 1: Initialize DataFlow
df = kailash.DataFlow(
    "postgresql://user:pass@localhost/db",
    auto_migrate=True,  # DEFAULT - works in Docker
)

# Step 2: Define models
@db.model
class Product:
    name: str
    price: float
    active: bool = True

# Step 3: Create NexusApp
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(NexusConfig(port=3000))

# Step 4: Register DataFlow workflows with Nexus
# DataFlow auto-generates 11 nodes per model - register them as workflows
builder = kailash.WorkflowBuilder()
builder.add_node("ProductCreateNode", "create", {
    "name": "${input.name}",
    "price": "${input.price}"
})
app.register("create_product", builder.build(reg))

# Step 5: Start the platform
app.start()  # Blocks until Ctrl+C
```

## NexusApp & NexusConfig Parameters

```python
from kailash.nexus import NexusApp, NexusConfig

config = NexusConfig(
    port=3000,                  # REST API port (default: 3000)
    host="0.0.0.0",             # Host to bind to
    cli_name="my-app",          # CLI command name
    enable_api=True,            # Enable API channel
    enable_cli=True,            # Enable CLI channel
    enable_mcp=True,            # Enable MCP channel
)
app = NexusApp(config)
```

**NOTE**: The following parameters do NOT exist in NexusApp/NexusConfig:

- `title`
- `dataflow_config`
- `auth_config`
- `auto_discovery`
- `api_port`, `mcp_port` (use `port` in NexusConfig instead)

## DataFlow Configuration

```python
db = kailash.DataFlow(
    "postgresql://...",
    auto_migrate=True,       # DEFAULT - works in Docker
    pool_size=3,             # Reduced: PgBouncer handles pooling
    pool_max_overflow=2,
    monitoring=True,
    slow_query_threshold=100,
)
```

**Removed Parameters** (no longer valid):

- `existing_schema_mode`, `enable_model_persistence`, `skip_registry`, `skip_migration` - all removed
- Use `auto_migrate=True` (default) or `auto_migrate=False` instead
- `connection_pool_size` -> use `pool_size`; `enable_metrics` -> use `monitoring=True`

## Common Mistakes

### Mistake 1: Using unsupported parameters

```python
# WRONG - auto_discovery does not exist in NexusApp
app = NexusApp(auto_discovery=True)  # THIS WILL FAIL
```

**Fix:**

```python
# CORRECT
from kailash.nexus import NexusApp

app = NexusApp()
```

### Mistake 2: Expecting dataflow_config Parameter

```python
# WRONG - dataflow_config does NOT exist in NexusApp!
app = NexusApp(
    dataflow_config={"integration": db}  # THIS WILL FAIL
)
```

**Fix: Register workflows manually:**

```python
# CORRECT - Manual workflow registration
from kailash.nexus import NexusApp

app = NexusApp()

builder = kailash.WorkflowBuilder()
builder.add_node("ProductListNode", "list", {"filter": "${input.filter}"})
app.register("list_products", builder.build(reg))
```

## Related Patterns

- **For Nexus basics**: See [`nexus-quickstart`](#)
- **For DataFlow models**: See [`dataflow-models`](#)

## When to Escalate to Subagent

Use `dataflow-specialist` or `nexus-specialist` when:

- Complex workflow registration patterns
- Performance optimization needed
- Multi-database integration
- Custom endpoint generation logic

## Example: Complete Setup

```python
import kailash

reg = kailash.NodeRegistry()

# Initialize DataFlow
df = kailash.DataFlow(
    "postgresql://user:pass@localhost/ecommerce",
    auto_migrate=True,
)

# Define models
@db.model
class Product:
    sku: str
    name: str
    price: float
    stock: int
    active: bool = True

# Create NexusApp
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(NexusConfig(port=3000))

# Register product operations as workflows
for node_name in ["ProductCreateNode", "ProductListNode", "ProductReadNode"]:
    builder = kailash.WorkflowBuilder()
    builder.add_node(node_name, "op", {"input": "${input}"})
    app.register(node_name.lower(), builder.build(reg))

# Start platform
app.start()
```

## Troubleshooting

| Issue                       | Cause                  | Solution                           |
| --------------------------- | ---------------------- | ---------------------------------- |
| Nexus hangs on startup      | Unsupported parameters | Use `NexusApp()` with no args      |
| Workflow not found          | Not registered         | Use `app.register(name, workflow)` |
| DataFlow tables not created | `auto_migrate=False`   | Use `auto_migrate=True` (default)  |

## Quick Tips

- Use `auto_migrate=True` (default) - works in Docker
- Use `NexusApp()` from `kailash.nexus` for Nexus platform
- Register DataFlow workflows manually with `app.register()`
- Test startup time - should be <2 seconds
