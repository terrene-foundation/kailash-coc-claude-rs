---
name: dataflow-crud-operations
description: "Use 11 auto-generated DataFlow nodes for CRUD operations. Use when DataFlow CRUD, generated nodes, CreateUser, ReadUser, create read update delete, basic operations, or single record operations."
---

# DataFlow CRUD Operations

Use the 11 automatically generated workflow nodes for Create, Read, Update, Delete, List, Upsert, and Count operations on DataFlow models.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`dataflow-models`](#), [`dataflow-queries`](#), [`dataflow-bulk-operations`](#), [`workflow-quickstart`](#)
> Related Subagents: `dataflow-specialist` (complex operations, troubleshooting)

## Quick Reference

- **11 Generated Nodes**: Create, Read, Update, Delete, List, Upsert, Count, BulkCreate, BulkUpdate, BulkDelete, BulkUpsert
- **Naming Pattern**: `{Operation}{Model}` (e.g., `CreateUser`)
- **Performance**: <1ms for single operations
- **String IDs**: Fully supported
- **Datetime Auto-Conversion**: ISO 8601 strings → datetime objects

## ⚠️ CRITICAL WARNING: CreateNode vs UpdateNode Patterns

**CreateNode and UpdateNode use FUNDAMENTALLY DIFFERENT parameter structures.** This is the #1 cause of 4+ hour debugging sessions for new DataFlow developers.

### Pattern Comparison

| Node Type             | Pattern                    | Example                                                          |
| --------------------- | -------------------------- | ---------------------------------------------------------------- |
| **CreateNode**        | **FLAT** individual fields | `{"name": "Alice", "email": "alice@example.com"}`                |
| **UpdateNode**        | **NESTED** filter + fields | `{"filter": {"id": 1}, "fields": {"name": "Alice Updated"}}`     |
| **BulkUpdate{Model}** | **NESTED** filter + fields | `{"filter": {"active": True}, "fields": {"status": "verified"}}` |

### CreateNode: FLAT Individual Fields

```python
# ✅ CORRECT - All fields at top level
builder.add_node("CreateUser", "create", {
    "name": "Alice",            # ← Individual field 1
    "email": "alice@example.com", # ← Individual field 2
    "age": 30                   # ← Individual field 3
})

# ❌ WRONG - Do NOT nest under 'data'
builder.add_node("CreateUser", "create", {
    "data": {  # ← This creates a FIELD named "data"!
        "name": "Alice",
        "email": "alice@example.com"
    }
})
# Error: "missing required inputs: name, email, age"
```

### UpdateNode: NESTED filter + fields

```python
# ✅ CORRECT - Nested structure with filter + fields
builder.add_node("UpdateUser", "update", {
    "filter": {"id": 1},  # ← Which records to update
    "fields": {            # ← What to change
        "name": "Alice Updated",
        "age": 31
    }
})

# ❌ WRONG - Do NOT use flat fields like CreateNode
builder.add_node("UpdateUser", "update", {
    "id": 1,          # ← Wrong! This is CreateNode pattern
    "name": "Alice"
})
# Error: "UpdateNode requires 'filter' and 'fields' parameters"
```

### Why Different?

- **CreateNode**: You're providing ALL data for a NEW record
  → Flat structure makes sense (like object construction)

- **UpdateNode**: You need to specify:
  1. **WHICH** records to update (`filter`)
  2. **WHAT** to change (`fields`)
     → Nested structure separates concerns

### Auto-Managed Fields

⚠️ **IMPORTANT**: DataFlow automatically manages these fields:

- `created_at` - Set automatically on create
- `updated_at` - Updated automatically on update

**Do NOT include them in your parameters!**

```python
# ❌ WRONG
fields = {
    "name": "Alice",
    "updated_at": datetime.now()  # ← Remove this!
}

# ✅ CORRECT
fields = {
    "name": "Alice"
    # updated_at is set automatically
}
```

## Core Pattern

```python
import os
import kailash
from kailash.dataflow import db

reg = kailash.NodeRegistry()

df = kailash.DataFlow(os.environ["DATABASE_URL"])

@db.model
class User:
    name: str
    email: str
    active: bool = True

# Automatically generates 11 nodes:
# CRUD: CreateUser, ReadUser, UpdateUser, DeleteUser, ListUser, UpsertUser, CountUser
# Bulk: BulkCreateUser, BulkUpdateUser, BulkDeleteUser, BulkUpsertUser

builder = kailash.WorkflowBuilder()

# CREATE - Single record
builder.add_node("CreateUser", "create_user", {
    "name": "Alice",
    "email": "alice@example.com"
})

# READ - Single record by ID
builder.add_node("ReadUser", "read_user", {
    "filter": {"id": 1}
})

# UPDATE - Single record
builder.add_node("UpdateUser", "update_user", {
    "filter": {"id": 1},
    "fields": {"active": False}
})

# DELETE - Single record
builder.add_node("DeleteUser", "delete_user", {
    "filter": {"id": 1}
})

# LIST - Query with filters
builder.add_node("ListUser", "list_users", {
    "filter": {"active": True},
    "limit": 10
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **User Registration**: Create user account with validation
- **Profile Lookup**: Read user by ID or email
- **Account Updates**: Update user profile fields
- **Account Deletion**: Soft or hard delete users
- **User Search**: List users with filters and pagination
- **Timestamp Handling**: Seamless datetime integration with EmbeddedPythonNode

## Generated Nodes Reference

### Basic CRUD Nodes (5)

| Node            | Purpose              | Performance | Parameters                    |
| --------------- | -------------------- | ----------- | ----------------------------- |
| `Create{Model}` | Insert single record | <1ms        | All model fields              |
| `Read{Model}`   | Select by ID         | <1ms        | `id` or `conditions`          |
| `Update{Model}` | Update single record | <1ms        | `id`, `updates`               |
| `Delete{Model}` | Delete single record | <1ms        | `id`, `soft_delete`           |
| `List{Model}`   | Query with filters   | <10ms       | `filter`, `limit`, `order_by` |

### Bulk Operation Nodes (4)

| Node                | Purpose                      | Performance | Parameters                    |
| ------------------- | ---------------------------- | ----------- | ----------------------------- |
| `BulkCreate{Model}` | Insert multiple records      | 1000+/sec   | `data`, `batch_size`          |
| `BulkUpdate{Model}` | Update multiple records      | 5000+/sec   | `filter`, `fields`            |
| `BulkDelete{Model}` | Delete multiple records      | 10000+/sec  | `filter`, `soft_delete`       |
| `BulkUpsert{Model}` | Insert or update on conflict | 3000+/sec   | `data`, `conflict_resolution` |

## Key Parameters / Options

### CreateNode Parameters

```python
builder.add_node("CreateUser", "create", {
    # Required: Model fields
    "name": "John Doe",
    "email": "john@example.com",

    # Optional: Control behavior
    "return_id": True,  # Return created ID (default: True)
    "validate": True    # Validate before insert (default: True)
})
```

### ReadNode Parameters

```python
# Option 1: By ID (recommended)
builder.add_node("ReadUser", "read", {
    "filter": {"id": 123}
})

# Option 2: By other conditions
builder.add_node("ReadUser", "read", {
    "filter": {"email": "john@example.com"},
    "raise_on_not_found": True  # Error if not found
})

# Option 3: String IDs
builder.add_node("ReadSession", "read_session", {
    "filter": {"id": "session-uuid-string"}  # String IDs preserved
})
```

### UpdateNode Parameters

```python
builder.add_node("UpdateUser", "update", {
    # Target record(s) - REQUIRED
    "filter": {"id": 123},
    # OR multiple conditions
    # "filter": {"email": "john@example.com", "active": True},

    # Fields to update - REQUIRED
    "fields": {
        "active": False
        # NOTE: Do NOT include updated_at - it's automatic!
    },

    # Options
    "return_updated": True,  # Return updated record
    "validate": True         # Validate before update
})
```

### DeleteNode Parameters

```python
builder.add_node("DeleteUser", "delete", {
    # Target record - REQUIRED
    "filter": {"id": 123},

    # Soft delete (preserve data)
    "soft_delete": True,  # Sets deleted_at, doesn't remove

    # Hard delete (permanent)
    "hard_delete": False  # Permanently removes
})
```

### ListNode Parameters

```python
builder.add_node("ListUser", "list", {
    # Filters (MongoDB-style)
    "filter": {
        "active": True,
        "age": {"$gt": 18}
    },

    # Sorting
    "order_by": ["-created_at"],  # Descending by created_at

    # Pagination
    "limit": 10,
    "offset": 0,

    # Field selection
    "fields": ["id", "name", "email"],  # Only return these fields

    # Count only
    "count_only": False  # Set True to just count matches
})
```

## Common Mistakes

### Mistake 1: Wrapping CreateNode Fields in 'data'

```python
# ❌ WRONG - 'data' is treated as a field name
builder.add_node("CreateUser", "create", {
    "data": {  # This creates a FIELD named "data"
        "name": "Alice",
        "email": "alice@example.com"
    }
})
# Error: "missing required inputs: name, email"
```

**Fix: Use Flat Fields**

```python
# ✅ CORRECT - Fields at top level
builder.add_node("CreateUser", "create", {
    "name": "Alice",
    "email": "alice@example.com"
})
```

### Mistake 2: Using CreateNode Pattern on UpdateNode

```python
# ❌ WRONG - Flat fields on UpdateNode
builder.add_node("UpdateUser", "update", {
    "id": 1,          # This is CreateNode pattern!
    "name": "Alice"
})
# Error: "UpdateNode requires 'filter' and 'fields' parameters"
```

**Fix: Use Nested filter + fields**

```python
# ✅ CORRECT - Nested structure for UpdateNode
builder.add_node("UpdateUser", "update", {
    "filter": {"id": 1},
    "fields": {"name": "Alice"}
})
```

### Mistake 3: Including Auto-Managed Fields

```python
# ❌ WRONG - Manually setting updated_at
builder.add_node("UpdateUser", "update", {
    "filter": {"id": 1},
    "fields": {
        "name": "Alice",
        "updated_at": datetime.now()  # Don't do this!
    }
})
# Error: "multiple assignments to same column 'updated_at'"
```

**Fix: Remove Auto-Managed Fields**

```python
# ✅ CORRECT - Let DataFlow handle updated_at
builder.add_node("UpdateUser", "update", {
    "filter": {"id": 1},
    "fields": {
        "name": "Alice"
        # updated_at is automatic
    }
})
```

### Mistake 4: Missing .build() Call

```python
# ❌ WRONG - missing .build()
builder.add_node("CreateUser", "create", {...})
result = rt.execute(workflow)  # ERROR
```

**Fix: Always Call .build()**

```python
# ✅ CORRECT
builder.add_node("CreateUser", "create", {...})
result = rt.execute(builder.build(reg))
```

### Mistake 5: Using Template Syntax for Parameters

```python
# ❌ WRONG - ${} conflicts with PostgreSQL
builder.add_node("CreateOrder", "create", {
    "customer_id": "${create_customer.id}"  # FAILS
})
```

**Fix: Use Workflow Connections**

```python
# ✅ CORRECT - use connections for dynamic values
builder.add_node("CreateOrder", "create", {
    "total": 100.0
})
builder.connect("create_customer", "id", "create", "customer_id")
```

## Automatic Datetime Conversion

DataFlow automatically converts ISO 8601 datetime strings to Python datetime objects for all datetime fields. This enables seamless integration with EmbeddedPythonNode and external data sources.

### Supported ISO 8601 Formats

- **Basic**: `2024-01-01T12:00:00`
- **With microseconds**: `2024-01-01T12:00:00.123456`
- **With timezone Z**: `2024-01-01T12:00:00Z`
- **With timezone offset**: `2024-01-01T12:00:00+05:30`

### Example: EmbeddedPythonNode → CreateNode

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# EmbeddedPythonNode generates ISO 8601 string
builder.add_node("EmbeddedPythonNode", "generate_timestamp", {
    "code": """
from datetime import datetime
result = {"registration_date": datetime.now().isoformat()}
    """,
    "output_vars": ["result"]
})

# CreateNode automatically converts to datetime
builder.add_node("CreateUser", "create", {
    "name": "Alice",
    "email": "alice@example.com",
    "registration_date": "{{generate_timestamp.registration_date}}"  # ISO string → datetime
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Database stores as proper datetime type
created_user = result["results"]["create"]["record"]
print(f"User registered at: {created_user['registration_date']}")
```

### Example: UpdateNode with Datetime

```python
# EmbeddedPythonNode generates timestamp
builder.add_node("EmbeddedPythonNode", "generate_last_login", {
    "code": """
from datetime import datetime
result = {"last_login": datetime.now().isoformat()}
    """,
    "output_vars": ["result"]
})

# UpdateNode automatically converts
builder.add_node("UpdateUser", "update_last_login", {
    "filter": {"id": 1},
    "fields": {
        "last_login": "{{generate_last_login.last_login}}"  # ISO string → datetime
    }
})
```

### Example: BulkCreate{Model} with Datetime

```python
# Prepare bulk data with ISO strings
builder.add_node("EmbeddedPythonNode", "generate_bulk_data", {
    "code": """
from datetime import datetime, timedelta
import json

users = []
for i in range(100):
    users.append({
        "name": f"User {i}",
        "email": f"user{i}@example.com",
        "joined_at": (datetime.now() - timedelta(days=i)).isoformat()
    })

result = {"users": json.dumps(users)}
    """,
    "output_vars": ["result"]
})

# BulkCreate{Model} automatically converts all datetime strings
builder.add_node("BulkCreateUser", "bulk_import", {
    "data": "{{generate_bulk_data.users}}"  # All ISO strings → datetime
})
```

### Backward Compatibility

Existing code passing datetime objects continues to work without changes:

```python
from datetime import datetime

# Still works - datetime objects accepted
builder.add_node("CreateUser", "create", {
    "name": "Bob",
    "email": "bob@example.com",
    "registration_date": datetime.now()  # Direct datetime object
})

# Also works - ISO strings now auto-converted
builder.add_node("CreateUser", "create_from_string", {
    "name": "Charlie",
    "email": "charlie@example.com",
    "registration_date": "2024-01-15T10:30:00"  # ISO string → datetime
})
```

### Applies To All CRUD Nodes

Datetime auto-conversion works on:

- ✅ `CreateUser` - Single record creation
- ✅ `UpdateUser` - Single record updates
- ✅ `BulkCreateUser` - Bulk record creation
- ✅ `BulkUpdateUser` - Bulk record updates
- ✅ `BulkUpsertUser` - Bulk upsert operations

### Common Use Cases

**External API Integration:**

```python
# API returns ISO 8601 strings
builder.add_node("EmbeddedPythonNode", "fetch_api_data", {
    "code": """
import requests
response = requests.get("https://api.example.com/users")
result = response.json()  # Contains ISO datetime strings
    """,
    "output_vars": ["result"]
})

# Automatically converted to datetime
builder.add_node("BulkCreateUser", "import_api_users", {
    "data": "{{fetch_api_data.users}}"
})
```

**CSV Import:**

```python
# CSV contains date strings
builder.add_node("EmbeddedPythonNode", "parse_csv", {
    "code": """
import csv
from datetime import datetime

users = []
with open('users.csv') as f:
    for row in csv.DictReader(f):
        users.append({
            "name": row["name"],
            "email": row["email"],
            "registered": datetime.fromisoformat(row["registered_date"]).isoformat(),
            "output_vars": ["result"]
        })

result = {"users": users}
    """
})

builder.add_node("BulkCreateUser", "import_csv", {
    "data": "{{parse_csv.users}}"  # ISO strings auto-converted
})
```

## Related Patterns

- **For model definition**: See [`dataflow-models`](#)
- **For query filters**: See [`dataflow-queries`](#)
- **For bulk operations**: See [`dataflow-bulk-operations`](#)
- **For result access**: See [`dataflow-result-access`](#)
- **For Nexus integration**: See [`dataflow-nexus-integration`](#)

## When to Escalate to Subagent

Use `dataflow-specialist` subagent when:

- Designing complex multi-step CRUD workflows
- Implementing custom validation logic
- Troubleshooting node execution errors
- Optimizing query performance
- Setting up advanced filtering patterns
- Working with relationships between models

## Documentation References

### Specialist Reference

- **DataFlow Specialist**: [`.claude/skills/dataflow-specialist.md`](../../dataflow-specialist.md#L211-L224)

## Examples

### Example 1: Complete User CRUD Workflow

```python
import os
import kailash
from kailash.dataflow import db

reg = kailash.NodeRegistry()

df = kailash.DataFlow(os.environ["DATABASE_URL"])

@db.model
class User:
    name: str
    email: str
    active: bool = True

builder = kailash.WorkflowBuilder()

# Create user
builder.add_node("CreateUser", "create", {
    "name": "Alice",
    "email": "alice@example.com"
})

# Read created user -- use JSONTransformNode to shape the ID into a filter
builder.add_node("JSONTransformNode", "shape_filter", {
    "expression": '{"id": @.id}'
})
builder.connect("create", "id", "shape_filter", "data")

builder.add_node("ReadUser", "read", {})
builder.connect("shape_filter", "result", "read", "filter")

# Update user
builder.add_node("UpdateUser", "update", {
    "fields": {"active": False}
})
builder.connect("shape_filter", "result", "update", "filter")

# List all inactive users
builder.add_node("ListUser", "list_inactive", {
    "filter": {"active": False}
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Access results -- each node type has specific output keys
created_user = result["results"]["create"]["record"]
print(f"Created user: {created_user['name']}")

inactive_users = result["results"]["list_inactive"]["records"]
print(f"Found {len(inactive_users)} inactive users")
```

### Example 2: String ID Operations

```python
@db.model
class SsoSession:
    id: str
    user_id: str
    state: str = 'active'

builder = kailash.WorkflowBuilder()

# Create with string ID
session_id = "session-80706348-0456-468b-8851-329a756a3a93"
builder.add_node("CreateSsoSession", "create_session", {
    "id": session_id,  # String ID preserved
    "user_id": "user-123",
    "state": "active"
})

# Read by string ID
builder.add_node("SsoReadSession", "read_session", {
    "filter": {"id": session_id}  # No conversion needed
})

# Update by string ID
builder.add_node("UpdateSsoSession", "update_session", {
    "filter": {"id": session_id},
    "fields": {"state": "expired"}
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Example 3: Soft Delete Pattern

```python
@db.model
class Customer:
    name: str
    email: str

    deleted_at: Optional[str] = None  # Soft delete support

builder = kailash.WorkflowBuilder()

# Soft delete (preserves data)
builder.add_node("DeleteCustomer", "soft_delete_customer", {
    "filter": {"id": 123},
    "soft_delete": True  # Sets deleted_at timestamp
})

# List active customers (excludes soft-deleted)
builder.add_node("ListCustomer", "active_customers", {
    "filter": {"active": True}
    # Soft-deleted records automatically excluded
})

# List including soft-deleted
builder.add_node("ListCustomer", "all_customers", {
    "filter": {},
    "include_deleted": True  # Include soft-deleted records
})
```

## Troubleshooting

| Issue                                     | Cause                            | Solution                                                                         |
| ----------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| `Node 'CreateUser' not found`             | Model not defined with @db.model | Add @db.model decorator to class                                                 |
| `KeyError: 'id'` in results               | Wrong result access pattern      | CreateNode: `results["node"]["id"]`; ReadNode: `results["node"]["record"]["id"]` |
| `ValidationError: Missing required field` | Field without default            | Provide value or add default to model                                            |
| `IntegrityError: duplicate key`           | Unique constraint violation      | Check for existing record before creating                                        |
| `NotFoundError: Record not found`         | Invalid ID or deleted record     | Verify ID exists and isn't soft-deleted                                          |

## Quick Tips

- String IDs fully supported - no conversion needed
- Use connections for dynamic parameters, NOT template syntax
- Access results via node-specific keys: CreateNode `record`/`id`, ListNode `records`/`count`/`total`, etc.
- Soft deletes preserve data with `deleted_at` timestamp
- ListNode excludes soft-deleted by default
- Use `count_only=True` for pagination counts
- ReadNode can use ID or conditions
- UpdateNode returns updated record if `return_updated=True`

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow CRUD, generated nodes, CreateUser, ReadUser, UpdateUser, DeleteUser, ListUser, create read update delete, basic operations, single record, DataFlow operations, database operations, CRUD patterns, node operations -->
