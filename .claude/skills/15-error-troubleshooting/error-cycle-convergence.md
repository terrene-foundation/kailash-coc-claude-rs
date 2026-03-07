---
name: error-cycle-convergence
description: "Fix cyclic workflow convergence errors in Kailash. Use when encountering 'cycle not converging', 'infinite loop', 'max iterations reached', 'cycle convergence failed', or cyclic workflow issues."
---

# Error: Cycle Not Converging

Fix cyclic workflow convergence issues including infinite loops, max iterations exceeded, and convergence criteria problems.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH`
> Related Skills: [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md), [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)
> Related Subagents: `pattern-expert` (complex cycle debugging)

## Common Issues

### Issue 1: Wrong Convergence Criteria
```python
# ❌ Wrong - using nested path in convergence
cycle_builder.converge_when("result.done == True")  # ERROR!

# ✅ Fix - use flattened field names
cycle_builder.converge_when("done == True")
```

### Issue 2: Missing Initial Parameters
```python
# ❌ Wrong - no starting value
builder.add_node("PythonCodeNode", "counter", {
    "code": "result = {'count': x + 1}"
})
rt.execute(builder.build(reg))  # ERROR: 'x' undefined

# ✅ Fix - provide initial parameters
rt.execute(builder.build(reg), parameters={
    "counter": {"x": 0}  # Starting value
})
```

### Issue 3: No Max Iterations Set
```python
# ❌ Wrong - could run forever
cycle_builder.connect("node1", "node2", mapping={...}).build()

# ✅ Fix - always set max iterations
cycle_builder.connect("node1", "node2", mapping={...}) \
             .max_iterations(100) \
             .converge_when("done == True") \
             .build()
```

## Complete Example

```python
import kailash

builder = kailash.WorkflowBuilder()

# Counter node
builder.add_node("PythonCodeNode", "counter", {
    "code": """
# Handle first iteration with try/except
try:
    count = x
except NameError:
    count = 0

count += 1
done = count >= 5
result = {'count': count, 'done': done}
"""
})

# CRITICAL: Build workflow FIRST
built_workflow = builder.build(reg)

# Create cycle on BUILT workflow (kailash.WorkflowBuilder doesn't have create_cycle)
cycle_builder = built_workflow.create_cycle("count_cycle")
# CRITICAL: mapping needs "result." prefix for PythonCodeNode outputs
cycle_builder.connect("counter", "counter", mapping={"result.count": "x"}) \
             .max_iterations(10) \
             .converge_when("done == True") \
             .build()

# Execute
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(built_workflow)

print(f"Final count: {results['counter']['result']['count']}")  # Should be 5
```

## Debugging Checklist

- [ ] Convergence criteria uses flattened fields (no `result.`)
- [ ] Max iterations set appropriately
- [ ] Initial parameters provided
- [ ] Cycle connections use correct mapping
- [ ] `.build()` called on cycle_builder

## Related Patterns

- **Cyclic patterns**: [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md)
- **Cyclic template**: [`template-cyclic-workflow`](../14-code-templates/template-cyclic-workflow.md)

## When to Escalate to Subagent

Use `pattern-expert` subagent when:
- Complex multi-cycle workflows
- Advanced convergence criteria
- Performance optimization of cycles

## Documentation References

### Related Skills
- **Cyclic Workflows**: [`workflow-pattern-cyclic`](../../09-workflow-patterns/workflow-pattern-cyclic.md)
- **Cyclic Template**: [`template-cyclic-workflow`](../../14-code-templates/template-cyclic-workflow.md)

## Quick Tips

- 💡 **Flattened convergence**: No `result.` prefix in `converge_when()`
- 💡 **Always max_iterations**: Prevent infinite loops
- 💡 **Initial values**: Cycles need starting parameters
- 💡 **Debug output**: Add print statements in PythonCodeNode to track values

<!-- Trigger Keywords: cycle not converging, infinite loop, max iterations reached, cycle convergence failed, cyclic workflow error, loop not stopping, convergence criteria, cycle issue -->
