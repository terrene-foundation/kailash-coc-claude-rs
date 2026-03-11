---
name: gold-testing
description: "Gold standard for testing. Use when asking 'testing standard', 'testing best practices', or 'how to test'."
---

# Gold Standard: Testing

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `HIGH`

## Testing Principles

### 1. Test-First Development
```python
import kailash

# ✅ Write test FIRST
def test_user_workflow():
    """Test user creation workflow."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "create", {
        "code": "email = 'test@example.com'\ncreated = True",
        "output_vars": ["email", "created"]
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["create"]["outputs"]["email"] == "test@example.com"
    assert result["results"]["create"]["outputs"]["created"] is True

# Then implement the actual workflow
```

### 2. 3-Tier Testing Strategy

```python
# Tier 1: Unit (fast, in-memory)
def test_workflow_build():
    """Test workflow construction."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "process", {"code": "result = 42", "output_vars": ["result"]})

    reg = kailash.NodeRegistry()
    assert builder.build(reg) is not None

# Tier 2: Integration (real infrastructure)
def test_database_integration():
    """Test with real PostgreSQL - NO MOCKING."""
    from tests.utils.docker_config import get_postgres_connection_string

    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "db", {
        "connection_string": get_postgres_connection_string(),
        "query": "SELECT 1 as value",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]

# Tier 3: E2E (full system)
import pytest

@pytest.mark.e2e
@pytest.mark.requires_docker
async def test_full_pipeline():
    """Test complete pipeline."""

    workflow = build_complete_pipeline()

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(workflow)

    assert result["results"]["extract"]["status"] == "success"
    assert result["results"]["load"]["rows_inserted"] > 0
```

### 3. NO MOCKING (Tiers 2-3)

```python
# ✅ GOOD: Real infrastructure in integration tests
def test_database_operations():
    """Use real Docker PostgreSQL."""
    from tests.utils.docker_config import get_postgres_connection_string

    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "db", {
        "connection_string": get_postgres_connection_string(),
        "query": "SELECT * FROM users",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]

# ❌ BAD: Mocking in integration tests
# from unittest.mock import patch
# @patch("sqlalchemy.create_engine")  # DON'T DO THIS
# def test_database(mock_engine):
#     mock_engine.return_value = {...}
```

### 4. Clear Test Names

```python
# ✅ GOOD: Descriptive names
def test_user_creation_with_valid_email_succeeds():
    pass

def test_user_creation_with_invalid_email_fails():
    pass

def test_workflow_execution_with_runtime_returns_result_dict():
    pass

# ❌ BAD: Generic names
def test_user_1():
    pass

def test_workflow():
    pass
```

### 5. Test Isolation

```python
import pytest

@pytest.fixture
def clean_builder():
    """Each test gets fresh workflow builder."""
    builder = kailash.WorkflowBuilder()
    yield builder
    # Cleanup if needed

@pytest.fixture
def runtime():
    """Runtime instance with registry."""
    reg = kailash.NodeRegistry()
    return kailash.Runtime(reg)

def test_one(clean_builder, runtime):
    """Isolated test with clean workflow."""
    clean_builder.add_node("EmbeddedPythonNode", "node", {"code": "result = 1", "output_vars": ["result"]})
    reg = kailash.NodeRegistry()
    result = runtime.execute(clean_builder.build(reg))
    assert result["results"]["node"]["outputs"]["result"] == 1

def test_two(clean_builder, runtime):
    """Another isolated test with fresh workflow."""
    clean_builder.add_node("EmbeddedPythonNode", "node", {"code": "result = 2", "output_vars": ["result"]})
    reg = kailash.NodeRegistry()
    result = runtime.execute(clean_builder.build(reg))
    assert result["results"]["node"]["outputs"]["result"] == 2
```

### 6. Testing with Runtime

```python
def test_workflow_execution():
    """Test workflow executes correctly."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "node", {
        "code": "status = 'completed'",
        "output_vars": ["status"]
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["node"]["outputs"]["status"] == "completed"
    assert result["run_id"] is not None
```

### 7. Resource Cleanup

```python
import pytest

@pytest.fixture
def runtime():
    """Runtime with fresh registry -- cleaned up after each test."""
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    yield rt
    # Runtime cleanup happens on garbage collection

def test_workflow_with_resources(runtime):
    """Test that uses database resources."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "db", {
        "connection_string": "postgresql://test:test@localhost:5433/testdb",
        "query": "SELECT 1 as value",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    result = runtime.execute(builder.build(reg))
    assert result["results"]["db"]["success"]

# Resources (database pools, etc.) are cleaned up in LIFO order
# when the Runtime is garbage collected
```

## Testing Checklist

- [ ] Test written before implementation (TDD)
- [ ] All 3 tiers covered (unit, integration, E2E)
- [ ] NO MOCKING in Tiers 2-3 (use real Docker services)
- [ ] Clear, descriptive test names
- [ ] Test isolation with fixtures
- [ ] Resource cleanup via pytest fixtures for Runtime lifecycle
- [ ] Tests run in CI/CD
- [ ] 80%+ code coverage
- [ ] Error cases tested
- [ ] Edge cases tested
- [ ] Runtime tested with NodeRegistry
- [ ] Real infrastructure via Docker (PostgreSQL, Redis, Ollama)
- [ ] Tests organized in correct tier (unit/, integration/, e2e/)

## Related Patterns

- **Test organization**: [`test-organization`](../../07-development-guides/test-organization.md)
- **Testing best practices**: [`testing-best-practices`](../../07-development-guides/testing-best-practices.md)
- **Runtime execution**: [`runtime-execution`](../../01-core-sdk/runtime-execution.md)

<!-- Trigger Keywords: testing standard, testing best practices, how to test, testing gold standard, test guidelines -->
