---
name: decide-database-postgresql-sqlite
description: "Choose between PostgreSQL and SQLite for DataFlow applications based on requirements. Use when asking 'PostgreSQL vs SQLite', 'database choice', 'which database', 'database selection', or 'DB comparison'."
---

# Decision: Database Selection

Decision: Database Selection guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `MEDIUM`

## Quick Reference

- **Primary Use**: Decision: Database Selection
- **Category**: cross-cutting
- **Priority**: MEDIUM
- **Trigger Keywords**: PostgreSQL vs SQLite, database choice, which database, database selection

## Core Pattern

```python
import kailash

# Decide Database Postgresql Sqlite implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters
# Reference: decide-database-postgresql-sqlite

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Decide-Database-Postgresql-Sqlite Processing**: Extract, transform, load data from various sources with validation
- **Format Conversion**: CSV, JSON, XML, Parquet conversions with schema validation and type handling
- **API Integration**: REST, GraphQL, WebSocket integrations with authentication and error handling
- **Batch Processing**: High-volume data processing with streaming, pagination, and memory optimization
- **Data Quality**: Validation, deduplication, enrichment, normalization for clean data pipelines

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For connections**: See [`connection-patterns`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:
- Complex implementation needed
- Production deployment required
- Deep analysis necessary
- Enterprise patterns needed

## Quick Tips

- 💡 **Tip 1**: Always follow Decision: Database Selection best practices
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference documentation for details

## Keywords for Auto-Trigger

<!-- Trigger Keywords: PostgreSQL vs SQLite, database choice, which database, database selection -->
