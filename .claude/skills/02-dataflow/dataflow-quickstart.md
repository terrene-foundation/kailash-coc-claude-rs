---
name: dataflow-quickstart
description: "Get started with Kailash DataFlow zero-config database framework. Use when asking 'DataFlow tutorial', 'DataFlow quick start', '@db.model', 'DataFlow setup', 'database framework', or 'how to use DataFlow'."
---

# DataFlow Quick Start

Zero-config database framework built on Core SDK with automatic node generation from models.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `CRITICAL`
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md), [`dataflow-models`](dataflow-models.md), [`dataflow-queries`](dataflow-queries.md)
> Related Subagents: `dataflow-specialist` (enterprise features, migrations), `nexus-specialist` (DataFlow+Nexus integration)

## Quick Reference

- **Install**: `pip install kailash-enterprise` (DataFlow included)
- **Import**: `import kailash`
- **Pattern**: `DataFlow() → @db.model → 11 nodes generated automatically`
- **NOT an ORM**: Workflow-native database framework
- **SQL Databases**: PostgreSQL, MySQL, SQLite (100% feature parity, 11 nodes per @db.model)
- **Document Database**: MongoDB (flexible schema, 8 specialized nodes)
- **Vector Search**: PostgreSQL pgvector (semantic search, 3 vector nodes)
- **Key Feature**: Automatic node generation from models or schema

## 30-Second Quick Start

```python
import kailash

reg = kailash.NodeRegistry()

# 1. Zero-config initialization
df = kailash.DataFlow()  # Auto-detects: SQLite (dev) or PostgreSQL (prod via DATABASE_URL)

# 2. Define model - automatically generates 11 node types
@df.model
class User:
    name: str
    email: str
    active: bool = True

# 3. Use generated nodes immediately
builder = kailash.WorkflowBuilder()

# UserCreateNode, UserReadNode, UserUpdateNode, UserDeleteNode, UserListNode,
# UserUpsertNode, UserCountNode,
# UserBulkCreateNode, UserBulkUpdateNode, UserBulkDeleteNode, UserBulkUpsertNode
# All created automatically!

builder.add_node("UserCreateNode", "create", {
    "name": "Alice",
    "email": "alice@example.com"
})

builder.add_node("UserListNode", "list", {
    "filter": {"active": True},
    "limit": 10
})

# 4. Execute
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(f"Created user ID: {result["results"]['create']['id']}")
```

## What is DataFlow?

**DataFlow is NOT an ORM** - it's a workflow-native database framework that generates Kailash workflow nodes from Python models.

### DataFlow vs Traditional ORM

| Feature           | Traditional ORM                 | DataFlow                          |
| ----------------- | ------------------------------- | --------------------------------- |
| **Usage**         | Direct instantiation (`User()`) | Workflow nodes (`UserCreateNode`) |
| **Operations**    | Method calls (`user.save()`)    | Workflow execution                |
| **Transactions**  | Manual management               | Distributed transactions built-in |
| **Caching**       | External integration            | Enterprise caching included       |
| **Multi-tenancy** | Custom code                     | Automatic isolation               |
| **Scalability**   | Vertical scaling                | Horizontal scaling built-in       |

## Generated Node Types (11 per Model)

Each `@db.model` automatically creates:

| Node                      | Purpose            | Example Config                                                |
| ------------------------- | ------------------ | ------------------------------------------------------------- |
| **{Model}CreateNode**     | Single insert      | `{"name": "John", "email": "john@example.com"}`               |
| **{Model}ReadNode**       | Single select      | `{"id": 123}` or `{"filter": {"email": "alice@example.com"}}` |
| **{Model}UpdateNode**     | Single update      | `{"id": 123, "name": "Jane"}`                                 |
| **{Model}DeleteNode**     | Single delete      | `{"id": 123}` or `{"soft_delete": True}`                      |
| **{Model}ListNode**       | Query with filters | `{"filter": {"age": {"$gt": 18}}, "limit": 10}`               |
| **{Model}UpsertNode**     | Insert or update   | `{"data": {"email": "a@b.com"}, "match_fields": ["email"]}`   |
| **{Model}CountNode**      | Count records      | `{"filter": {"status": "active"}}`                            |
| **{Model}BulkCreateNode** | Bulk insert        | `{"data": [...], "batch_size": 1000}`                         |
| **{Model}BulkUpdateNode** | Bulk update        | `{"filter": {...}, "fields": {...}}`                          |
| **{Model}BulkDeleteNode** | Bulk delete        | `{"filter": {...}}`                                           |
| **{Model}BulkUpsertNode** | Bulk insert/update | `{"data": [...], "match_fields": ["email"]}`                  |

