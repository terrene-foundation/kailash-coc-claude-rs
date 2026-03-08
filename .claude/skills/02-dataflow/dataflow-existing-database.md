---
name: dataflow-existing-database
description: "Connect DataFlow to existing databases safely. Use when existing database, legacy database, auto_migrate=False, or connect to production database."
---

# DataFlow Existing Database Integration

Connect DataFlow to existing databases using `ModelDefinition` to define models that match your existing schema.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`dataflow-models`](#), [`dataflow-connection-config`](#), [`dataflow-nexus-integration`](#)
> Related Subagents: `dataflow-specialist` (complex schemas, migration planning)

## Quick Reference

- **Safe Mode**: `auto_migrate=False` prevents ALL schema changes (default)
- **Define Models**: Use `@db.model` or `ModelDefinition()` to match existing tables
- **Register**: `df.register_model(model)` to generate CRUD nodes

## Core Pattern

```python
import os
import kailash
from kailash.dataflow import db

reg = kailash.NodeRegistry()

# Connect safely to existing database (auto_migrate=False is the default)
df = kailash.DataFlow(os.environ["DATABASE_URL"])

# Define a model that matches your existing table schema
@db.model
class User:
    __table__ = "users"  # Must match existing table name
    id: int
    email: str
    name: str

# Register the model -- generates CRUD nodes (CreateUser, ReadUser, etc.)
df.register_model(User._model_definition)

# Use generated nodes
builder = kailash.WorkflowBuilder()
builder.add_node("ListUser", "get_users", {
    "filter": {"active": True},
    "limit": 10
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Using ModelDefinition Directly

For programmatic model definition without decorators:

```python
import kailash

df = kailash.DataFlow(os.environ["DATABASE_URL"])

# Build model definition to match existing table
model = kailash.ModelDefinition("Product", "products")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
model.field("price", kailash.FieldType.real(), required=True)
model.field("category", kailash.FieldType.text(), nullable=True)

# Register generates CRUD nodes
df.register_model(model)

# Now ListProduct, CreateProduct, etc. are available
builder = kailash.WorkflowBuilder()
builder.add_node("ListProduct", "list_products", {
    "filter": {"category": "electronics"},
    "limit": 50
})
```

## Common Use Cases

- **Legacy Integration**: Define models matching existing table schemas
- **Production Readonly**: Safe read access with auto_migrate=False
- **Multiple Tables**: Register multiple models for your existing schema

## Common Mistakes

### Mistake 1: Modifying Production Schema

```python
# DANGER - auto_migrate=True will create/modify tables!
df = kailash.DataFlow(
    "postgresql://prod-db/database",
    auto_migrate=True  # BAD - could alter production schema!
)
```

**Fix: Use Safe Mode (default)**

```python
# Safe - auto_migrate=False is the default
df = kailash.DataFlow("postgresql://prod-db/database")
# OR explicitly:
df = kailash.DataFlow("postgresql://prod-db/database", auto_migrate=False)
```

### Mistake 2: Model Doesn't Match Existing Schema

```python
@db.model
class User:
    id: int
    email: str
    nonexistent_column: str  # Column doesn't exist in database!
```

**Fix: Ensure model matches the existing table schema exactly.**

## Production Readonly Pattern

```python
import os
import kailash
from kailash.dataflow import db

# Connect to production with readonly credentials
df = kailash.DataFlow(os.environ["PROD_DATABASE_URL"])  # auto_migrate=False by default

@db.model
class Order:
    __table__ = "orders"
    id: int
    customer_id: int
    total: float
    status: str

df.register_model(Order._model_definition)

# Safe read operations
builder = kailash.WorkflowBuilder()
builder.add_node("ListOrder", "recent_orders", {
    "filter": {"status": "completed"},
    "limit": 100
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Troubleshooting

| Issue               | Cause                              | Solution                                  |
| ------------------- | ---------------------------------- | ----------------------------------------- |
| "Table not found"   | Model table doesn't exist          | Verify table name in __table__ matches DB |
| "Permission denied" | Readonly user trying to write      | Use only List/Read nodes, not Create      |
| "Column not found"  | Model field doesn't match DB       | Align model fields with actual columns    |

## Quick Tips

- Default `auto_migrate=False` prevents all schema changes
- Use `@db.model` with `__table__` to match existing table names
- `df.register_model()` generates 11 CRUD nodes per model
- Use `kailash.ModelDefinition()` for programmatic model definition
- Always use readonly database credentials for production access

## Keywords for Auto-Trigger

<!-- Trigger Keywords: existing database, legacy database, auto_migrate=False, production database, readonly database, connect existing, ModelDefinition -->
