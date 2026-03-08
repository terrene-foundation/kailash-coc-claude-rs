# Serialize Workflow Skill

Demonstrate workflow serialization, deserialization, and definition extraction using the Kailash Python SDK.

## Usage

`/serialize-workflow` -- Generate workflow serialization code with JSON round-trip

## Steps

1. Choose the appropriate pattern:
   - **JSON round-trip**: Build workflow -> serialize to JSON -> deserialize -> rebuild
   - **Definition extraction**: Build workflow -> extract definition dict
   - **Builder inspection**: Query node IDs and connections before building

2. Implement the serialization flow with proper error handling.

3. Write tests covering:
   - JSON serialization round-trip
   - Builder to workflow to definition
   - Node ID and connection listing

## Template

### WorkflowBuilder JSON Round-Trip

```python
import json
from kailash import NodeRegistry, WorkflowBuilder

registry = NodeRegistry()

# 1. Build a workflow
builder = WorkflowBuilder()
builder.add_node("TextTransformNode", "upper", {"operation": "uppercase"})
builder.add_node("LogNode", "log")
builder.connect("upper", "result", "log", "data")

# 2. Serialize to JSON
json_str = builder.to_json()
print(f"Serialized:\n{json_str}")

# 3. Deserialize from JSON
restored = WorkflowBuilder.from_json(json_str)
print("Round-trip: OK")

# 4. Build from restored builder
workflow = restored.build(registry)
print(f"Built workflow: {workflow.node_count()} nodes, "
      f"{workflow.connection_count()} connections")

# 5. Extract definition from built workflow
definition = workflow.to_definition()
assert len(definition["nodes"]) == 2
assert len(definition["connections"]) == 1
print("Extraction: OK")
```

### Builder Inspection Before Build

```python
from kailash import WorkflowBuilder

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "a")
builder.add_node("NoOpNode", "b")
builder.connect("a", "data", "b", "data")

# Inspect the builder state
node_ids = builder.get_node_ids()
connections = builder.get_connections()

print(f"Node IDs: {node_ids}")        # ["a", "b"]
print(f"Connections: {connections}")   # [{"source": "a", ...}]
```

### Auto-Generated Node IDs

```python
from kailash import NodeRegistry, WorkflowBuilder

registry = NodeRegistry()
builder = WorkflowBuilder()

# Auto-generate unique IDs
id1 = builder.add_node_auto_id("NoOpNode")
id2 = builder.add_node_auto_id("LogNode")
print(f"Auto IDs: {id1}, {id2}")

builder.connect(id1, "data", id2, "data")
workflow = builder.build(registry)
print(f"Nodes: {workflow.node_count()}")
```

### Built Workflow JSON Serialization

```python
from kailash import NodeRegistry, WorkflowBuilder

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "a")
builder.add_node("NoOpNode", "b")
builder.connect("a", "data", "b", "data")

workflow = builder.build(registry)

# Serialize the built workflow
workflow_json = workflow.to_json()
print(f"Workflow JSON: {workflow_json[:100]}...")
```

## Test Template

```python
import pytest
from kailash import NodeRegistry, WorkflowBuilder

@pytest.fixture
def registry():
    return NodeRegistry()

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

def test_definition_extraction(registry):
    builder = WorkflowBuilder()
    builder.add_node("NoOpNode", "a")
    builder.add_node("NoOpNode", "b")
    builder.connect("a", "data", "b", "data")

    workflow = builder.build(registry)
    definition = workflow.to_definition()

    assert len(definition["nodes"]) == 2
    assert len(definition["connections"]) == 1

def test_auto_id():
    builder = WorkflowBuilder()
    id1 = builder.add_node_auto_id("NoOpNode")
    id2 = builder.add_node_auto_id("NoOpNode")

    assert id1 != id2
    assert id1 in builder.get_node_ids()
    assert id2 in builder.get_node_ids()
```

## Verify

```bash
python -c "
from kailash import NodeRegistry, WorkflowBuilder
registry = NodeRegistry()
b = WorkflowBuilder()
b.add_node('NoOpNode', 'a')
b.add_node('NoOpNode', 'b')
b.connect('a', 'data', 'b', 'data')
json_str = b.to_json()
restored = WorkflowBuilder.from_json(json_str)
wf = restored.build(registry)
assert wf.node_count() == 2
assert wf.connection_count() == 1
d = wf.to_definition()
assert len(d['nodes']) == 2
print('OK')
"
```