## Database Connection Patterns

### Option 1: Zero-Config (Development)

```python
db = kailash.DataFlow()  # Defaults to SQLite in-memory
```

### Option 2: SQLite File (Development/Testing)

```python
db = kailash.DataFlow("sqlite:///app.db")
```

### Option 3: PostgreSQL or MySQL (Production)

```python
# PostgreSQL (recommended for production)
db = kailash.DataFlow("postgresql://user:password@localhost:5432/database")

# MySQL (web hosting, existing infrastructure)
db = kailash.DataFlow("mysql://user:password@localhost:3306/database")

# Special characters in passwords supported
db = kailash.DataFlow("postgresql://admin:MySecret#123$@localhost/db")
```

### Option 4: Environment Variable (Recommended)

```bash
# Set environment variable
export DATABASE_URL="postgresql://user:pass@localhost/db"
```

```python
# DataFlow reads automatically
db = kailash.DataFlow()
```

## MongoDB-Style Queries

DataFlow uses MongoDB query syntax that works across all SQL databases (PostgreSQL, MySQL, SQLite):

```python
builder.add_node("UserListNode", "search", {
    "filter": {
        "age": {"$gt": 18, "$lt": 65},           # age BETWEEN 18 AND 65
        "name": {"$regex": "^John"},              # name LIKE 'John%'
        "department": {"$in": ["eng", "sales"]},  # department IN (...)
        "status": {"$ne": "inactive"}             # status != 'inactive'
    },
    "order_by": ["-created_at"],  # Sort descending
    "limit": 10,
    "offset": 0
})
```

## Common Use Cases

- **CRUD Applications**: Automatic node generation for create/read/update/delete
- **Data Import**: Bulk operations for high-speed data loading (10k+ records/sec)
- **SaaS Platforms**: Built-in multi-tenancy and tenant isolation
- **Analytics**: Complex queries with MongoDB-style syntax
- **Existing Databases**: Connect safely with `auto_migrate=False`

## Working with Existing Databases

### Safe Connection Mode

```python
# Connect to existing database WITHOUT modifying schema
db = kailash.DataFlow(
    "postgresql://user:pass@localhost/existing_db",
    auto_migrate=False,          # Don't create/modify tables
)

# Discover existing tables
schema = db.discover_schema(use_real_inspection=True)
print(f"Found tables: {list(schema.keys())}")

# Register existing tables as models (no @db.model needed)
result = db.register_schema_as_models(tables=['users', 'orders'])

# Use generated nodes immediately
builder = kailash.WorkflowBuilder()
user_nodes = result['generated_nodes']['users']

builder.add_node(user_nodes['list'], "get_users", {
    "filter": {"active": True},
    "limit": 10
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Mistakes

### ❌ Mistake 1: Direct Model Instantiation

```python
# Wrong - models are NOT instantiable
user = User(name="John")  # ERROR!
```

### ✅ Fix: Use Generated Nodes

```python
# Correct - use workflow nodes
builder.add_node("UserCreateNode", "create", {
    "name": "John",
    "email": "john@example.com"
})
```

### ❌ Mistake 2: Wrong Template Syntax

```python
# Wrong - DataFlow uses ${} syntax in connections, not {{}
}
builder.add_node("OrderCreateNode", "create", {
    "customer_id": "{{customer.id}}"  # ERROR!
})
```

### ✅ Fix: Use Connections

```python
# Correct - use explicit connections
builder.connect("customer", "id", "create_order", "customer_id")
```

### ❌ Mistake 3: String Datetime Values

```python
# Wrong - datetime as string
builder.add_node("OrderCreateNode", "create", {
    "due_date": datetime.now().isoformat()  # ERROR!
})
```

### ✅ Fix: Native Datetime Objects

```python
# Correct - use native datetime
from datetime import datetime

