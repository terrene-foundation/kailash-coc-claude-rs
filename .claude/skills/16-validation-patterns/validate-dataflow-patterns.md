---
name: validate-dataflow-patterns
description: "Validate DataFlow compliance patterns. Use when asking 'validate dataflow', 'dataflow compliance', or 'check dataflow code'."
---

# Validate DataFlow Patterns

> **Skill Metadata**
> Category: `validation`
> Priority: `MEDIUM`

## DataFlow Compliance Checks

```python
# ✅ CORRECT: Use @df.model decorator
import kailash

df = kailash.DataFlow("sqlite:///app.db")

@df.model
class User:
    id: str
    email: str

# Auto-generates 11 nodes: UserCreateNode, UserReadNode, UserUpsertNode, UserCountNode, etc.

# ❌ WRONG: Manual node creation for database ops
# builder.add_node("DatabaseExecuteNode", "create_user", {
#     "query": "INSERT INTO users..."
# })
```

## Validation Rules

1. **Use @df.model** - Not manual SQL
2. **Use generated nodes** - UserCreateNode, UserReadNode
3. **String IDs** - Required for all models
4. **No direct SQLAlchemy** - DataFlow handles it

<!-- Trigger Keywords: validate dataflow, dataflow compliance, check dataflow code, dataflow patterns -->
