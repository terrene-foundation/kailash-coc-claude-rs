---
name: core-events-visualization
description: "Workflow serialization, definition round-trip, and visualization patterns. Use when asking 'workflow definition', 'serialize workflow', 'to_json', 'to_definition', 'workflow composition'."
---

# Core Advanced: Serialization and Visualization

Patterns for serializing, deserializing, and inspecting workflows.

## 1. Workflow Serialization (JSON Round-Trip)

Serialize a workflow builder to JSON and restore it.

```python
from kailash import NodeRegistry, WorkflowBuilder, Runtime

registry = NodeRegistry()

# Build a workflow
builder = WorkflowBuilder()
builder.add_node("TextTransformNode", "upper", {"operation": "uppercase"})
builder.add_node("LogNode", "log")
builder.connect("upper", "result", "log", "data")

# Serialize to JSON
json_str = builder.to_json()
print(f"Serialized:\n{json_str}")

# Restore from JSON
restored = WorkflowBuilder.from_json(json_str)

# Build from restored builder
workflow = restored.build(registry)
print(f"Built workflow: {workflow.node_count()} nodes, {workflow.connection_count()} connections")
```

## 2. Workflow Definition Extraction

Extract a definition dict from a built workflow for inspection or storage.

```python
from kailash import NodeRegistry, WorkflowBuilder

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "step1")
builder.add_node("NoOpNode", "step2")
builder.connect("step1", "data", "step2", "data")

workflow = builder.build(registry)

# Extract as a dict
definition = workflow.to_definition()
print(f"Nodes: {len(definition['nodes'])}")
print(f"Connections: {len(definition['connections'])}")
```

## 3. Auto-Generated Node IDs

Use `add_node_auto_id` when you do not need to reference a node explicitly.

```python
from kailash import NodeRegistry, WorkflowBuilder

registry = NodeRegistry()

builder = WorkflowBuilder()

# Auto-generated IDs are returned
id1 = builder.add_node_auto_id("NoOpNode")
id2 = builder.add_node_auto_id("LogNode")
print(f"Generated IDs: {id1}, {id2}")

builder.connect(id1, "data", id2, "data")
workflow = builder.build(registry)
```

## 4. Builder Inspection

Query the builder state before building.

```python
from kailash import WorkflowBuilder

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "a")
builder.add_node("LogNode", "b")
builder.connect("a", "data", "b", "data")

# Inspect before build
node_ids = builder.get_node_ids()
connections = builder.get_connections()
print(f"Node IDs: {node_ids}")         # ["a", "b"]
print(f"Connections: {connections}")    # [{"source": "a", ...}]
```

## 5. Workflow Properties

Inspect built workflow properties.

```python
from kailash import NodeRegistry, WorkflowBuilder

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.add_node("NoOpNode", "a")
builder.add_node("NoOpNode", "b")
builder.add_node("NoOpNode", "c")
builder.connect("a", "data", "b", "data")
builder.connect("b", "data", "c", "data")

workflow = builder.build(registry)

print(f"Nodes: {workflow.node_count()}")               # 3
print(f"Connections: {workflow.connection_count()}")     # 2
print(f"Levels: {workflow.level_count()}")               # 3
print(f"Has cycles: {workflow.has_cycles()}")            # False

# JSON serialization of built workflow
json_str = workflow.to_json()
print(f"Workflow JSON length: {len(json_str)}")
```

## 6. Cyclic Workflows

Enable cycles for workflows that need feedback loops.

```python
from kailash import NodeRegistry, WorkflowBuilder

registry = NodeRegistry()

builder = WorkflowBuilder()
builder.enable_cycles(True)

builder.add_node("NoOpNode", "a")
builder.add_node("NoOpNode", "b")
builder.connect("a", "data", "b", "data")
builder.connect("b", "data", "a", "data")  # creates a cycle

workflow = builder.build(registry)
print(f"Has cycles: {workflow.has_cycles()}")  # True
```
