---
name: asyncsql-advanced
description: "Advanced AsyncSQL patterns for complex queries. Use when asking 'async SQL', 'AsyncSQL patterns', 'async queries', 'SQL workflows', or 'async database'."
---

# Asyncsql Advanced

Asyncsql Advanced for database operations and query management.

> **Skill Metadata**
> Category: `database`
> Priority: `HIGH`
> SDK Version: `0.9.25+`

## Quick Reference

- **Primary Use**: Asyncsql Advanced
- **Category**: database
- **Priority**: HIGH
- **Trigger Keywords**: async SQL, AsyncSQL patterns, async queries, SQL workflows

## Core Pattern

```rust
use kailash_core::workflow::WorkflowBuilder;
use kailash_core::runtime::Runtime;
use kailash_core::node::NodeRegistry;

// AsyncSQL Advanced implementation
let registry = NodeRegistry::new();
let mut builder = WorkflowBuilder::new();

// See source documentation for specific node types and parameters

let workflow = builder.build(&registry)?;
let runtime = Runtime::new(registry);
let results = runtime.execute(&workflow, Default::default()).await?;
```

## Common Use Cases

- **Health Monitoring & Pool Management**: Automatic health checks, dynamic pool resizing, connection monitoring for production databases
- **Advanced Type Handling**: Custom type serializers for UUID, Decimal, byte arrays, binary data with PostgreSQL-specific support
- **Batch Operations**: High-performance bulk inserts using sqlx batch queries or COPY for 10K+ rows
- **Streaming Large Results**: Memory-efficient streaming with async iterators and cursor-based pagination for massive datasets
- **Query Timeout & Cancellation**: Granular timeout control at connection, command, pool, and network levels with cancellable operations

## External Pool Injection (Multi-Worker)

### Why

In multi-worker deployments (e.g., behind a load balancer with 8 service replicas), each replica creates its own connection pool. With a default `max_connections=30`, that's **240 connections** exhausting the database. External pool injection lets you control pool sizing at the application level and share a single pool across all nodes in a replica.

### Pattern

```rust
use sqlx::postgres::PgPoolOptions;
use kailash_dataflow::AsyncSqlNode;
use std::env;

// Create ONE pool at app startup (shared across all nodes)
let pool = PgPoolOptions::new()
    .min_connections(5)
    .max_connections(20)
    .connect(&env::var("DATABASE_URL")?)
    .await?;

// Inject into nodes -- SDK borrows, does NOT close
let node = AsyncSqlNode::new(
    "query_users",
    "postgresql",
    "SELECT * FROM users WHERE active = $1",
    &[&true],
)
.with_external_pool(pool.clone());

let result = node.execute().await?;
node.cleanup().await; // Safe -- pool stays open

// Caller closes pool at app shutdown
pool.close().await;
```

### Ownership Rules

| Rule                                   | Behavior                            |
| -------------------------------------- | ----------------------------------- |
| SDK borrows the pool                   | Caller retains ownership            |
| `cleanup()` marks adapter disconnected | Does NOT close the pool             |
| Serialization raises error             | External pools cannot be serialized |
| Retry fails fast on dead pool          | No reconnect attempts               |
| Pool type must match `database_type`   | Validated at init                   |

### Supported Pool Types

| Database   | Pool Type          |
| ---------- | ------------------ |
| PostgreSQL | `sqlx::PgPool`     |
| MySQL      | `sqlx::MySqlPool`  |
| SQLite     | `sqlx::SqlitePool` |

### Anti-Patterns

| Anti-Pattern                                 | Consequence                        |
| -------------------------------------------- | ---------------------------------- |
| Creating a new pool per request              | Connection exhaustion              |
| Dropping the pool before all nodes are done  | Nodes fail mid-query               |
| Serializing nodes with external pools        | Serialization error                |
| Using `external_pool` with `share_pool=true` | SDK forces `share_pool` to `false` |

## Related Patterns

- **For fundamentals**: See `workflow-quickstart` in `06-cheatsheets/`
- **For patterns**: See `workflow-patterns-library` in `06-cheatsheets/`
- **For parameters**: See `param-passing-quick` in `06-cheatsheets/`

## When to Escalate to Subagent

Use specialized subagents when:

- **pattern-expert**: Complex patterns, multi-node workflows
- **testing-specialist**: Comprehensive testing strategies

## Quick Tips

- **Use connection pooling**: Enable `share_pool: true` for production to reuse connections (note: forced to `false` when using `external_pool` -- the external pool itself handles sharing)
- **Implement health checks**: Enable automatic health monitoring with `enable_health_checks: true` (uses pool-level `connect_timeout`)
- **Stream large datasets**: Use streaming queries with `fetch()` instead of `fetch_all()` to avoid loading entire result sets into memory
- **Set pool-level timeout**: Configure `connect_timeout` at pool creation (default: 60s) -- applies to ALL queries including health checks
- **Batch insert optimization**: For 10K+ rows, use sqlx batch queries (general), COPY (PostgreSQL fastest), or UNNEST (PostgreSQL arrays)
- **External pool for multi-replica**: Use `.with_external_pool(pool)` to inject a shared pool in multi-replica deployments -- prevents connection exhaustion

## Keywords for Auto-Trigger

<!-- Trigger Keywords: async SQL, AsyncSQL patterns, async queries, SQL workflows -->
