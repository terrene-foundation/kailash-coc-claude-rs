---
name: query-routing
description: "Query routing patterns for multi-database workflows. Use when asking 'query routing', 'route queries', 'database routing', 'multi-database', or 'query distribution'."
---

# Query Routing

Query Routing for database operations and query management.

> **Skill Metadata**
> Category: `database`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Query Routing
- **Category**: database
- **Priority**: HIGH
- **Trigger Keywords**: query routing, route queries, database routing, multi-database

## Core Pattern

```python
import kailash

# In the Rust-backed SDK, nodes are string-based via builder.add_node()
builder = kailash.WorkflowBuilder()

# Intelligent connection pool with query routing
builder.add_node("DatabaseConnectionNode", "smart_pool", {
    "database_type": "postgresql",
    "host": "localhost",
    "database": "myapp",
    "user": "dbuser",
    "password": "secret",
    "min_connections": 3,
    "max_connections": 30
})

# Route queries using SwitchNode based on query type
builder.add_node("SwitchNode", "router", {
    "cases": {"read": "read_handler", "write": "write_handler"},
    "default_branch": "read_handler"
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Intelligent Query Distribution**: Automatically route queries to optimal connections based on query type (READ_SIMPLE, READ_COMPLEX, WRITE_SIMPLE, WRITE_BULK, DDL, TRANSACTION)
- **Read/Write Splitting**: Route read queries to replicas, write queries to primary for horizontal scaling
- **Adaptive Connection Pooling**: Dynamic pool sizing based on workload with automatic scaling up/down
- **Transaction Management**: Sticky routing ensures transaction queries use same connection for consistency
- **Query Pattern Learning**: ML-based pattern recognition for optimizing future query routing decisions

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For patterns**: See [`workflow-patterns-library`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:

- **pattern-expert**: Complex patterns, multi-node workflows
- **sdk-navigator**: Error resolution, parameter issues
- **testing-specialist**: Comprehensive testing strategies

## Quick Tips

- 💡 **Use Parameterized Queries**: Prepared statements enable caching and improve routing performance (e.g., `SELECT * FROM users WHERE id = ?` instead of string concatenation)
- 💡 **Session IDs for Related Queries**: Use same session_id for logically grouped queries to ensure they use the same connection
- 💡 **Monitor Pool Statistics**: Check `pool.execute({"operation": "stats"})` for connection utilization, health scores, and adaptive scaling history
- 💡 **Tune for Workload**: Read-heavy workloads benefit from large cache_size and read/write splitting; write-heavy workloads should route all to primary
- 💡 **Enable Debug Logging**: Use `logging.getLogger("kailash.nodes.data.query_router").setLevel(logging.DEBUG)` to troubleshoot routing decisions

## Keywords for Auto-Trigger

<!-- Trigger Keywords: query routing, route queries, database routing, multi-database -->
