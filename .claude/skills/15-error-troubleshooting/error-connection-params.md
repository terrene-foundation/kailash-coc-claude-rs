---
name: error-connection-params
description: "Fix connection parameter errors in Kailash workflows. Use when encountering 'target node not found', 'connection parameter order', 'wrong connection syntax', or '4-parameter connection' errors."
---

# Error: Connection Parameter Issues

Fix connection-related errors including wrong parameter order, missing parameters, and target node not found issues.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `CRITICAL` (Very common error #2)
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md), [`connection-patterns`](../../01-core-sdk/connection-patterns.md)
> Related Subagents: `pattern-expert` (complex connection debugging)

## Common Error Messages

```
Node 'result' not found in workflow
Node 'X' not found in workflow
TypeError: connect() takes 5 positional arguments but 4 were given
Connection mapping error: output key 'X' not found
```

## Root Causes

1. **Wrong parameter order** - Swapping source_output and target
2. **Missing node ID** - Referencing non-existent node
3. **Wrong number of parameters** - Using deprecated 3-parameter syntax
4. **Nested output access** - Missing dot notation for nested fields

## Quick Fixes

### ❌ Error 1: Wrong Parameter Order (VERY COMMON)

```python
# Wrong - parameters swapped (source_output and target positions)
builder.connect(
    "prepare_filters",   # source ✓
    "execute_search",    # source_output ✗ (should be "result")
    "result",            # target ✗ (should be "execute_search")
    "input"              # target_input ✓
)
# Error: "Target node 'result' not found in workflow"
```

### ✅ Fix: Correct Parameter Order

```python
# Correct - proper order: source, source_output, target, target_input
builder.connect(
    "prepare_filters",   # source: source node ID
    "result",            # source_output: output field from source
    "execute_search",    # target: target node ID
    "input"              # target_input: input field on target
)
```

**Mnemonic**: **Source first** (node + output), **then Target** (node + input)

### ❌ Error 2: Only 3 Parameters (Deprecated)

```python
# Wrong - old 3-parameter syntax (not supported)
builder.connect("reader", "processor", "data")
```

### ✅ Fix: Use 4 Parameters

```python
# Correct - modern 4-parameter syntax
builder.connect("reader", "data", "processor", "data")
#                       ^source ^output  ^target   ^input
```

### ❌ Error 3: Missing Nested Path

```python
# If node outputs: {'result': {'filters': {...}, 'limit': 50}}

# Wrong - missing nested path
builder.connect(
    "prepare_filters", "filters",  # ✗ 'filters' is nested under 'result'
    "search", "filter"
)
# Error: "Output key 'filters' not found on node 'prepare_filters'"
```

### ✅ Fix: Use Dot Notation

```python
# Correct - full path to nested value
builder.connect(
    "prepare_filters", "result.filters",  # ✓ Full nested path
    "search", "filter"
)

builder.connect(
    "prepare_filters", "result.limit",
    "search", "limit"
)
```

## Complete Example: Before & After

### ❌ Wrong Code (All Common Mistakes)

```python
builder = kailash.WorkflowBuilder()

builder.add_node("EmbeddedPythonNode", "prep", {
    "code": "result = {'filters': {'status': 'active'}, 'limit': 10}"
})

builder.add_node("ListUser", "search", {})

# WRONG: Only 3 parameters
builder.connect("prep", "search", "filters")

# WRONG: Wrong order (swapped output and target)
builder.connect("prep", "search", "filters", "filter")

# WRONG: Missing nested path
builder.connect("prep", "filters", "search", "filter")
```

### ✅ Correct Code

```python
builder = kailash.WorkflowBuilder()

builder.add_node("EmbeddedPythonNode", "prep", {
    "code": "result = {'filters': {'status': 'active'}, 'limit': 10}"
})

builder.add_node("ListUser", "search", {})

# CORRECT: 4 parameters in right order with nested path
builder.connect("prep", "result.filters", "search", "filter")
builder.connect("prep", "result.limit", "search", "limit")
```

## 4-Parameter Connection Pattern

### Parameter Breakdown

```python
builder.connect(
    source,         # 1. Source node ID (string)
    source_output,  # 2. Output field name from source (use dot notation for nested)
    target,         # 3. Target node ID (string)
    target_input    # 4. Input parameter name on target
)
```

### Common Patterns

| Scenario          | source_output         | Example                                                       |
| ----------------- | --------------------- | ------------------------------------------------------------- |
| **Simple field**  | `"data"`              | `builder.connect("reader", "data", "processor", "input")`     |
| **Nested field**  | `"result.data"`       | `builder.connect("prep", "result.data", "process", "input")`  |
| **Deep nesting**  | `"result.user.email"` | `builder.connect("fetch", "result.user.email", "send", "to")` |
| **Array element** | `"result.items[0]"`   | Not supported - use EmbeddedPythonNode to extract             |

## Debugging Connection Errors

### Step 1: Verify Node IDs Exist

```python
# List all node IDs in your workflow
node_ids = ["prep", "search", "process"]  # Your nodes

# Check connection references match
builder.connect("prep", "result", "search", "input")  # ✓ Both exist
builder.connect("prep", "result", "missing", "input")  # ✗ 'missing' not in workflow
```

### Step 2: Check Output Structure

```python
# Debug by printing node outputs
result = rt.execute(builder.build(reg))

print(f"prep outputs: {results['prep'].keys()}")  # See available keys
# If output is: {'result': {'filters': {}, 'limit': 10}}
# Then use: "result.filters" and "result.limit"
```

### Step 3: Verify Parameter Order

```python
# Remember the order: source, source_output, target, target_input
#                     ^SOURCE  ^SOURCE^^^^^  ^TARGET  ^TARGET^^^^
builder.connect(
    "source_node",     # 1. source (source node ID)
    "output_field",    # 2. source_output (output field from source)
    "target_node",     # 3. target (target node ID)
    "input_param"      # 4. target_input (input field on target)
)
```

## Related Patterns

- **Connection basics**: [`connection-patterns`](../../01-core-sdk/connection-patterns.md)
- **Workflow creation**: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)
- **Other errors**: [`error-missing-build`](error-missing-build.md), [`error-parameter-validation`](error-parameter-validation.md)
- **Parameter passing**: [`param-passing-quick`](../../01-core-sdk/param-passing-quick.md)

## When to Escalate to Subagent

Use `pattern-expert` subagent when:

- Complex multi-node connection patterns
- Cyclic workflow connection issues
- Advanced parameter mapping
- Connection optimization for performance

## Documentation References

### Primary Sources

- **Pattern Expert**: [`.claude/agents/pattern-expert.md` (lines 294-338)](../../../../.claude/agents/pattern-expert.md#L294-L338)

### Related Documentation

- **Critical Rules**: [`CLAUDE.md` (line 140)](../../../../CLAUDE.md#L140)

## Quick Tips

- 💡 **Mnemonic**: Source (node + output) → Target (node + input)
- 💡 **Debug order**: If "node not found", check if you swapped source_output and target
- 💡 **Nested access**: Use dot notation (`result.data`) for nested fields
- 💡 **Verify IDs**: Ensure all referenced node IDs actually exist in workflow
- 💡 **Check output**: Print `results[node].keys()` to see available output fields

## Version Notes

<!-- Trigger Keywords: target node not found, connection error, connection parameter order, wrong connection syntax, 4-parameter connection, connect error, connection mapping error, node not found in workflow, connection issues -->
