---
name: code-templates
description: "Production-ready code templates for Kailash SDK including basic workflows, cyclic workflows, custom nodes, MCP servers, and all three test tiers (unit, integration, end-to-end). Use when asking about 'template', 'example code', 'starter code', 'boilerplate', 'scaffold', 'workflow template', 'custom node template', 'MCP server template', 'test template', 'unit test template', 'integration test template', or 'E2E test template'."
---

# Kailash Code Templates

Production-ready code templates and boilerplate for common Kailash development tasks.

## Overview

Complete templates for:

- Basic workflows
- Cyclic workflows
- Custom node development
- MCP server creation
- Unit tests (Tier 1)
- Integration tests (Tier 2)
- End-to-end tests (Tier 3)

## Reference Documentation

### Workflow Templates

#### Basic Workflow

- **[template-workflow-basic](template-workflow-basic.md)** - Standard workflow template
  - WorkflowBuilder setup
  - Node addition pattern
  - Connection pattern
  - Runtime execution
  - Result access
  - Error handling

#### Cyclic Workflow

- **[template-cyclic-workflow](template-cyclic-workflow.md)** - Cyclic workflow template
  - LoopNode setup
  - Convergence checking
  - State persistence
  - Iteration limits
  - Result aggregation

### Custom Development Templates

#### Custom Node

- **[template-custom-node](template-custom-node.md)** - Custom node template
  - Handler function definition
  - `register_callback()` registration
  - Input/output parameter declaration
  - Input validation
  - Output formatting
  - Error handling
  - Workflow integration

#### MCP Server

- **[template-mcp-server](template-mcp-server.md)** - MCP server template
  - McpServer initialization
  - Tool registration
  - Resource definition
  - Transport configuration
  - Authentication setup
  - Progress reporting

### Test Templates

#### Unit Tests (Tier 1)

- **[template-test-unit](template-test-unit.md)** - Unit test template
  - Test class structure
  - Fixture setup
  - Mock setup (allowed in Tier 1)
  - Assertion patterns
  - Teardown cleanup
  - Fast execution pattern

#### Integration Tests (Tier 2)

- **[template-test-integration](template-test-integration.md)** - Integration test template
  - Real database setup
  - Workflow execution testing
  - NO MOCKING policy
  - Real infrastructure fixtures
  - Resource cleanup
  - Result validation

#### End-to-End Tests (Tier 3)

- **[template-test-e2e](template-test-e2e.md)** - E2E test template
  - Full system setup
  - API testing pattern
  - Real HTTP requests
  - Complete user flows
  - Multi-component testing
  - Production-like environment

## Template Usage

### Quick Start Process

1. **Select Template**: Choose relevant template for your task
2. **Copy Code**: Copy template as starting point
3. **Customize**: Adapt to your specific needs
4. **Test**: Verify with real data
5. **Refine**: Iterate based on results

### Template Categories

**Workflow Development**:

- `template-workflow-basic` → Standard workflows
- `template-cyclic-workflow` → Iterative workflows

**Custom Development**:

- `template-custom-node` → New node types
- `template-mcp-server` → MCP integration

**Testing**:

- `template-test-unit` → Fast unit tests
- `template-test-integration` → Real infrastructure tests
- `template-test-e2e` → Complete system tests

## Template Examples

All templates follow the **canonical 4-parameter pattern** from `/01-core-sdk`.

### Basic Workflow Template

```python
import kailash

def create_workflow():
    """Create a basic workflow using canonical 4-param pattern (see /01-core-sdk)."""
    builder = kailash.WorkflowBuilder()

    # Add nodes (4-param: NodeType, ID, config, connections)
    builder.add_node("EmbeddedPythonNode", "node1", {
        "code": "result = input_data * 2"
    })
    builder.add_node("EmbeddedPythonNode", "node2", {
        "code": "result = input_data + 10"
    })

    # Add connections (4-param: src_id, src_param, tgt_id, tgt_param)
    builder.connect("node1", "result", "node2", "input_data")

    return builder.build(reg)

# Execute
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(create_workflow())
print(result["results"]["node2"]["result"])
```

### Custom Node Template

```python
import kailash

reg = kailash.NodeRegistry()

def my_custom_handler(inputs):
    """Custom node handler."""
    input_data = inputs.get("input_data")
    if not input_data:
        raise ValueError("Missing input_data")

    result = input_data * 2
    return {"result": result}

# Register the custom node
reg.register_callback(
    "MyCustomNode",
    my_custom_handler,
    ["input_data"],   # input parameter names
    ["result"]        # output parameter names
)

# Use in workflow
builder = kailash.WorkflowBuilder()
builder.add_node("MyCustomNode", "node1", {"input_data": 21})
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Integration Test Template

```python
import pytest

@pytest.fixture
def db():
    """Real database for testing."""
    df = kailash.DataFlow("postgresql://test:test@localhost:5433/test_db")
    db.create_tables()
    yield db
    db.drop_tables()

@pytest.fixture
def runtime():
    """Real runtime."""
    reg = kailash.NodeRegistry()
    return kailash.Runtime(reg)

def test_workflow_execution(runtime):
    """Tier 2: Integration test with real execution."""
    # Arrange
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "calc", {
        "code": "result = 2 + 2"
    })

    # Act
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Assert
    assert result["results"]["calc"]["result"] == 4
    assert result["run_id"] is not None
```

## Best Practices

### Using Templates

- ✅ Start with template, then customize
- ✅ Keep template structure
- ✅ Follow naming conventions
- ✅ Add comments for customization points
- ✅ Test template modifications
- ❌ NEVER skip error handling
- ❌ NEVER remove validation
- ❌ NEVER ignore resource cleanup

### Template Customization

- Keep core structure intact
- Add custom logic in designated areas
- Maintain error handling patterns
- Preserve type hints
- Update docstrings

### Testing Templates

- Test with real data
- Verify all code paths
- Check error handling
- Validate cleanup
- Performance test if needed

## When to Use This Skill

Use this skill when you need:

- Starting point for new code
- Boilerplate for common tasks
- Reference implementation
- Best practice examples
- Quick scaffolding
- Test structure guidance

## Template Selection Guide

| Task                 | Template                    | Why                |
| -------------------- | --------------------------- | ------------------ |
| **New workflow**     | `template-workflow-basic`   | Standard structure |
| **Iterative logic**  | `template-cyclic-workflow`  | Cycle pattern      |
| **Custom node**      | `template-custom-node`      | Node structure     |
| **MCP integration**  | `template-mcp-server`       | MCP setup          |
| **Fast tests**       | `template-test-unit`        | Unit testing       |
| **Real infra tests** | `template-test-integration` | Integration        |
| **Full system**      | `template-test-e2e`         | End-to-end         |

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core patterns
- **[06-cheatsheets](../../06-cheatsheets/SKILL.md)** - Pattern examples
- **[07-development-guides](../../07-development-guides/SKILL.md)** - Development guides
- **[12-testing-strategies](../../12-testing-strategies/SKILL.md)** - Testing strategies
- **[17-gold-standards](../../17-gold-standards/SKILL.md)** - Best practices

## Support

For template help, invoke:

- `pattern-expert` - Pattern selection
- `tdd-implementer` - Test-first development
- `sdk-navigator` - Find examples
