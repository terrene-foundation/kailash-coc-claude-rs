---
name: dataflow-queries
description: "MongoDB-style query syntax for DataFlow filters. Use when DataFlow query, MongoDB syntax, $gt $lt $in operators, query filters, filter conditions, or advanced queries."
---

# DataFlow Query Patterns

Use MongoDB-style query operators for filtering, searching, and aggregating DataFlow data.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`dataflow-crud-operations`](#), [`dataflow-models`](#), [`dataflow-bulk-operations`](#)
> Related Subagents: `dataflow-specialist` (complex queries, optimization)

## ⚠️ Important: Filter Operators

DataFlow uses MongoDB-style filter syntax translated to SQL. Only the following operators are supported:

**Supported Operators:**
- ✅ `$eq` (equal — or direct value match: `{"active": True}`)
- ✅ `$ne` (not equal)
- ✅ `$gt`, `$gte`, `$lt`, `$lte` (comparison)
- ✅ `$in` (value in list)
- ✅ `$like` (SQL LIKE pattern match)
- ✅ `$null` (IS NULL / IS NOT NULL check)

**NOT supported:** `$nin`, `$regex`, `$or`, `$and`, `$not`, `$contains`, `$overlap`, `$text`, `$exists`

## Quick Reference

- **Operators**: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$like`, `$null`
- **Pattern**: Use in `filter` parameter of ListNode
- **Multiple conditions at same level = implicit AND**

```python
# Basic comparison
{"age": {"$gt": 18}}

# Multiple conditions (implicit AND)
{"active": True, "age": {"$gte": 18}}

# IN operator
{"category": {"$in": ["electronics", "computers"]}}

# Pattern match (SQL LIKE)
{"name": {"$like": "%laptop%"}}

# NULL check
{"deleted_at": {"$null": True}}   # WHERE deleted_at IS NULL
```

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

df = kailash.DataFlow(os.environ["DATABASE_URL"])

@db.model
class Product:
    name: str
    category: str
    price: float
    stock: int
    active: bool = True

builder = kailash.WorkflowBuilder()

# Simple filter
builder.add_node("ListProduct", "active_products", {
    "filter": {"active": True}
})

# Comparison operators
builder.add_node("ListProduct", "affordable_products", {
    "filter": {
        "price": {"$lt": 100.00},
        "stock": {"$gt": 0}
    }
})

# Range query
builder.add_node("ListProduct", "mid_range_products", {
    "filter": {
        "price": {"$gte": 50.00, "$lte": 150.00}
    }
})

# IN operator
builder.add_node("ListProduct", "electronics", {
    "filter": {
        "category": {"$in": ["phones", "laptops", "tablets"]}
    }
})

# NULL check
builder.add_node("ListProduct", "with_description", {
    "filter": {
        "description": {"$null": False}  # Has a description
    }
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Search**: Text search with regex
- **Filtering**: Age restrictions, status filters
- **Price Ranges**: E-commerce price filtering
- **Multi-Select**: Category or tag filtering
- **Exclusions**: NOT IN patterns

## Query Operators Reference

### Comparison Operators

| Operator | SQL Equivalent | Example |
|----------|---------------|---------|
| `$eq` | `=` | `{"active": {"$eq": true}}` (or just `{"active": true}`) |
| `$ne` | `!=` | `{"status": {"$ne": "inactive"}}` |
| `$gt` | `>` | `{"age": {"$gt": 18}}` |
| `$gte` | `>=` | `{"age": {"$gte": 18}}` |
| `$lt` | `<` | `{"price": {"$lt": 100}}` |
| `$lte` | `<=` | `{"price": {"$lte": 100}}` |
| `$in` | `IN` | `{"category": {"$in": ["a", "b", "c"]}}` |
| `$like` | `LIKE` | `{"name": {"$like": "%laptop%"}}` |
| `$null` | `IS NULL` / `IS NOT NULL` | `{"deleted_at": {"$null": True}}` |

### Null Checking

**For soft-delete filtering and nullable field queries:**

```python
# Query for NULL values (e.g., non-deleted records)
builder.add_node("ListPatient", "active_patients", {
    "filter": {"deleted_at": {"$null": True}}  # WHERE deleted_at IS NULL
})

# Query for NOT NULL values
builder.add_node("ListPatient", "deleted_patients", {
    "filter": {"deleted_at": {"$null": False}}  # WHERE deleted_at IS NOT NULL
})
```

**Common Pattern - Soft Delete Filtering:**
```python
# soft_delete: True only affects DELETE operations, NOT queries!
# You MUST manually filter in queries:
builder.add_node("ListModel", "active_records", {
    "filter": {"deleted_at": {"$null": True}}  # Exclude soft-deleted records
})
```

### Pattern Matching

```python
# SQL LIKE pattern matching
builder.add_node("ListUser", "search", {
    "filter": {"name": {"$like": "%john%"}}  # Contains "john"
})

builder.add_node("ListUser", "starts_with", {
    "filter": {"email": {"$like": "admin%"}}  # Starts with "admin"
})
```

### Multiple Conditions (Implicit AND)

Multiple filter keys at the same level are combined with AND:

```python
# All conditions must be true (implicit AND)
builder.add_node("ListUser", "query", {
    "filter": {
        "active": True,
        "role": {"$ne": "banned"},
        "age": {"$gte": 18}
    }
})
```

**Note:** Explicit `$or`, `$and`, `$not` logical operators are NOT supported. Use multiple filter fields for AND conditions. For OR-like behavior, run separate queries.

## Key Parameters / Options

### Sorting

```python
builder.add_node("ListProduct", "sorted_products", {
    "filter": {"active": True},
    "order_by": ["-price", "name"]  # - prefix for descending
})
```

### Pagination

```python
# Offset-based
builder.add_node("ListProduct", "page_2", {
    "filter": {"active": True},
    "order_by": ["created_at"],
    "limit": 20,
    "offset": 20  # Skip first 20 (page 2)
})

# Cursor-based (more efficient)
builder.add_node("ListProduct", "next_page", {
    "filter": {
        "active": True,
        "id": {"$gt": last_id}  # After last seen ID
    },
    "order_by": ["id"],
    "limit": 20
})
```

### Field Selection

```python
# Select specific fields only
builder.add_node("ListUser", "names_only", {
    "filter": {"active": True},
    "fields": ["id", "name", "email"]  # Only these fields
})

# Exclude fields
builder.add_node("ListProduct", "no_description", {
    "filter": {"active": True},
    "exclude_fields": ["description", "long_text"]
})
```

### Aggregation

```python
# Group by and aggregate
builder.add_node("ListOrder", "revenue_by_status", {
    "group_by": "status",
    "aggregations": {
        "total_revenue": {"$sum": "total"},
        "order_count": {"$count": "*"},
        "avg_order": {"$avg": "total"}
    }
})
```

## Common Mistakes

### Mistake 1: Using SQL Operators

```python
# Wrong - SQL operators don't work
builder.add_node("ListProduct", "query", {
    "filter": {"price > 100"}  # FAILS
})
```

**Fix: Use MongoDB-Style Operators**

```python
# Correct
builder.add_node("ListProduct", "query", {
    "filter": {"price": {"$gt": 100.00}}
})
```

### Mistake 2: Using Unsupported Logical Operators

```python
# Wrong - $or and $and are NOT supported
builder.add_node("ListUser", "query", {
    "filter": {
        "$or": [{"role": "admin"}, {"role": "manager"}]  # FAILS
    }
})
```

**Fix: Use $in for OR-like Behavior on Same Field**

```python
# Correct - use $in for multiple values on one field
builder.add_node("ListUser", "query", {
    "filter": {
        "active": True,
        "role": {"$in": ["admin", "manager"]}
    }
})
```

### Mistake 3: Forgetting $ Prefix

```python
# Wrong - missing $ prefix
builder.add_node("ListProduct", "query", {
    "filter": {"price": {"gt": 100}}  # FAILS
})
```

**Fix: Always Use $ Prefix**

```python
# Correct
builder.add_node("ListProduct", "query", {
    "filter": {"price": {"$gt": 100}}
})
```

## Related Patterns

- **For CRUD operations**: See [`dataflow-crud-operations`](#)
- **For bulk operations**: See [`dataflow-bulk-operations`](#)
- **For performance**: See [`dataflow-performance`](#)
- **For result access**: See [`dataflow-result-access`](#)

## When to Escalate to Subagent

Use `dataflow-specialist` subagent when:
- Designing complex aggregation queries
- Optimizing slow query performance
- Working with full-text search
- Implementing faceted search
- Creating dashboard analytics
- Troubleshooting query errors

## Examples

### Example 1: E-commerce Search

```python
builder = kailash.WorkflowBuilder()

# Product search with multiple filters (implicit AND)
builder.add_node("ListProduct", "search_results", {
    "filter": {
        "active": True,
        "name": {"$like": "%laptop%"},
        "price": {"$gte": 500.00, "$lte": 2000.00},
        "category": {"$in": ["computers", "electronics"]},
        "stock": {"$gt": 0}
    },
    "order_by": ["-created_at"],
    "limit": 20
})
```

### Example 2: Dashboard Analytics

```python
# Revenue by category
builder.add_node("ListOrder", "category_revenue", {
    "filter": {
        "status": {"$in": ["completed", "shipped"]},
        "created_at": {"$gte": "2024-01-01"}
    },
    "group_by": "category",
    "aggregations": {
        "revenue": {"$sum": "total"},
        "orders": {"$count": "*"},
        "avg_order": {"$avg": "total"}
    },
    "order_by": ["-revenue"]
})
```

### Example 3: User Search with Multiple Filters

```python
# Advanced user search (all conditions = implicit AND)
builder.add_node("ListUser", "power_users", {
    "filter": {
        "active": True,
        "verified": True,
        "subscription": "premium",
        "role": {"$ne": "banned"},
    },
    "order_by": ["-created_at"],
    "limit": 100
})
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| `Invalid operator: gt` | Missing $ prefix | Use `$gt` not `gt` |
| `TypeError: unsupported operand` | SQL syntax in filter | Use MongoDB-style operators |
| `No results returned` | Filter too restrictive | Check individual conditions |
| `Query timeout` | Inefficient query | Add indexes, simplify filter |

## Quick Tips

- Always use $ prefix for operators
- Multiple conditions at same level = implicit AND
- Use `$in` for OR-like behavior on same field
- Use `$like` for pattern matching (SQL LIKE syntax: `%` for wildcard)
- Use `$null` for NULL/NOT NULL checks
- Add indexes for frequently queried fields
- Use cursor pagination for better performance
- Limit + offset for simple pagination

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow query, MongoDB syntax, $gt, $lt, $in, $or, $and, query filters, filter conditions, query operators, advanced queries, database filters, search filters, query patterns, filter syntax -->
