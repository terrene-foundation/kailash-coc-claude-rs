---
name: nodes-database-reference
description: "Database nodes reference (AsyncSQL, MySQL, PostgreSQL, Connection Pool). Use when asking 'database node', 'SQL node', 'AsyncSQL', 'connection pool', or 'query routing'."
---

# Database Nodes Reference

Complete reference for database operations and connection management.

> **Skill Metadata**
> Category: `nodes`
> Priority: `HIGH`
> Related Skills: [`nodes-data-reference`](nodes-data-reference.md), [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (database workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available database nodes:
#   SQLQueryNode (Production recommended)
#   WorkflowConnectionPool (Connection pooling)
#   QueryRouterNode (Intelligent routing)
#   SQLDatabaseNode (Simple queries)
#   OptimisticLockingNode (Concurrency control)
```

## Production Database Node

### SQLQueryNode ⭐ (Recommended)

```python
import kailash

builder = kailash.WorkflowBuilder()

# Production-grade async SQL with transactions
builder.add_node("SQLQueryNode", "db", {
    "database_type": "postgresql",
    "host": "localhost",
    "database": "myapp",
    "user": "dbuser",
    "password": "dbpass",
    "transaction_mode": "auto"  # auto, manual, or none
})

# Execute query
builder.add_node("SQLQueryNode", "query", {
    "query": "SELECT * FROM users WHERE active = :active",
    "params": {"active": True},
    "fetch_mode": "all"
})
```

## Connection Pooling

### WorkflowConnectionPool ⭐

```python
import kailash

builder = kailash.WorkflowBuilder()

# Initialize connection pool via node
builder.add_node("WorkflowConnectionPool", "pool_init", {
    "operation": "initialize",
    "name": "main_pool",
    "database_type": "postgresql",
    "host": "localhost",
    "database": "myapp",
    "min_connections": 5,
    "max_connections": 20,
    "adaptive_sizing": True,
    "enable_query_routing": True
})
```

## Query Routing

### QueryRouterNode ⭐

```python
import kailash

# Intelligent query routing with caching
builder.add_node("QueryRouterNode", "router", {
    "name": "query_router",
    "connection_pool": "smart_pool",
    "enable_read_write_split": True,
    "cache_size": 2000,
    "pattern_learning": True
})
```

## Simple SQL Node

### SQLDatabaseNode

```python
builder.add_node("SQLDatabaseNode", "simple_query", {
    "connection_string": "postgresql://user:pass@localhost/db",
    "query": "SELECT * FROM users WHERE id = :user_id",
    "parameters": {"user_id": 123},
    "operation": "fetch_one"
})
```

## Concurrency Control

### OptimisticLockingNode ⭐

```python
import kailash

# Version-based concurrency control
builder.add_node("OptimisticLockingNode", "lock", {
    "version_field": "version",
    "max_retries": 3,
    "default_conflict_resolution": "retry",
    "action": "update_with_version",
    "table_name": "users",
    "record_id": 123,
    "update_data": {"name": "John Updated"},
    "expected_version": 5
})
```

## Related Skills

- **Data Nodes**: [`nodes-data-reference`](nodes-data-reference.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: database node, SQL node, AsyncSQL, connection pool, query routing, SQLQueryNode, WorkflowConnectionPool, QueryRouterNode -->
