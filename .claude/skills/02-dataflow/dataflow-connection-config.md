---
name: dataflow-connection-config
description: "DataFlow database connection configuration for SQL (PostgreSQL, MySQL, SQLite), MongoDB, and pgvector. Use when DataFlow connection, database URL, connection string, special characters in password, or connection setup."
---

# DataFlow Connection Configuration

Configure database connections with full support for special characters in passwords and connection pooling.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`dataflow-quickstart`](#), [`dataflow-models`](#), [`dataflow-existing-database`](#)
> Related Subagents: `dataflow-specialist` (connection troubleshooting, pooling optimization)

## Quick Reference

- **Format**: `scheme://[user[:pass]@]host[:port]/database`
- **Special Chars**: Fully supported in passwords
- **SQL Databases**: PostgreSQL, MySQL, SQLite (11 nodes per @db.model)
- **Document Database**: MongoDB (8 specialized nodes, flexible schema)
- **Vector Search**: PostgreSQL pgvector (3 vector nodes for RAG/semantic search)
- **Pooling**: Automatic, configurable

## Core Pattern

```python
import kailash

# PostgreSQL with special characters
df = kailash.DataFlow(
    "postgresql://admin:MySecret#123$@localhost:5432/mydb"
)

# With connection pool config
config = kailash.DataFlowConfig(
    "postgresql://admin:MySecret#123$@localhost:5432/mydb",
    max_connections=20,
    min_connections=2,
)
df = kailash.DataFlow("postgresql://...", config=config)

# SQLite (development)
db_dev = kailash.DataFlow("sqlite:///dev.db")

# Environment variable (recommended)
import os
db_prod = kailash.DataFlow(os.getenv("DATABASE_URL"))
```

## Common Use Cases

- **Production**: PostgreSQL with connection pooling
- **Development**: SQLite for fast iteration
- **Testing**: In-memory SQLite
- **Multi-Environment**: Different configs per environment
- **Special Passwords**: Passwords with #, $, @, ? characters

## Connection String Format

### PostgreSQL

```python
# Full format
"postgresql://username:password@host:port/database?param=value"

# Examples
"postgresql://user:pass@localhost:5432/mydb"
"postgresql://readonly:secret@replica.host:5432/analytics"
"postgresql://admin:Complex$Pass!@10.0.1.5:5432/production"
```

### SQLite

```python
# File-based
"sqlite:///path/to/database.db"
"sqlite:////absolute/path/database.db"

# In-memory (testing)
"sqlite:///:memory:"
":memory:"  # Shorthand
```

## Key Parameters

```python
# DataFlowConfig controls connection pool settings
config = kailash.DataFlowConfig(
    "postgresql://...",
    max_connections=20,          # Max pool connections (default: 10)
    min_connections=1,           # Min pool connections (default: 1)
    connect_timeout_secs=30,     # Connection timeout (default: 30)
    idle_timeout_secs=600,       # Idle connection timeout (optional)
    max_lifetime_secs=3600,      # Max connection lifetime (optional)
    auto_migrate=False,          # Auto schema updates
)

# Pass config to DataFlow
db = kailash.DataFlow("postgresql://...", config=config)

# Or use simple constructor (defaults are fine for most cases)
db = kailash.DataFlow("postgresql://...", auto_migrate=True)
```

## Common Mistakes

### Mistake 1: URL Encoding Passwords

```python
# Wrong (old workaround, no longer needed)
password = "MySecret%23123%24"  # Manual encoding
db = kailash.DataFlow(f"postgresql://user:{password}@host/db")
```

**Fix: Use Password Directly**

```python
# Correct - automatic handling
db = kailash.DataFlow("postgresql://user:MySecret#123$@host/db")
```

### Mistake 2: Small Connection Pool

```python
# Wrong - default max_connections=10 may be too small for production
config = kailash.DataFlowConfig("postgresql://...", max_connections=5)
```

**Fix: Adequate Pool Size**

```python
# Correct - increase max_connections for production
config = kailash.DataFlowConfig(
    "postgresql://...",
    max_connections=20,
    min_connections=2,
)
db = kailash.DataFlow("postgresql://...", config=config)
```

## Related Patterns

- **For existing databases**: See [`dataflow-existing-database`](#)
- **For multi-instance**: See [`dataflow-multi-instance`](#)
- **For performance**: See [`dataflow-performance`](#)

## When to Escalate to Subagent

Use `dataflow-specialist` when:

- Connection pool exhaustion
- Timeout issues
- SSL/TLS configuration
- Read/write splitting
- Multi-database setup

## Examples

### Example 1: Multi-Environment Setup

```python
import os

# Development
if os.getenv("ENV") == "development":
    db = kailash.DataFlow("sqlite:///dev.db", auto_migrate=True)

# Staging
elif os.getenv("ENV") == "staging":
    config = kailash.DataFlowConfig(os.getenv("DATABASE_URL"), max_connections=10)
    db = kailash.DataFlow(os.getenv("DATABASE_URL"), config=config, auto_migrate=True)

# Production
else:
    config = kailash.DataFlowConfig(
        os.getenv("DATABASE_URL"),
        max_connections=20,
        min_connections=2,
    )
    db = kailash.DataFlow(os.getenv("DATABASE_URL"), config=config)
```

### Example 2: Connection with Complex Password

```python
# Password with special characters
config = kailash.DataFlowConfig(
    "postgresql://admin:P@ssw0rd!#$@db.example.com:5432/prod",
    max_connections=20,
    connect_timeout_secs=10,
)
db = kailash.DataFlow(
    "postgresql://admin:P@ssw0rd!#$@db.example.com:5432/prod",
    config=config,
)
```

## Troubleshooting

| Issue                          | Cause                     | Solution                 |
| ------------------------------ | ------------------------- | ------------------------ |
| Connection refused             | Wrong host/port           | Verify connection string |
| Password authentication failed | Special chars in password | Use latest DataFlow      |
| Pool exhausted                 | max_connections too small  | Increase max_connections  |
| Connection timeout             | Network/firewall          | Check connect_timeout    |

## Quick Tips

- Use environment variables for credentials
- Special characters work with no encoding required
- SQLite for development, PostgreSQL for production
- max_connections = 2x CPU cores (typical)
- Use DataFlowConfig for pool tuning
- Test connection before deployment

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow connection, database URL, connection string, PostgreSQL connection, SQLite connection, special characters password, connection pool, database setup, connection configuration -->
