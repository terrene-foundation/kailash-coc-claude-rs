---
name: asyncsql-advanced
description: "Advanced AsyncSQL patterns for complex queries. Use when asking 'async SQL', 'AsyncSQL patterns', 'async queries', 'SQL workflows', or 'async database'."
---

# Asyncsql Advanced

Asyncsql Advanced for database operations and query management.

> **Skill Metadata**
> Category: `database`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Asyncsql Advanced
- **Category**: database
- **Priority**: HIGH
- **Trigger Keywords**: async SQL, AsyncSQL patterns, async queries, SQL workflows

## Core Pattern

```python

# Asyncsql Advanced implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Health Monitoring & Pool Management**: Automatic health checks, dynamic pool resizing, connection monitoring for production databases
- **Advanced Type Handling**: Custom type serializers for UUID, Decimal, numpy arrays, binary data with PostgreSQL-specific support
- **Batch Operations**: High-performance bulk inserts using execute_many_async, COPY, or UNNEST for 10K+ rows
- **Streaming Large Results**: Memory-efficient streaming with async iterators and cursor-based pagination for massive datasets
- **Query Timeout & Cancellation**: Granular timeout control at connection, command, pool, and network levels with cancellable operations

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

- 💡 **Use Connection Pooling**: Enable share_pool=True for production to reuse connections and improve performance
- 💡 **Implement Health Checks**: Enable automatic health monitoring with enable_health_checks=True (uses pool-level command_timeout)
- 💡 **Stream Large Datasets**: Use stream_query() with batch_size instead of loading entire result sets into memory
- 💡 **Set Pool-Level Timeout**: Configure command_timeout at node creation (default: 60s) - applies to ALL queries including health checks
- 💡 **Batch Insert Optimization**: For 10K+ rows, use execute_many_async (general), COPY (PostgreSQL fastest), or UNNEST (PostgreSQL arrays)
- 💡 **pytest-asyncio Compatibility**: SQLQueryNode automatically detects pytest environments and adjusts pool key generation for compatibility with function-scoped fixtures

## Keywords for Auto-Trigger

<!-- Trigger Keywords: async SQL, AsyncSQL patterns, async queries, SQL workflows -->
