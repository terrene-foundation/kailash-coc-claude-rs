---
name: dataflow-models
description: "Complete reference for ModelDefinition builder API, FieldType, field constraints, validation, and all 11 generated node types. Use when asking 'dataflow model', 'generated nodes', 'model definition', 'ModelDefinition', 'FieldType', 'field constraints', 'unique', 'index', or 'foreign key'."
---

# DataFlow Models Skill

Complete reference for the `ModelDefinition` builder API and all 11 generated node types.

## Usage

`/dataflow-models` -- Reference for model definition, field types, builder options, and generated nodes

## ModelDefinition -- Builder API

Models are defined using `ModelDefinition` with a builder pattern.

```python
import kailash

model = kailash.ModelDefinition("User", "users")        # (model_name, table_name)
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
model.field("email", kailash.FieldType.text(), required=True, unique=True)
model.field("age", kailash.FieldType.integer(), nullable=True)
model.auto_timestamps()   # adds created_at and updated_at (auto-managed)
```

## FieldType -- SQL Column Types

| FieldType                    | SQLite  | PostgreSQL       | MySQL      |
| ---------------------------- | ------- | ---------------- | ---------- |
| `FieldType.integer()`        | INTEGER | BIGINT           | BIGINT     |
| `FieldType.float()`          | REAL    | DOUBLE PRECISION | DOUBLE     |
| `FieldType.text()`           | TEXT    | TEXT             | TEXT       |
| `FieldType.boolean()`        | INTEGER | BOOLEAN          | TINYINT(1) |
| `FieldType.timestamp()`      | TEXT    | TIMESTAMPTZ      | DATETIME   |
| `FieldType.json()`           | TEXT    | JSONB            | JSON       |
| `FieldType.uuid()`           | TEXT    | UUID             | CHAR(36)   |

**Aliases**: `FieldType.real()` is an alias for `FieldType.float()`.

## Field Configuration Options

| Keyword                          | Effect                                                   |
| -------------------------------- | -------------------------------------------------------- |
| `primary_key=True`               | Marks as PK. Also sets required. Must be exactly one.    |
| `required=True`                  | NOT NULL. Must be provided on Create.                    |
| `nullable=True`                  | Allows NULL. Clears required.                            |
| `unique=True`                    | UNIQUE constraint on the column.                         |
| `references=("table", "column")` | Foreign key: REFERENCES table(column).                   |

### Examples

```python
import kailash

model = kailash.ModelDefinition("Order", "orders")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
model.field("email", kailash.FieldType.text(), required=True, unique=True)
model.field("user_id", kailash.FieldType.integer(), required=True, references=("users", "id"))
model.field("priority", kailash.FieldType.integer(), nullable=True)
model.auto_timestamps()
```

## Model Validation Rules

`model.validate()` enforces:

1. **At least one field** -- "model has no fields"
2. **Exactly one primary key** -- "model must have a primary key field" / "exactly one primary key"
3. **Valid SQL identifiers** -- model name, table name, and field names must match `[a-zA-Z_][a-zA-Z0-9_]*`
4. **Valid FK references** -- foreign key table and column names must be valid identifiers

Validation happens automatically on `df.register_model(model)`.

## Auto-Timestamps

`.auto_timestamps()` adds two auto-managed fields:

- `created_at` (timestamp, NOT NULL, auto-managed) -- set on INSERT only
- `updated_at` (timestamp, NOT NULL, auto-managed) -- set on INSERT and UPDATE

These fields are:

- Excluded from writable fields (cannot be set manually)
- Idempotent: calling `.auto_timestamps()` twice does not duplicate fields

```python
model = kailash.ModelDefinition("User", "users")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text(), required=True)
model.auto_timestamps()

print(model.name)                 # "User"
print(model.table_name)           # "users"
print(model.primary_key)          # "id"
print(model.has_auto_timestamps)  # True
print(model.has_soft_delete)      # False
print(len(model.fields))          # 4 (id, name, created_at, updated_at)
```

## FieldDef Properties

- `name`, `field_type`, `is_primary_key`, `is_nullable`, `is_required`
- `is_soft_delete`, `is_auto_managed`, `is_unique`, `is_indexed`
- `references` -- `{"table": ..., "column": ...}` dict or `None`

## Generated Node Types (11 per model)

When a model named "User" is registered, these 11 node types are created:

| Node Type        | Operation                                         |
| ---------------- | ------------------------------------------------- |
| `CreateUser`     | INSERT one record (flat writable fields as input) |
| `ReadUser`       | SELECT one by primary key                         |
| `UpdateUser`     | UPDATE with `filter` + `fields` inputs            |
| `DeleteUser`     | DELETE (or soft-delete) by primary key            |
| `ListUser`       | SELECT with filters, ordering, pagination         |
| `UpsertUser`     | INSERT or UPDATE on conflict                      |
| `CountUser`      | SELECT COUNT with optional filter                 |
| `BulkCreateUser` | Batch INSERT (input: `items` array)               |
| `BulkUpdateUser` | Batch UPDATE (input: array of `{filter, fields}`) |
| `BulkDeleteUser` | Batch DELETE (input: `ids` array or `filter`)     |
| `BulkUpsertUser` | Batch INSERT or UPDATE on conflict                |

## FilterCondition

```python
from kailash import FilterCondition

f = FilterCondition("name", "eq", "Alice")
f = FilterCondition("age", "gte", 18)
f = FilterCondition("status", "in", ["active", "pending"])
f = FilterCondition("deleted_at", "is_null")

# Shorthand static methods
f = FilterCondition.eq("name", "Alice")
f = FilterCondition.gt("age", 18)
f = FilterCondition.like("name", "%smith%")
```

## Verify

```bash
pip install kailash-enterprise
pytest tests/test_dataflow.py -v
```
