---
name: dataflow-quickstart
description: "DataFlow in 5 minutes: connect to a database, define models, register nodes, run CRUD workflows. Use when asking 'dataflow quickstart', 'dataflow getting started', 'first dataflow model', or 'dataflow without workflow'."
---

# DataFlow Quickstart Skill

DataFlow in 5 minutes: connect, define models, run CRUD via workflows.

## Usage

`/dataflow-quickstart` -- Fastest path to database-backed workflows with DataFlow

## What DataFlow Does

DataFlow is NOT an ORM. It takes `ModelDefinition` objects (builder API) and generates 11 workflow node types per model. Those nodes are registered into `NodeRegistry` and used exactly like any other workflow node.

## Step 1: Connect to a Database

```python
import kailash

# From a URL (auto-detects dialect: SQLite, PostgreSQL, MySQL)
df = kailash.DataFlow("sqlite::memory:")

# PostgreSQL
df = kailash.DataFlow("postgres://user:pass@localhost/mydb")
```

| Database   | URL Format                          |
| ---------- | ----------------------------------- |
| SQLite     | `sqlite::memory:`, `sqlite:data.db` |
| PostgreSQL | `postgres://user:pass@host/db`      |
| MySQL      | `mysql://user:pass@host/db`         |

## Step 2: Define a Model

```python
model = kailash.ModelDefinition("User", "users")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
model.field("email", kailash.FieldType.text(), required=True, unique=True)
model.field("age", kailash.FieldType.integer(), nullable=True)
model.auto_timestamps()

df.register_model(model)
```

## Step 3: Create the Table

```python
df.execute_raw("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        age INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
""")
```

## Step 4: Register Nodes and Build a Workflow

```python
reg = kailash.NodeRegistry()
df.register_nodes(reg)

builder = kailash.WorkflowBuilder()
builder.add_node("CreateUser", "create", {})
builder.add_node("ReadUser", "verify", {})
builder.connect("create", "id", "verify", "id")

wf = builder.build(reg)
rt = kailash.Runtime(reg)

result = rt.execute(wf, {
    "name": "Alice",
    "email": "alice@example.com",
})
created = result["results"]["create"]["record"]
```

## Python Decorator Approach (@db.model)

```python
from kailash.dataflow import db, F, with_tenant

@db.model
class User:
    id: int
    name: str
    email: str

# Filter builder
users = F("name") == "Alice"  # Creates FilterCondition

with with_tenant(df, "tenant-123") as scoped_interceptor:
    pass  # All queries inside are tenant-scoped
```

## FilterCondition

```python
from kailash import FilterCondition

f = FilterCondition("name", "eq", "Alice")
f = FilterCondition.eq("name", "Alice")
f = FilterCondition.gt("age", 18)
f = FilterCondition.like("name", "%smith%")
```

## Critical Rules

1. NEVER manually set `created_at` or `updated_at` -- they are auto-managed
2. `CreateUser` uses FLAT params (not nested objects)
3. Primary key field must use `primary_key=True`
4. DataFlow is NOT an ORM -- it generates workflow nodes
5. All queries use parameterized placeholders (never string interpolation)

## Verify

```bash
pip install kailash-enterprise
pytest tests/test_dataflow.py -v
```
