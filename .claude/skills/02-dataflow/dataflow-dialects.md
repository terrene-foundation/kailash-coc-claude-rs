---
name: dataflow-dialects
description: "SQL database support in DataFlow - PostgreSQL, MySQL, and SQLite with 100% feature parity. Use when asking 'dataflow postgres', 'dataflow mysql', 'dataflow sqlite', or 'database dialects'. For MongoDB or pgvector, see Multi-Database Support Matrix in SKILL.md."
---

# DataFlow SQL Database Dialects

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> **Note**: This guide covers SQL databases. For MongoDB (document database) or pgvector (vector search), see SKILL.md Multi-Database Support Matrix.

## 100% SQL Feature Parity

**All three SQL databases support identical operations:**

- ✅ Same 11 nodes per model (Create, Read, Update, Delete, List, Upsert, Count, BulkCreate, BulkUpdate, BulkDelete, BulkUpsert)
- ✅ Identical workflows work across all databases
- ✅ Same query syntax and filtering
- ✅ Full async operations with connection pooling
- ✅ Enterprise features (multi-tenancy, soft deletes, transactions)

## PostgreSQL (Production Enterprise)

```python
import kailash

df = kailash.DataFlow("postgresql://user:pass@localhost:5432/mydb")

# Pros:
# - Advanced features (PostGIS, JSONB, arrays)
# - Multi-writer, full ACID
# - Proven at scale
# - Best for production enterprise apps

# Cons:
# - Requires PostgreSQL server
# - Slightly higher resource usage
```

**Best For:** Production enterprise, PostGIS spatial data, complex analytics, large-scale deployments

## MySQL (Web Hosting)

```python
db = kailash.DataFlow("mysql://user:pass@localhost:3306/mydb")

# With charset configuration
db = kailash.DataFlow("mysql://user:pass@localhost:3306/mydb?charset=utf8mb4&collation=utf8mb4_unicode_ci")

# Pros:
# - Widely available on web hosting
# - Existing MySQL infrastructure
# - Excellent read performance
# - InnoDB for ACID compliance

# Cons:
# - Requires MySQL server
# - Some advanced features require MySQL 8.0+
```

**Best For:** Web hosting environments, existing MySQL infrastructure, read-heavy workloads, cost optimization

## SQLite (Development/Mobile)

```python
# In-memory (fast testing)
db = kailash.DataFlow(":memory:")

# File-based
db = kailash.DataFlow("sqlite:///app.db")

# WAL mode for better concurrency is configured at the database level
# e.g., PRAGMA journal_mode=WAL; (not a DataFlow constructor parameter)
db = kailash.DataFlow("sqlite:///app.db")

# Pros:
# - Zero config, no server needed
# - Perfect for development/testing
# - Excellent for mobile apps
# - Single-file database

# Cons:
# - Single-writer (WAL mode improves this)
# - Not recommended for high-concurrency web apps
```

**Best For:** Development/testing, mobile apps, edge computing, serverless functions, desktop applications

## Feature Comparison

| Feature                | PostgreSQL      | MySQL                 | SQLite                       |
| ---------------------- | --------------- | --------------------- | ---------------------------- |
| **Driver**             | sqlx (Any)      | sqlx (Any)            | sqlx (Any)                   |
| **Concurrency**        | Multi-writer    | Multi-writer (InnoDB) | Single-writer (WAL improves) |
| **Multi-Instance**     | ✅ Safe         | ✅ Safe               | ⚠️ Not for concurrent writes |
| **Setup**              | Requires server | Requires server       | Zero config                  |
| **DataFlow Nodes**     | ✅ All 11       | ✅ All 11             | ✅ All 11                    |
| **Connection Pooling** | ✅ Native       | ✅ Native             | ✅ Custom                    |
| **Transactions**       | ✅ ACID         | ✅ ACID (InnoDB)      | ✅ ACID                      |
| **JSON Support**       | ✅ JSONB        | ✅ 5.7+               | ✅ JSON1                     |
| **Full-Text Search**   | ✅              | ✅                    | ✅ FTS5                      |
| **Best Performance**   | Complex queries | Read-heavy            | Small datasets               |

## Switching Between Databases

```python
import os
import kailash

# Environment-based selection
env = os.getenv("ENV", "development")

if env == "development":
    # Fast local development
    df = kailash.DataFlow(":memory:")

elif env == "staging":
    # MySQL for web hosting compatibility
    df = kailash.DataFlow(os.getenv("MYSQL_URL"))

else:
    # PostgreSQL for production
    df = kailash.DataFlow(os.getenv("DATABASE_URL"))

# Same model works everywhere
@db.model
class User:
    id: str
    name: str
    email: str

# Same 11 nodes generated regardless of database
```

## Multi-Database Workflows

```python
# Use different databases for different purposes
dev_db = kailash.DataFlow(":memory:")  # SQLite for testing
web_db = kailash.DataFlow("mysql://...")  # MySQL for web app
prod_db = kailash.DataFlow("postgresql://...")  # PostgreSQL for analytics

# Same models work across all
@dev_db.model
@web_db.model
@prod_db.model
class Order:
    customer_id: int
    total: float
```

## Connection Examples

### PostgreSQL

```python
# Basic
db = kailash.DataFlow("postgresql://user:pass@localhost:5432/mydb")

# With SSL
db = kailash.DataFlow("postgresql://user:pass@localhost:5432/mydb?sslmode=require")

# With pool config
config = kailash.DataFlowConfig(
    "postgresql://user:pass@localhost:5432/mydb",
    max_connections=20,
)
db = kailash.DataFlow("postgresql://user:pass@localhost:5432/mydb", config=config)
```

### MySQL

```python
# Basic
db = kailash.DataFlow("mysql://user:pass@localhost:3306/mydb")

# With charset
db = kailash.DataFlow("mysql://user:pass@localhost:3306/mydb?charset=utf8mb4")

# With SSL (via connection string params)
db = kailash.DataFlow("mysql://user:pass@localhost:3306/mydb?ssl-mode=required")
```

### SQLite

```python
# In-memory
db = kailash.DataFlow(":memory:")

# File-based
db = kailash.DataFlow("sqlite:///path/to/database.db")

# File-based with auto_migrate
db = kailash.DataFlow("sqlite:///db.db", auto_migrate=True)
```

## Database Selection Guide

### Choose PostgreSQL When:

- Enterprise production applications
- PostGIS spatial data needed
- Complex analytics and reporting
- High-concurrency write operations
- Advanced features (arrays, JSONB)

### Choose MySQL When:

- Web hosting environments (cPanel, shared hosting)
- Existing MySQL infrastructure
- Read-heavy workloads
- Cost optimization (lower resources than PostgreSQL)
- Integration with MySQL-specific tools

### Choose SQLite When:

- Development and testing
- Mobile applications (iOS/Android)
- Edge computing and IoT
- Serverless functions
- Desktop applications
- Prototyping and demos

## Migration Between Databases

DataFlow makes it easy to migrate between databases:

1. **Export data** from old database using workflows
2. **Change connection string** to new database
3. **Run auto-migration** - DataFlow creates schema automatically
4. **Import data** using bulk operations

The same workflow code works on all databases!

## Documentation

- **Connection Config**: [dataflow-connection-config.md](dataflow-connection-config.md)

<!-- Trigger Keywords: dataflow postgres, dataflow mysql, dataflow sqlite, database dialects, dataflow databases, database selection -->
