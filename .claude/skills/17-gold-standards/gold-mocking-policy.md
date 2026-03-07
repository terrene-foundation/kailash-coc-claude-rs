---
name: gold-mocking-policy
description: "Testing policy requiring real infrastructure, no mocking for Tier 2-3 tests. Use when asking 'mocking policy', 'NO MOCKING', 'real infrastructure', 'test policy', 'mock guidelines', or 'testing standards'."
---

# Gold Standard: NO MOCKING Policy

NO MOCKING policy for integration and E2E tests - use real infrastructure with Runtime.

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `CRITICAL`

## Core Policy

### NO MOCKING in Tiers 2-3

**Tier 1 (Unit Tests)**: Mocking ALLOWED for external dependencies
**Tier 2 (Integration Tests)**: NO MOCKING - Use real Docker services
**Tier 3 (E2E Tests)**: NO MOCKING - Use real infrastructure

## Why NO MOCKING?

1. **Mocks hide real integration issues** - Type mismatches, connection errors, timing issues
2. **Real infrastructure catches actual bugs** - Validates actual behavior, not assumptions
3. **Production-like testing prevents surprises** - Discovers deployment issues early
4. **Runtime validation** - Tests Runtime with real services
5. **Better confidence** - Tests prove the code works with real systems

## What to Use Instead

### Tier 1: Unit Tests (Mocking Allowed)
```python
from unittest.mock import patch
import kailash

# ✅ ALLOWED in unit tests
@patch('requests.get')
def test_node_logic(mock_get):
    """Unit test can mock external dependencies."""
    mock_get.return_value.status_code = 200
    # Test node logic without real API
```

### Tier 2: Integration Tests (NO MOCKING)
```python
from tests.utils.docker_config import get_postgres_connection_string
import pytest

# ✅ CORRECT: Use real Docker PostgreSQL
@pytest.mark.requires_docker
def test_database_integration():
    """Integration test with real PostgreSQL - NO MOCKING."""
    conn_string = get_postgres_connection_string()

    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLDatabaseNode", "db", {
        "connection_string": conn_string,
        "query": "SELECT 1 as value",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]
    assert len(result["results"]["db"]["data"]) > 0

# ❌ WRONG: Mocking in integration tests
# from unittest.mock import patch
# @patch('sqlalchemy.create_engine')  # DON'T DO THIS
# def test_database_integration(mock_engine):
#     mock_engine.return_value = Mock(...)
```

### Tier 3: E2E Tests (NO MOCKING)
```python
import pytest

# ✅ CORRECT: Use real services for E2E
@pytest.mark.e2e
@pytest.mark.requires_docker
async def test_complete_pipeline():
    """E2E test with real infrastructure - NO MOCKING."""
    workflow = build_complete_etl_pipeline()

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(workflow)

    # All stages use real services
    assert result["results"]["extract"]["status"] == "success"
    assert result["results"]["transform"]["rows_processed"] > 0
    assert result["results"]["load"]["rows_inserted"] > 0
```

## Real Infrastructure Examples

### Real PostgreSQL Database
```python
from tests.utils.docker_config import get_postgres_connection_string

def test_with_real_postgres():
    """Use real PostgreSQL from Docker."""
    conn_string = get_postgres_connection_string()

    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLDatabaseNode", "db", {
        "connection_string": conn_string,
        "query": "SELECT * FROM users",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]
```

### Real Redis Cache
```python
from tests.utils.docker_config import get_redis_url
import redis

def test_with_real_redis():
    """Use real Redis from Docker."""
    redis_url = get_redis_url()
    redis_client = redis.from_url(redis_url)

    # Test with real Redis
    redis_client.set('test_key', 'test_value')
    assert redis_client.get('test_key') == b'test_value'
```

### Real API Service
```python
from tests.utils.docker_config import MOCK_API_CONFIG
import requests

def test_with_real_api():
    """Use real mock-api Docker service."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("HTTPRequestNode", "api", {
        "url": f"{MOCK_API_CONFIG['base_url']}/v1/users",
        "method": "GET"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["api"]["status_code"] == 200
```

