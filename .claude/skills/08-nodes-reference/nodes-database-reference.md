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
#   DatabaseConnectionNode (Connection pooling)
#   SQLTransactionNode (Transaction management)
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

### DatabaseConnectionNode ⭐

```python
import kailash

builder = kailash.WorkflowBuilder()

# Initialize connection pool via node
builder.add_node("DatabaseConnectionNode", "pool_init", {
    "operation": "initialize",
    "name": "main_pool",
    "database_type": "postgresql",
    "host": "localhost",
    "database": "myapp",
    "min_connections": 5,
    "max_connections": 20
})
```

## Transaction Management

### SQLTransactionNode

```python
import kailash

# SQL transaction management
builder.add_node("SQLTransactionNode", "txn", {
    "operation": "begin",
    "isolation_level": "serializable"
})
```

## Related Skills

- **Data Nodes**: [`nodes-data-reference`](nodes-data-reference.md)
- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: database node, SQL node, AsyncSQL, connection pool, SQLQueryNode, DatabaseConnectionNode -->
