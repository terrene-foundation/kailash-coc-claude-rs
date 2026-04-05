# Python Binding Common Mistakes

Error resolution guide for the Rust-backed kailash Python package (v2 API).

## Top 10 Mistakes

### 1. Missing Registry in build()

```python
# WRONG — raises RuntimeError
workflow = builder.build()

# CORRECT
registry = kailash.NodeRegistry()
workflow = builder.build(registry)
```

**Why:** v2 API requires the registry to validate node types at build time. The v0.12 compat layer allows `build()` without registry but emits a DeprecationWarning.

### 2. Expecting Tuple Return from execute()

```python
# WRONG — v0.12 pattern, no longer works in v2
results, run_id = runtime.execute(workflow, inputs)

# CORRECT — v2 returns a dict with 3 keys
result = runtime.execute(workflow, inputs)
# Access: result["results"]["node_id"]["output_key"]
# Run ID: result["run_id"]
# Metadata: result["metadata"]
```

**Why:** v2 API returns a dict with keys `"results"` (node outputs), `"run_id"` (unique ID), and `"metadata"` (timing info). The v0.12 compat layer still supports tuple unpacking but emits a DeprecationWarning.

### 3. Missing Registry in Runtime()

```python
# WRONG — raises TypeError
runtime = kailash.Runtime()

# CORRECT
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)
```

### 4. Wrong Connection Parameter Order

```python
# WRONG — swapped source/target or missing output/input names
builder.connect("target", "source")
builder.connect("source", "target", "output", "input")

# CORRECT — source_node, source_output, target_node, target_input
builder.connect("source", "output", "target", "input")
```

**Mnemonic**: "From node.output TO node.input" — source first, then target.

### 5. Registering Callback After Runtime Creation

```python
# WRONG — runtime doesn't see the callback node
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)
registry.register_callback("MyNode", fn, ["in"], ["out"])  # Too late!

# CORRECT — register before creating runtime
registry = kailash.NodeRegistry()
registry.register_callback("MyNode", fn, ["in"], ["out"])
runtime = kailash.Runtime(registry)  # Now runtime sees MyNode
```

### 6. Using Async Functions as Callbacks

```python
# WRONG — callbacks must be synchronous
async def my_node(inputs):
    result = await some_api()
    return {"data": result}

# CORRECT — use synchronous function
def my_node(inputs):
    import requests
    result = requests.get("https://api.example.com").json()
    return {"data": result}
```

**Why:** PyO3 callbacks run on the Rust tokio runtime. Async Python functions would need a Python event loop, which conflicts with the Rust runtime.

### 7. Passing Non-Serializable Objects in Config

```python
import numpy as np

# WRONG — numpy arrays not supported
builder.add_node("MyNode", "n", {"data": np.array([1, 2, 3])})

# CORRECT — convert to plain Python types
builder.add_node("MyNode", "n", {"data": [1, 2, 3]})
```

**Supported types**: str, int, float, bool, None, list, dict (nested). No numpy, pandas, datetime, custom classes.

### 8. Accessing Internal Module Directly

```python
# WRONG — _kailash is an implementation detail
from kailash._kailash import Runtime, NodeRegistry

# CORRECT
import kailash
# or
from kailash import NodeRegistry  # if re-exported in __init__.py
```

### 9. Node Type Name Misspelling

```python
# WRONG — case-sensitive, exact names required
builder.add_node("jsonTransformNode", "t", {})   # wrong case
builder.add_node("JSONTransform", "t", {})        # missing "Node"
builder.add_node("Json_Transform_Node", "t", {})  # wrong format

# CORRECT
builder.add_node("JSONTransformNode", "t", {})
```

**Tip**: Use `registry.list_types()` to see all valid node type names.

### 10. Manually Setting created_at/updated_at (DataFlow)

