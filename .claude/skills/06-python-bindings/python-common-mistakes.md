# Python Binding Common Mistakes

Error resolution guide for the `kailash-enterprise` Python package.

## Top 10 Mistakes

### 1. Missing Registry in build()

```python
# WRONG -- raises RuntimeError
workflow = builder.build()

# CORRECT
registry = kailash.NodeRegistry()
workflow = builder.build(registry)
```

### 2. Expecting Tuple Return from execute()

```python
# WRONG
results, run_id = runtime.execute(workflow, inputs)

# CORRECT -- returns a dict with 3 keys
result = runtime.execute(workflow, inputs)
# Access: result["results"]["node_id"]["output_key"]
# Run ID: result["run_id"]
# Metadata: result["metadata"]
```

### 3. Missing Registry in Runtime()

```python
# WRONG -- raises TypeError
runtime = kailash.Runtime()

# CORRECT
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)
```

### 4. Wrong Connection Parameter Order

```python
# WRONG -- swapped source/target or missing output/input names
builder.connect("target", "source")

# CORRECT -- source_node, source_output, target_node, target_input
builder.connect("source", "output", "target", "input")
```

**Mnemonic**: "From node.output TO node.input" -- source first, then target.

### 5. Registering Callback After Runtime Creation

```python
# WRONG -- runtime doesn't see the callback node
registry = kailash.NodeRegistry()
runtime = kailash.Runtime(registry)
registry.register_callback("MyNode", fn, ["in"], ["out"])  # Too late!

# CORRECT -- register before creating runtime
registry = kailash.NodeRegistry()
registry.register_callback("MyNode", fn, ["in"], ["out"])
runtime = kailash.Runtime(registry)  # Now runtime sees MyNode
```

### 6. Using Async Functions as Callbacks

```python
# WRONG -- callbacks must be synchronous
async def my_node(inputs):
    result = await some_api()
    return {"data": result}

# CORRECT -- use synchronous function
def my_node(inputs):
    import requests
    result = requests.get("https://api.example.com").json()
    return {"data": result}
```

**Why**: PyO3 callbacks run on the Rust tokio runtime. Async Python functions would need a Python event loop, which conflicts with the Rust runtime.

### 7. Passing Non-Serializable Objects in Config

```python
import numpy as np

# WRONG -- numpy arrays not supported
builder.add_node("MyNode", "n", {"data": np.array([1, 2, 3])})

# CORRECT -- convert to plain Python types
builder.add_node("MyNode", "n", {"data": [1, 2, 3]})
```

**Supported types**: str, int, float, bool, None, list, dict (nested). No numpy, pandas, datetime, custom classes.

### 8. Accessing Internal Module Directly

```python
# WRONG -- _kailash is an implementation detail
from kailash._kailash import Runtime, NodeRegistry

# CORRECT
import kailash
```

### 9. Node Type Name Misspelling

```python
# WRONG -- case-sensitive, exact names required
builder.add_node("jsonTransformNode", "t", {})   # wrong case
builder.add_node("JSONTransform", "t", {})        # missing "Node"

# CORRECT
builder.add_node("JSONTransformNode", "t", {})
```

**Tip**: Use `registry.list_types()` to see all valid node type names.

### 10. Manually Setting created_at/updated_at (DataFlow)

```python
# WRONG -- DataFlow auto-manages these
builder.add_node("UserCreateNode", "create", {
    "id": "1",
    "name": "Alice",
    "created_at": "2024-01-01T00:00:00Z"  # CAUSES ERROR
})

# CORRECT -- omit timestamp fields
builder.add_node("UserCreateNode", "create", {
    "id": "1",
    "name": "Alice"
})
```

## Error Messages & Solutions

| Error                                                           | Cause                                      | Fix                                                                                       |
| --------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `Unknown node type 'X'`                                         | Node type name not in registry             | Check spelling (case-sensitive), ensure `register_callback()` was called before `build()` |
| `Node 'X' not found in workflow`                                | Connection references non-existent node ID | Verify node IDs match exactly between `add_node()` and `connect()`                        |
| `Missing required input 'X' for node 'Y'`                       | Node expects unconnected input             | Add a connection or provide in execute inputs                                             |
| `TypeError: argument 'config': ...`                             | Config dict has non-serializable type      | Use only str, int, float, bool, None, list, dict                                          |
| `RuntimeError: workflow execution failed`                       | Structural issues or node failure          | Check connections, no unintended cycles, required inputs connected                        |
| `RuntimeError: cannot register callback after runtime creation` | Registered after `Runtime(registry)`       | Move all `register_callback()` before `Runtime(registry)`                                 |
| `ValueError: invalid node configuration`                        | Wrong config keys or value types           | Check node's expected parameters                                                          |

## Performance Tips

1. **Reuse Runtime**: Create once, execute many workflows
2. **Reuse Registry**: Don't recreate for each workflow
3. **Batch operations**: Use bulk nodes for >100 records
4. **Parallel execution**: Set `RuntimeConfig(max_concurrent_nodes=N)` for independent node groups
5. **GIL release**: `runtime.execute()` releases the GIL -- safe with threading
6. **Async execution**: Use `await runtime.execute_async(workflow, inputs)` or `asyncio.to_thread(runtime.execute, ...)` in async code
