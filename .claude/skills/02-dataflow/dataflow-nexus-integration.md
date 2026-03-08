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
builder.add_node("CreateProduct", "create", {})
# Input data is passed via workflow execution inputs, not ${} template syntax
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("create_product", lambda **inputs: rt.execute(workflow, inputs))

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
# Simple (default pool settings are fine for most apps)
db = kailash.DataFlow("postgresql://...", auto_migrate=True)

# With custom pool config
config = kailash.DataFlowConfig(
    "postgresql://...",
    max_connections=10,
    min_connections=1,
)
db = kailash.DataFlow("postgresql://...", config=config, auto_migrate=True)
```

**DataFlow constructor parameters**: `database_url`, `config` (DataFlowConfig), `auto_migrate`
**DataFlowConfig parameters**: `database_url`, `max_connections`, `min_connections`, `connect_timeout_secs`, `idle_timeout_secs`, `max_lifetime_secs`, `auto_migrate`

> **Note**: `test_mode` is available on both `DataFlow(url, test_mode=True)` and `DataFlowConfig(url, test_mode=True)`. For quick test setup, use `DataFlowConfig.test()` which returns in-memory SQLite with auto_migrate and test_mode enabled.

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
builder.add_node("ListProduct", "list", {})
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("list_products", lambda **inputs: rt.execute(workflow, inputs))
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
rt = kailash.Runtime(reg)
for node_name in ["CreateProduct", "ListProduct", "ReadProduct"]:
    builder = kailash.WorkflowBuilder()
    builder.add_node(node_name, "op", {})
    workflow = builder.build(reg)
    app.register(node_name.lower(), lambda **inputs, wf=workflow: rt.execute(wf, inputs))

# Start platform
app.start()
```

## Troubleshooting

| Issue                       | Cause                  | Solution                           |
| --------------------------- | ---------------------- | ---------------------------------- |
| Nexus hangs on startup      | Unsupported parameters | Use `NexusApp()` with no args      |
| Workflow not found          | Not registered         | Use `app.register(name, callable)` |
| DataFlow tables not created | `auto_migrate=False`   | Use `auto_migrate=True` (default)  |

## Quick Tips

- Use `auto_migrate=True` (default) - works in Docker
- Use `NexusApp()` from `kailash.nexus` for Nexus platform
- Register DataFlow workflows manually with `app.register()`
- Test startup time - should be <2 seconds
