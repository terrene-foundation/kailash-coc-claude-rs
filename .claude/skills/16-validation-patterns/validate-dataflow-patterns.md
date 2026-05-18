---
name: validate-dataflow-patterns
description: "Validate DataFlow compliance patterns in the Kailash Rust SDK. Use when asking 'validate dataflow', 'dataflow compliance', or 'check dataflow code'."
---

# Validate DataFlow Patterns

> **Skill Metadata**
> Category: `validation`
> Priority: `MEDIUM`

## DataFlow Compliance Checks

### Model Definition (Required Pattern)

```rust
use kailash_dataflow::{DataFlow, ModelDefinition, FieldType};

// CORRECT: Use ModelDefinition builder
let user_model = ModelDefinition::new("User")
    .field("id", FieldType::Integer, |f| f.primary_key())
    .field("name", FieldType::String, |f| f.required())
    .field("email", FieldType::String, |f| f.required().unique())
    .build()?;

let df = DataFlow::new(&std::env::var("DATABASE_URL")?).await?;
df.register_model(user_model)?;
// Auto-generates 11 nodes: CreateUser, ReadUser, UpdateUser, DeleteUser,
// ListUser, BulkCreateUser, CountUser, UpsertUser, etc.

// WRONG: Manual SQL for CRUD operations
// let query = format!("INSERT INTO users (name, email) VALUES ('{}', '{}')", name, email);
// sqlx::query(&query).execute(&pool).await?;  // SQL injection risk!
```

### Database Connection (Required Pattern)

```rust
// CORRECT: Connection string from environment
dotenvy::dotenv().ok();
let df = DataFlow::new(&std::env::var("DATABASE_URL")?).await?;

// WRONG: Hardcoded connection string
// let df = DataFlow::new("postgres://user:password@localhost/db").await?;
```

### Compile-Time SQL (Required Pattern)

```rust
// CORRECT: Compile-time checked queries with sqlx
let user = sqlx::query_as!(
    User,
    "SELECT id, name, email FROM users WHERE id = $1",
    user_id
)
.fetch_one(&pool)
.await?;

// CORRECT: Runtime query with bound parameters
let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
    .bind(user_id)
    .fetch_one(&pool)
    .await?;

// WRONG: String interpolation in SQL
// let query = format!("SELECT * FROM users WHERE id = {}", user_id);
```

## Validation Rules

1. **Use ModelDefinition** -- Not manual SQL for CRUD
2. **Use auto-generated nodes** -- CreateUser, ReadUser, UpdateUser, DeleteUser, etc.
3. **Primary key must be `id`** -- DataFlow convention
4. **Never manually set `created_at`/`updated_at`** -- Auto-managed by DataFlow
5. **Connection string from env** -- `std::env::var("DATABASE_URL")?`
6. **Use `sqlx::query!` or `sqlx::query_as!`** -- Compile-time checked SQL
7. **CreateModel uses FLAT params** -- Not nested objects
8. **UpdateModel uses `filter` + `fields`** -- Separate filter from update data

### Generated Node Usage

```rust
use kailash_core::{WorkflowBuilder, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();

// CORRECT: Using auto-generated node
builder.add_node("CreateUser", "create", ValueMap::from([
    ("name".into(), Value::String("Alice".into())),
    ("email".into(), Value::String("alice@example.com".into())),
    // Do NOT set id, created_at, updated_at -- auto-managed
]));

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;
```

## DataFlow Gotchas

1. **NEVER manually set `created_at`/`updated_at`** -- auto-managed by DataFlow
2. **`CreateModel` uses FLAT params** -- `{"name": "Alice", "email": "alice@example.com"}`
3. **`UpdateModel` uses `filter` + `fields`** -- separate filter criteria from update data
4. **Primary key MUST be named `id`** -- DataFlow convention
5. **`soft_delete` only affects DELETE operations** -- queries still return soft-deleted rows unless filtered

## Documentation

- **DataFlow guide**: [`CLAUDE.md`](../../../../CLAUDE.md) -- kailash-dataflow section
- **DataFlow crate**: `crates/kailash-dataflow/`
- **DataFlow skills**: `.claude/skills/02-dataflow/`

<!-- Trigger Keywords: validate dataflow, dataflow compliance, check dataflow code, dataflow patterns, ModelDefinition -->
