---
name: error-troubleshooting
description: "Common error patterns and troubleshooting guides for Kailash SDK including Nexus blocking issues, connection parameter errors, runtime execution errors, cycle convergence problems, missing .build() calls, parameter validation errors, and DataFlow template syntax errors. Use when encountering errors, debugging issues, or asking about 'error', 'troubleshooting', 'debugging', 'not working', 'hangs', 'timeout', 'validation error', 'connection error', 'runtime error', 'cycle not converging', 'missing build', or 'template syntax'."
---

# Kailash Error Troubleshooting

Comprehensive troubleshooting guides for common Kailash SDK errors and issues.

## Overview

Common error patterns and solutions for:

- Nexus blocking and timeout issues
- Connection parameter errors
- Runtime execution problems
- Cycle convergence failures
- Missing .build() calls
- Parameter validation errors
- DataFlow template syntax errors

## Reference Documentation

### Critical Errors

#### Nexus Blocking (MOST COMMON)

- **[error-nexus-blocking](error-nexus-blocking.md)** - Nexus hangs or blocks
  - **Symptom**: Nexus API hangs forever, no response
  - **Cause**: Wrong runtime configuration
  - **Solution**: Use `kailash.Runtime(reg)`
  - **Prevention**: Always use async runtime in containers

#### Missing .build() Call

- **[error-missing-build](error-missing-build.md)** - Forgot to call .build()
  - **Symptom**: `TypeError: execute() expects Workflow, got WorkflowBuilder`
  - **Cause**: `rt.execute(workflow)` instead of `rt.execute(builder.build(reg))`
  - **Solution**: Always call `.build()` before execution
  - **Pattern**: `rt.execute(builder.build(reg))`

### Connection & Parameter Errors

#### Connection Parameter Errors

- **[error-connection-params](error-connection-params.md)** - Invalid connections
  - **Symptom**: Node doesn't receive expected data
  - **Cause**: Wrong 4-parameter connection format
  - **Solution**: Use `(source_id, source_param, target_id, target_param)`
  - **Common mistake**: Wrong parameter names

#### Parameter Validation Errors

- **[error-parameter-validation](error-parameter-validation.md)** - Invalid node parameters
  - **Symptom**: `ValidationError: Missing required parameter`
  - **Cause**: Missing or incorrect node parameters
  - **Solution**: Check node documentation for required params
  - **Tool**: Use validate-parameters skill

### Runtime Errors

#### Runtime Execution Errors

- **[error-runtime-execution](error-runtime-execution.md)** - Runtime failures
  - **Symptom**: Workflow fails during execution
  - **Cause**: Various runtime issues
  - **Solutions**: Check logs, validate inputs, test nodes individually
  - **Debug**: Use LogNode for visibility

### Cyclic Workflow Errors

#### Cycle Convergence Errors

- **[error-cycle-convergence](error-cycle-convergence.md)** - Cycles don't converge
  - **Symptom**: Workflow runs forever, max iterations exceeded
  - **Cause**: No convergence condition or bad logic
  - **Solution**: Add proper convergence check
  - **Pattern**: Use `cycle_complete` flag

### DataFlow Errors

#### DataFlow Template Syntax

- **[error-dataflow-template-syntax](error-dataflow-template-syntax.md)** - Template string errors
  - **Symptom**: `SyntaxError` in template strings
  - **Cause**: Invalid template syntax in queries
  - **Solution**: Use proper template format
  - **Pattern**: `{{variable}}` or `{param}`

## Quick Error Reference

### Error by Symptom

| Symptom                         | Error Type           | Quick Fix                   |
| ------------------------------- | -------------------- | --------------------------- |
| **API hangs forever**           | Nexus blocking       | Use `kailash.Runtime(reg)`  |
| **TypeError: expects Workflow** | Missing .build()     | Add .build() call           |
| **Node gets wrong data**        | Connection params    | Check 4-parameter format    |
| **ValidationError**             | Parameter validation | Check required params       |
| **Infinite loop**               | Cycle convergence    | Add convergence condition   |
| **Template SyntaxError**        | DataFlow template    | Fix template syntax         |
| **Runtime fails**               | Runtime execution    | Check logs, validate inputs |

