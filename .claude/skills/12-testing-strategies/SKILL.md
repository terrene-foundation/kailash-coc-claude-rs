---
name: testing-strategies
description: "Comprehensive testing strategies for Kailash applications including the 3-tier testing approach with NO MOCKING policy for Tiers 2-3. Use when asking about 'testing', 'test strategy', '3-tier testing', 'unit tests', 'integration tests', 'end-to-end tests', 'testing workflows', 'testing DataFlow', 'testing Nexus', 'NO MOCKING', 'real infrastructure', 'test organization', or 'testing best practices'."
---

# Kailash Testing Strategies

Comprehensive testing approach for Kailash applications using the 3-tier testing strategy with NO MOCKING policy.

## Overview

Kailash testing philosophy:

- **3-Tier Strategy**: Unit, Integration, End-to-End
- **NO MOCKING Policy**: Tiers 2-3 use real infrastructure
- **Real Database Testing**: Actual PostgreSQL/SQLite
- **Real API Testing**: Live HTTP calls
- **Real LLM Testing**: Actual model calls (with caching)

## Reference Documentation

### Core Strategy

- **[test-3tier-strategy](test-3tier-strategy.md)** - Complete 3-tier testing guide
  - Tier 1: Unit Tests (test doubles allowed)
  - Tier 2: Integration Tests (NO MOCKING)
  - Tier 3: End-to-End Tests (NO MOCKING)
  - Test organization
  - Helper function patterns
  - CI/CD integration

## 3-Tier Testing Strategy

### Tier 1: Unit Tests

**Scope**: Individual functions and classes
**Mocking**: Allowed (test doubles, fakes)
**Speed**: Fast (< 1s per test)

```python
import kailash

def test_workflow_builder():
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("LogNode", "node1", {})
    wf = builder.build(reg)
    assert wf is not None
```

### Tier 2: Integration Tests

**Scope**: Component integration (workflows, database, APIs)
**Mocking**: NO MOCKING
**Speed**: Medium (1-10s per test)

```python
import kailash
import os
import pytest

@pytest.mark.integration
def test_dataflow_crud():
    db_url = os.environ["DATABASE_URL"]

    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "create", {
        "connection_string": db_url,
        "query": "INSERT INTO users (name) VALUES ($1) RETURNING id",
        "parameters": ["Test"],
    })

    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf)

    assert "create" in result["results"]
```

### Tier 3: End-to-End Tests

**Scope**: Complete user workflows
**Mocking**: NO MOCKING
**Speed**: Slow (10s+ per test)

```python
import requests
import pytest

@pytest.mark.e2e
def test_user_registration_flow():
    response = requests.post("http://localhost:3000/api/register", json={
        "email": "test@example.com",
        "name": "Test User",
    })

    assert response.status_code == 200
    body = response.json()
    assert "user_id" in body
```

## NO MOCKING Policy

### Why No Mocking in Tiers 2-3?

**Real Issues Found**:

- Database constraint violations
- API timeout problems
- Race conditions
- Connection pool exhaustion
- Schema migration issues
- LLM token limits

**Mocking Hides**:

- Real-world latency
- Actual error conditions
- Integration bugs
- Performance issues

### What to Use Instead

**Real Infrastructure**:

- Test databases (Docker containers)
- Test API endpoints
- Test LLM accounts (with caching)
- Test file systems (temp directories via `tempfile` module)

## Test Organization

### Directory Structure

```
project/
  src/
    app/
      main.py
  tests/
    unit/               # Tier 1
      test_workflows.py
      test_models.py
    integration/        # Tier 2
      test_dataflow.py
      test_nexus.py
    e2e/                # Tier 3
      test_user_flows.py
  conftest.py           # Shared fixtures
  pytest.ini            # Test configuration
```

### pytest Configuration

```ini
# pytest.ini
[pytest]
markers =
    integration: Integration tests (require real database)
    e2e: End-to-end tests (require running services)
testpaths = tests
```

## Testing Different Components

### Testing Workflows

```python
import kailash

def test_workflow_execution():
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("JSONTransformNode", "calc", {
        "expression": "@.value",
    })

    wf = builder.build(reg)
    rt = kailash.Runtime(reg)

    result = rt.execute(wf, {"data": {"value": 42}})
    assert "calc" in result["results"]
```

### Testing DataFlow

```python
import kailash
import os
import pytest

@pytest.mark.integration
def test_dataflow_operations():
    db_url = os.environ["DATABASE_URL"]
    df = kailash.DataFlow(db_url)

    # Real database operations
    model = kailash.ModelDefinition("test_users")
    model.add_field("name", kailash.FieldType.string(), required=True)
    df.register_model(model)
```

### Testing Nexus

```python
import requests
import pytest

@pytest.mark.e2e
def test_nexus_api():
    response = requests.post(
        "http://localhost:3000/api/workflow/test_workflow",
        json={"input": "data"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "result" in body
```

### Testing Kaizen Agents

```python
from kailash.kaizen import BaseAgent
import os
import pytest

@pytest.mark.integration
def test_agent_execution():
    # Real LLM call (use caching to reduce costs)
    class TestAgent(BaseAgent):
        def run(self, input_text):
            return {"response": f"Processed: {input_text}"}

    agent = TestAgent(name="test")
    result = agent.run("Test query")
    assert result["response"]
```

## Critical Rules

- Tier 1: Test doubles for external dependencies allowed
- Tier 2-3: Use real infrastructure
- Use Docker for test databases
- Clean up resources after tests
- Cache LLM responses for cost
- Run Tier 1 in CI, Tier 2-3 optionally
- NEVER use mock frameworks in Tier 2-3
- NEVER mock database in Tier 2-3
- NEVER mock HTTP calls in Tier 2-3
- NEVER skip resource cleanup
- NEVER commit test credentials (use `.env`)

## Running Tests

### Local Development

```bash
# Run all unit tests
pytest tests/unit/

# Run by tier
pytest tests/unit/                          # Tier 1: Unit
pytest tests/integration/ -m integration    # Tier 2: Integration
pytest tests/e2e/ -m e2e                    # Tier 3: E2E

# Run with coverage
pytest --cov=src --cov-report=html tests/
```

### CI/CD

```bash
# Fast CI (Tier 1 only)
pytest tests/unit/
flake8 src/

# Full CI (all tiers)
docker compose -f tests/docker-compose.test.yml up -d
pytest tests/ -m "not e2e or integration"
docker compose -f tests/docker-compose.test.yml down
```

## Best Practices

### Test Quality

- Write descriptive test names (snake_case)
- Use AAA pattern (Arrange, Act, Assert)
- Test both success and failure cases
- Clean up resources properly
- Use fixtures for setup/teardown

### Performance

- Use test database containers
- Cache expensive operations
- Run tests in parallel (`pytest-xdist`)
- Mark slow tests with `@pytest.mark.slow`

### Maintenance

- Keep tests close to code
- Update tests with code changes
- Review test coverage regularly
- Remove obsolete tests

## Related Skills

- **[02-dataflow](../02-dataflow/SKILL.md)** - DataFlow testing
- **[03-nexus](../03-nexus/SKILL.md)** - API testing
- **[17-gold-standards](../17-gold-standards/SKILL.md)** - Testing best practices

## Support

For testing help, invoke:

- `testing-specialist` - Testing strategies and patterns
- `tdd-implementer` - Test-driven development
- `dataflow-specialist` - DataFlow testing patterns
