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

- **Pattern**: `results["node_id"]["result"]`
- **ListNode**: Returns list in `result` key
- **Single Ops**: Return dict in `result` key
- **NOT**: `results["node_id"]` directly (returns metadata)

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

df = kailash.DataFlow()

@df.model
class User:
    name: str
    email: str

builder = kailash.WorkflowBuilder()

# Create user
builder.add_node("UserCreateNode", "create_user", {
    "name": "Alice",
    "email": "alice@example.com"
})

# List users
builder.add_node("UserListNode", "list_users", {
    "filter": {"active": True}
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# CORRECT: Access through 'result' key
created_user = result["results"]["create_user"]["result"]
user_id = created_user["id"]
user_name = created_user["name"]

# CORRECT: ListNode returns list
users_list = result["results"]["list_users"]["result"]
print(f"Found {len(users_list)} users")
for user in users_list:
    print(f"User: {user['name']}")

# WRONG: Missing 'result' wrapper
# user_data = result["results"]["create_user"]  # Returns metadata, not data!
# user_id = user_data["id"]  # FAILS - no 'id' in metadata
```

## Result Structure

### Single Operation Nodes (Create/Read/Update)

```python
results = {
    "node_id": {
        "result": {  # Actual data here
            "id": 1,
            "name": "Alice",
            "email": "alice@example.com"
        },
        "metadata": {...},  # Execution metadata
        "status": "success"
    }
}

# Access
data = result["results"]["node_id"]["result"]
user_id = data["id"]
```

### ListNode (Query Operations)

```python
results = {
    "node_id": {
        "result": [  # List of records
            {"id": 1, "name": "Alice"},
            {"id": 2, "name": "Bob"}
        ],
        "metadata": {...}
    }
}

# Access
users = result["results"]["node_id"]["result"]
for user in users:
    print(user["name"])
```

### Delete/Update Operations

```python
results = {
    "node_id": {
        "result": {
            "affected_rows": 1,
            "success": True
        },
        "metadata": {...}
    }
}

# Access
result_info = result["results"]["node_id"]["result"]
affected = result_info["affected_rows"]
```

## Common Mistakes

### Mistake 1: Missing 'result' Key

```python
# WRONG
result = rt.execute(builder.build(reg))
user_data = result["results"]["create_user"]  # Returns full node result (metadata + data)
user_id = user_data["id"]  # FAILS - 'id' not at this level
```

**Fix: Access Through 'result'**

```python
# CORRECT
user_data = result["results"]["create_user"]["result"]
user_id = user_data["id"]  # Works
```

### Mistake 2: Wrong ListNode Access

```python
# WRONG
users = result["results"]["list_users"]
user_name = users[0]["name"]  # FAILS - users is metadata dict, not list
```

**Fix: Access List in 'result'**

```python
# CORRECT
users_list = result["results"]["list_users"]["result"]  # This is the list
user_name = users_list[0]["name"]  # Works
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
builder.add_node("UserCreateNode", "create", {
    "name": "Alice",
    "email": "alice@example.com"
})

# Read created user
builder.add_node("UserReadNode", "read", {})
builder.connect("create", "id", "read", "id")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Access created user
created = result["results"]["create"]["result"]
print(f"Created user ID: {created['id']}")

# Access read user
user_details = result["results"]["read"]["result"]
print(f"User name: {user_details['name']}")
```

### Example 2: Processing List Results

```python
builder.add_node("ProductListNode", "list_products", {
    "filter": {"active": True},
    "limit": 10
})

result = rt.execute(builder.build(reg))

# Access list
products = result["results"]["list_products"]["result"]

# Process list
total_value = sum(p["price"] * p["stock"] for p in products)
print(f"Total inventory value: ${total_value}")
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `KeyError: 'id'` | Missing 'result' wrapper | Access `results["node"]["result"]["id"]` |
| `TypeError: 'dict' object is not subscriptable` | Treating metadata as list | Use `results["node"]["result"]` for list |
| `KeyError: 'result'` | Node failed | Check `results["node"]["status"]` first |

## Quick Tips

- Always access through `results["node"]["result"]`
- ListNode returns list in 'result' key
- Single operations return dict in 'result' key
- Check 'status' if 'result' missing (node failed)

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow result, access data, ListNode structure, result wrapper, results pattern, access results, node results, workflow results -->
