---
name: decide-database-postgresql-sqlite
description: "Choose between PostgreSQL and SQLite for DataFlow applications based on requirements. Use when asking 'PostgreSQL vs SQLite', 'database choice', 'which database', 'database selection', or 'DB comparison'."
---

# Decision: Database Selection

Choose between PostgreSQL and SQLite for your Kailash DataFlow application.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `MEDIUM`

## Quick Reference

- **Primary Use**: Database selection for DataFlow
- **Category**: cross-cutting
- **Priority**: MEDIUM
- **Trigger Keywords**: PostgreSQL vs SQLite, database choice, which database, database selection

## Decision Matrix

| Criteria                | PostgreSQL                     | SQLite                         |
| ----------------------- | ------------------------------ | ------------------------------ |
| **Production use**      | Recommended                    | Not recommended                |
| **Development/testing** | Full-featured                  | Fast, zero setup               |
| **Concurrency**         | Excellent (MVCC)               | Limited (file-level locking)   |
| **Scalability**         | Horizontal + vertical          | Single file                    |
| **Setup**               | Requires server                | Embedded, zero-config          |
| **Features**            | Full SQL, JSON, arrays, CTE    | Standard SQL subset            |
| **Connection pooling**  | sqlx::PgPool                   | sqlx::SqlitePool               |
| **Compile-time checks** | sqlx::query! with DATABASE_URL | sqlx::query! with DATABASE_URL |

## Connection Setup

### PostgreSQL

```rust
use sqlx::PgPool;

// Connection string from environment (.env file)
dotenvy::dotenv().ok();
let database_url = std::env::var("DATABASE_URL")
    .map_err(|_| anyhow::anyhow!("DATABASE_URL must be set in .env"))?;

let pool = PgPool::connect(&database_url).await?;
```

### SQLite

```rust
use sqlx::SqlitePool;

// In-memory for tests
let pool = SqlitePool::connect("sqlite::memory:").await?;

// File-based for development
let pool = SqlitePool::connect("sqlite:///tmp/dev.db?mode=rwc").await?;
```

### DataFlow Integration

```rust
use kailash_dataflow::{DataFlow, ModelDefinition, FieldType};

// PostgreSQL (production)
let df = DataFlow::new(&std::env::var("DATABASE_URL")?).await?;

// SQLite (development/testing)
let df = DataFlow::new("sqlite:///tmp/dev.db").await?;

// Model definition is database-agnostic
let user_model = ModelDefinition::new("User")
    .field("id", FieldType::Integer, |f| f.primary_key())
    .field("name", FieldType::String, |f| f.required())
    .field("email", FieldType::String, |f| f.required().unique())
    .build()?;

df.register_model(user_model)?;
```

## Connection Pool Configuration

### PostgreSQL Pool

```rust
use sqlx::postgres::PgPoolOptions;

let pool = PgPoolOptions::new()
    .max_connections(20)
    .min_connections(5)
    .acquire_timeout(std::time::Duration::from_secs(5))
    .idle_timeout(std::time::Duration::from_secs(300))
    .connect(&database_url)
    .await?;
```

### SQLite Pool

```rust
use sqlx::sqlite::SqlitePoolOptions;

let pool = SqlitePoolOptions::new()
    .max_connections(5)  // SQLite has limited concurrency
    .connect("sqlite:///tmp/dev.db?mode=rwc")
    .await?;
```

## Compile-Time Query Checking

Both backends support sqlx compile-time query verification:

```rust
// Requires DATABASE_URL set at compile time
// PostgreSQL
let users = sqlx::query_as!(
    User,
    "SELECT id, name, email FROM users WHERE id = $1",
    user_id
)
.fetch_one(&pool)
.await?;

// SQLite (uses ? instead of $1)
let users = sqlx::query_as!(
    User,
    "SELECT id, name, email FROM users WHERE id = ?",
    user_id
)
.fetch_one(&pool)
.await?;
```

## Decision Flow

```
What's your use case?
  |-- Production deployment?
  |     -> PostgreSQL (scalable, enterprise-grade)
  |-- Development/prototyping?
  |     -> SQLite (zero setup, fast iteration)
  |-- Integration tests?
  |     -> SQLite in-memory (fast, isolated, no cleanup)
  |-- High concurrency (10+ concurrent writes)?
  |     -> PostgreSQL (MVCC handles concurrent access)
  |-- Single-user / embedded?
  |     -> SQLite (no server overhead)
  |-- Need JSON columns, arrays, full-text search?
        -> PostgreSQL (richer type system)
```

## Environment Configuration

### .env File

```bash
# PostgreSQL (production)
DATABASE_URL=postgres://user:password@localhost:5432/kailash_db

# SQLite (development)
DATABASE_URL=sqlite:///tmp/kailash_dev.db

# SQLite in-memory (testing)
DATABASE_URL=sqlite::memory:
```

### Loading in Rust

```rust
// At program entry point
dotenvy::dotenv().ok();

let database_url = std::env::var("DATABASE_URL")
    .map_err(|_| anyhow::anyhow!("DATABASE_URL not set -- add it to .env"))?;
```

## Migration Strategy

Migrations work with both backends via sqlx-cli:

```bash
# Install sqlx-cli
cargo install sqlx-cli --features postgres,sqlite

# Create migration
sqlx migrate add create_users

# Run migrations
sqlx migrate run --database-url "$DATABASE_URL"

# Revert last migration
sqlx migrate revert --database-url "$DATABASE_URL"
```

## Common Use Cases

### Testing with SQLite, Production with PostgreSQL

```rust
#[cfg(test)]
async fn get_test_pool() -> sqlx::SqlitePool {
    let pool = sqlx::SqlitePool::connect("sqlite::memory:").await
        .expect("failed to create test pool");
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("failed to run migrations");
    pool
}

#[cfg(not(test))]
async fn get_pool() -> sqlx::PgPool {
    dotenvy::dotenv().ok();
    let url = std::env::var("DATABASE_URL").expect("DATABASE_URL required");
    sqlx::PgPool::connect(&url).await.expect("failed to connect")
}
```

## Related Patterns

- **DataFlow models**: See `.claude/skills/02-dataflow/`
- **Connection management**: See `crates/kailash-dataflow/src/connection.rs`
- **Multi-tenancy**: See QueryInterceptor in `crates/kailash-dataflow/`

## Documentation References

### Primary Sources

- [`CLAUDE.md`](../../../../CLAUDE.md) -- kailash-dataflow section
- `crates/kailash-dataflow/` -- DataFlow implementation
- [sqlx documentation](https://docs.rs/sqlx)

## Quick Tips

- Production: always PostgreSQL with connection pooling
- Development: SQLite for fast iteration, zero setup
- Testing: SQLite in-memory for speed and isolation
- Always read DATABASE_URL from environment, never hardcode
- Use `sqlx::query!` for compile-time SQL checking with both backends
- DataFlow model definitions are database-agnostic

<!-- Trigger Keywords: PostgreSQL vs SQLite, database choice, which database, database selection, sqlx, connection pool -->
