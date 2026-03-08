# DataFlow Schema Cache

## Overview

The schema cache is a thread-safe table existence cache that eliminates redundant migration checks, providing **91-99% performance improvement** for multi-operation workflows.

## Key Features

- **Thread-safe**: RLock protection for multi-threaded apps (Nexus handlers, CLI tools)
- **Configurable**: TTL, size limits, and validation
- **Automatic invalidation**: Cache cleared on schema changes
- **Low overhead**: <1KB per cached table

## Performance Characteristics

| Operation                | Time          |
| ------------------------ | ------------- |
| Cache miss (first check) | ~1500ms       |
| Cache hit (subsequent)   | ~1ms          |
| Improvement              | 91-99% faster |

## Configuration

SchemaCache is a **separate class**, NOT a DataFlow constructor parameter.

```python
import kailash
from kailash.dataflow import SchemaCache

# DataFlow has no schema_cache_* constructor params
df = kailash.DataFlow("postgresql://...")

# Create a SchemaCache separately
cache = SchemaCache()              # No TTL (never expires)
cache = SchemaCache(ttl_secs=300)  # TTL in seconds

# Use cache for schema introspection
tables = cache.get_tables(df)             # First call: fetches from DB
tables = cache.get_tables(df)             # Second call: returns cached
columns = cache.get_columns(df, "users")  # Column metadata
indexes = cache.get_indexes(df, "users")  # Index metadata

# Invalidate cache
cache.invalidate()
```

## Automatic Usage

Cache works automatically - no code changes needed:

```python
from kailash.dataflow import db

df = kailash.DataFlow("postgresql://...")

@db.model
class User:
    id: str
    name: str

# First operation: Cache miss (~1500ms)
builder = kailash.WorkflowBuilder()
builder.add_node("CreateUser", "create", {
    "id": "user-1",
    "name": "Alice"
})
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Subsequent operations: Cache hit (~1ms)
workflow2 = kailash.WorkflowBuilder()
workflow2.add_node("CreateUser", "create2", {
    "id": "user-2",
    "name": "Bob"
})
result2 = rt.execute(workflow2.build(reg))  # 99% faster!
```

## Cache Methods (Advanced)

```python
from kailash.dataflow import SchemaCache

cache = SchemaCache(ttl_secs=300)

# Query cached data
tables = cache.get_tables(df)
columns = cache.get_columns(df, "users")
indexes = cache.get_indexes(df, "users")

# Clear all cached entries
cache.invalidate()
```

> **Note**: DataFlow does NOT have a `_schema_cache` attribute. SchemaCache is a standalone object you create and manage separately.

## Thread Safety

The schema cache is fully thread-safe for multi-threaded applications:

```python
import kailash
from kailash.dataflow import db

reg = kailash.NodeRegistry()
from concurrent.futures import ThreadPoolExecutor

df = kailash.DataFlow("postgresql://...")

@db.model
class User:
    id: str
    name: str

def create_user(user_id: str):
    builder = kailash.WorkflowBuilder()
    builder.add_node("CreateUser", "create", {
        "id": user_id,
        "name": f"User {user_id}"
    })
    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))

# Safe for concurrent execution
with ThreadPoolExecutor(max_workers=10) as executor:
    futures = [executor.submit(create_user, f"user-{i}") for i in range(100)]
    results = [f.result() for f in futures]
```

All cache operations are protected by RLock, ensuring safe concurrent access from Nexus handlers or multi-threaded applications.

## Performance Impact Summary

| Metric                | Without Cache | With Cache           |
| --------------------- | ------------- | -------------------- |
| Instance creation     | ~700ms        | <50ms (14x faster)   |
| First operation       | ~1500ms       | ~1500ms (cache miss) |
| Subsequent operations | ~1500ms       | ~1ms (99% faster)    |
| Memory per table      | N/A           | <1KB                 |

## Requirements
