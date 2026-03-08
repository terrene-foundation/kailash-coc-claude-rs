# DataFlow Async Lifecycle Methods

## Overview

DataFlow provides proper async lifecycle methods for use in async contexts like pytest async fixtures and async main functions.

## The Problem (DF-501 Error)

Sync methods like `create_tables()` and `close()` fail in async contexts with event loop conflicts:

```
RuntimeError: Cannot run sync method in running event loop
RuntimeError: Event loop is closed
```

## Async Methods Reference

| Sync Method                  | Async Alternative                  | Usage                            |
| ---------------------------- | ---------------------------------- | -------------------------------- |
| `create_tables()`            | `create_tables_async()`            | Table creation in async contexts |
| `close()`                    | `close_async()`                    | Cleanup in async contexts        |
| `_ensure_migration_tables()` | `_ensure_migration_tables_async()` | Internal migration tables        |

## When to Use Each

**Use Async Methods When:**

- Inside pytest async fixtures (`@pytest.fixture async def db()`)
- Inside async main functions (`async def main()`)
- Any code running in an async context with `asyncio.get_running_loop()`

**Use Sync Methods When:**

- CLI scripts and management commands
- Sync pytest tests (non-async)
- Any code NOT running in an async context

## Nexus Integration Pattern

```python
import kailash
from kailash.dataflow import db
from kailash.nexus import NexusApp

df = kailash.DataFlow("postgresql://localhost/mydb")

@db.model
class User:
    id: str
    name: str
    email: str

reg = kailash.NodeRegistry()
app = NexusApp()

@app.handler()
def get_user(user_id: str):
    builder = kailash.WorkflowBuilder()
    builder.add_node("ReadUser", "read", {"id": user_id})
    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))
```

## Pytest Async Fixture Pattern

```python
import pytest
import kailash
from kailash.dataflow import db

@pytest.fixture
async def dataflow():
    """Async fixture with proper cleanup."""
    df = kailash.DataFlow("postgresql://...")

    @db.model
    class User:
        id: str
        name: str

    # Use async version in async context
    await df.create_tables_async()

    yield df

    # Use async cleanup
    await df.close_async()

@pytest.mark.asyncio
async def test_user_creation(dataflow):
    # Test with async dataflow fixture
    pass
```

## Sync Context Detection

DataFlow sync methods detect when called from async context and raise clear errors:

```python
# In async context (e.g., async def main())
try:
    db.create_tables()  # Raises RuntimeError
except RuntimeError as e:
    print(e)
    # Output: Cannot use create_tables() in async context - use create_tables_async() instead.
    # See DF-501 for details.
```

## Error Messages

**DF-501 for create_tables():**

```
RuntimeError: Cannot use create_tables() in async context - use create_tables_async() instead.
See DF-501 for details.
```

**DF-501 for \_ensure_migration_tables():**

```
RuntimeError: Cannot use _ensure_migration_tables() in async context - use _ensure_migration_tables_async() instead.
See DF-501 for details.
```

## Migration from Sync to Async

**Before (DF-501 Error):**

```python
from kailash.dataflow import db

# WRONG - Causes DF-501 in async context
async def setup():
    df = kailash.DataFlow("postgresql://...")

    @db.model
    class User:
        id: str
        name: str

    df.create_tables()  # DF-501 ERROR!
```

**Correct Pattern:**

```python
from kailash.dataflow import db

# CORRECT - Use async methods in async context
async def setup():
    df = kailash.DataFlow("postgresql://...")

    @db.model
    class User:
        id: str
        name: str

    await df.create_tables_async()  # Works correctly
```

## close_async() Method Details

The `close_async()` method properly cleans up all DataFlow resources:

```python
async def close_async(self):
    """Close database connections and clean up resources (async version)."""
    # Closes connection pool manager
    # Closes memory connections (SQLite)
    # Clears internal state
```

**Safe to Call Multiple Times:**

```python
await db.close_async()  # First call - cleans up
await db.close_async()  # Second call - no-op, safe
await db.close_async()  # Third call - no-op, safe
```

## Context Manager Support

DataFlow supports sync context managers for CLI/scripts:

```python
from kailash.dataflow import db

# Sync context manager (for CLI/scripts)
with kailash.DataFlow("sqlite:///dev.db") as df:
    @db.model
    class User:
        id: str
        name: str

    df.create_tables()  # OK in sync context
    # Automatic cleanup when exiting context

# For async contexts, use the lifespan pattern above
```

## References

- **Specialist**: `.claude/agents/frameworks/dataflow-specialist.md`
- **Pattern**: Async lifecycle management for DataFlow in async Python contexts

## Requirements

- Python 3.10+
