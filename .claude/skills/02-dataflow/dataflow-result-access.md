---
name: dataflow-result-access
description: "Access DataFlow node results correctly. Use when DataFlow result, access data, ListNode structure, result wrapper, or results pattern."
---

# DataFlow Result Access Patterns

Correct patterns for accessing DataFlow node results in workflows.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> Related Skills: [`dataflow-crud-operations`](#), [`param-passing-quick`](#)
> Related Subagents: `dataflow-specialist` (troubleshooting), `pattern-expert` (workflow design)

## Quick Reference

Each node type uses specific output keys:

| Node Type           | Output Keys                                 |
| ------------------- | ------------------------------------------- |
| `Create{Model}`     | `record`, `id`                              |
| `Read{Model}`       | `record`, `found`                           |
| `Update{Model}`     | `updated_count`                             |
| `Delete{Model}`     | `deleted_count`, `soft_deleted`             |
| `List{Model}`       | `records`, `count`, `total`                 |
| `Count{Model}`      | `count`                                     |
| `Upsert{Model}`     | `record`, `created`                         |
| `BulkCreate{Model}` | `records`, `count`                          |
| `BulkUpdate{Model}` | `updated_count`                             |
| `BulkDelete{Model}` | `deleted_count`                             |
| `BulkUpsert{Model}` | `records`, `created_count`, `updated_count` |

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

builder = kailash.WorkflowBuilder()

# Create user
builder.add_node("CreateUser", "create_user", {
    "name": "Alice",
    "email": "alice@example.com"
})

# List users
builder.add_node("ListUser", "list_users", {
    "filter": {"active": True}
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# CORRECT: CreateNode returns "record" and "id"
created_user = result["results"]["create_user"]["record"]
user_id = result["results"]["create_user"]["id"]
user_name = created_user["name"]

# CORRECT: ListNode returns "records", "count", "total"
users_list = result["results"]["list_users"]["records"]
total = result["results"]["list_users"]["total"]
print(f"Found {len(users_list)} users (total: {total})")
for user in users_list:
    print(f"User: {user['name']}")
```

## Result Structure

### Create{Model}

```python
results = {
    "node_id": {
        "record": {  # The created record
            "id": 1,
            "name": "Alice",
            "email": "alice@example.com"
        },
        "id": 1      # The created record's ID
    }
}

# Access
record = result["results"]["node_id"]["record"]
record_id = result["results"]["node_id"]["id"]
```

### Read{Model}

```python
results = {
    "node_id": {
        "record": {  # The found record (or null)
            "id": 1,
            "name": "Alice"
        },
        "found": True  # Whether the record was found
    }
}

# Access
record = result["results"]["node_id"]["record"]
found = result["results"]["node_id"]["found"]
```

### List{Model}

```python
results = {
    "node_id": {
        "records": [  # List of matching records
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"}
        ],
        "count": 2,   # Number of records in this page
        "total": 50    # Total matching records
    }
}

# Access
users = result["results"]["node_id"]["records"]
total = result["results"]["node_id"]["total"]
for user in users:
    print(user["name"])
```

### Update{Model}

```python
results = {
    "node_id": {
        "updated_count": 1  # Number of records updated
    }
}

# Access
updated = result["results"]["node_id"]["updated_count"]
```

### Delete{Model}

```python
results = {
    "node_id": {
        "deleted_count": 1,     # Number of records deleted
        "soft_deleted": True    # Whether soft delete was used
    }
}

# Access
deleted = result["results"]["node_id"]["deleted_count"]
```

### Count{Model}

```python
results = {
    "node_id": {
        "count": 42  # Total count of matching records
    }
}

# Access
count = result["results"]["node_id"]["count"]
```

### Upsert{Model}

```python
results = {
    "node_id": {
        "record": {  # The upserted record
            "id": 1,
            "name": "Alice"
        },
        "created": True  # True if inserted, False if updated
    }
}

# Access
record = result["results"]["node_id"]["record"]
was_created = result["results"]["node_id"]["created"]
```

## Common Mistakes

### Mistake 1: Using Generic "result" Key

```python
# WRONG - there is no generic "result" key
result = rt.execute(builder.build(reg))
user_data = result["results"]["create_user"]["result"]  # KeyError!
```

**Fix: Use the Correct Key for Each Node Type**

```python
# CORRECT - CreateNode uses "record" and "id"
user_data = result["results"]["create_user"]["record"]
user_id = result["results"]["create_user"]["id"]
```

### Mistake 2: Wrong ListNode Access

```python
# WRONG - ListNode does not use "result"
users = result["results"]["list_users"]["result"]  # KeyError!
```

**Fix: Access via "records"**

```python
# CORRECT - ListNode uses "records", "count", "total"
users_list = result["results"]["list_users"]["records"]
user_name = users_list[0]["name"]
```

## Related Patterns

- **For CRUD operations**: See [`dataflow-crud-operations`](#)
- **For parameter passing**: See [`param-passing-quick`](#)
- **For connections**: See [`connection-patterns`](#)

## Documentation References

### Primary Sources

- **DataFlow Specialist**: [`.claude/skills/dataflow-specialist.md`](../../dataflow-specialist.md#L991-L1001)

## Examples

### Example 1: Chained Operations

```python
builder = kailash.WorkflowBuilder()

# Create user
builder.add_node("CreateUser", "create", {
    "name": "Alice",
    "email": "alice@example.com"
})

# Read created user
builder.add_node("ReadUser", "read", {})
builder.connect("create", "id", "read", "id")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Access created user -- CreateNode uses "record" and "id"
created = result["results"]["create"]["record"]
print(f"Created user ID: {result['results']['create']['id']}")

# Access read user -- ReadNode uses "record" and "found"
user_details = result["results"]["read"]["record"]
print(f"User name: {user_details['name']}")
```

### Example 2: Processing List Results

```python
builder.add_node("ListProduct", "list_products", {
    "filter": {"active": True},
    "limit": 10
})

result = rt.execute(builder.build(reg))

# Access list -- ListNode uses "records", "count", "total"
products = result["results"]["list_products"]["records"]
total = result["results"]["list_products"]["total"]

# Process list
total_value = sum(p["price"] * p["stock"] for p in products)
print(f"Total inventory value: ${total_value} ({total} products)")
```

## Troubleshooting

| Issue                                           | Cause                 | Solution                                                   |
| ----------------------------------------------- | --------------------- | ---------------------------------------------------------- |
| `KeyError: 'result'`                            | Using wrong key       | Use node-specific keys: `record`, `records`, `count`, etc. |
| `KeyError: 'id'`                                | Wrong access path     | CreateNode: `results["node"]["id"]`                        |
| `TypeError: 'dict' object is not subscriptable` | Treating dict as list | ListNode: use `results["node"]["records"]` for the list    |

## Quick Tips

- Each node type has specific output keys (see Quick Reference table above)
- CreateNode: `record`, `id`
- ReadNode: `record`, `found`
- ListNode: `records`, `count`, `total`
- UpdateNode: `updated_count`
- DeleteNode: `deleted_count`, `soft_deleted`
- CountNode: `count`
- UpsertNode: `record`, `created`

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow result, access data, ListNode structure, result wrapper, results pattern, access results, node results, workflow results -->
