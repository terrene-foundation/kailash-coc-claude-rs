---
name: gold-test-creation
description: "Test creation standards with 3-tier strategy, fixtures, and real infrastructure requirements. Use when asking 'test standards', 'test creation', 'test guidelines', '3-tier testing', 'test requirements', or 'testing gold standard'."
---

# Gold Standard: Test Creation

Test creation guide with patterns, examples, and best practices for Kailash SDK.

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `HIGH`

## Test Creation Pattern

### Basic Test Structure
```python
import kailash
import pytest

def test_workflow_execution():
    """Test workflow execution with Runtime."""
    # Arrange: Build workflow
    builder = kailash.WorkflowBuilder()
    builder.add_node("PythonCodeNode", "process", {
        "code": "result = {'status': 'success', 'value': 42}"
    })

    # Act: Execute workflow
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Assert: Verify results
    assert result["results"]["process"]["result"]["status"] == "success"
    assert result["results"]["process"]["result"]["value"] == 42
    assert result["run_id"] is not None
```

### Async Test Pattern
```python
import pytest

@pytest.mark.asyncio
async def test_async_workflow_execution():
    """Test workflow execution with Runtime."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("PythonCodeNode", "process", {
        "code": "result = {'status': 'completed'}"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["process"]["result"]["status"] == "completed"
```

## 3-Tier Test Creation

### Tier 1: Unit Tests
```python
# tests/unit/test_workflow_builder.py

def test_workflow_builder_creates_workflow():
    """Test WorkflowBuilder creates valid workflow."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("PythonCodeNode", "node", {"code": "result = 1"})

    reg = kailash.NodeRegistry()
    built_workflow = builder.build(reg)
    assert built_workflow is not None
    assert "node" in built_workflow.graph

def test_workflow_builder_adds_connection():
    """Test WorkflowBuilder adds connections correctly."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("PythonCodeNode", "source", {"code": "result = {'data': 42}"})
    builder.add_node("PythonCodeNode", "target", {"code": "result = data"})
    builder.add_connection("source", "result.data", "target", "data")

    reg = kailash.NodeRegistry()
    built_workflow = builder.build(reg)
    assert built_workflow is not None
```

### Tier 2: Integration Tests (NO MOCKING)
```python
# tests/integration/test_database_workflows.py
import pytest
from tests.utils.docker_config import get_postgres_connection_string

@pytest.mark.requires_docker
def test_database_query_workflow():
    """Test database query with real PostgreSQL - NO MOCKING."""
    conn_string = get_postgres_connection_string()

    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLDatabaseNode", "db", {
        "connection_string": conn_string,
        "query": "SELECT 1 as id, 'test' as name",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]
    assert len(result["results"]["db"]["data"]) == 1
    assert result["results"]["db"]["data"][0]["name"] == "test"
```

### Tier 3: E2E Tests
```python
# tests/e2e/test_complete_pipeline.py
import pytest

@pytest.mark.e2e
@pytest.mark.requires_docker
async def test_complete_etl_pipeline():
    """Test complete ETL pipeline end-to-end."""
    workflow = build_etl_pipeline()

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(workflow)

    # Verify all stages completed
    assert result["results"]["extract"]["status"] == "success"
    assert result["results"]["transform"]["rows_processed"] > 0
    assert result["results"]["load"]["rows_inserted"] > 0
    assert result["results"]["validate"]["errors"] == []
```

## Test Fixtures

### Workflow Fixtures
```python
# tests/conftest.py
import pytest

@pytest.fixture
def workflow_builder():
    """Fresh WorkflowBuilder for each test."""
    return kailash.WorkflowBuilder()

@pytest.fixture
def registry():
    """NodeRegistry instance."""
    return kailash.NodeRegistry()

@pytest.fixture
def runtime(registry):
    """Runtime instance with registry."""
    return kailash.Runtime(registry)
```

### Infrastructure Fixtures
```python
# tests/conftest.py
from tests.utils.docker_config import (
    get_postgres_connection_string,
    get_redis_url
)

@pytest.fixture(scope="session")
def postgres_connection():
    """Session-scoped PostgreSQL connection."""
    return get_postgres_connection_string()

@pytest.fixture(scope="session")
def redis_connection():
    """Session-scoped Redis connection."""
    return get_redis_url()
```

## Parametrized Testing

### Testing Workflow Execution
```python
def test_workflow_returns_correct_value(workflow_builder, registry, runtime):
    """Test workflow returns expected value."""
    workflow_builder.add_node("PythonCodeNode", "node", {
        "code": "result = {'value': 100}"
    })

    result = runtime.execute(workflow_builder.build(registry))

    assert result["results"]["node"]["result"]["value"] == 100
    assert result["run_id"] is not None
```

### Testing Multiple Scenarios
```python
@pytest.mark.parametrize("input_value,expected", [
    (10, 20),
    (5, 10),
    (0, 0),
    (-5, -10)
])
def test_double_value_workflow(input_value, expected, workflow_builder, registry, runtime):
    """Test workflow doubles input value correctly."""
    workflow_builder.add_node("PythonCodeNode", "double", {
        "code": "result = {'value': input_val * 2}"
    })

    result = runtime.execute(
        workflow_builder.build(registry),
        parameters={"double": {"input_val": input_value}}
    )

    assert result["results"]["double"]["result"]["value"] == expected
```

## Error Testing

### Testing Error Handling
```python
import pytest

def test_missing_required_parameter_raises_error(workflow_builder, registry, runtime):
    """Test that missing required parameters raise validation error."""
    workflow_builder.add_node("RequiredParamNode", "node", {})

    with pytest.raises(WorkflowValidationError, match="missing required inputs"):
        runtime.execute(workflow_builder.build(registry))
```

## Test Organization Standards

### File Naming
```
tests/
├── unit/
│   └── test_<component>.py        # test_ prefix required
├── integration/
│   └── test_<integration>.py      # test_ prefix required
└── e2e/
    └── test_<scenario>.py         # test_ prefix required
```

### Test Naming
```python
# ✅ GOOD: Descriptive test names
def test_workflow_execution_with_valid_parameters_returns_success():
    pass

def test_database_connection_with_invalid_credentials_raises_error():
    pass

# ❌ BAD: Generic test names
def test_workflow():
    pass

def test_db():
    pass
```

## Test Standards Checklist

- [ ] Test uses `kailash.Runtime(reg)` with `kailash.NodeRegistry()`
- [ ] Test organized in correct tier (unit/, integration/, e2e/)
- [ ] NO MOCKING in integration/e2e tests (use real Docker services)
- [ ] Clear, descriptive test name
- [ ] Proper fixtures for test isolation
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] Parametrized for multiple scenarios (where applicable)
- [ ] Result accessed via `result["results"]`, `result["run_id"]`, `result["metadata"]`
- [ ] Proper pytest markers (@pytest.mark.requires_docker, @pytest.mark.e2e)

## Related Patterns

- **Testing best practices**: [`testing-best-practices`](../../07-development-guides/testing-best-practices.md)
- **Test organization**: [`test-organization`](../../07-development-guides/test-organization.md)
- **Gold testing standard**: [`gold-testing`](gold-testing.md)

## When to Escalate

Use `testing-specialist` subagent when:
- Complex test infrastructure needed
- Custom fixtures required
- CI/CD integration issues
- Performance testing strategy

<!-- Trigger Keywords: test standards, test creation, test guidelines, 3-tier testing, test requirements, testing gold standard -->
