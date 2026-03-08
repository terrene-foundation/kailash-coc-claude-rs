---
name: dataflow-count-node
description: "CountNode for efficient COUNT(*) queries with 10-50x performance improvement over ListNode. Use when counting records, pagination metadata, existence checks, dashboard metrics, or performance-critical counts."
---

# DataFlow CountNode - Efficient Counting

11th auto-generated node for efficient `COUNT(*)` queries with 10-50x performance improvement over ListNode.

> **Skill Metadata**
> Category: `dataflow/nodes`
> Priority: `HIGH`
> Related Skills: [`dataflow-crud-operations`](#), [`dataflow-queries`](#), [`dataflow-performance`](#)
> Related Subagents: `dataflow-specialist` (performance optimization)

## Quick Reference

- **Performance**: 10-50x faster than ListNode workaround
- **Query Type**: Uses `SELECT COUNT(*)` instead of fetching all records
- **Auto-Generated**: 11th node per @db.model
- **MongoDB Support**: Optimized `.count_documents()` for MongoDB
- **Filter Support**: All MongoDB-style operators ($eq, $ne, $gt, $in, etc.)

## ⚠️ CRITICAL: Performance Comparison

### Before CountNode

```python
# ❌ SLOW - Fetches all records to count (20-50ms for 10,000 records)
builder.add_node("ListUser", "count_users", {
    "filter": {"active": True},
    "limit": 10000  # Must fetch all to count
})

# In node output:
count = len(result["results"]["count_users"])  # Retrieved 10,000 records!
```

### After CountNode

```python
# ✅ FAST - Uses COUNT(*) query (1-5ms regardless of record count)
builder.add_node("CountUser", "count_users", {
    "filter": {"active": True}
})

# In node output:
count = result["results"]["count_users"]["count"]  # Only count value (99% faster!)
```

## Basic Usage

### Simple Count

```python
# Count all users
builder.add_node("CountUser", "count_all", {})

# Result: {"count": 1000}
```

### Count with Filter

```python
# Count active users
builder.add_node("CountUser", "count_active", {
    "filter": {"active": True}
})

# Result: {"count": 847}
```

### Complex Filter

```python
# Count premium users created in last 30 days
builder.add_node("CountUser", "count_recent_premium", {
    "filter": {
        "subscription_tier": "premium",
        "created_at": {"$gte": "2024-01-01"}
    }
})

# Result: {"count": 23}
```

## Common Patterns

### 1. Pagination Metadata

```python
# Get total count for pagination
builder.add_node("CountUser", "total_users", {
    "filter": {"active": True}
})

builder.add_node("ListUser", "page_users", {
    "filter": {"active": True},
    "offset": 0,
    "limit": 20
})

# Results:
# total_users: {"count": 1000}
# page_users: [...20 records...]
# Pagination: Page 1 of 50 (1000 / 20)
```

### 2. Existence Checks

```python
# Check if any records exist matching criteria
builder.add_node("CountOrder", "pending_orders", {
    "filter": {
        "user_id": "user-123",
        "status": "pending"
    }
})

# Result: {"count": 0} → No pending orders
# Result: {"count": 3} → Has pending orders
```

### 3. Dashboard Metrics

```python
# Dashboard: Active vs Inactive users
builder.add_node("CountUser", "active_count", {
    "filter": {"active": True}
})

builder.add_node("CountUser", "inactive_count", {
    "filter": {"active": False}
})

# Results:
# active_count: {"count": 847}
# inactive_count: {"count": 153}
# Total: 1000 users (84.7% active)
```

### 4. Conditional Logic Based on Count

```python
# Count items in cart before checkout
builder.add_node("CountCartItem", "item_count", {
    "filter": {"cart_id": "cart-123"}
})

# ConditionalNode selects between two values based on a boolean condition.
# NO config params. Inputs: "condition", "if_value", "else_value". Output: "result".
builder.add_node("ConditionalNode", "check_empty", {})

builder.connect("item_count", "count", "check_empty", "condition")  # truthy if count > 0
builder.connect("item_count", "count", "check_empty", "if_value")   # pass count when non-empty
builder.connect("item_count", "count", "check_empty", "else_value") # pass count when empty

# ConditionalNode outputs the selected value on a single "result" port
builder.connect("check_empty", "result", "proceed_checkout", "data")
```

### 5. Multi-Tenant Counts

```python
# Count records per tenant
builder.add_node("CountOrder", "tenant_orders", {
    "filter": {"tenant_id": current_tenant_id}
})

# Result: {"count": 456}  # This tenant's order count
```

### 6. Time Series Counts

```python
# Count events in last hour
builder.add_node("CountEvent", "recent_events", {
    "filter": {
        "timestamp": {
            "$gte": datetime.now() - timedelta(hours=1)
        }
    }
})

# Result: {"count": 1247}  # Events in last hour
```

## MongoDB-Style Filters

CountNode supports all MongoDB-style filter operators:

### Comparison Operators

```python
# Greater than
builder.add_node("CountUser", "adults", {
    "filter": {"age": {"$gte": 18}}
})

# Not equal
builder.add_node("CountUser", "not_admin", {
    "filter": {"role": {"$ne": "admin"}}
})

# In list
builder.add_node("CountProduct", "active_categories", {
    "filter": {"category": {"$in": ["electronics", "books"]}}
})

# Not equal
builder.add_node("CountProduct", "exclude_inactive", {
    "filter": {"status": {"$ne": "archived"}}
})
```

### Complex Filters

```python
# Multiple conditions
builder.add_node("CountOrder", "high_value_recent", {
    "filter": {
        "amount": {"$gte": 1000},
        "status": "completed",
        "created_at": {"$gte": "2024-01-01"}
    }
})
```

## Performance Optimization

### Index Usage

```python
# Ensure indexes on filtered fields for optimal performance
@db.model
class Order:
    id: str
    status: str
    created_at: datetime

    # Create indexes on status and (status, created_at) in your database
    # for optimal count query performance

# Query uses index for fast counting
builder.add_node("CountOrder", "count", {
    "filter": {
        "status": "pending",
        "created_at": {"$gte": "2024-01-01"}
    }
})
# Performance: <1ms with index, 5-50ms without
```

### Avoiding Full Table Scans

```python
# ✅ GOOD - Uses index on 'status'
builder.add_node("CountOrder", "pending", {
    "filter": {"status": "pending"}
})

# ❌ SLOW - No index, full table scan
builder.add_node("CountOrder", "search_notes", {
    "filter": {"notes": {"$like": "%important%"}}
})
# Solution: Add index on frequently searched fields
```

## Database Behavior

### PostgreSQL

```sql
-- Generated SQL
SELECT COUNT(*) FROM users WHERE active = true;
-- Performance: <1ms for indexed fields, <5ms for 10K records
```

### MySQL

```sql
-- Generated SQL
SELECT COUNT(*) FROM users WHERE active = 1;
-- Performance: <1ms for indexed fields
```

### SQLite

```sql
-- Generated SQL
SELECT COUNT(*) FROM users WHERE active = 1;
-- Performance: <2ms for indexed fields, <10ms for 100K records
```

### MongoDB

```python
# Generated MongoDB query
collection.count_documents({"active": True})
# Performance: <1ms with index
```

## Best Practices

### 1. Use CountNode Instead of ListNode for Counts

```python
# ✅ CORRECT - Use CountNode (99% faster)
builder.add_node("CountUser", "count", {
    "filter": {"active": True}
})
count = result["results"]["count"]["count"]

# ❌ WRONG - Use ListNode (10-50x slower)
builder.add_node("ListUser", "list", {
    "filter": {"active": True},
    "limit": 10000
})
count = len(result["results"]["list"])
```

### 2. Add Indexes for Frequently Counted Fields

```python
# ✅ CORRECT - Index frequently filtered fields
@db.model
class Order:
    id: str
    status: str
    user_id: str

    # Create database indexes on status and user_id for optimal count performance
```

### 3. Use CountNode for Existence Checks

```python
# ✅ CORRECT - Fast existence check
builder.add_node("CountOrder", "has_pending", {
    "filter": {
        "user_id": user_id,
        "status": "pending"
    }
})
has_pending = result["results"]["has_pending"]["count"] > 0

# ❌ WRONG - Fetches unnecessary data
builder.add_node("ListOrder", "pending_list", {
    "filter": {
        "user_id": user_id,
        "status": "pending"
    },
    "limit": 1
})
has_pending = len(result["results"]["pending_list"]) > 0
```

### 4. Combine with Pagination

```python
# ✅ CORRECT - Efficient pagination
builder.add_node("CountUser", "total", {
    "filter": {"active": True}
})

builder.add_node("ListUser", "page", {
    "filter": {"active": True},
    "offset": page * limit,
    "limit": limit
})

# Calculate pagination:
# total_pages = ceil(result["results"]["total"]["count"] / limit)
```

## Troubleshooting

### ❌ Slow CountNode Queries

**Cause:** Missing index on filtered fields

**Solution:**

```python
# Add index to model
@db.model
class Order:
    status: str

    # Add a database index on status for count performance
```

### ❌ Count Returns 0 Unexpectedly

**Cause:** Filter condition too restrictive or incorrect

**Solution:**

```python
# Debug with ListNode first
builder.add_node("ListOrder", "debug_list", {
    "filter": {"status": "pending"},
    "limit": 5
})
# Check if ListNode returns records

# Then use CountNode
builder.add_node("CountOrder", "count", {
    "filter": {"status": "pending"}
})
```

## Related Resources

- **[dataflow-queries](dataflow-queries.md)** - Query patterns and filtering
- **[dataflow-performance](dataflow-performance.md)** - Performance optimization
- **[dataflow-crud-operations](dataflow-crud-operations.md)** - CRUD operation patterns

## When to Use This Skill

Use CountNode when you:

- Count records without fetching data (10-50x faster)
- Calculate pagination metadata (total pages, records)
- Perform existence checks (any matching records?)
- Generate dashboard metrics (user counts, order stats)
- Implement conditional logic based on counts
- Optimize performance-critical counting operations
