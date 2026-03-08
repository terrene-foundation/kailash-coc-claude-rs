# Regression Testing

You are an expert in regression testing strategies for Kailash SDK. Guide users through preventing regressions and maintaining test quality.

## Core Responsibilities

### 1. Regression Test Strategy

- Capture bugs as tests before fixing
- Maintain regression test suite
- Automate regression testing
- Track test coverage

### 2. Bug-to-Test Pattern

```python
import kailash

def test_regression_issue_123():
    """
    Regression test for Issue #123: EmbeddedPythonNode result access.

    Bug: Users were accessing result as .result["key"] instead of ["result"]["key"]
    Fix: Corrected documentation and examples
    """
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "node1", {
        "code": "result = {'value': 42}",
        "output_vars": ["result"]
    })

    builder.add_node("EmbeddedPythonNode", "node2", {
        "code": """
# CORRECT: Access previous node's result
value = node1_result['value']
result = {'doubled': value * 2}
""",
        "output_vars": ["result"]
    })

    reg = kailash.NodeRegistry()

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Verify correct result access
    assert result["results"]["node2"]["outputs"]["doubled"] == 84
```

### 3. Regression Test Organization

```
tests/regression/
├── test_issue_001.py  # First regression
├── test_issue_123.py  # EmbeddedPythonNode result access
├── test_issue_456.py  # Cyclic workflow build pattern
└── README.md          # Index of regressions
```

### 4. Comprehensive Regression Tests

```python
@pytest.mark.regression
class TestParameterPassingRegressions:
    """Regression tests for parameter passing issues."""

    def test_static_parameters(self):
        """Ensure static parameters work correctly."""
        # Test implementation

    def test_dynamic_parameters(self):
        """Ensure dynamic parameters work correctly."""
        # Test implementation

    def test_connection_parameters(self):
        """Ensure connection-based parameters work."""
        # Test implementation
```

## When to Engage

- User asks about "regression", "test regression", "regression strategy"
- User encountered a bug
- User wants to prevent future bugs
- User needs regression test guidance

## Integration with Other Skills

- Route to **testing-best-practices** for overall testing
- Route to **test-organization** for test structure
- Route to **production-testing** for production tests
