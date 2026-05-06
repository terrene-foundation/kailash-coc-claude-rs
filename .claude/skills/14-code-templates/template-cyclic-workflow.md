---
name: template-cyclic-workflow
description: "Generate Kailash cyclic workflow template. Use when requesting 'cyclic workflow template', 'loop workflow template', 'iterative workflow', 'cycle template', or 'convergence workflow'."
---

# Cyclic Workflow Template

Template for creating cyclic/iterative workflows using `ConditionalNode`, `LoopNode`, and back-edge connections in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`CLAUDE.md`](../../../../CLAUDE.md), [`01-core`](../../01-core/)
> Related Subagents: `workflow-designer` (complex cycles), `rust-architect` (DAG design)

## Basic Cyclic Workflow Template

```rust
//! Cyclic Workflow Template using WorkflowBuilder with ConditionalNode.

use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    let mut builder = WorkflowBuilder::new();

    // 1. Initialization node
    builder.add_node("LogNode", "init", ValueMap::from([
        ("message".into(), Value::String("Starting cycle".into())),
    ]));

    // 2. Condition check node (controls the loop)
    builder.add_node("ConditionalNode", "check", ValueMap::from([
        ("condition".into(), Value::String("counter < 5".into())),
    ]));

    // 3. Processing node (loop body)
    builder.add_node("LogNode", "process", ValueMap::from([
        ("message".into(), Value::String("Processing iteration".into())),
    ]));

    // 4. Forward connections
    builder.connect("init", "output", "check", "input");
    builder.connect("check", "true_branch", "process", "input");

    // 5. Back-edge: cycle from process output back to check
    builder.connect("process", "output", "check", "input");

    // 6. Build and execute
    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::new())?;

    for (node_id, outputs) in &result.results {
        println!("{node_id}: {outputs:?}");
    }

    Ok(())
}
```

## LoopNode Template

Use the built-in `LoopNode` for structured iteration with automatic counter management:

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    let mut builder = WorkflowBuilder::new();

    // LoopNode manages iteration count and convergence
    builder.add_node("LoopNode", "loop", ValueMap::from([
        ("max_iterations".into(), Value::Integer(10)),
        ("condition".into(), Value::String("counter < max_count".into())),
    ]));

    // Body: processing done each iteration
    builder.add_node("LogNode", "body", ValueMap::from([
        ("message".into(), Value::String("Loop iteration".into())),
    ]));

    // Connect loop to body and back
    builder.connect("loop", "body_output", "body", "input");
    builder.connect("body", "output", "loop", "body_input");

    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::from([
        ("max_count".into(), Value::Integer(5)),
    ]))?;

    println!("Loop completed: run_id={}", result.run_id);
    Ok(())
}
```

## SwitchNode + Cycle Template

Conditional cycling with `SwitchNode` for multi-branch iteration:

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    let mut builder = WorkflowBuilder::new();

    // Optimizer node (adjusts value each iteration)
    builder.add_node("JSONTransformNode", "optimizer", ValueMap::from([
        ("expression".into(), Value::String("@.value * 1.1".into())),
    ]));

    // Quality check (SwitchNode decides continue or stop)
    builder.add_node("SwitchNode", "check_quality", ValueMap::from([
        ("condition".into(), Value::String("optimized >= target".into())),
        ("condition_type".into(), Value::String("expression".into())),
    ]));

    // Final result node (when quality met)
    builder.add_node("LogNode", "final", ValueMap::from([
        ("message".into(), Value::String("Optimization complete".into())),
    ]));

    // Forward connections
    builder.connect("optimizer", "result", "check_quality", "input");
    builder.connect("check_quality", "output_true", "final", "input");

    // Back-edge: if quality not met, cycle back to optimizer
    builder.connect("check_quality", "output_false", "optimizer", "input");

    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::from([
        ("value".into(), Value::Float(1.0)),
        ("target".into(), Value::Float(10.0)),
    ]))?;

    println!("Optimization result: {:?}", result.results.get("final"));
    Ok(())
}
```

## RetryNode Template

Use `RetryNode` for fault-tolerant cyclic patterns:

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    let mut builder = WorkflowBuilder::new();

    // RetryNode wraps fallible operations with backoff
    builder.add_node("RetryNode", "retry", ValueMap::from([
        ("max_retries".into(), Value::Integer(3)),
        ("backoff_ms".into(), Value::Integer(100)),
    ]));

    builder.add_node("HTTPRequestNode", "fetch", ValueMap::from([
        ("url".into(), Value::String("https://api.example.com/data".into())),
        ("method".into(), Value::String("GET".into())),
    ]));

    builder.connect("retry", "attempt", "fetch", "trigger");
    builder.connect("fetch", "response", "retry", "result");

    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::new())?;

    println!("Fetch result: {:?}", result.results.get("fetch"));
    Ok(())
}
```

## Key Patterns

### Critical Steps for Cyclic Workflows

1. **Define the condition**: Use `ConditionalNode`, `SwitchNode`, or `LoopNode`
2. **Create back-edges**: Use `builder.connect()` to form cycles
3. **Set iteration limits**: Always bound cycles with `max_iterations` or condition
4. **Provide initial values**: Pass starting parameters via `execute_sync()` inputs
5. **Handle termination**: Ensure at least one path exits the cycle

### Control Flow Nodes for Cycles

| Node              | Purpose                    | Key Config                    |
| ----------------- | -------------------------- | ----------------------------- |
| `ConditionalNode` | Binary branch (true/false) | `condition` expression        |
| `SwitchNode`      | Multi-branch routing       | `condition`, `condition_type` |
| `LoopNode`        | Structured iteration       | `max_iterations`, `condition` |
| `RetryNode`       | Retry with backoff         | `max_retries`, `backoff_ms`   |
| `ParallelNode`    | Fan-out/fan-in             | `branches`                    |

## Related Patterns

- **Control flow nodes**: See `crates/kailash-nodes/` for ConditionalNode, LoopNode, SwitchNode
- **DAG execution**: See `crates/kailash-core/` for cycle detection and level-based scheduling
- **Workflow design**: See `.claude/skills/01-core/` for WorkflowBuilder patterns

## When to Escalate

Use `workflow-designer` when:

- Complex multi-cycle workflows
- Nested cycles or parallel cycles
- Advanced convergence logic

Use `rust-architect` when:

- Custom cycle detection or scheduling
- Performance optimization for tight loops

## Documentation References

### Primary Sources

- **WorkflowBuilder**: [`CLAUDE.md`](../../../../CLAUDE.md) -- builder pattern, connect, build
- **Core Crate**: [`crates/kailash-core/`](../../../../crates/kailash-core/) -- DAG, Runtime, cycle handling
- **Control Flow Nodes**: [`crates/kailash-nodes/`](../../../../crates/kailash-nodes/) -- ConditionalNode, LoopNode, etc.

## Quick Tips

- Always set `max_iterations` to prevent infinite loops
- Provide initial parameters via the inputs `ValueMap` passed to `execute_sync()`
- Use `ConditionalNode` for simple yes/no cycles, `SwitchNode` for multi-branch
- `LoopNode` is the simplest option for counter-based iteration
- Test cyclic workflows with small iteration counts first

<!-- Trigger Keywords: cyclic workflow template, loop workflow template, iterative workflow, cycle template, convergence workflow, cyclic template, loop template, iterative template -->