## Testing with Real Services

```python
import pytest
from tests.utils.docker_config import get_postgres_connection_string

@pytest.mark.requires_docker
def test_database_with_real_services():
    """Test database operations with real infrastructure - NO MOCKING."""
    conn_string = get_postgres_connection_string()

    builder = kailash.WorkflowBuilder()
    builder.add_node("SQLDatabaseNode", "db", {
        "connection_string": conn_string,
        "query": "SELECT 1 as value",
        "operation": "select"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["db"]["success"]
```

## Available Docker Services

### Test Infrastructure
```bash
# Start all test services
cd tests/utils
docker-compose -f docker-compose.test.yml up -d

# Available services:
# - PostgreSQL: localhost:5434
# - Redis: localhost:6380
# - Ollama: localhost:11435
# - MySQL: localhost:3307
# - MongoDB: localhost:27017
# - Mock API: localhost:8888
```

### Using Docker Config
```python
from tests.utils.docker_config import (
    get_postgres_connection_string,  # PostgreSQL connection
    get_redis_url,                   # Redis URL
    OLLAMA_CONFIG,                   # Ollama config
    MOCK_API_CONFIG                  # Mock API config
)
```

## Common Violations and Fixes

### Violation 1: Mocking Database Connections
```python
# ❌ WRONG: Mocking database in integration test
from unittest.mock import patch, Mock

@patch('sqlalchemy.create_engine')
def test_database_query(mock_engine):
    mock_engine.return_value = Mock(...)
    # BAD - mocking hides real connection issues

# ✅ CORRECT: Use real database
from tests.utils.docker_config import get_postgres_connection_string

@pytest.mark.requires_docker
def test_database_query():
    conn_string = get_postgres_connection_string()
    # Use real PostgreSQL connection
```

### Violation 2: Mocking HTTP Requests
```python
# ❌ WRONG: Mocking requests in integration test
from unittest.mock import patch

@patch('requests.get')
def test_api_call(mock_get):
    mock_get.return_value.status_code = 200
    # BAD - mocking hides real API issues

# ✅ CORRECT: Use real mock-api service
from tests.utils.docker_config import MOCK_API_CONFIG

@pytest.mark.requires_docker
def test_api_call():
    url = f"{MOCK_API_CONFIG['base_url']}/v1/users"
    response = requests.get(url)
    assert response.status_code == 200
```

### Violation 3: Mocking Runtime Behavior
```python
# ❌ WRONG: Mocking runtime behavior
from unittest.mock import patch

@patch('kailash.Runtime.execute')
def test_workflow(mock_execute):
    mock_execute.return_value = {"results": {}, "run_id": "run_123", "metadata": {}}
    # BAD - not testing real runtime behavior

# ✅ CORRECT: Use real runtime

def test_workflow():
    builder = kailash.WorkflowBuilder()
    builder.add_node("PythonCodeNode", "node", {"code": "result = 42"})

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["node"]["result"] == 42
```

## Policy Summary

| Test Tier | Mocking Policy | Infrastructure | Runtime |
|-----------|---------------|----------------|---------|
| **Tier 1: Unit** | ✅ ALLOWED | In-memory, mocked | Runtime |
| **Tier 2: Integration** | ❌ NO MOCKING | Real Docker services | Runtime |
| **Tier 3: E2E** | ❌ NO MOCKING | Real infrastructure | Runtime |

## Related Patterns

- **Testing best practices**: [`testing-best-practices`](../../07-development-guides/testing-best-practices.md)
- **Test organization**: [`test-organization`](../../07-development-guides/test-organization.md)
- **Gold testing standard**: [`gold-testing`](gold-testing.md)

<!-- Trigger Keywords: mocking policy, NO MOCKING, real infrastructure, test policy, mock guidelines, testing standards -->