### Error Prevention Checklist

**Before Running Workflow**:

- [ ] Called `.build()` on WorkflowBuilder?
- [ ] Using `kailash.Runtime(reg)` with NodeRegistry?
- [ ] All connections use 4 parameters?
- [ ] All required node parameters provided?
- [ ] Cyclic workflows have convergence checks?
- [ ] Template strings use correct syntax?

## Common Error Patterns

### 1. Nexus Blocking/Hanging

```python
# ❌ WRONG (causes hang in Docker)
reg = kailash.NodeRegistry()
from kailash.nexus import NexusApp
app = NexusApp()  # Don't pass unsupported parameters
```

### 2. Missing .build() Call

```python
# ❌ WRONG
builder = kailash.WorkflowBuilder()
builder.add_node(...)
result = rt.execute(workflow)  # TypeError!

# ✅ CORRECT
builder = kailash.WorkflowBuilder()
builder.add_node(...)
result = rt.execute(builder.build(reg))  # Always .build()
```

### 3. Connection Parameter Errors

```python
# ❌ WRONG (only 2 parameters)
builder.connect("node1", "node2")

# ❌ WRONG (wrong parameter names)
builder.connect("node1", "output", "node2", "input_data")
# but node2 expects "data" not "input_data"

# ✅ CORRECT (4 parameters, correct names)
builder.connect("node1", "result", "node2", "data")
```

### 4. Cycle Convergence Issues

```python
# LoopNode iterates over an items array (not condition-based)
builder.add_node("LoopNode", "loop", {
    "max_iterations": 100  # Optional safety limit
})
# Connect the array to iterate over
builder.connect("source", "items_array", "loop", "items")

# For convergence logic, use a callback node with internal state
def converge(inputs):
    current = inputs.get("current", 0)
    previous = inputs.get("previous", 0)
    done = abs(current - previous) < 0.01
    return {"done": done, "value": current}

reg.register_callback("ConvergeCheck", converge, ["current", "previous"], ["done", "value"])
```

### 5. DataFlow Template Errors

```python
# ❌ WRONG
query = "SELECT * FROM users WHERE id = {user_id}"  # Invalid

# ✅ CORRECT
query = "SELECT * FROM users WHERE id = {{user_id}}"  # kailash.DataFlow template
```

## Debugging Strategies

### Step 1: Check Error Message

- Read full error message and stack trace
- Identify error type and location
- Check if it matches known patterns

### Step 2: Validate Configuration

- Runtime: Using `kailash.Runtime(reg)`?
- Build: Called .build()?
- Connections: 4 parameters?
- Parameters: All required params?

### Step 3: Test Components

- Test nodes individually
- Test with minimal workflow
- Add LogNode for visibility
- Check intermediate results

### Step 4: Check Documentation

- Node documentation for parameters
- Framework-specific guides
- Error troubleshooting guides
- Gold standards for best practices

## When to Use This Skill

Use this skill when you encounter:

- API hanging or blocking
- Runtime errors during execution
- Validation errors
- Connection issues
- Cyclic workflow problems
- DataFlow errors
- Any error message or unexpected behavior

## CRITICAL Debugging Tips

1. **ALWAYS** check `.build()` was called on workflow
2. **NEVER** ignore connection validation errors
3. **ALWAYS** verify absolute imports when seeing import errors
4. **NEVER** assume mock tests found real issues - use real infrastructure

## Related Skills

- **[16-validation-patterns](../16-validation-patterns/SKILL.md)** - Validation patterns
- **[17-gold-standards](../../17-gold-standards/SKILL.md)** - Best practices to avoid errors
- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core patterns
- **[02-dataflow](../../02-dataflow/SKILL.md)** - DataFlow specifics
- **[03-nexus](../../03-nexus/SKILL.md)** - Nexus specifics

## Support

For error troubleshooting, invoke:

- `sdk-navigator` - Find relevant documentation
- `pattern-expert` - Pattern validation
- `gold-standards-validator` - Check compliance
- `testing-specialist` - Test debugging
