---
skill: nexus-dataflow-integration
description: DataFlow + Nexus integration patterns with manual workflow registration (NexusApp has no auto_discovery param)
priority: CRITICAL
tags: [nexus, dataflow, integration, performance]
---

# Nexus DataFlow Integration

Integrate DataFlow-generated nodes with Nexus for multi-channel APIs.

> **Important**: NexusApp has NO `auto_discovery` parameter. Workflows must always be registered manually via `app.register()`. The parameters `enable_model_persistence`, `skip_migration`, and `existing_schema_mode` do not exist either.

## The Pattern

```python
import kailash
from kailash.nexus import NexusApp, NexusConfig

reg = kailash.NodeRegistry()

# Step 1: Create NexusApp (no auto_discovery param exists)
app = NexusApp(config=NexusConfig(port=3000))

# Step 2: Create DataFlow (defaults work fine)
df = kailash.DataFlow(
    "postgresql://user:pass@host:port/db",
    auto_migrate=True,  # Default - works in Docker
)

# Step 3: Register models
from kailash.dataflow import db

@db.model
class User:
    id: str
    email: str
    name: str

# Step 4: Register workflows manually with app.register()
builder = kailash.WorkflowBuilder()
builder.add_node("CreateUser", "create", {})
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("create_user", lambda **inputs: rt.execute(workflow, inputs))

# Step 5: Start
app.start()
```

## Why Manual Registration

NexusApp does not scan for workflows automatically. You must:

1. Build workflows using `WorkflowBuilder`
2. Register each one via `app.register(name, callable)`

This gives you full control over which workflows are exposed and avoids startup delays.

## `auto_migrate=True` (DataFlow Default)

- Table creation handled internally by the Rust engine
- No event loop issues in Docker
- Automatic schema creation and updates
- **This is the default** -- no special configuration needed

## Complete Working Example

```python
import kailash
from kailash.nexus import NexusApp, NexusConfig
from kailash.dataflow import db

reg = kailash.NodeRegistry()

app = NexusApp(config=NexusConfig(port=3000))

df = kailash.DataFlow("postgresql://localhost:5432/mydb")

@db.model
class Contact:
    id: str
    name: str
    email: str
    company: str

@db.model
class Company:
    id: str
    name: str
    industry: str

# Register DataFlow nodes
df.register_nodes(reg)

# Create and register workflows
def register_workflows(app, reg):
    rt = kailash.Runtime(reg)

    for node_name in ["CreateContact", "ListContact", "ReadContact"]:
        builder = kailash.WorkflowBuilder()
        builder.add_node(node_name, "op", {})
        workflow = builder.build(reg)
        app.register(node_name.lower(), lambda **inputs, wf=workflow: rt.execute(wf, inputs))

register_workflows(app, reg)
app.start()
```

## What You Get

- All CRUD operations (11 nodes per model)
- Connection pooling via DataFlowConfig
- All Nexus channels (API, CLI, MCP)
- Automatic schema migration
- Fast startup

## API Usage

```bash
# Create contact via Nexus API
curl -X POST http://localhost:3000/workflows/create_contact/execute \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Corp"
    }
  }'
```

## Production Pattern

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusConfig

def create_production_app():
    app = NexusApp(config=NexusConfig(
        port=int(os.getenv("API_PORT", "3000")),
    ))

    df = kailash.DataFlow(os.getenv("DATABASE_URL"))

    # Register models and workflows
    reg = kailash.NodeRegistry()
    df.register_nodes(reg)
    register_workflows(app, reg)

    return app

app = create_production_app()
```

## Common Issues

### Workflows Not Found

```python
# Must register manually — NexusApp has no auto_discovery
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("workflow-name", lambda **inputs: rt.execute(workflow, inputs))
```

### Schema Not Created

```python
# Ensure auto_migrate=True (default)
df = kailash.DataFlow(
    "postgresql://...",
    auto_migrate=True,  # This is the default
)
```

## NexusApp Parameters (What Exists vs. What Doesn't)

| Parameter              | Exists? | Notes                                 |
| ---------------------- | ------- | ------------------------------------- |
| `config` (NexusConfig) | Yes     | Port, host, CLI name, channel toggles |
| `preset`               | Yes     | "standard", "saas", "enterprise"      |
| `auto_discovery`       | **NO**  | Register workflows manually           |
| `dataflow_config`      | **NO**  | Create DataFlow separately            |
| `enable_auth`          | **NO**  | Use NexusAuthPlugin                   |
| `title`                | **NO**  | Not a NexusApp param                  |

## Testing Strategy

```python
import pytest
import time
import kailash

def test_nexus_dataflow_integration():
    start_time = time.time()

    from kailash.nexus import NexusApp
    app = NexusApp()
    df = kailash.DataFlow("sqlite::memory:")

    startup_time = time.time() - start_time
    assert startup_time < 2.0, f"Startup too slow: {startup_time}s"

    # Register and test workflow
    reg = kailash.NodeRegistry()
    df.register_nodes(reg)
    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "q", {"query": "SELECT 1"})
    workflow = builder.build(reg)
    rt = kailash.Runtime(reg)
    app.register("test", lambda **inputs: rt.execute(workflow, inputs))
```

## Key Takeaways

- NexusApp has **NO** `auto_discovery` parameter — always register workflows manually
- `auto_migrate=True` (default) works everywhere including Docker
- The parameters `enable_model_persistence`, `skip_migration`, `existing_schema_mode` do not exist
- All CRUD operations work with default DataFlow config

## Related Skills

- [nexus-quickstart](#) - Basic Nexus setup
- [dataflow-quickstart](#) - Basic DataFlow setup
- [nexus-production-deployment](#) - Production patterns
- [nexus-troubleshooting](#) - Fix integration issues
