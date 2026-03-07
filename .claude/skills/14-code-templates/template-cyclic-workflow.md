---
name: template-cyclic-workflow
description: "Generate Kailash cyclic workflow template. Use when requesting 'cyclic workflow template', 'loop workflow template', 'iterative workflow', 'cycle template', or 'convergence workflow'."
---

# Cyclic Workflow Template

Template for creating cyclic/iterative workflows with convergence criteria.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md), [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)
> Related Subagents: `pattern-expert` (complex cycles)

## WorkflowBuilder Cyclic Template (Recommended)

```python
"""Cyclic Workflow Template using kailash.WorkflowBuilder"""

import kailash

# 1. Create workflow
builder = kailash.WorkflowBuilder()

# 2. Add cycle node with try/except for first iteration
builder.add_node("PythonCodeNode", "counter", {
    "code": """
# Handle first iteration
try:
    count = x
except NameError:
    count = 0

count += 1
done = count >= 10

result = {'count': count, 'done': done}
"""
})

# 3. CRITICAL: Build workflow FIRST (kailash.WorkflowBuilder doesn't have create_cycle)
reg = kailash.NodeRegistry()
built_workflow = builder.build(reg)

# 4. Create cycle on BUILT workflow
# CRITICAL: mapping needs "result." prefix for PythonCodeNode outputs
cycle_builder = built_workflow.create_cycle("count_cycle")
cycle_builder.connect("counter", "counter", mapping={"result.count": "x"}) \
             .max_iterations(20) \
             .converge_when("done == True") \
             .build()

# 5. Execute
rt = kailash.Runtime(reg)
result = rt.execute(built_workflow)

print(f"Final count: {result['results']['counter']['result']['count']}")
```

## Simple Counter Template

```python
"""Simple counter cyclic workflow"""

builder = kailash.WorkflowBuilder()

# Counter node with try/except for first iteration
builder.add_node("PythonCodeNode", "counter", {
    "code": """
# Handle first iteration
try:
    count = x
    max_val = max_count
except NameError:
    count = 0
    max_val = 10

count += 1
done = count >= max_val

result = {'count': count, 'done': done}
"""
})

# CRITICAL: Build workflow FIRST
reg = kailash.NodeRegistry()
built_workflow = builder.build(reg)

# Create cycle on BUILT workflow
# CRITICAL: Use "result." prefix in mapping for PythonCodeNode
cycle_builder = built_workflow.create_cycle("count_cycle")
cycle_builder.connect("counter", "counter", mapping={"result.count": "x"}) \
             .max_iterations(100) \
             .converge_when("done == True") \
             .build()

# Execute
rt = kailash.Runtime(reg)
result = rt.execute(built_workflow)

print(f"Final count: {result['results']['counter']['result']['count']}")
```

## SwitchNode + Cycle Template

```python
"""Conditional cycle with SwitchNode"""

builder = kailash.WorkflowBuilder()

# Optimizer node
builder.add_node("PythonCodeNode", "optimizer", {
    "code": """
optimized_value = current_value * 1.1
result = {'optimized': optimized_value}
"""
})

# Condition checker (SwitchNode)
builder.add_node("SwitchNode", "check_quality", {
    "condition": "optimized >= target",
    "condition_type": "expression"
})

# Packager for switch input
builder.add_node("PythonCodeNode", "packager", {
    "code": "result = {'optimized': optimized, 'target': target}"
})

# Final result node
builder.add_node("PythonCodeNode", "final", {
    "code": "result = {'final_value': optimized, 'iterations': 'completed'}"
})

# CRITICAL: Setup forward connections FIRST
builder.add_connection("check_quality", "output_false", "optimizer", "current_value")
builder.add_connection("check_quality", "output_true", "final", "optimized")

# Build and create cycle
reg = kailash.NodeRegistry()
built_workflow = builder.build(reg)
cycle_builder = built_workflow.create_cycle("optimization_cycle")
cycle_builder.connect("optimizer", "packager", mapping={"optimized": "optimized"}) \
             .connect("packager", "check_quality", mapping={"package": "input"}) \
             .max_iterations(20) \
             .converge_when("converged == True") \
             .build()

# Execute
rt = kailash.Runtime(reg)
result = rt.execute(built_workflow, parameters={
    "optimizer": {"current_value": 1.0, "target": 10.0}
})
```

## Key Patterns

### Critical Steps
1. **Build workflow** FIRST with `builder.build(reg)`
2. **Create cycle** on built workflow
3. **Use mapping** for parameter flow
4. **Set max_iterations** to prevent infinite loops
5. **Define convergence** criteria
6. **Provide initial** parameters at runtime

### Convergence Criteria
```python
# ✅ Flattened fields (no 'result.' prefix)
.converge_when("done == True")
.converge_when("quality >= 0.95")
.converge_when("count > max_count")

# ❌ Don't use nested paths
.converge_when("result.done == True")  # ERROR!
```

## Related Patterns

- **Cyclic patterns**: [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md)
- **Cycle errors**: [`error-cycle-convergence`](../15-error-troubleshooting/error-cycle-convergence.md)
- **Cycle errors**: [`error-cycle-convergence`](../15-error-troubleshooting/error-cycle-convergence.md)

## When to Escalate

Use `pattern-expert` when:
- Complex multi-cycle workflows
- Advanced convergence logic
- Performance optimization
- Nested cycles

## Documentation References

### Primary Sources
- **Pattern Expert**: [`.claude/agents/pattern-expert.md` (lines 103-158)](../../../../.claude/agents/pattern-expert.md#L103-L158)

## Quick Tips

- 💡 **Build first**: Always `.build(reg)` before creating cycle
- 💡 **Max iterations**: Prevent infinite loops
- 💡 **Initial values**: Provide starting parameters
- 💡 **Flat convergence**: No `result.` in `converge_when()`

<!-- Trigger Keywords: cyclic workflow template, loop workflow template, iterative workflow, cycle template, convergence workflow, cyclic template, loop template, iterative template -->
