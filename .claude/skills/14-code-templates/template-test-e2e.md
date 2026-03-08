---
name: template-test-e2e
description: "Generate Kailash end-to-end test template (Tier 3). Use when requesting 'e2e test template', 'Tier 3 test', 'end-to-end test', 'complete workflow test', or 'business scenario test'."
---

# End-to-End Test Template (Tier 3)

Complete business scenario test template with full infrastructure stack.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`test-3tier-strategy`](../../4-operations/testing/test-3tier-strategy.md), [`template-test-integration`](template-test-integration.md)
> Related Subagents: `testing-specialist`, `tdd-implementer`

## Quick Reference

- **Purpose**: Test complete user workflows end-to-end
- **Speed**: <10 seconds per test
- **Dependencies**: Full Docker infrastructure
- **Location**: `tests/e2e/`
- **Mocking**: ❌ **FORBIDDEN** - complete real scenarios

## E2E Test Template

```python
"""End-to-end tests for [Business Scenario]"""

import pytest
import kailash

@pytest.mark.e2e
@pytest.mark.timeout(10)
class Test[BusinessScenario]E2E:
    """End-to-end test for complete [scenario] workflow."""

    def test_complete_user_journey(self, test_database_url):
        """Test complete user journey from start to finish."""
        builder = kailash.WorkflowBuilder()

        # Step 1: Data ingestion
        builder.add_node("EmbeddedPythonNode", "ingest", {
            "code": "result = {'data': [{'id': 1, 'name': 'Alice'}, {'id': 2, 'name': 'Bob'}]}",
            "output_vars": ["result"]
        })

        # Step 2: Validation
        builder.add_node("EmbeddedPythonNode", "validate", {
            "code": """
items = input_data
valid_items = [item for item in items if 'id' in item and 'name' in item]
result = {'validated': valid_items, 'count': len(valid_items)}
""",
            "output_vars": ["result"]
        })

        # Step 3: Database storage
        builder.add_node("SQLQueryNode", "store", {
            "connection_string": test_database_url,
            "query": "INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        })

        # Step 4: Verification
        builder.add_node("SQLQueryNode", "verify", {
            "connection_string": test_database_url,
            "query": "SELECT COUNT(*) as count FROM users"
        })

        # Connect complete pipeline
        builder.connect("ingest", "outputs", "validate", "input_data")
        builder.connect("validate", "outputs", "store", "batch_data")
        builder.connect("store", "result", "verify", "trigger")

        # Execute complete workflow
        reg = kailash.NodeRegistry()
        rt = kailash.Runtime(reg)
        result = rt.execute(builder.build(reg))

        # Verify end-to-end results
        assert result["results"]["ingest"]["outputs"]["data"] is not None
        assert result["results"]["validate"]["outputs"]["count"] == 2
        assert result["results"]["verify"]["data"][0]["count"] >= 2
```

## Related Patterns

- **Unit tests**: [`template-test-unit`](template-test-unit.md)
- **Integration tests**: [`template-test-integration`](template-test-integration.md)
- **Testing strategy**: [`test-3tier-strategy`](../../4-operations/testing/test-3tier-strategy.md)

## When to Escalate

Use `testing-specialist` when:

- Complex E2E scenario design
- Performance testing needed
- CI/CD integration

## Documentation References

### Primary Sources

- **Testing Specialist**: [`.claude/agents/testing-specialist.md` (lines 211-262)](../../../../.claude/agents/testing-specialist.md#L211-L262)

## Quick Tips

- 💡 **Complete scenarios**: Test full user journeys
- 💡 **<10 seconds**: Keep reasonable execution time
- 💡 **Real infrastructure**: All services must be real
- 💡 **Business validation**: Verify business rules, not just technical

<!-- Trigger Keywords: e2e test template, Tier 3 test, end-to-end test, complete workflow test, business scenario test, e2e template, full workflow test -->
