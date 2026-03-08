---
name: decide-runtime
description: "Choose between Runtime and Runtime based on deployment context. Use when asking 'which runtime', 'Runtime vs Async', 'runtime choice', 'sync vs async', 'runtime selection', or 'choose runtime'."
---

# Decision: Runtime Selection

Decision: Runtime Selection guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Decision: Runtime Selection
- **Category**: cross-cutting
- **Priority**: HIGH
- **Trigger Keywords**: which runtime, Runtime vs Async, runtime choice, sync vs async, runtime selection

## Decision Matrix

### Use Runtime When:

- CLI applications and scripts
- Synchronous execution contexts
- Testing in pytest (without async fixtures)
- Simple sequential workflows
- Existing code integration

```python
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Use Runtime in Production When:

- Docker deployments
- NexusApp deployments
- High-concurrency scenarios
- Production APIs

```python
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Standard Pattern (Recommended):

```python
import kailash

# Single runtime for all contexts
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Runtime Details

| Feature             | Value                                       |
| ------------------- | ------------------------------------------- | --- |
| **Execution Model** | Handles both sync and async                 |
| **Best For**        | All contexts (CLI, Docker, NexusApp, APIs)  |
| **Return Value**    | `dict` with `results`, `run_id`, `metadata` |
| **Method**          | `rt.execute(builder.build(reg))`            |
| **Context**         | Any                                         | Any |

## Shared Architecture

`kailash.Runtime` is a single unified Rust-backed runtime:

**Core Capabilities**:

- Workflow execution via `rt.execute(wf)` and `rt.execute(wf, inputs={...})`
- Level-based parallelism: nodes at the same DAG level execute concurrently
- Result type: dict with keys `"results"`, `"run_id"`, `"metadata"`
- Workflow validation happens at `builder.build(reg)` time (not at runtime)

**Key Features**:

- Cycle detection and execution support
- Conditional execution and branching (SwitchNode)
- Connection validation between node inputs/outputs
- Run ID generation and execution metadata

**ParameterHandlingMixin Not Used**:
Runtime uses WorkflowParameterInjector for enterprise parameter handling instead of ParameterHandlingMixin (architectural boundary for complex workflows).

The shared architecture ensures consistent behavior, with the only differences being execution model and async-specific optimizations.

## Parallelism

The single `kailash.Runtime` handles parallelism automatically:

- No separate "AsyncNode" class — all nodes implement the same async `Node` trait
- Nodes at the same DAG level execute concurrently (via tokio::spawn)
- The Runtime chooses the optimal execution strategy based on the DAG structure

### Level-Based Parallelism

Executes independent nodes concurrently within dependency levels:

```python
# Example workflow structure:
# A (no deps) ─┐
# B (no deps) ─┼─→ D (deps: A, B, C) ─→ F (deps: D, E)
# C (no deps) ─┘                    └─→ E (deps: C)

# Execution:
# Level 0: [A, B, C] → Execute concurrently
# Level 1: [D, E]    → Execute concurrently
# Level 2: [F]       → Execute alone

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Concurrency Control

```python
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
```

### Resource Integration

```python
import kailash

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

# Nodes can access: context.resource_registry.get_resource("db")
```

## Common Patterns

### Pattern 1: CLI Script

```python
# CLI script
import kailash

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(f"Workflow {result['run_id']} completed: {result['results']}")
```

### Pattern 2: NexusApp Deployment

```python
# NexusApp deployment
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler()
def execute_workflow(data):
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    # ... build workflow ...
    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))
```

### Pattern 3: Testing

```python
# Testing
import pytest
import kailash

def test_workflow():
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    assert result["results"]["node"]["output"] == expected
```

## Migration Between Runtimes

Both runtimes share the same configuration parameters:

```python
# Configuration works identically for both
config = {
    "debug": True,
    "enable_cycles": True,
    "conditional_execution": True,
    "connection_validation": "strict",  # or "warn" or "off"
    "content_aware_success_detection": True
}

# Create runtime with registry
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
```

## Related Patterns

- **For execution options**: See [`runtime-execution`](#)
- **For parameter passing**: See [`gold-parameter-passing`](#)
- **For workflow basics**: See [`workflow-quickstart`](#)

## Documentation References

### Primary Sources

- [`CLAUDE.md#L111-177`](../../../CLAUDE.md)

### Internal Architecture

- `kailash.Runtime` is a single Rust-backed runtime (PyO3 binding)
- No separate sync/async split -- one unified runtime handles both

## Quick Tips

- Use `kailash.Runtime(reg)` for all contexts -- it handles both sync and async
- Always pass `reg` (NodeRegistry) to both Runtime and builder.build()
- Result is a dict with keys `results`, `run_id`, and `metadata`

## Keywords for Auto-Trigger

<!-- Trigger Keywords: which runtime, Runtime vs Async, runtime choice, sync vs async, runtime selection -->
