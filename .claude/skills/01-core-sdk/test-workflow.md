# Test Workflow Skill

Run comprehensive workflow tests for the Kailash Python SDK.

## Usage

`/test-workflow` -- Run tests, lint, and type checks

Examples:

- `/test-workflow` -- Run all tests
- `/test-workflow quick` -- Quick smoke test

## Steps

1. Run unit tests:

```bash
pytest tests/ -v 2>&1
```

2. Run type checking (if mypy or pyright configured):

```bash
mypy --strict your_module.py 2>&1
```

3. Run a quick smoke test:

```bash
python -c "
from kailash import NodeRegistry, WorkflowBuilder, Runtime

# Verify registry
registry = NodeRegistry()
types = registry.list_types()
print(f'Registry: {len(types)} node types')

# Build and execute a workflow
builder = WorkflowBuilder()
builder.add_node('NoOpNode', 'start')
builder.add_node('LogNode', 'end')
builder.connect('start', 'data', 'end', 'data')

workflow = builder.build(registry)
print(f'Workflow: {workflow.node_count()} nodes, {workflow.connection_count()} connections')

runtime = Runtime(registry)
result = runtime.execute(workflow, {'data': 'test'})
print(f'Execution: run_id={result[\"run_id\"]}')
print('All smoke tests passed')
"
```

4. Report results:
   - Total test count (passed/failed/ignored)
   - Any type check issues
   - Test duration

## Test Template

```python
import pytest
from kailash import NodeRegistry, WorkflowBuilder, Runtime, RuntimeConfig

@pytest.fixture
def registry():
    return NodeRegistry()

@pytest.fixture
def runtime(registry):
    return Runtime(registry)

# --- Registry Tests ---

def test_registry_has_builtin_nodes(registry):
    types = registry.list_types()
    assert len(types) >= 139
    assert registry.has_type("NoOpNode")
    assert registry.has_type("LogNode")

def test_registry_custom_callback(registry):
    def echo(inputs):
        return {"result": inputs.get("data")}

    registry.register_callback("EchoNode", echo, ["data"], ["result"])
    assert registry.has_type("EchoNode")

# --- Builder Tests ---

def test_builder_add_node():
    builder = WorkflowBuilder()
    builder.add_node("NoOpNode", "n1")
    assert "n1" in builder.get_node_ids()

def test_builder_connect():
    builder = WorkflowBuilder()
    builder.add_node("NoOpNode", "a")
    builder.add_node("NoOpNode", "b")
    builder.connect("a", "data", "b", "data")
    conns = builder.get_connections()
    assert len(conns) == 1

def test_builder_auto_id():
    builder = WorkflowBuilder()
    id1 = builder.add_node_auto_id("NoOpNode")
    id2 = builder.add_node_auto_id("NoOpNode")
    assert id1 != id2

# --- Execution Tests ---

def test_basic_execution(registry, runtime):
    builder = WorkflowBuilder()
    builder.add_node("NoOpNode", "n1")
    workflow = builder.build(registry)

    result = runtime.execute(workflow)
    assert "run_id" in result
    assert "results" in result

def test_execution_with_inputs(registry, runtime):
    builder = WorkflowBuilder()
    builder.add_node("NoOpNode", "passthrough")
    workflow = builder.build(registry)

    result = runtime.execute(workflow, {"data": "hello"})
    assert result["run_id"]

def test_chained_execution(registry, runtime):
    builder = WorkflowBuilder()
    builder.add_node("NoOpNode", "a")
    builder.add_node("NoOpNode", "b")
    builder.add_node("NoOpNode", "c")
    builder.connect("a", "data", "b", "data")
    builder.connect("b", "data", "c", "data")
    workflow = builder.build(registry)

    result = runtime.execute(workflow, {"data": "test"})
    assert result["run_id"]

# --- Serialization Tests ---

def test_json_roundtrip(registry):
    builder = WorkflowBuilder()
    builder.add_node("NoOpNode", "n1")
    builder.add_node("NoOpNode", "n2")
    builder.connect("n1", "data", "n2", "data")

    json_str = builder.to_json()
    restored = WorkflowBuilder.from_json(json_str)
    workflow = restored.build(registry)

    assert workflow.node_count() == 2
    assert workflow.connection_count() == 1

# --- Error Tests ---

def test_build_with_invalid_node_type(registry):
    builder = WorkflowBuilder()
    builder.add_node("NonExistentNode", "bad")
    with pytest.raises(Exception):
        builder.build(registry)
```

## Quick Commands

### Run all tests

```bash
pytest tests/ -v 2>&1
```

### Run specific test file

```bash
pytest tests/test_workflow.py -v 2>&1
```

### Run specific test

```bash
pytest tests/test_workflow.py::test_basic_execution -v 2>&1
```

### Run with output (for debugging)

```bash
pytest tests/ -v -s 2>&1
```

## Verify

After running tests, check for:

- All tests pass (0 failures)
- No import errors
- No deprecation warnings
