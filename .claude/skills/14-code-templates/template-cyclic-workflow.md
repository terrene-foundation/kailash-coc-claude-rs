---
name: template-cyclic-workflow
description: "Generate Kailash cyclic workflow template. Use when requesting 'cyclic workflow template', 'loop workflow template', 'iterative workflow', 'cycle template', or 'convergence workflow'."
---

# Cyclic Workflow Template

Template for creating iterative/looping workflows in the Rust-backed binding.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md), [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)
> Related Subagents: `pattern-expert` (complex cycles)

> **Known Limitation**: The Rust binding's `WorkflowBuilder.build(registry)` rejects self-referencing connections (`cycle detected involving nodes: X`). The `Workflow` object has no `create_cycle()`, `mapping=`, `converge_when()`, or `max_iterations()` methods. `RuntimeConfig(enable_cycles=True)` exists but cycles are blocked at build validation. Use the LoopNode-based patterns below instead.

## LoopNode Iterative Template (Recommended)

```python
"""Iterative workflow using LoopNode (Rust-backed)"""

import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# 1. Setup initial data
builder.add_node("EmbeddedPythonNode", "setup", {
    "code": """
result = {'items': [1, 2, 3, 4, 5], 'processed': []}
""",
    "output_vars": ["result"]
})

# 2. LoopNode handles iteration
builder.add_node("LoopNode", "loop", {
    "max_iterations": 5
})

# 3. Processing node inside loop body
builder.add_node("EmbeddedPythonNode", "process", {
    "code": """
item = items.pop(0)
processed.append(item * 2)
result = {'items': items, 'processed': processed}
""",
    "output_vars": ["result"]
})

# Connect pipeline
builder.connect("setup", "outputs", "loop", "items")
builder.connect("loop", "results", "process", "data")

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
```

## Callback-Based Iteration Pattern

For iteration logic that doesn't fit LoopNode, use a callback node with internal state:

```python
"""Callback-based iteration pattern"""

import kailash

reg = kailash.NodeRegistry()

# Stateful callback that tracks iterations
def iterative_counter(inputs):
    count = inputs.get("count", 0) + 1
    target = inputs.get("target", 10)
    done = count >= target
    return {
        "count": count,
        "done": done,
        "result": f"Iteration {count}/{target}"
    }

reg.register_callback(
    "IterativeCounterNode",
    iterative_counter,
    ["count", "target"],
    ["count", "done", "result"]
)

builder = kailash.WorkflowBuilder()
builder.add_node("IterativeCounterNode", "counter", {})

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf, {"count": 0, "target": 5})
print(f"Result: {result['results']['counter']}")
```

## Multi-Step Pipeline (No Cycles Needed)

For many use cases, a linear pipeline with conditional logic replaces cycles:

```python
"""Linear pipeline with ConditionalNode instead of cycle"""

import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# Step 1: Extract
builder.add_node("EmbeddedPythonNode", "extract", {
    "code": "result = {'data': [1, 2, 3, 4, 5]}",
    "output_vars": ["result"]
})

# Step 2: Transform
builder.add_node("EmbeddedPythonNode", "transform", {
    "code": """
data = input_data.get('data', [])
result = {'transformed': [x * 2 for x in data], 'count': len(data)}
""",
    "output_vars": ["result"]
})

# Step 3: Validate (ConditionalNode takes NO config params; inputs via connections only)
builder.add_node("ConditionalNode", "validate", {})

# Step 4: Load
builder.add_node("EmbeddedPythonNode", "load", {
    "code": "result = {'status': 'loaded', 'items': len(transformed)}",
    "output_vars": ["result"]
})

# Connect pipeline
builder.connect("extract", "outputs", "transform", "input_data")
builder.connect("transform", "outputs", "validate", "condition")
builder.connect("validate", "result", "load", "data")

wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
print(f"Status: {result['results']['load']}")
```

## Key Patterns

### Iteration Approaches (Rust Binding)

1. **LoopNode** -- LoopNode iterates over an array with optional max_iterations limit
2. **Callback nodes** -- Register Python functions that handle iteration internally
3. **Linear pipelines** -- Replace cycles with sequential steps + ConditionalNode
4. **RetryNode** -- For retry-on-failure patterns (built-in backoff)

### What Does NOT Work

- `workflow.create_cycle()` -- does not exist on Workflow
- `connect(..., mapping={...})` -- `mapping=` kwarg not supported
- `.converge_when()` -- does not exist
- `.max_iterations()` on cycle builder -- does not exist
- Self-referencing `connect("a", "out", "a", "in")` -- blocked by build validation

## Related Patterns

- **Cyclic patterns**: [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md)
- **Cycle errors**: [`error-cycle-convergence`](../15-error-troubleshooting/error-cycle-convergence.md)

## When to Escalate

Use `pattern-expert` when:

- Complex iteration logic that doesn't fit LoopNode
- Need to simulate cycles with linear pipelines
- Performance optimization of iterative workflows

<!-- Trigger Keywords: cyclic workflow template, loop workflow template, iterative workflow, cycle template, convergence workflow, cyclic template, loop template, iterative template -->
