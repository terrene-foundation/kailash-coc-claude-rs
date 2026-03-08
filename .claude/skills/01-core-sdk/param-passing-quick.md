---
name: param-passing-quick
description: "Three methods of parameter passing in Kailash SDK: node configuration, workflow connections, and runtime parameters. Use when asking 'parameter passing', 'pass parameters', 'runtime parameters', 'node config', 'how to pass data', '3 methods', 'parameter methods', 'node parameters', or 'workflow parameters'."
---

# Parameter Passing - Three Methods

Three methods to pass parameters to nodes in Kailash SDK workflows.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `CRITICAL`
> Related Skills: [`workflow-quickstart`](workflow-quickstart.md), [`connection-patterns`](connection-patterns.md), [`error-parameter-validation`](../ 15-error-troubleshooting/error-parameter-validation.md)
> Related Subagents: `pattern-expert` (complex parameter patterns)

## Quick Reference

**Three Methods:**

1. **Node Configuration** (Static) - Most reliable ⭐⭐⭐⭐⭐
2. **Workflow Connections** (Dynamic) - Most reliable ⭐⭐⭐⭐⭐
3. **Runtime Parameters** (Override) - Reliable (unwrapped automatically) ⭐⭐⭐⭐⭐

**CRITICAL**: Every required parameter must come from one of these methods or workflow fails at build time.

## Core Pattern

> **Note**: Some node names below (e.g., EmailNode, UserLookupNode) are hypothetical examples to illustrate parameter passing patterns. For real node names, see `node-patterns-common` or query `NodeRegistry().list_types()`. Real equivalents include `EmailAlertNode`, `EmbeddedPythonNode`, etc.

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# Method 1: Node Configuration (static values)
builder.add_node("EmailAlertNode", "send", {
    "to": "user@example.com",
    "subject": "Welcome"
})

# Method 2: Workflow Connection (dynamic from another node)
builder.add_node("EmbeddedPythonNode", "lookup", {
    "code": "result = {'email': 'user@example.com'}"
})
builder.connect("lookup", "result.email", "send", "to")

# Method 3: Runtime Parameter (override at execution)
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), inputs={
    "send": {"to": "override@example.com"}
})
```

## Parameter Scoping

**Node-specific parameters are automatically unwrapped:**

```python
# What you pass to runtime:
parameters = {
    "api_key": "global-key",      # Global param (all nodes)
    "node1": {"value": 10},        # Node-specific for node1
    "node2": {"value": 20}         # Node-specific for node2
}

rt.execute(builder.build(reg), inputs=parameters)

# What node1 receives (unwrapped automatically):
{
    "api_key": "global-key",       # Global param
    "value": 10                     # Unwrapped from {"node1": {"value": 10}}
}
# node1 does NOT receive node2's parameters (isolated)
```

**Scoping rules:**

- **Node-specific params**: Nested under node ID → unwrapped automatically
- **Global params**: Top-level (not node IDs) → go to all nodes
- **Parameter isolation**: Each node receives only its params + globals
- **No leakage**: Node1's params never reach Node2

## The Three Methods

### Method 1: Node Configuration (Static)

**Use when**: Values known at design time

```python
# Example: configure a node with all values known at design time
builder.add_node("EmbeddedPythonNode", "create", {
    "code": """
result = {
    'name': name,
    'email': email,
    'active': active
}
"""
})
```

**Advantages:**

- Most reliable
- Clear and explicit
- Easy to debug
- Ideal for testing

### Method 2: Workflow Connections (Dynamic)

**Use when**: Values come from other nodes

```python
builder.add_node("EmbeddedPythonNode", "form", {
    "code": "result = {'email_field': 'alice@example.com'}"
})
builder.add_node("EmbeddedPythonNode", "create", {
    "code": "result = {'name': 'Alice', 'email': email}"
    # 'email' comes from connection
})

# 4-parameter syntax: source, source_output, target, target_input
builder.connect("form", "result.email_field", "create", "email")
```

**Advantages:**

- Dynamic data flow
- Loose coupling
- Enables pipelines
- Natural for transformations

### Method 3: Runtime Parameters (Override)

**Use when**: Values determined at execution time

```python
builder.add_node("EmbeddedPythonNode", "generate", {
    "code": "result = {'report': f'Report from {start_date} to {end_date}'}"
    # 'start_date' and 'end_date' from runtime
})

rt.execute(builder.build(reg), inputs={
    "generate": {
        "start_date": "2025-01-01",
        "end_date": "2025-01-31"
    }
})
```

## Common Mistakes

### ❌ Mistake: Missing Required Parameter

```python
builder.add_node("HTTPRequestNode", "fetch", {
    "method": "GET"
    # ERROR: Missing required 'url'!
})
```

### ✅ Fix: Use One of Three Methods

```python
# Method 1: Add to config
builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://api.example.com/data",
    "method": "GET"
})

# OR Method 2: Connect from another node
builder.connect("source", "api_url", "fetch", "url")

# OR Method 3: Provide at runtime
rt.execute(builder.build(reg), inputs={
    "fetch": {"url": "https://api.example.com/data"}
})
```

## Related Patterns

- **For connections**: [`connection-patterns`](connection-patterns.md)
- **For workflow creation**: [`workflow-quickstart`](workflow-quickstart.md)
- **For parameter errors**: [`error-parameter-validation`](../15-error-troubleshooting/error-parameter-validation.md)
- **Gold standard**: [`gold-parameter-passing`](../17-gold-standards/gold-parameter-passing.md)

## When to Escalate to Subagent

Use `pattern-expert` when:

- Complex parameter flow across many nodes
- Custom node parameter validation
- Enterprise parameter governance
- Advanced parameter patterns

## Quick Tips

- 💡 **Method 1 for tests**: Most reliable and deterministic
- 💡 **Method 2 for pipelines**: Natural for data flows
- 💡 **Method 3 for user input**: Dynamic values at runtime
- 💡 **Combine methods**: You can use all three together
- 💡 **Parameter scoping**: Automatic unwrapping prevents leakage

## Version Notes

- Parameter scoping with automatic unwrapping is the standard behavior
- Strict parameter validation is enforced (security feature)
- Three parameter methods are the established standard pattern

<!-- Trigger Keywords: parameter passing, pass parameters, runtime parameters, node config, how to pass data, 3 methods, parameter methods, node parameters, workflow parameters, parameter flow, provide parameters, parameter scoping, unwrap parameters -->
