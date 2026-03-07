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
- Use `auto_discovery=False` in Nexus to prevent blocking during startup
- **Integration**: DataFlow nodes must be manually registered as workflows with Nexus

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

# Step 1: Initialize DataFlow
df = kailash.DataFlow(
    database_url="postgresql://user:pass@localhost/db",
    auto_migrate=True,  # DEFAULT - works in Docker
)

# Step 2: Define models
@df.model
class Product:
    name: str
    price: float
    active: bool = True

# Step 3: Create Nexus platform
nexus = kailash.Nexus(
    api_port=8000,
    mcp_port=3001,
    auto_discovery=False,  # CRITICAL: Prevents blocking during startup
)

# Step 4: Register DataFlow workflows with Nexus
# DataFlow auto-generates 11 nodes per model - register them as workflows
builder = kailash.WorkflowBuilder()
builder.add_node("ProductCreateNode", "create", {
    "name": "${input.name}",
    "price": "${input.price}"
})
nexus.register("create_product", builder.build(reg))

# Step 5: Start the platform
nexus.start()  # Blocks until Ctrl+C
```

## Nexus Constructor Parameters

```python
app = kailash.Nexus(
    api_port=8000,              # REST API port (default: 8000)
    mcp_port=3001,              # MCP server port (default: 3001)
    enable_auth=None,           # Authentication (auto-enabled in production)
    enable_monitoring=False,    # Metrics collection
    rate_limit=100,             # Requests per minute (None to disable)
    auto_discovery=False,       # Workflow auto-discovery (keep False!)
    enable_http_transport=False,# HTTP transport for MCP
    enable_sse_transport=False, # SSE transport for MCP
    enable_discovery=False,     # MCP service discovery
    enable_durability=True,     # Durability/caching
)
```

**NOTE**: The following parameters do NOT exist in Nexus:

- `title`
- `enable_api`, `enable_cli`, `enable_mcp`
- `dataflow_config`
- `auth_config`

## DataFlow Configuration

```python
db = kailash.DataFlow(
    database_url="postgresql://...",
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

### Mistake 1: Using auto_discovery=True

```python
# WRONG - auto_discovery=True causes blocking
app = kailash.Nexus(auto_discovery=True)  # BLOCKS! Scans filesystem
```

**Fix:**

```python
# CORRECT
app = kailash.Nexus(auto_discovery=False)
```

### Mistake 2: Expecting dataflow_config Parameter

```python
# WRONG - dataflow_config does NOT exist in Nexus!
app = kailash.Nexus(
    dataflow_config={"integration": db}  # THIS WILL FAIL
)
```

**Fix: Register workflows manually:**

```python
# CORRECT - Manual workflow registration
app = kailash.Nexus(auto_discovery=False)

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
    database_url="postgresql://user:pass@localhost/ecommerce",
    auto_migrate=True,
)

# Define models
@df.model
class Product:
    sku: str
    name: str
    price: float
    stock: int
    active: bool = True

# Create Nexus platform
nexus = kailash.Nexus(
    api_port=8000,
    mcp_port=3001,
    auto_discovery=False,
    enable_auth=True,
    rate_limit=100,
)

# Register product operations as workflows
for node_name in ["ProductCreateNode", "ProductListNode", "ProductReadNode"]:
    builder = kailash.WorkflowBuilder()
    builder.add_node(node_name, "op", {"input": "${input}"})
    nexus.register(node_name.lower(), builder.build(reg))

# Start platform
nexus.start()
```

## Troubleshooting

| Issue                       | Cause                 | Solution                           |
| --------------------------- | --------------------- | ---------------------------------- |
| Nexus hangs on startup      | `auto_discovery=True` | Set `auto_discovery=False`         |
| Workflow not found          | Not registered        | Use `app.register(name, workflow)` |
| DataFlow tables not created | `auto_migrate=False`  | Use `auto_migrate=True` (default)  |

## Quick Tips

- Use `auto_migrate=True` (default) - works in Docker
- ALWAYS use `auto_discovery=False` in Nexus to prevent blocking
- Register DataFlow workflows manually with `app.register()`
- Test startup time - should be <2 seconds
