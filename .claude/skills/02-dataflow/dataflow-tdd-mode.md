---
name: dataflow-tdd-mode
description: "DataFlow TDD mode for fast isolated tests. Use when DataFlow TDD, test isolation, savepoint, fast tests, or <100ms tests DataFlow."
---

# DataFlow TDD Mode

> **Rust Binding Caveat**: `tdd_mode` is a pure Python SDK feature. The Rust-backed binding (`kailash-enterprise`) does not support this parameter. For testing with the Rust binding, use separate test databases or SQLite in-memory databases (`:memory:`).

Lightning-fast isolated tests (<100ms) using savepoint-based rollback for DataFlow.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`test-3tier-strategy`](#), [`dataflow-models`](#)
> Related Subagents: `dataflow-specialist`, `testing-specialist`

## Quick Reference

- **TDD Mode**: Savepoint isolation - each test rollsback
- **Speed**: <100ms per test (no cleanup needed)
- **Isolation**: Tests don't affect each other
- **Pattern**: Use in-memory SQLite or transaction wrappers

## Core Pattern

```python
import pytest
import kailash

reg = kailash.NodeRegistry()

@pytest.fixture
def db():
    """TDD mode - savepoint isolation."""
    df = kailash.DataFlow(
        ":memory:",  # In-memory for speed; provides natural isolation
        auto_migrate=True,
    )

    @df.model
    class User:
        name: str
        email: str

    yield db
    # Automatic rollback via savepoint

def test_user_creation(db):
    """Test runs in <100ms with isolation."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("UserCreateNode", "create", {
        "name": "Test User",
        "email": "test@example.com"
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["create"]["result"]["name"] == "Test User"
    # Automatic rollback - no cleanup needed
```

## TDD Mode Features

### Savepoint Isolation

```python
@pytest.fixture
def isolated_db():
    db = kailash.DataFlow(":memory:")  # In-memory DB provides per-fixture isolation

    @db.model
    class Product:
        name: str
        price: float

    yield db
    # In-memory DB is discarded when fixture tears down

def test_product_1(isolated_db):
    # Create product
    # ... test logic ...
    pass  # Rolled back

def test_product_2(isolated_db):
    # Fresh state - no data from test_product_1
    pass
```

### Fast Test Execution

```python
def test_suite_performance(db):
    """100 tests in <10 seconds."""
    for i in range(100):
        builder = kailash.WorkflowBuilder()
        builder.add_node("UserCreateNode", f"create_{i}", {
            "name": f"User {i}",
            "email": f"user{i}@test.com"
        })
        rt = kailash.Runtime(reg)
        result = rt.execute(builder.build(reg))
        # Each test <100ms with rollback
```

## Common Mistakes

### Mistake 1: Manual Cleanup Instead of In-Memory DB

```python
# SLOW - Full cleanup needed
@pytest.fixture
def db():
    db = kailash.DataFlow("sqlite:///test.db")
    yield db
    # Manual cleanup - slow!
    db.drop_all_tables()
```

**Fix: Use In-Memory SQLite**

```python
@pytest.fixture
def db():
    db = kailash.DataFlow(":memory:")  # Fresh DB per fixture invocation
    yield db
    # No cleanup needed - in-memory DB is discarded automatically
```

## Documentation References

### Related Documentation

- **DataFlow Specialist**: [`.claude/skills/dataflow-specialist.md`](../../dataflow-specialist.md#L893-L940)
- **Test Strategy**: [`test-3tier-strategy`](#)

## Quick Tips

- Use `:memory:` SQLite for maximum speed and natural isolation
- Each test <100ms with in-memory DB
- No manual cleanup needed (in-memory DB is discarded per fixture)
- Perfect for unit tests (Tier 1)
- `tdd_mode` is NOT available in the Rust binding; use `:memory:` instead

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow TDD, test isolation, savepoint, fast tests, DataFlow testing, <100ms tests, test mode, isolated tests -->
