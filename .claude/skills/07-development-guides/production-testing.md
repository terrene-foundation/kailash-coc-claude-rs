# Production Testing

You are an expert in production-quality testing for Kailash SDK. Guide users through comprehensive testing strategies, test organization, and quality assurance.

## Core Responsibilities

### 1. 3-Tier Testing Strategy

- **Tier 1**: Unit tests - Individual node testing
- **Tier 2**: Integration tests - Multi-node workflows with real infrastructure
- **Tier 3**: End-to-end tests - Complete workflows with external services

### 2. Tier 1: Unit Tests (Node-Level)

```python
import kailash
import pytest

def test_python_code_node_execution():
    """Test individual node execution via workflow."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "test_node", {
        "code": "result = {'status': 'success', 'value': input_value * 2}"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), inputs={
        "test_node": {"input_value": 10}
    })

    assert result["results"]["test_node"]["result"]["status"] == "success"
    assert result["results"]["test_node"]["result"]["value"] == 20

def test_python_code_node_error_handling():
    """Test node error handling."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "test_node", {
        "code": "result = 1 / 0"  # Division by zero
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    with pytest.raises(Exception):
        rt.execute(builder.build(reg))

def test_parameter_validation():
    """Test parameter validation."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("HTTPRequestNode", "test_node", {
        "url": "https://api.example.com",
        "method": "GET"
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    assert "test_node" in result["results"]
```

### 3. Tier 2: Integration Tests (Real Infrastructure)

```python
import kailash

import pytest
@pytest.fixture
def test_database():
    """Setup test database - NO MOCKING."""
    import sqlite3
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE test_data (
            id INTEGER PRIMARY KEY,
            value TEXT
        )
    """)
    cursor.execute("INSERT INTO test_data VALUES (1, 'test')")
    conn.commit()
    yield conn
    conn.close()

def test_database_workflow_integration(test_database):
    """Test workflow with real database - NO MOCKS."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("SQLQueryNode", "reader", {
        "connection_string": "sqlite:///:memory:",
        "query": "SELECT * FROM test_data"
    })

    builder.add_node("EmbeddedPythonNode", "processor", {
        "code": """
result = {
    'count': len(data),
    'values': [row['value'] for row in data]
}
"""
    })

    builder.connect("reader", "data", "processor", "data")  # SQLQueryNode outputs "data"

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), inputs={
        "reader": {"connection_string": "sqlite:///:memory:"}
    })

    assert result["results"]["processor"]["result"]["count"] > 0
    assert "test" in result["results"]["processor"]["result"]["values"]

def test_api_workflow_integration():
    """Test workflow with real API - NO MOCKS."""
    builder = kailash.WorkflowBuilder()

    # Use real test API (jsonplaceholder)
    builder.add_node("HTTPRequestNode", "api_call", {
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "method": "GET"
    })

    builder.add_node("EmbeddedPythonNode", "validator", {
        "code": """
result = {
    'valid': isinstance(response, dict),
    'has_title': 'title' in response,
    'title': response.get('title')
}
"""
    })

    builder.connect("api_call", "body", "validator", "response")

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    assert result["results"]["validator"]["result"]["valid"]
    assert result["results"]["validator"]["result"]["has_title"]
```

### 4. Tier 3: End-to-End Tests

```python
import kailash

@pytest.mark.e2e
def test_complete_etl_pipeline():
    """Test complete ETL pipeline end-to-end."""
    builder = kailash.WorkflowBuilder()

    # Extract
    builder.add_node("CSVProcessorNode", "extract", {
        "action": "read",
        "source_path": "tests/data/test_input.csv"
    })

    # Transform
    builder.add_node("EmbeddedPythonNode", "transform", {
        "code": """
import pandas as pd
df = pd.DataFrame(data)

# Clean and transform
df['value'] = df['value'].fillna(0)
df['category'] = df['category'].str.upper()

result = {'transformed_data': df.to_dict('records')}
"""
    })

    # Load
    builder.add_node("FileWriterNode", "load", {
        "path": "tests/output/test_output.csv"
    })

    # Connections
    builder.connect("extract", "rows", "transform", "data")
    builder.connect("transform", "result", "load", "content")

    # Execute
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Verify output file exists and has correct data
    import os
    assert os.path.exists("tests/output/test_output.csv")

    # Verify data integrity
    output_df = pd.read_csv("tests/output/test_output.csv")
    assert len(output_df) > 0
    assert 'category' in output_df.columns
    assert all(output_df['category'].str.isupper())
```

### 5. Test Organization (NO MOCKING Policy)