```python
# WRONG — DataFlow auto-manages these
builder.add_node("UserCreateNode", "create", {
    "id": "1",
    "name": "Alice",
    "created_at": "2024-01-01T00:00:00Z"  # CAUSES ERROR
})

# CORRECT — omit timestamp fields
builder.add_node("UserCreateNode", "create", {
    "id": "1",
    "name": "Alice"
})
```

## Error Messages & Solutions

### "Unknown node type 'X'"

**Cause**: Node type name not found in registry.

**Fix**:

1. Check spelling (case-sensitive): `JSONTransformNode` not `jsonTransformNode`
2. For custom nodes: ensure `register_callback()` was called
3. For custom nodes: ensure registration happened before `builder.build(registry)`
4. List available types: `print(sorted(registry.list_types()))`

### "Node 'X' not found in workflow"

**Cause**: Connection references a node ID that doesn't exist.

**Fix**:

1. Check node ID matches exactly between `add_node()` and `connect()`
2. IDs are case-sensitive strings
3. Check connection parameter order: maybe source/target are swapped

### "Missing required input 'X' for node 'Y'"

**Cause**: A node expects an input that isn't connected or provided.

**Fix**:

1. Add a connection: `builder.connect("source", "output", "Y", "X")`
2. Or provide in execute inputs: `runtime.execute(workflow, {"X": value})`
3. Check if the input name matches the node's expected parameter name

### "TypeError: argument 'config': ..."

**Cause**: Config dict contains a non-serializable Python type.

**Fix**: Use only plain Python types in config dicts:

- str, int, float, bool, None
- list (of plain types)
- dict (with string keys, plain type values)

### "RuntimeError: workflow execution failed: ..."

**Cause**: Workflow has structural issues or a node failed during execution.

**Fix**:

1. Check all connections are valid
2. Ensure no circular dependencies (unless `enable_cycles=True` in RuntimeConfig)
3. Every node should have its required inputs connected
4. Check the full error message — it includes the chain of causes

### "RuntimeError: cannot register callback after runtime creation"

**Cause**: Tried to register a callback node after `Runtime(registry)`.

**Fix**: Move all `register_callback()` calls before `Runtime(registry)`.

### DeprecationWarning: "LocalRuntime is deprecated"

**Cause**: Using v0.12 compat layer.

**Fix**: Migrate to v2 API:

```python
# OLD (v0.12)
from kailash.runtime import LocalRuntime
runtime = LocalRuntime()
results, run_id = runtime.execute(workflow.build())

# NEW (v2)
import kailash
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, inputs)
```

### "ValueError: invalid node configuration"

**Cause**: Config dict has wrong keys or values for the node type.

**Fix**: Check the node's expected parameters. Common issues:

- Wrong parameter name (e.g., `path` vs `file_path`)
- Wrong value type (e.g., string where int expected)
- Missing required parameter

## Performance Tips

1. **Reuse Runtime**: Create once, execute many workflows
2. **Reuse Registry**: Don't recreate for each workflow
3. **Batch operations**: Use bulk nodes for >100 records
4. **Parallel execution**: Set `RuntimeConfig(max_concurrent_nodes=N)` for independent node groups
5. **GIL release**: `runtime.execute()` releases the GIL — safe with threading
6. **Async execution**: Use `await runtime.execute_async(workflow, inputs)` or `asyncio.to_thread(runtime.execute, ...)` in async code

## Migration Checklist (v0.12 -> v2)

- [ ] Replace `LocalRuntime()` with `kailash.Runtime(registry)`
- [ ] Replace `workflow.build()` with `builder.build(registry)`
- [ ] Replace `results, run_id = ...` with `result = ...` (access via `result["results"]`)
- [ ] Replace `from kailash.runtime import ...` with `import kailash`
- [ ] Replace `@register_node()` class with `register_callback()` function
- [ ] Test all workflows with v2 API
- [ ] Remove `import warnings; warnings.filterwarnings("ignore", category=DeprecationWarning)`
