# DataFlow Troubleshooting Guide (Rust Binding)

Troubleshoot common issues when using DataFlow with the Rust-backed Python binding (`kailash-enterprise`).

## Issue 1: Unsupported Type Annotation

**Error**:

```
TypeError: unsupported type annotation: <class 'list'>; expected int, str, float, bool, datetime.datetime, or Optional[T]
```

**Cause**: `@db.model` only supports these type annotations: `int`, `str`, `float`, `bool`, `datetime.datetime`, and `Optional[T]` variants.

**Fix**: Use supported types. For complex data, serialize to `str` (JSON):

```python
from kailash.dataflow import db
from typing import Optional
import json

@db.model
class Config:
    __table__ = "configs"
    id: int
    name: str
    data_json: str  # Store complex data as JSON string

    def set_data(self, data: dict):
        self.data_json = json.dumps(data)

    def get_data(self) -> dict:
        return json.loads(self.data_json)
```

## Issue 2: DataFlow Connection Failed

**Error**:

```
RuntimeError: DataFlow connection failed: database error: error returned from database: (code: 14) unable to open database file
```

**Cause**: SQLite file path doesn't exist or the directory is not writable.

**Fix**:

```python
import os
from kailash.dataflow import DataFlow

# Ensure directory exists
os.makedirs("/path/to/data", exist_ok=True)

# Use absolute path
df = DataFlow("sqlite:///path/to/data/app.db")

# For in-memory (testing)
df = DataFlow("sqlite://:memory:")
```

## Issue 3: FieldDef Has No Constructor

**Error**:

```
TypeError: No constructor defined for FieldDef
```

**Cause**: `FieldDef` is created internally by `@db.model` and `ModelDefinition.field()`. It has no public constructor.

**Fix**: Use `ModelDefinition.field()` to add fields programmatically:

```python
from kailash.dataflow import ModelDefinition, FieldType

md = ModelDefinition("User", "users")
md.field("id", FieldType.integer(), primary_key=True)
md.field("name", FieldType.text())
md.field("active", FieldType.boolean())
```

`FieldType` variants are **lowercase class methods** (not uppercase attributes):

| Method                  | Type         |
| ----------------------- | ------------ |
| `FieldType.integer()`   | Integer      |
| `FieldType.text()`      | Text/Varchar |
| `FieldType.real()`      | Real/Double  |
| `FieldType.float()`     | Float        |
| `FieldType.boolean()`   | Boolean      |
| `FieldType.json()`      | JSON         |
| `FieldType.timestamp()` | Timestamp    |
| `FieldType.uuid()`      | UUID         |

## Issue 4: Workflow Build Failed — Unknown Node Type

**Error**:

```
RuntimeError: workflow build failed: unknown node type: UserCreateNode
```

**Cause**: DataFlow-generated node types (CreateNode, ReadNode, etc.) are not registered in `NodeRegistry` by default. The Rust binding does not auto-generate nodes from model definitions like the pure Python SDK does.

**Fix**: Use `@db.model` with DataFlow's workflow integration, or use `SQLQueryNode` / `DatabaseConnectionNode` for direct SQL:

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# Use built-in SQL nodes instead of generated CRUD nodes
builder.add_node("SQLQueryNode", "query_users", {
    "query": "SELECT * FROM users WHERE active = true",
    "connection_string": "sqlite:///app.db"
})

wf = builder.build(reg)
```

## Issue 5: Invalid Connection — Target Node Does Not Exist

**Error**:

```
RuntimeError: workflow build failed: invalid connection from node_a.result to node_b.input: target node 'node_b' does not exist in the workflow
```

**Cause**: Connecting to a node ID that hasn't been added to the builder.

**Fix**: Ensure all nodes are added before connecting:

```python
builder = kailash.WorkflowBuilder()

# Add ALL nodes first
builder.add_node("SwitchNode", "router", {"cases": {"a": "handler_a"}, "default_branch": "handler_a"})
builder.add_node("MergeNode", "combiner", {})

# Then connect
builder.connect("router", "result", "combiner", "input")
```

## Issue 6: Cycle Detected

**Error**:

```
RuntimeError: workflow build failed: cycle detected involving nodes: a, b
```

**Cause**: The Rust binding blocks cyclic graphs at `build()` time.

**Fix**: See [`error-cycle-convergence`](../15-error-troubleshooting/error-cycle-convergence.md) for detailed solutions (LoopNode, callback nodes, linear pipelines).

## Issue 7: Node Execution Failed — No Matching Case

**Error**:

```
RuntimeError: workflow execution failed: node 'sw' failed -> node execution failed: no matching case for condition '"x > 5"' and no default branch configured
```

**Cause**: SwitchNode condition doesn't match any case and no default is set.

**Fix**: Add a default branch or ensure conditions cover all cases:

```python
builder.add_node("SwitchNode", "router", {
    "cases": {
        "active": "process_active",
        "inactive": "process_inactive"
    },
    "default_branch": "process_default"  # Always set a default
})
# Connect the condition input (the value to match against case keys)
builder.connect("source", "status", "router", "condition")
# SwitchNode outputs: "matched" (branch name) and "data" (forwarded)
```

## Issue 8: Duplicate Node IDs (Silent Overwrite)

**Symptom**: Second `add_node()` with the same ID silently overwrites the first. No error raised.

**Cause**: `WorkflowBuilder` does not enforce unique node IDs — it overwrites.

**Fix**: Use unique IDs. Check with `get_node_ids()`:

```python
builder = kailash.WorkflowBuilder()
builder.add_node("SwitchNode", "step1", {"cases": {"a": "handler_a"}, "default_branch": "handler_a"})

# Check before adding
existing = builder.get_node_ids()
if "step1" in existing:
    print("Warning: step1 already exists!")
```

## Quick Diagnostic Checklist

- [ ] Using supported type annotations in `@db.model` (int, str, float, bool, datetime, Optional)
- [ ] Database file path exists and is writable (SQLite)
- [ ] All node IDs are unique in the builder
- [ ] All connection targets exist (added via `add_node` before `connect`)
- [ ] No cyclic connections (use LoopNode instead)
- [ ] SwitchNode has a `default_branch` configured
- [ ] Using `FieldType.text()` (lowercase method), not `FieldType.Text` (no such attribute)
- [ ] Using `builder.connect()` with 4 positional args, not keyword args

## Pure Python SDK vs Rust Binding Differences

| Feature                            | Pure Python SDK    | Rust Binding          |
| ---------------------------------- | ------------------ | --------------------- |
| Auto-generated CRUD nodes          | Yes (11 per model) | No — use SQLQueryNode |
| Inspector / DebugAgent             | Yes                | No                    |
| CLI commands (`dataflow validate`) | Yes                | No                    |
| DF-XXX error codes                 | Yes                | RuntimeError messages |
| `DataFlow(url, test_mode=True)`    | Yes                | No `test_mode` param  |
| Schema cache metrics               | Yes                | No                    |
| ExpressDataFlow                    | Yes                | No                    |

## Related

- [DataFlow quickstart](dataflow-quickstart.md)
- [DataFlow models](dataflow-models.md)
- [DataFlow gotchas](dataflow-gotchas.md)
- [Cycle errors](../15-error-troubleshooting/error-cycle-convergence.md)
