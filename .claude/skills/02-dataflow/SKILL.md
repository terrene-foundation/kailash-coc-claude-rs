---
name: dataflow
description: "Kailash DataFlow - zero-config database framework with automatic model-to-node generation. Use when asking about 'database operations', 'DataFlow', 'database models', 'CRUD operations', 'bulk operations', 'database queries', 'database migrations', 'multi-tenancy', 'database transactions', 'PostgreSQL', 'MySQL', 'SQLite', or 'TDD with databases'. DataFlow is NOT an ORM - it generates 11 workflow nodes per model."
---

# Kailash DataFlow - Zero-Config Database Framework

DataFlow is a zero-config database framework built on Kailash Core SDK that automatically generates workflow nodes from database models.

## Overview

- **Automatic Node Generation**: 11 nodes per model
- **Multi-Database Support**: PostgreSQL, MySQL, SQLite via sqlx (Rust engine)
- **Enterprise Features**: Multi-tenancy, transactions, query interceptors
- **Zero Configuration**: Auto-dialect detection from connection URL
- **Two Usage Modes**: Node-based (via WorkflowBuilder) or direct CRUD (via DataFlowExpress)

## Quick Start

```python
import kailash
from kailash.dataflow import db, F, with_tenant

# Connect to database
df = kailash.DataFlow("sqlite::memory:")

# Define model using ModelDefinition
model = kailash.ModelDefinition("User", "users")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
model.field("email", kailash.FieldType.text(), required=True, unique=True)
model.field("age", kailash.FieldType.integer(), nullable=True)
model.auto_timestamps()

# Register model
df.register_model(model)

# Register generated nodes
reg = kailash.NodeRegistry()
df.register_nodes(reg)

# Use generated nodes in workflows
builder = kailash.WorkflowBuilder()
builder.add_node("CreateUser", "create_user", {})

# Execute
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), {
    "name": "Alice",
    "email": "alice@example.com"
})
user = result["results"]["create_user"]
```

### Python Decorator Approach

The `@db.model` decorator provides a Pythonic interface:

```python
from kailash.dataflow import db, F, with_tenant

@db.model
class User:
    id: int
    name: str
    email: str

# Filter builder
users = F("name") == "Alice"  # Creates FilterCondition

# Multi-tenancy
with with_tenant(df, "tenant-123") as scoped_interceptor:
    pass  # All queries inside are tenant-scoped
```

## Generated Nodes (11 per model)

Each model generates:

1. `Create{Model}` - INSERT one record (flat writable fields as input)
2. `Read{Model}` - SELECT one by primary key
3. `Update{Model}` - UPDATE with `filter` + `fields` inputs
4. `Delete{Model}` - DELETE (or soft-delete) by primary key
5. `List{Model}` - SELECT with filters, ordering, pagination
6. `Upsert{Model}` - INSERT or UPDATE on conflict
7. `Count{Model}` - SELECT COUNT with optional filter
8. `BulkCreate{Model}` - Batch INSERT (input: `items` array)
9. `BulkUpdate{Model}` - Batch UPDATE (input: array of `{filter, fields}`)
10. `BulkDelete{Model}` - Batch DELETE (input: `ids` array or `filter`)
11. `BulkUpsert{Model}` - Batch INSERT or UPDATE on conflict

## Critical Rules

- NEVER manually set `created_at` or `updated_at` -- they are auto-managed
- `CreateUser` uses FLAT params (not nested objects)
- Primary key field must use `primary_key=True` in the builder
- `soft_delete` marks records deleted AND filters them from READ/LIST
- DataFlow is NOT an ORM -- it generates workflow nodes
- All queries use parameterized placeholders (never string interpolation)

## Reference Documentation

### Getting Started

- **[dataflow-quickstart](dataflow-quickstart.md)** - Quick start guide
- **[dataflow-models](dataflow-models.md)** - Defining models with ModelDefinition

### Core Operations

- **[dataflow-crud-operations](dataflow-crud-operations.md)** - Create, Read, Update, Delete
- **[dataflow-queries](dataflow-queries.md)** - Query patterns and filtering
- **[dataflow-bulk-operations](dataflow-bulk-operations.md)** - Batch operations
- **[dataflow-transactions](dataflow-transactions.md)** - Transaction management

### Advanced Features

- **[dataflow-multi-tenancy](dataflow-multi-tenancy.md)** - Multi-tenant architectures
- **[dataflow-gotchas](dataflow-gotchas.md)** - Common pitfalls and solutions

## Database Support Matrix

| Database   | Nodes/Model | URL Format                       |
| ---------- | ----------- | -------------------------------- |
| SQLite     | 11          | `sqlite::memory:`, `sqlite:f.db` |
| PostgreSQL | 11          | `postgres://user:pass@host/db`   |
| MySQL      | 11          | `mysql://user:pass@host/db`      |

Dialect is auto-detected via the connection URL.

## Integration Patterns

### With Nexus (Multi-Channel)

```python
from kailash.nexus import NexusApp
import kailash

df = kailash.DataFlow("postgresql://user:pass@localhost/db")
model = kailash.ModelDefinition("User", "users")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
df.register_model(model)

app = NexusApp()

@app.handler("create_user")
async def create_user(name: str) -> dict:
    reg = kailash.NodeRegistry()
    df.register_nodes(reg)
    builder = kailash.WorkflowBuilder()
    builder.add_node("CreateUser", "create", {})
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), {"name": name})
    return result["results"]["create"]

app.start()
```

## When to Use This Skill

Use DataFlow when you need to:

- Perform database operations in workflows
- Generate CRUD APIs automatically (with Nexus)
- Implement multi-tenant systems
- Work with existing databases
- Handle bulk data operations

## Related Skills

- **[01-core-sdk](../01-core-sdk/SKILL.md)** - Core workflow patterns
- **[03-nexus](../03-nexus/SKILL.md)** - Multi-channel deployment
- **[04-kaizen](../04-kaizen/SKILL.md)** - AI agent integration
- **[17-gold-standards](../17-gold-standards/SKILL.md)** - Best practices

## Support

For DataFlow-specific questions, invoke:

- `dataflow-specialist` - DataFlow implementation and patterns
- `testing-specialist` - DataFlow testing strategies
- `framework-advisor` - Choose between Core SDK and DataFlow
