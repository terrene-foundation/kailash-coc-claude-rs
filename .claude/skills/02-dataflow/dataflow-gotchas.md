---
name: dataflow-gotchas
description: "Common DataFlow mistakes and misunderstandings. Use when DataFlow issues, gotchas, common mistakes DataFlow, troubleshooting DataFlow, or DataFlow problems."
---

# DataFlow Common Gotchas

Common misunderstandings and mistakes when using DataFlow, with solutions.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`dataflow-models`](#), [`dataflow-crud-operations`](#), [`dataflow-nexus-integration`](#)
> Related Subagents: `dataflow-specialist` (complex troubleshooting)

## Quick Reference

- **✅ Docker**: `auto_migrate=True` works! DataFlow handles DDL internally
- **⚠️ In-Memory SQLite**: `:memory:` databases use lazy creation (sync DDL skipped)
- **🚨 Sync methods in async context (DF-501)**: Use `create_tables_async()` if needed
- **🚨 Timestamp fields auto-stripped**: `created_at`/`updated_at` auto-removed with warning
- **🔇 Logging configuration**: Use `LoggingConfig` for clean logs - `db = kailash.DataFlow(..., log_config=LoggingConfig.production())`
- **soft_delete auto-filters**: Use `include_deleted=True` to see deleted records
- **NOT an ORM**: DataFlow is workflow-native, not like SQLAlchemy
- **Primary Key MUST be `id`**: NOT `user_id`, `model_id`, or anything else
- **CreateNode ≠ UpdateNode**: Different parameter patterns (flat vs nested)
- **Template Syntax**: DON'T use `${}` - conflicts with PostgreSQL
- **Connections**: Use connections, NOT template strings
- **Result Access**: ListNode → `records`, CountNode → `count`, ReadNode → record dict
- **Use Nexus for APIs**: Register workflows with `NexusApp` via `@app.handler()`

## Critical Gotchas

### 🚨 #1 MOST COMMON: Auto-Managed Timestamp Fields (DF-104)

**This WAS the #1 mistake - now auto-handled!**

#### Current Behavior: Auto-Strip with Warning

DataFlow now **automatically strips** `created_at` and `updated_at` fields and logs a warning:

```python
# This WORKS (with warning) - timestamps are auto-stripped
async def update(self, id: str, data: dict) -> dict:
    now = datetime.now(UTC).isoformat()
    data["updated_at"] = now  # ⚠️ Auto-stripped with warning

    builder.add_node("ModelUpdateNode", "update", {
        "filter": {"id": id},
        "fields": data  # ✅ Works! updated_at is auto-stripped
    })
```

**Warning Message**:

```
⚠️ AUTO-STRIPPED: Fields ['updated_at'] removed from update. DataFlow automatically
manages created_at/updated_at timestamps. Remove these fields from your code to
avoid this warning.
```

#### Best Practice (Avoid Warning)

Remove timestamp fields from your code entirely:

```python
# ✅ BEST PRACTICE - No timestamp management needed
async def update(self, id: str, data: dict) -> dict:
    # Don't set timestamps - DataFlow handles it
    builder.add_node("ModelUpdateNode", "update", {
        "filter": {"id": id},
        "fields": data  # DataFlow sets updated_at automatically
    })
```

#### Auto-Managed Fields

- `created_at` - Set automatically on record creation (CreateNode)
- `updated_at` - Set automatically on every modification (UpdateNode)

**Impact**: No DF-104 errors. Fields are auto-stripped with warning.

---

### 🚨 #2: Sync Methods in Async Context (DF-501) ⚠️ CRITICAL

**This error occurs when using DataFlow in pytest-asyncio or any async framework!**

```
RuntimeError: DF-501: Sync Method in Async Context

You called create_tables() from an async context (running event loop detected).
Use create_tables_async() instead.
```

#### The Problem

```python
# ❌ WRONG - Sync method in async context
async def startup():
    db.create_tables()  # RuntimeError: DF-501!

# ❌ WRONG - In pytest async fixture
@pytest.fixture
async def db_fixture():
    db = kailash.DataFlow(":memory:")
    db.create_tables()  # RuntimeError: DF-501!
    yield db
    db.close()  # Also fails!
```

#### The Fix

```python
# ✅ CORRECT - Use async methods in async context
async def startup():
    await db.create_tables_async()

# ✅ CORRECT - pytest async fixtures
@pytest.fixture
async def db_fixture():
    db = kailash.DataFlow(":memory:")
    @db.model
    class User:
        id: str
        name: str
    await db.create_tables_async()
    yield db
    await db.close_async()
```

#### Async Methods Available

| Sync Method                  | Async Method                       | When to Use                      |
| ---------------------------- | ---------------------------------- | -------------------------------- |
| `create_tables()`            | `create_tables_async()`            | Table creation in async contexts |
| `close()`                    | `close_async()`                    | Connection cleanup               |
| `_ensure_migration_tables()` | `_ensure_migration_tables_async()` | Migration system                 |

#### Sync Context Still Works

```python
# ✅ Sync methods work in sync context (CLI, scripts)
if __name__ == "__main__":
    db = kailash.DataFlow(":memory:")
    db.create_tables()  # Works in sync context
    db.close()
```

**Impact**: Immediate `RuntimeError` with clear message. Use async methods in async contexts.

---

### ✅ #2.5: Docker Deployment

**`auto_migrate=True` works in Docker!**

DataFlow handles table creation internally using synchronous DDL, completely bypassing event loop boundary issues.

#### Zero-Config Docker Pattern

```python
import kailash
from kailash.nexus import NexusApp

# Zero-config: auto_migrate=True (default) now works!
df = kailash.DataFlow("postgresql://...")

@df.model  # Tables created immediately via sync DDL
class User:
    id: str
    name: str

reg = kailash.NodeRegistry()
app = NexusApp()

@app.handler()
def create_user(name: str, email: str):
    builder = kailash.WorkflowBuilder()
    builder.add_node("UserCreateNode", "create", {"name": name, "email": email})
    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))
```

#### How It Works

- Table creation is handled synchronously by the Rust engine - no asyncio conflicts
- Tables are created at model registration time
- CRUD operations continue using async execution
- No event loop conflicts because DDL and CRUD use separate execution paths

#### ⚠️ In-Memory SQLite Limitation

In-memory databases (`:memory:`) **cannot** use sync DDL because table creation creates a separate connection, which for `:memory:` means a different database. They automatically fall back to lazy table creation:

```python
# In-memory SQLite: Uses lazy creation (still works, just deferred)
db = kailash.DataFlow(":memory:", auto_migrate=True)  # Tables created on first access
```

#### When to Use Each Pattern

| Context                 | Pattern                       | Notes                      |
| ----------------------- | ----------------------------- | -------------------------- |
| **Docker/Nexus**        | `auto_migrate=True` (default) | ✅ Works                   |
| **In-Memory SQLite**    | `auto_migrate=True`           | Uses lazy creation (works) |
| **CLI Scripts**         | `auto_migrate=True` (default) | Works                      |
| **pytest (sync/async)** | `auto_migrate=True` (default) | Works via sync DDL         |

#### Alternative: Manual Control

```python
# For explicit control over table creation timing
db = kailash.DataFlow("postgresql://...", auto_migrate=False)

# Explicitly create tables when ready
db.create_tables()
```

---

#### The Bug

Python treats empty dict `{}` as falsy, causing incorrect behavior in filter operations.

#### Symptoms (Before Fix)

```python
# This would return ALL records instead of filtered records in older versions
builder.add_node("UserListNode", "query", {
    "filter": {"status": {"$ne": "inactive"}}
})
# Expected: 2 users (active only)
# Actual (older versions): 3 users (ALL records)
```

#### The Fix

```bash
pip install kailash-enterprise
```

✅ All filter operators now work correctly:

- $ne (not equal)
- $nin (not in)
- $in (in)
- $not (logical NOT)
- All comparison operators ($gt, $lt, $gte, $lte)

#### Prevention Pattern

When checking if a parameter was provided:

```python
# ❌ WRONG - treats empty dict as "not provided"
if filter_dict:
    process_filter()

# ✅ CORRECT - checks if key exists
if "filter" in kwargs:
    process_filter()
```

#### Root Cause

Two locations had truthiness bugs:

1. ListNode at nodes.py:1810 - `if filter_dict:` → `if "filter" in kwargs:`
2. BulkDeleteNode at bulk_delete.py:177 - `not filter_conditions` → `"filter" not in validated_inputs`

#### Impact

**High**: All query filtering was affected in older versions. Ensure you're using the latest DataFlow version.

---

### 0.1. Primary Key MUST Be Named 'id' ⚠️ HIGH IMPACT

```python
# WRONG - Custom primary key names FAIL
@db.model
class User:
    user_id: str  # FAILS - DataFlow requires 'id'
    name: str

# WRONG - Other variations also fail
@db.model
class Agent:
    agent_id: str  # FAILS
    model_id: str  # FAILS
```

**Why**: DataFlow's auto-generated nodes expect `id` as the primary key field name.

**Fix: Use 'id' Exactly**

```python
# CORRECT - Primary key MUST be 'id'
@db.model
class User:
    id: str  # ✅ REQUIRED - must be exactly 'id'
    name: str
```

**Impact**: 10-20 minutes debugging if violated. Use `id` for all models, always.

### 0.1. CreateNode vs UpdateNode Pattern Difference ⚠️ CRITICAL

```python
# WRONG - Applying CreateNode pattern to UpdateNode
builder.add_node("UserUpdateNode", "update", {
    "db_instance": "my_db",
    "model_name": "User",
    "id": "user_001",  # ❌ Individual fields don't work for UpdateNode
    "name": "Alice",
    "status": "active"
})
# Error: "column user_id does not exist" (misleading!)
```

**Why**: CreateNode and UpdateNode use FUNDAMENTALLY DIFFERENT patterns:

- **CreateNode**: Flat individual fields at top level
- **UpdateNode**: Nested `filter` + `fields` dicts

**Fix: Use Correct Pattern**

```python
# CreateNode: FLAT individual fields
builder.add_node("UserCreateNode", "create", {
    "db_instance": "my_db",
    "model_name": "User",
    "id": "user_001",  # ✅ Individual fields
    "name": "Alice",
    "email": "alice@example.com"
})

# UpdateNode: NESTED filter + fields
builder.add_node("UserUpdateNode", "update", {
    "db_instance": "my_db",
    "model_name": "User",
    "filter": {"id": "user_001"},  # ✅ Which records
    "fields": {"name": "Alice Updated"}  # ✅ What to change
    # ⚠️ Do NOT include created_at or updated_at - auto-managed!
})
```

**Impact**: 1-2 hours debugging if violated. Different patterns for different operations.

### 0.2. Auto-Managed Timestamp Fields ⚠️

```python
# WRONG - Including auto-managed fields
builder.add_node("UserUpdateNode", "update", {
    "filter": {"id": "user_001"},
    "fields": {
        "name": "Alice",
        "updated_at": datetime.now()  # ❌ FAILS - auto-managed
    }
})
# Error: "multiple assignments to same column 'updated_at'"
```

**Why**: DataFlow automatically manages `created_at` and `updated_at` fields.

**Fix: Omit Auto-Managed Fields**

```python
# CORRECT - Omit auto-managed fields
builder.add_node("UserUpdateNode", "update", {
    "filter": {"id": "user_001"},
    "fields": {
        "name": "Alice"  # ✅ Only your fields
        # created_at, updated_at auto-managed by DataFlow
    }
})
```

**Impact**: 5-10 minutes debugging. Never manually set `created_at` or `updated_at`.

### 1. DataFlow is NOT an ORM

```python
# WRONG - Models are not instantiable
import kailash
df = kailash.DataFlow()

@df.model
class User:
    name: str

user = User(name="John")  # FAILS - not supported by design
user.save()  # FAILS - no save() method
```

**Why**: DataFlow is workflow-native, not object-oriented. Models are schemas, not classes.

**Fix: Use Workflow Nodes**

```python
builder = kailash.WorkflowBuilder()
builder.add_node("UserCreateNode", "create", {
    "name": "John"  # Correct pattern
})
```

### 2. Template Syntax Conflicts with PostgreSQL

```python
# WRONG - ${} conflicts with PostgreSQL
builder.add_node("OrderCreateNode", "create", {
    "customer_id": "${create_customer.id}"  # FAILS with PostgreSQL
})
```

**Fix: Use Workflow Connections**

```python
builder.add_node("OrderCreateNode", "create", {
    "total": 100.0
})
builder.connect("create_customer", "id", "create", "customer_id")
```

### 3. Nexus Integration Blocks Startup

```python
# WRONG - dataflow_config does NOT exist in Nexus!
db = kailash.DataFlow()
app = NexusApp(dataflow_config={"integration": db})  # THIS WILL FAIL
```

**Fix: Use NexusApp and manual workflow registration**

```python
# auto_migrate=True works in Docker
import kailash
from kailash.nexus import NexusApp, NexusConfig

df = kailash.DataFlow(
    "postgresql://...",
    auto_migrate=True,  # Default - works in all environments
)

# Create NexusApp and register workflows manually
app = NexusApp(NexusConfig(port=8000))

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("ProductCreateNode", "create", {"name": "${input.name}"})
app.register("create_product", builder.build(reg))
```

### 4. Wrong Result Access Pattern ⚠️

Each node type returns results under specific keys:

| Node Type      | Result Key                    | Example                                      |
| -------------- | ----------------------------- | -------------------------------------------- |
| **ListNode**   | `records`                     | `results["list"]["records"]` → list of dicts |
| **CountNode**  | `count`                       | `results["count"]["count"]` → integer        |
| **ReadNode**   | (direct)                      | `results["read"]` → dict or None             |
| **CreateNode** | (direct)                      | `results["create"]` → created record         |
| **UpdateNode** | (direct)                      | `results["update"]` → updated record         |
| **UpsertNode** | `record`, `created`, `action` | `results["upsert"]["record"]` → record       |

```python
# WRONG - using generic "result" key
result = rt.execute(builder.build(reg))
records = result["results"]["list"]["result"]  # ❌ FAILS - wrong key

# CORRECT - use proper key for node type
records = result["results"]["list"]["records"]  # ✅ ListNode returns "records"
count = result["results"]["count"]["count"]  # ✅ CountNode returns "count"
record = result["results"]["read"]  # ✅ ReadNode returns dict directly
```

### 4.1 soft_delete Auto-Filters Queries

**DataFlow auto-filters soft_delete models by default.**

```python
@db.model
class Patient:
    id: str
    deleted_at: Optional[str] = None
    __dataflow__ = {"soft_delete": True}

# ✅ Auto-filters by default - excludes soft-deleted records
builder.add_node("PatientListNode", "list", {"filter": {}})
# Returns ONLY non-deleted patients (deleted_at IS NULL)

# ✅ To include soft-deleted records, use include_deleted=True
builder.add_node("PatientListNode", "list_all", {
    "filter": {},
    "include_deleted": True  # Returns ALL patients including deleted
})

# Also works with ReadNode and CountNode
builder.add_node("PatientReadNode", "read", {
    "id": "patient-123",
    "include_deleted": True  # Return even if soft-deleted
})

builder.add_node("PatientCountNode", "count_active", {
    "filter": {"status": "active"},
    # Automatically excludes soft-deleted (no need to add deleted_at filter)
})
```

**Behavior by Node Type**:
| Node | Default | include_deleted=True |
|------|---------|---------------------|
| ListNode | Excludes deleted | Includes all |
| CountNode | Counts non-deleted | Counts all |
| ReadNode | Returns 404 if deleted | Returns record |

**Note**: This matches industry standards (Django, Rails, Laravel) where soft_delete auto-filters by default.

### 4.2 Sort/Order Parameters (Both Work) ⚠️

DataFlow supports TWO sorting formats:

```python
# Format 1: order_by with prefix for direction
builder.add_node("UserListNode", "list", {
    "order_by": ["-created_at", "name"]  # - prefix = DESC
})

# Format 2: sort with explicit structure
builder.add_node("UserListNode", "list", {
    "sort": [
        {"field": "created_at", "order": "desc"},
        {"field": "name", "order": "asc"}
    ]
})

# Format 3: order_by with dict structure
builder.add_node("UserListNode", "list", {
    "order_by": [{"created_at": -1}, {"name": 1}]  # -1 = DESC, 1 = ASC
})
```

**All formats work.** Choose based on preference.

### 5. String IDs (Fixed - Historical Issue)

```python
# HISTORICAL ISSUE (now fixed)
@db.model
class Session:
    id: str  # String IDs were converted to int in older versions

builder.add_node("SessionReadNode", "read", {
    "id": "session-uuid-string"  # Failed in older versions
})
```

**Fix: Ensure you have the latest kailash-enterprise version**

```python
# Fixed - string IDs now fully supported
@db.model
class Session:
    id: str  # Fully supported

builder.add_node("SessionReadNode", "read", {
    "id": "session-uuid-string"  # Works perfectly
})
```

### 6. VARCHAR(255) Content Limits (Fixed - Historical Issue)

```python
# HISTORICAL ISSUE (now fixed)
@db.model
class Article:
    content: str  # Was VARCHAR(255) in older versions - truncated!

# Long content failed or got truncated
```

**Fix: Automatic in Current Version**

```python
# Fixed - now TEXT type
@db.model
class Article:
    content: str  # Unlimited content - TEXT type
```

### 7. DateTime Serialization (Fixed - Historical Issue)

```python
# HISTORICAL ISSUE (now fixed)
from datetime import datetime

builder.add_node("OrderCreateNode", "create", {
    "due_date": datetime.now().isoformat()  # String failed validation in older versions
})
```

**Fix: Use Native datetime Objects**

```python
from datetime import datetime

builder.add_node("OrderCreateNode", "create", {
    "due_date": datetime.now()  # Native datetime works
})
```

### 8. Multi-Instance Context Isolation (Fixed - Historical Issue)

```python
# HISTORICAL ISSUE (now fixed)
db_dev = kailash.DataFlow("sqlite:///dev.db")
db_prod = kailash.DataFlow("postgresql://...")

@db_dev.model
class DevModel:
    name: str

# Model leaked to db_prod instance in older versions!
```

**Fix: Fixed (Proper Context Isolation)**

```python
# Fixed - proper isolation now enforced
db_dev = kailash.DataFlow("sqlite:///dev.db")
db_prod = kailash.DataFlow("postgresql://...")

@db_dev.model
class DevModel:
    name: str
# Only in db_dev, not in db_prod
```

## Documentation References

### Primary Sources

- **DataFlow Specialist**: [`.claude/skills/dataflow-specialist.md`](../../dataflow-specialist.md#L28-L72)

## Related Patterns

- **For models**: See [`dataflow-models`](#)
- **For result access**: See [`dataflow-result-access`](#)
- **For Nexus integration**: See [`dataflow-nexus-integration`](#)
- **For connections**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use `dataflow-specialist` when:

- Complex workflow debugging
- Performance optimization issues
- Migration failures
- Multi-database problems

## Quick Tips

- DataFlow is workflow-native, NOT an ORM
- Use connections, NOT `${}` template syntax
- Enable critical config for Nexus integration
- Access results via `results["node"]["result"]`
- Historical fixes: string IDs, TEXT type, datetime, multi-instance isolation

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow issues, gotchas, common mistakes DataFlow, troubleshooting DataFlow, DataFlow problems, DataFlow errors, not working, DataFlow bugs -->
