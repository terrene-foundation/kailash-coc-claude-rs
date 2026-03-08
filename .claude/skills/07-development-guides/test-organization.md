# Test Organization (NO MOCKING)

Test organization and the NO MOCKING policy for Kailash SDK testing.

## NO MOCKING Policy (CRITICAL)

### Why NO MOCKING?
- Mocks hide real integration issues
- Real infrastructure catches actual bugs
- Production-like testing prevents surprises
- Type mismatches discovered early
- Runtime behavior validated with real services

### What to Use Instead

**Tier 1: Unit Tests**
- Test actual node and workflow implementation
- Mock ONLY external dependencies (APIs, databases)
- Use kailash.Runtime for execution testing

**Tier 2: Integration Tests**
- Use real Docker services (PostgreSQL, Redis, Ollama)
- Test with kailash.Runtime and kailash.Runtime
- NO MOCKING of databases or infrastructure

**Tier 3: E2E Tests**
- Use real APIs (test endpoints, staging environments)
- Complete workflow scenarios with real services
- Test production-like deployments

## Test Directory Structure

```
tests/
├── unit/              # Tier 1: Individual nodes and components
│   ├── nodes/         # Node tests
│   ├── runtime/       # Runtime tests (kailash.Runtime, kailash.Runtime)
│   └── workflow/      # Workflow builder tests
├── integration/       # Tier 2: Real infrastructure
│   ├── database/      # Database workflow tests
│   ├── api/           # API integration tests
│   └── workflows/     # Multi-node workflow tests
├── e2e/              # Tier 3: Complete flows
│   ├── pipelines/     # Full pipeline tests
│   └── production/    # Production scenario tests
├── conftest.py       # Shared fixtures
└── utils/            # Test utilities
    ├── docker_config.py
    └── docker-compose.test.yml
```

## NO MOCKING Examples

### Wrong: Using Mocks in Integration Tests
```python
# ❌ DON'T DO THIS in integration/e2e tests
from unittest.mock import patch, Mock

@patch('requests.get')
def test_api_call(mock_get):
    mock_get.return_value = Mock(status_code=200, json=lambda: {"data": "test"})
    # BAD - mocking hides real issues
```

### Correct: Real Infrastructure
```python
import kailash

# ✅ DO THIS - Use real Docker services
def test_api_call():
    """Use real mock API Docker service."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("HTTPRequestNode", "api", {
        "url": "http://localhost:8888/v1/users",  # Real Docker mock-api
        "method": "GET"
    })

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["api"]["status_code"] == 200
    assert "data" in results["api"]["response"]
```

## Real Database Testing

### Using Docker PostgreSQL
```pythonfrom tests.utils.docker_config import get_postgres_connection_string
import pytest

@pytest.fixture
def postgres_db():
    """Real PostgreSQL database from Docker - NO MOCKING."""
    conn_string = get_postgres_connection_string()
    # Setup test schema
    yield conn_string
    # Cleanup handled by Docker restart

def test_database_workflow(postgres_db):
    """Test with real PostgreSQL database."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "db", {
        "connection_string": postgres_db,
        "query": "SELECT 1 as id, 'Alice' as name",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]
    assert len(results["db"]["data"]) == 1
    assert result["results"]["db"]["data"][0]["name"] == "Alice"
```

### Testing Both Runtimes
```python
import kailash

def test_database_workflow(postgres_db):
    """Test database workflow with real PostgreSQL."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLQueryNode", "db", {
        "connection_string": postgres_db,
        "query": "SELECT COUNT(*) as count FROM test_table",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]
```

## Shared Test Fixtures

### conftest.py Example
```python
import kailash

# tests/conftest.py
import pytest
from tests.utils.docker_config import (
    get_postgres_connection_string,
    get_redis_url,
    OLLAMA_CONFIG
)

@pytest.fixture(scope="session")
def postgres_connection():
    """Session-scoped PostgreSQL connection."""
    return get_postgres_connection_string()

@pytest.fixture(scope="session")
def redis_connection():
    """Session-scoped Redis connection."""
    return get_redis_url()

@pytest.fixture
def workflow_builder():
    """Fresh workflow builder for each test."""
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

## Running Tests by Tier

```bash
# Tier 1 - Unit tests (ALL unit tests)
pytest tests/unit/

# Tier 2 - Integration tests (ALL integration tests)
# Requires Docker services running
pytest tests/integration/

# Tier 3 - E2E tests (ALL e2e tests)
# Requires Docker services running
pytest tests/e2e/

# Run specific markers
pytest -m "requires_docker"
pytest -m "e2e"
```

## Critical Rules

1. **NO MOCKING in Tiers 2-3** - Use real Docker services via kailash.Runtime/kailash.Runtime
2. **Use real databases** - PostgreSQL, Redis from Docker
3. **Use real APIs** - Docker mock-api service
4. **Test both runtimes** - Parametrize tests for kailash.Runtime and kailash.Runtime
5. **Clean isolation** - Use fixtures for test data setup/teardown

## Related Patterns

- **Testing best practices**: [`testing-best-practices`](testing-best-practices.md)
- **Gold testing standard**: [`gold-testing`](../../17-gold-standards/gold-testing.md)
- **Runtime patterns**: [`runtime-execution`](../../01-core-sdk/runtime-execution.md)

## When to Escalate

Use `testing-specialist` subagent when:
- Complex test infrastructure setup needed
- User attempts to use mocks in Tiers 2-3 (redirect to real services)
- Test structure guidance required
- CI/CD integration issues

<!-- Trigger Keywords: test organization, NO MOCKING, 3-tier testing, test structure, real infrastructure -->
