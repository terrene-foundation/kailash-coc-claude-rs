---
name: dataflow-performance
description: "DataFlow performance optimization. Use when DataFlow performance, optimize, connection pool, query optimization, or slow queries."
---

# DataFlow Performance Optimization

Performance tuning for DataFlow applications with connection pooling, caching, and query optimization.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> Related Skills: [`dataflow-bulk-operations`](#), [`dataflow-queries`](#), [`dataflow-connection-config`](#)
> Related Subagents: `dataflow-specialist` (advanced optimization)

## Quick Reference

- **Connection Pooling**: 20-50 connections typical
- **Bulk Operations**: 10-100x faster for >100 records
- **Indexes**: Add to frequently queried fields
- **Caching**: Enable for read-heavy workloads
- **Benchmarks**: 31.8M ops/sec baseline, 99.9% cache hit rate

## Core Pattern

```python
import kailash

# Production-optimized configuration
config = kailash.DataFlowConfig(
    "postgresql://...",
    max_connections=20,          # Increase from default 10
    min_connections=2,           # Keep warm connections
    max_lifetime_secs=3600,      # Recycle after 1 hour
)

df = kailash.DataFlow("postgresql://...", config=config)
```

## Performance Optimization Strategies

### 1. Connection Pooling

```python
config = kailash.DataFlowConfig(
    "postgresql://...",
    max_connections=20,           # 2x CPU cores typical
    max_lifetime_secs=3600,
)
db = kailash.DataFlow("postgresql://...", config=config)
```

### 2. Use Bulk Operations

```python
# Slow - 1 op at a time
for product in products:
    builder.add_node("CreateProduct", f"create_{product['id']}", product)

# Fast - 10-100x faster
builder.add_node("BulkCreateProduct", "import", {
    "data": products,
    "batch_size": 1000
})
```

### 3. Add Indexes

```python
@db.model
class User:
    email: str
    active: bool

    __indexes__ = [
        {"fields": ["email"], "unique": True},
        {"fields": ["active"]}
    ]
```

### 4. Enable Caching

```python
builder.add_node("ListProduct", "cached_query", {
    "filter": {"active": True},
    "cache_key": "active_products",
    "cache_ttl": 300
})
```

### 5. Query Optimization

```python
# Good - selective filter first
builder.add_node("ListProduct", "query", {
    "filter": {
        "active": True,  # Most selective first
        "category": "electronics",
        "price": {"$lt": 1000}
    }
})

# Good - field selection
builder.add_node("ListUser", "names_only", {
    "fields": ["id", "name"],  # Only needed fields
    "filter": {"active": True}
})
```

### 6. Schema Cache

Thread-safe table existence cache eliminating redundant migration checks, providing 91-99% performance improvement for multi-operation workflows.

```python
import kailash

# Default (cache enabled, no TTL)
df = kailash.DataFlow("postgresql://...")

# Custom configuration
df = kailash.DataFlow(
    "postgresql://...",
    schema_cache_enabled=True,      # Enable/disable cache
    schema_cache_ttl=300,            # TTL in seconds (None = no expiration)
    schema_cache_max_size=10000,    # Max cached tables
    schema_cache_validation=False,  # Schema checksum validation
)

# Performance Impact
# First operation: ~1500ms (cache miss with migration check)
# Subsequent operations: ~1ms (cache hit) - 99% faster!

# Cache Management
metrics = df._schema_cache.get_metrics()
print(f"Hit rate: {metrics['hit_rate']:.2%}")  # Should be >90%

# Clear cache
df._schema_cache.clear()

# Clear specific table
df._schema_cache.clear_table("User", database_url)
```

**When to Clear Cache:**

- After manual schema modifications
- After external migrations
- For debugging schema issues
- Cache auto-clears on DataFlow schema operations

**Performance Characteristics:**

- **First operation**: ~1500ms (cache miss)
- **Subsequent operations**: ~1ms (cache hit) - **99% faster**
- **Multi-operation workflows**: 91-99% overall improvement
- **Memory overhead**: <1KB per cached table
- **Thread safety**: RLock-protected concurrent access

## Performance Benchmarks

- **Single ops**: <1ms
- **Bulk create**: 10k+/sec
- **Bulk update**: 50k+/sec
- **Bulk delete**: 100k+/sec
- **Cache hit rate**: 99.9%

## Common Mistakes

### Mistake 1: Small Connection Pool

```python
# Wrong - default max_connections=10 may exhaust under load
db = kailash.DataFlow("postgresql://...")
```

**Fix: Adequate Pool**

```python
config = kailash.DataFlowConfig("postgresql://...", max_connections=20)
db = kailash.DataFlow("postgresql://...", config=config)
```

### Mistake 2: Single Operations for Bulk

```python
# Wrong - very slow
for item in items:
    builder.add_node("CreateItem", f"create_{item['id']}", item)
```

**Fix: Use Bulk Operations**

```python
builder.add_node("BulkCreateItem", "import", {
    "data": items,
    "batch_size": 1000
})
```

## Quick Tips

- max_connections = 2x CPU cores (typical)
- Use bulk operations for >100 records
- Add indexes to queried fields
- Enable caching for read-heavy
- Monitor slow queries (>100ms)

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow performance, optimize, connection pool, query optimization, slow queries, performance tuning, database optimization -->