builder.add_node("OrderCreateNode", "create", {
    "due_date": datetime.now()  # ✓
})
```

## Async Usage

### Basic Pattern

```python
import kailash

reg = kailash.NodeRegistry()

# Initialize DataFlow
df = kailash.DataFlow("postgresql://localhost:5432/mydb")

@df.model
class User:
    id: str
    name: str
    email: str

# Execute with kailash.Runtime
async def create_user():
    builder = kailash.WorkflowBuilder()
    builder.add_node("UserCreateNode", "create", {
        "id": "user-123",
        "name": "Alice",
        "email": "alice@example.com"
    })

    # Execute with kailash.Runtime
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["create"]["id"]
```

### Nexus Integration

`auto_migrate=True` (default) works correctly in Docker environments. DataFlow handles table creation internally without event loop conflicts.

```python
import kailash
from kailash.nexus import NexusApp
import uuid

reg = kailash.NodeRegistry()

# auto_migrate=True (default) works in Docker
df = kailash.DataFlow("postgresql://localhost:5432/mydb")

@df.model
class User:
    id: str
    name: str
    email: str

app = NexusApp()

@app.handler()
def create_user(name: str, email: str):
    builder = kailash.WorkflowBuilder()
    builder.add_node("UserCreateNode", "create", {
        "id": f"user-{uuid.uuid4()}",
        "name": name,
        "email": email
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["create"]
```

## DataFlow + Nexus Integration

**CRITICAL**: Use these settings to avoid blocking/slow startup:

```python
import kailash

reg = kailash.NodeRegistry()

# Step 1: Create NexusApp
from kailash.nexus import NexusApp

app = NexusApp()

# Step 2: Create DataFlow (auto_migrate=True works in Docker)
df = kailash.DataFlow(
    "postgresql://user:pass@localhost/db",
    auto_migrate=True,  # DEFAULT - works in Docker
)

# Step 3: Define models
@df.model
class User:
    name: str
    email: str

# Step 4: Register workflows manually
builder = kailash.WorkflowBuilder()
builder.add_node("UserCreateNode", "create", {"name": "Alice", "email": "alice@example.com"})
app.register("create_user", builder.build(reg))

# Fast startup: <2 seconds!
app.start()
```

## Related Patterns

- **Model definition**: [`dataflow-models`](dataflow-models.md)
- **Query patterns**: [`dataflow-queries`](dataflow-queries.md)
- **Bulk operations**: [`dataflow-bulk-ops`](dataflow-bulk-ops.md)
- **Nexus integration**: See Nexus skills in `03-nexus/`
- **Migration guide**: [`dataflow-migration-quick`](dataflow-migration-quick.md)

## When to Escalate to Subagent

Use `dataflow-specialist` subagent when:

- Implementing enterprise migration system (8 components)
- Setting up multi-tenant architecture
- Configuring distributed transactions
- Production deployment and optimization
- Complex foreign key relationships
- Performance tuning and caching strategies

Use `nexus-specialist` when:

- Integrating DataFlow with Nexus platform
- Troubleshooting blocking/slow startup issues
- Multi-channel deployment (API/CLI/MCP)

## Quick Tips

- 💡 **Zero-config first**: Start with `DataFlow()` - no configuration needed
- 💡 **11 nodes per model**: Remember - Create, Read, Update, Delete, List, Upsert, Count, Bulk(Create/Update/Delete/Upsert)
- 💡 **MongoDB queries**: Use familiar syntax that works across all SQL databases (PostgreSQL/MySQL/SQLite)
- 💡 **String IDs**: Fully supported - no forced integer conversion
- 💡 **Existing databases**: Use `auto_migrate=False` for safety
- 💡 **Nexus integration**: Use `NexusApp()` and register workflows manually
- 💡 **Clean logs**: Use `LoggingConfig.production()` for production, `LoggingConfig.development()` for debugging

<!-- Trigger Keywords: DataFlow tutorial, DataFlow quick start, @db.model, DataFlow setup, database framework, how to use DataFlow, DataFlow installation, DataFlow guide, zero-config database, automatic node generation, DataFlow example, start with DataFlow -->