```python
# tests/unit/test_nodes.py
"""Unit tests for individual nodes."""

# tests/integration/test_workflows.py
"""Integration tests with real infrastructure."""

# tests/e2e/test_complete_flows.py
"""End-to-end tests of complete workflows."""

# conftest.py
import pytest

@pytest.fixture(scope="session")
def test_database():
    """Real test database - NO MOCKING."""
    # Setup real database
    pass

@pytest.fixture
def cleanup_files():
    """Clean up test files after tests."""
    yield
    # Cleanup logic
    import os
    import shutil
    if os.path.exists("tests/output"):
        shutil.rmtree("tests/output")
```

### 6. Async Testing

```python
import kailash

import pytest
@pytest.mark.asyncio
async def test_async_workflow():
    """Test async workflow execution."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("EmbeddedPythonNode", "async_processor", {
        "code": """
import asyncio
await asyncio.sleep(0.1)
result = {'processed': True}
"""
    })

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), inputs={})

    assert result["results"]["async_processor"]["result"]["processed"]

@pytest.mark.asyncio
async def test_async_api_calls():
    """Test async API calls."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("HTTPRequestNode", "api_call", {
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "method": "GET"
    })

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), inputs={})

    assert "api_call" in results
    assert result["results"]["api_call"]["status_code"] == 200
```

### 7. Test Coverage and Assertions

```python
import kailash

def test_comprehensive_workflow_coverage():
    """Test all execution paths in workflow."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("EmbeddedPythonNode", "input", {
        "code": "result = {'value': input_value}"
    })

    # SwitchNode for multi-branch routing
    builder.add_node("SwitchNode", "router", {
        "cases": {"high": "high_path", "low": "low_path"},
        "default_branch": "low_path"
    })
    # SwitchNode outputs: "matched" (branch name) and "data" (forwarded)
    builder.connect("input", "result", "router", "condition")
    builder.connect("router", "data", "high_path", "value")
    builder.connect("router", "data", "low_path", "value")

    builder.add_node("EmbeddedPythonNode", "high_path", {
        "code": "result = {'category': 'high', 'value': value}"
    })

    builder.add_node("EmbeddedPythonNode", "low_path", {
        "code": "result = {'category': 'low', 'value': value}"
    })

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)

    # Test high path
    results_high, _ = rt.execute(builder.build(reg), inputs={
        "input": {"input_value": 75}
    })
    assert results_high["high_path"]["result"]["category"] == "high"

    # Test low path
    results_low, _ = rt.execute(builder.build(reg), inputs={
        "input": {"input_value": 25}
    })
    assert results_low["low_path"]["result"]["category"] == "low"

    # Test boundary
    results_boundary, _ = rt.execute(builder.build(reg), inputs={
        "input": {"input_value": 50}
    })
    assert results_boundary["low_path"]["result"]["category"] == "low"
```

### 8. Production Test Best Practices

```python
import kailash

# 1. Use fixtures for setup/teardown
@pytest.fixture(scope="module")
def production_config():
    """Production-like configuration."""
    return {
        "database_url": "sqlite:///:memory:",
        "api_timeout": 30,
        "retry_attempts": 3
    }

# 2. Test error scenarios
def test_error_recovery():
    """Test workflow error recovery."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("EmbeddedPythonNode", "risky_op", {
        "code": """
try:
    result = {'value': 1 / divisor}
except ZeroDivisionError:
    result = {'value': 0, 'error': 'division_by_zero'}
"""
    })

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    results, _ = rt.execute(builder.build(reg), inputs={
        "risky_op": {"divisor": 0}
    })

    assert result["results"]["risky_op"]["result"]["error"] == "division_by_zero"

# 3. Test performance
import time

def test_workflow_performance():
    """Test workflow execution performance."""
    workflow = create_complex_workflow()

    start_time = time.time()
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    results, _ = rt.execute(builder.build(reg))
    execution_time = time.time() - start_time

    assert execution_time < 5.0  # Should complete in under 5 seconds
```

## Critical Testing Rules

1. **NO MOCKING in Tiers 2-3**: Use real infrastructure
2. **Test All Paths**: Ensure complete code coverage
3. **Real Data**: Use realistic test data
4. **Error Scenarios**: Test failures, not just successes
5. **Async Testing**: Use pytest-asyncio for async workflows
6. **Cleanup**: Always clean up test artifacts

## When to Engage

- User asks about "production testing", "quality assurance", "testing strategy"
- User needs testing guidance
- User wants to improve test coverage
- User has questions about test organization

## Integration with Other Skills

- Route to **testing-best-practices** for testing strategies
- Route to **test-organization** for NO MOCKING policy
- Route to **regression-testing** for regression testing
- Route to **tdd-implementer** for test-first development
