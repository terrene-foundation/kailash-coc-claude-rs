---
name: error-runtime-execution
description: "Fix runtime execution errors in Kailash workflows. Use when encountering 'execute() failed', 'runtime error', 'workflow execution error', 'Runtime error', or execution-related failures."
---

# Error: Runtime Execution Failures

Fix common runtime execution errors including wrong runtime usage, execution failures, and runtime configuration issues.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH`
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md), [`runtime-execution`](../../01-core-sdk/runtime-execution.md), [`decide-runtime`](../decisions/decide-runtime.md)
> Related Subagents: `pattern-expert` (complex debugging)

## Common Errors

### Wrong Runtime Parameter Name

```python
# ❌ Error
rt.execute(builder.build(reg), config={"node": {"param": "value"}})
rt.execute(builder.build(reg), inputs={"node": {"param": "value"}})
rt.execute(builder.build(reg), overrides={"node": {"param": "value"}})

# ✅ Fix: Use 'inputs'
rt.execute(builder.build(reg), inputs={"node": {"param": "value"}})
```

### Result Access

```python
# Result is a dict with keys: results, run_id, metadata
result = rt.execute(builder.build(reg))

# Access results
print(result["results"])   # node outputs
print(result["run_id"])    # execution run ID
print(result["metadata"])  # execution metadata
```

## Runtime Usage Guide

| Context          | Runtime                | Method                           |
| ---------------- | ---------------------- | -------------------------------- |
| **CLI/Scripts**  | `kailash.Runtime(reg)` | `rt.execute(builder.build(reg))` |
| **NexusApp**     | `kailash.Runtime(reg)` | `rt.execute(builder.build(reg))` |
| **All contexts** | `kailash.Runtime(reg)` | Same unified API                 |

## Complete Examples

### CLI/Script Pattern

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "process", {
    "code": "result = {'status': 'completed'}"
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(f"Completed: {result['run_id']}")
```

### NexusApp Pattern

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler()
def execute(data):
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "process", {
        "code": "result = {'status': 'completed'}"
    })

    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))
```

## Related Patterns

- **Runtime selection**: [`decide-runtime`](../decisions/decide-runtime.md)
- **Execution guide**: [`runtime-execution`](../../01-core-sdk/runtime-execution.md)
- **Parameter errors**: [`error-parameter-validation`](error-parameter-validation.md)

## When to Escalate to Subagent

Use `pattern-expert` subagent when:

- Complex runtime configuration needed
- Performance optimization required
- Custom runtime development

## Documentation References

### Primary Sources

- **CLAUDE.md**: [`CLAUDE.md` (lines 106-137)](../../../../CLAUDE.md#L106-L137)

## Quick Tips

- 💡 **Right parameter name**: Always use `inputs={}` not `parameters` or `config`
- 💡 **Deployment**: Use NexusApp for Docker deployment
- 💡 **Capture both**: Always get `result = rt.execute(...)`

<!-- Trigger Keywords: execute() failed, runtime error, workflow execution error, Runtime error, execution failed, runtime.execute error, execution failure, runtime issue -->
