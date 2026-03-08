---
name: dataflow-tdd-api
description: "DataFlow TDD fixtures and testing API. Use when asking 'test dataflow', 'dataflow fixtures', or 'dataflow testing api'."
---

# DataFlow TDD API

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`

## Test Fixtures

```python
import pytest
import kailash

reg = kailash.NodeRegistry()

@pytest.fixture
def test_db():
    """In-memory SQLite for tests"""
    df = kailash.DataFlow("sqlite:///:memory:")

    @db.model
    class User:
        id: str
        email: str

    df.create_tables()
    yield db
    df.close()

def test_user_creation(test_db):

    builder = kailash.WorkflowBuilder()
    builder.add_node("UserCreateNode", "create", {
        "id": "user_001",
        "email": "test@example.com"
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["create"]["id"] == "user_001"
    assert result["results"]["create"]["email"] == "test@example.com"
```

## Isolation Patterns

```python
@pytest.fixture(scope="function")
def isolated_db():
    """Each test gets isolated database"""
    db = kailash.DataFlow("sqlite:///:memory:")
    db.create_tables()
    yield db
    db.close()  # Clean up

def test_isolation_1(isolated_db):
    # This test's data won't affect test_isolation_2
    pass

def test_isolation_2(isolated_db):
    # Clean slate - no data from test_isolation_1
    pass
```

<!-- Trigger Keywords: test dataflow, dataflow fixtures, dataflow testing api, dataflow unit tests -->
