---
name: error-cycle-convergence
description: "Fix cyclic workflow errors in Kailash Rust binding. Use when encountering 'cycle detected', 'infinite loop', 'max iterations reached', or cyclic workflow issues."
---

# Error: Cycle Detected in Workflow

Fix cyclic workflow errors in the Rust-backed binding, where self-referencing connections are blocked at build time.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH`
> Related Skills: [`template-cyclic-workflow`](../14-code-templates/template-cyclic-workflow.md), [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)
> Related Subagents: `pattern-expert` (iteration pattern design)

## The Error

```
RuntimeError: workflow build failed: cycle detected involving nodes: counter
```

This occurs when `WorkflowBuilder.build(registry)` detects a self-referencing connection (node A -> node A, or A -> B -> A).

## Why This Happens

The Rust binding's `build()` performs topological validation and rejects any graph that contains cycles. Unlike the pure Python SDK, the Rust binding does **not** have:

- `workflow.create_cycle()`
- `connect(..., mapping={...})`
- `.converge_when()` or `.max_iterations()` on a cycle builder

`RuntimeConfig(enable_cycles=True)` exists as a flag but cycles are blocked at the build validation layer.

## Solutions

### Solution 1: Use LoopNode (Recommended)

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# LoopNode handles bounded iteration natively
builder.add_node("LoopNode", "loop", {
    "max_iterations": 10,
    "condition": "count < target"
})

builder.add_node("EmbeddedPythonNode", "body", {
    "code": "result = {'count': count + 1}"
})

builder.connect("loop", "item", "body", "data")

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf, {"count": 0, "target": 5})
```

### Solution 2: Use a Callback Node with Internal State

```python
import kailash

reg = kailash.NodeRegistry()

def iterative_process(inputs):
    count = inputs.get("count", 0)
    target = inputs.get("target", 10)

    # Do all iterations inside the callback
    while count < target:
        count += 1

    return {"count": count, "done": True}

reg.register_callback(
    "IterativeNode", iterative_process,
    ["count", "target"], ["count", "done"]
)

builder = kailash.WorkflowBuilder()
builder.add_node("IterativeNode", "process", {})

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf, {"count": 0, "target": 5})
print(f"Final: {result['results']['process']['count']}")  # 5
```

### Solution 3: Unroll the Loop as Linear Pipeline

Replace a cycle with explicit sequential steps:

```python
builder = kailash.WorkflowBuilder()

# Instead of a cycle, create sequential processing steps
builder.add_node("EmbeddedPythonNode", "step1", {
    "code": "result = {'value': input_val * 2}"
})
builder.add_node("EmbeddedPythonNode", "step2", {
    "code": "result = {'value': value * 2}"
})
builder.add_node("EmbeddedPythonNode", "step3", {
    "code": "result = {'value': value * 2}"
})

builder.connect("step1", "result", "step2", "data")
builder.connect("step2", "result", "step3", "data")

wf = builder.build(reg)
```

### Solution 4: RetryNode for Retry-on-Failure Patterns

```python
builder = kailash.WorkflowBuilder()

# RetryNode handles retry logic with backoff
builder.add_node("RetryNode", "retry", {
    "max_retries": 3,
    "backoff_ms": 1000
})

builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://api.example.com/data",
    "method": "GET"
})

builder.connect("retry", "output", "fetch", "trigger")
```

## Debugging Checklist

- [ ] No self-referencing connections (node connecting to itself)
- [ ] No circular chains (A -> B -> A)
- [ ] Use LoopNode for bounded iteration
- [ ] Use callback nodes for complex iteration logic
- [ ] Use RetryNode for retry patterns
- [ ] Use linear pipelines when iteration count is known

## Common Migration from py SDK Cycles

| Pure Python SDK Pattern              | Rust Binding Equivalent                                   |
| ------------------------------------ | --------------------------------------------------------- |
| `workflow.create_cycle("name")`      | Use `LoopNode` or callback node                           |
| `cycle.connect(a, b, mapping={...})` | `builder.connect(a, output, b, input)` in linear pipeline |
| `.converge_when("done == True")`     | Condition logic inside callback or LoopNode `condition`   |
| `.max_iterations(N)`                 | LoopNode `max_iterations` config or callback loop limit   |

## Related Patterns

- **Iteration templates**: [`template-cyclic-workflow`](../14-code-templates/template-cyclic-workflow.md)
- **Workflow quickstart**: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)

## When to Escalate to Subagent

Use `pattern-expert` subagent when:

- Need to convert complex py SDK cyclic workflows to Rust binding patterns
- Iteration logic requires conditional branching mid-loop
- Performance optimization of iterative patterns

<!-- Trigger Keywords: cycle detected, cycle not converging, infinite loop, max iterations reached, cycle convergence failed, cyclic workflow error, loop not stopping, convergence criteria, cycle issue, create_cycle -->
