---
name: test-3tier-strategy
description: "3-tier testing strategy overview. Use when asking '3-tier testing', 'testing strategy', or 'test tiers'."
---

# 3-Tier Testing Strategy

> **Skill Metadata**
> Category: `testing`
> Priority: `HIGH`

## Testing Pyramid

### Tier 1: Unit Tests (Fast, In-Memory)

```python
def test_workflow_build():
    """Test workflow construction"""
    builder = kailash.WorkflowBuilder()
    builder.add_node("LLMNode", "llm", {"prompt": "test"})
    reg = kailash.NodeRegistry()
    built = builder.build(reg)
    assert built is not None
```

### Tier 2: Integration Tests (Real Infrastructure)

```python
def test_llm_integration():
    """Test with real OpenAI API"""
    builder = kailash.WorkflowBuilder()
    builder.add_node("LLMNode", "llm", {
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
        "prompt": "Say hello"
    })
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    assert "hello" in result["results"]["llm"]["response"].lower()
```

### Tier 3: End-to-End Tests (Full System)

```python
@pytest.mark.e2e
def test_full_application():
    """Test complete application flow"""
    # Test API endpoint
    # Test database persistence
    # Test external integrations
```

## Test Distribution

- **Tier 1 (Unit)**: 70% - Fast feedback
- **Tier 2 (Integration)**: 25% - Real dependencies
- **Tier 3 (E2E)**: 5% - Critical paths

## NO MOCKING Policy

✅ **Use real infrastructure** in Tiers 2-3:

- Real OpenAI API calls
- Real databases (SQLite/PostgreSQL)
- Real file systems

❌ **No mocks** for:

- LLM providers
- Databases
- External APIs (in integration tests)

## Resource Cleanup

Tests that use database connections or other resources should manage cleanup through pytest fixtures:

```python
import pytest
import kailash

@pytest.fixture
def runtime():
    """Runtime with fresh registry -- cleaned up after each test."""
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    yield rt
    # Resources are cleaned up when Runtime is garbage collected

def test_with_db_pool(runtime):
    """Test with database resources."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "db", {
        "connection_string": "postgresql://test:test@localhost:5433/testdb",
        "query": "SELECT 1",
        "operation": "select"
    })
    reg = kailash.NodeRegistry()
    result = runtime.execute(builder.build(reg))
    assert result["results"]["db"]["success"]
    # Resources cleaned up in LIFO order when fixture teardown runs
```

## Runtime Parity Testing

Test workflows against **both** Runtime and Runtime using shared fixtures:

```python
import pytest
import kailash

def test_workflow_execution():
    """Test workflow execution with Runtime."""
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    workflow = create_test_workflow()

    result = rt.execute(workflow, inputs={"input": "data"})

    assert result["results"]["output_node"]["result"] == expected_value
```

**Key Features:**

- Parametrized fixtures run same test on both runtimes
- `execute_runtime()` helper normalizes parameters and return structures
- Ensures identical behavior between sync and async runtimes
- Located in `tests/shared/runtime/` directory

## Documentation

- **Testing Rules**: See `rules/testing.md` for NO MOCKING policy

<!-- Trigger Keywords: 3-tier testing, testing strategy, test tiers, testing pyramid, unit tests, integration tests -->
