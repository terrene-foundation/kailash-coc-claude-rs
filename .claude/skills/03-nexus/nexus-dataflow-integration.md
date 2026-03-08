---
skill: nexus-dataflow-integration
description: CRITICAL DataFlow + Nexus integration patterns with blocking fix configuration (auto_discovery=False, auto_migrate=True default)
priority: CRITICAL
tags: [nexus, dataflow, integration, blocking-fix, performance]
---

# Nexus DataFlow Integration

CRITICAL: Proper configuration to prevent blocking on startup.

> The parameters `enable_model_persistence`, `skip_migration`, and `existing_schema_mode` have been **removed**. The only critical Nexus-side setting is `auto_discovery=False`. DataFlow's `auto_migrate=True` (default) works correctly in Docker.

## The Problem

Without proper configuration, Nexus + DataFlow causes:

1. **Infinite blocking** during initialization (when `auto_discovery=True`)

## The Solution

```python
import kailash

reg = kailash.NodeRegistry()

# Step 1: Create Nexus with auto_discovery=False
app = NexusApp(NexusConfig(port=3000))
# Register workflows manually (no auto_discovery param)

# Step 2: Create DataFlow (defaults work fine)
df = kailash.DataFlow(
    "postgresql://user:pass@host:port/db",
    auto_migrate=True,  # Default - works in Docker
)

# Step 3: Register models
@db.model
class User:
    id: str
    email: str
    name: str

# Step 4: Register workflows manually
builder = kailash.WorkflowBuilder()
builder.add_node("UserCreateNode", "create", {"email": "{{email}}"})
app.register("create_user", builder.build(reg))

# Step 5: Start
app.start()
```

## Why This Configuration

### `auto_discovery=False` (Nexus)

- Prevents scanning filesystem for workflows
- Avoids re-importing Python modules
- Eliminates infinite blocking issue
- **When to use**: Always when integrating with DataFlow

### `auto_migrate=True` (DataFlow Default)

- Table creation handled internally by the Rust engine
- No event loop issues in Docker
- Automatic schema creation and updates
- **This is the default** -- no special configuration needed

## Complete Working Example

```python
import kailash

reg = kailash.NodeRegistry()

# Fast initialization
app = NexusApp(NexusConfig(port=3000))
# Register workflows manually (no auto_discovery param)

df = kailash.DataFlow(
    "postgresql://localhost:5432/mydb",
)

# Define models
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

# Create workflow using DataFlow nodes
def create_contact_workflow():
    builder = kailash.WorkflowBuilder()

    # Use DataFlow's auto-generated nodes
    builder.add_node("ContactCreateNode", "create", {
        "name": "{{name}}",
        "email": "{{email}}",
        "company": "{{company}}"
    })

    return builder.build(reg)

# Register workflow
app.register("create_contact", create_contact_workflow())

# Start
app.start()
```

## What You Get

With `auto_discovery=False` + DataFlow defaults:

- All CRUD operations (11 nodes per model)
- Connection pooling, caching, metrics
- All Nexus channels (API, CLI, MCP)
- Automatic schema migration
- Fast startup

## What You Lose

With `auto_discovery=False`:

- Auto-discovery of workflows (must register manually)

## Using DataFlow Nodes

```python
# DataFlow auto-generates 11 nodes per model:
# CRUD: Create, Read, Update, Delete, List, Upsert, Count
# Bulk: BulkCreate, BulkUpdate, BulkDelete, BulkUpsert

builder = kailash.WorkflowBuilder()

# Create node
builder.add_node("ContactCreateNode", "create", {
    "name": "{{name}}",
    "email": "{{email}}"
})

# Search node
builder.add_node("ContactListNode", "search", {
    "filter": {"company": "{{company}}"},
    "limit": 10
})

# Connect nodes
builder.connect("create", "result", "search", "input")

app.register("contact_workflow", builder.build(reg))
```

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
    app = NexusApp(NexusConfig(
        port=int(os.getenv("API_PORT", "3000")),
    ))

    db = kailash.DataFlow(
        os.getenv("DATABASE_URL"),
    )

    # Register models
    from .models import Contact, Company  # Import after DataFlow creation

    # Register workflows
    register_workflows(app, db)

    return app

app = create_production_app()
```

## Common Issues

### Blocking on Start

```python
# Must disable auto_discovery
app = NexusApp()  # Register workflows manually
```

### Workflows Not Found

```python
# Register manually since auto_discovery is off
app.register("workflow-name", builder.build(reg))
```

### Schema Not Created

```python
# Ensure auto_migrate=True (default)
db = kailash.DataFlow(
    "postgresql://...",
    auto_migrate=True,  # This is the default
)
```

## Testing Strategy

```python
import pytest
import time

def test_nexus_dataflow_integration():
    # Test fast startup
    start_time = time.time()

    app = NexusApp()  # Register workflows manually
    db = kailash.DataFlow("sqlite:///:memory:")

    @db.model
    class TestModel:
        id: str
        name: str

    startup_time = time.time() - start_time
    assert startup_time < 2.0, f"Startup too slow: {startup_time}s"

    # Test workflow execution
    builder = kailash.WorkflowBuilder()
    builder.add_node("TestModelCreateNode", "create", {"name": "test"})
    app.register("test", builder.build(reg))
```

## Key Takeaways

- **CRITICAL**: Use `auto_discovery=False` with DataFlow
- `auto_migrate=True` (default) works everywhere including Docker
- The parameters `enable_model_persistence`, `skip_migration`, and `existing_schema_mode` have been removed
- All CRUD operations work with default DataFlow config
- Manual workflow registration required with `auto_discovery=False`

## Related Documentation

- [Main Integration Guide](nexus-dataflow-integration.md)

## Related Skills

- [nexus-quickstart](#) - Basic Nexus setup
- [dataflow-quickstart](#) - Basic DataFlow setup
- [nexus-production-deployment](#) - Production patterns
- [nexus-troubleshooting](#) - Fix integration issues
