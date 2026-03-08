---
name: template-test-unit
description: "Generate Kailash unit test template (Tier 1). Use when requesting 'unit test template', 'Tier 1 test', 'create unit test', 'test structure', or 'unit test example'."
---

# Unit Test Template (Tier 1)

Fast, isolated unit test template for Kailash SDK components (<1 second execution).

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `HIGH`
> Related Skills: [`test-3tier-strategy`](../../4-operations/testing/test-3tier-strategy.md), [`template-test-integration`](template-test-integration.md)
> Related Subagents: `testing-specialist` (test strategy), `tdd-implementer` (test-first development)

## Quick Reference

- **Purpose**: Fast, isolated component testing
- **Speed**: <1 second per test
- **Dependencies**: None (mocks allowed for external services)
- **Location**: `tests/unit/`
- **Mocking**: ✅ ALLOWED for external services

## Basic Unit Test Template

```python
"""Unit tests for [Component Name]"""

import pytest
import kailash

class Test[ComponentName]:
    """Unit tests for [component] functionality."""

    def test_basic_functionality(self):
        """Test basic [component] operation."""
        # Create simple workflow
        builder = kailash.WorkflowBuilder()

        builder.add_node("EmbeddedPythonNode", "test_node", {
            "code": "result = {'value': 42, 'status': 'success'}",
            "output_vars": ["result"]
        })

        # Execute
        reg = kailash.NodeRegistry()
        rt = kailash.Runtime(reg)
        result = rt.execute(builder.build(reg))

        # Assertions
        assert "test_node" in results
        assert result["results"]["test_node"]["outputs"]["value"] == 42
        assert result["results"]["test_node"]["outputs"]["status"] == "success"

    def test_error_handling(self):
        """Test error handling in [component]."""
        builder = kailash.WorkflowBuilder()

        builder.add_node("EmbeddedPythonNode", "test_error", {
            "code": """
if not input_data:
    result = {'error': 'No data provided', 'status': 'error'}
else:
    result = {'status': 'success'}
""",
            "output_vars": ["result"]
        })

        reg = kailash.NodeRegistry()
        rt = kailash.Runtime(reg)

        # Test error case (no input)
        result = rt.execute(builder.build(reg))
        assert result["results"]["test_error"]["outputs"]["status"] == "error"
        assert "error" in results["test_error"]["outputs"]

    def test_edge_cases(self):
        """Test edge cases and boundary conditions."""
        builder = kailash.WorkflowBuilder()

        builder.add_node("EmbeddedPythonNode", "edge_test", {
            "code": """
# Test empty list
if not data:
    result = {'count': 0, 'empty': True}
else:
    result = {'count': len(data), 'empty': False}
""",
            "output_vars": ["result"]
        })

        reg = kailash.NodeRegistry()
        rt = kailash.Runtime(reg)

        # Test with empty data
        result = rt.execute(builder.build(reg), inputs={
            "edge_test": {"data": []}
        })

        assert result["results"]["edge_test"]["outputs"]["count"] == 0
        assert result["results"]["edge_test"]["outputs"]["empty"] is True
```

## Custom Node (register_callback) Unit Test Template

```python
"""Unit tests for custom node registered via register_callback()"""

import pytest
import kailash

class TestCustomNode:
    """Unit tests for custom node handler."""

    def test_handler_direct_invocation(self):
        """Test handler function directly with valid inputs."""
        def my_handler(inputs):
            return {"result": inputs.get("data", "").upper()}

        result = my_handler({"data": "hello"})
        assert result["result"] == "HELLO"

    def test_handler_missing_input(self):
        """Test handler handles missing inputs gracefully."""
        def my_handler(inputs):
            data = inputs.get("data")
            if not data:
                raise ValueError("data is required")
            return {"result": data.upper()}

        with pytest.raises(ValueError):
            my_handler({})

    def test_register_callback_and_execute(self):
        """Test custom node registration and workflow execution."""
        def my_handler(inputs):
            return {"result": inputs.get("value", 0) * 2}

        reg = kailash.NodeRegistry()
        reg.register_callback(
            "DoubleNode", my_handler,
            ["value"],     # input parameter names
            ["result"]     # output parameter names
        )

        builder = kailash.WorkflowBuilder()
        builder.add_node("DoubleNode", "doubler", {"value": 21})

        rt = kailash.Runtime(reg)
        result = rt.execute(builder.build(reg))

        assert result["results"]["doubler"]["result"] == 42
```

## Mocking External Services (Allowed in Tier 1)

```python
from unittest.mock import patch, Mock

class TestWithMocking:
    """Unit tests with mocked external services."""

    @patch('external_api_client.request')
    def test_api_integration_mocked(self, mock_request):
        """Test API integration with mocked response."""
        # Setup mock
        mock_request.return_value = {
            "status": "success",
            "data": {"value": 100}
        }

        # Test your workflow
        builder = kailash.WorkflowBuilder()
        builder.add_node("EmbeddedPythonNode", "api_handler", {
            "code": """
# This would call external_api_client.request in real code
result = {'processed': True, 'value': 100}
""",
            "output_vars": ["result"]
        })

        reg = kailash.NodeRegistry()
        rt = kailash.Runtime(reg)
        result = rt.execute(builder.build(reg))

        assert result["results"]["api_handler"]["outputs"]["processed"] is True
```

## Quick Tips

- 💡 **Fast execution**: Unit tests must complete in <1 second
- 💡 **Isolation**: No external dependencies (database, APIs, files)
- 💡 **Mocking allowed**: Mock external services in Tier 1 only
- 💡 **Focus on logic**: Test individual components, not integration

## Related Patterns

- **Integration tests**: [`template-test-integration`](template-test-integration.md)
- **E2E tests**: [`template-test-e2e`](template-test-e2e.md)
- **Testing strategy**: [`test-3tier-strategy`](../../4-operations/testing/test-3tier-strategy.md)

## When to Escalate to Subagent

Use `testing-specialist` subagent when:

- Designing comprehensive test strategy
- Custom test architecture needed
- CI/CD integration planning

Use `tdd-implementer` when:

- Implementing test-first development
- Need complete test coverage plan

## Documentation References

### Primary Sources

- **Testing Specialist**: [`.claude/agents/testing-specialist.md` (lines 146-176)](../../../../.claude/agents/testing-specialist.md#L146-L176)

<!-- Trigger Keywords: unit test template, Tier 1 test, create unit test, test structure, unit test example, unit test boilerplate, pytest unit test, fast test template -->
