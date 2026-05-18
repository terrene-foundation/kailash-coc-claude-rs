---
name: error-cycle-convergence
description: "Fix cyclic workflow convergence errors in Kailash Rust SDK. Use when encountering 'cycle detected', 'max iterations reached', 'cycle convergence failed', 'CycleDetected', or cyclic workflow issues."
---

# Error: Cycle Detection and Convergence

Fix cyclic workflow issues including unexpected cycle detection during build, infinite loops, max iterations exceeded, and convergence criteria problems in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH`
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)

## Common Issues

### Issue 1: Unexpected CycleDetected at Build Time

By default, `WorkflowBuilder` rejects cycles. If you intentionally want a cyclic workflow, you must enable cycles before building.

```rust
// :x: Wrong - cycles not enabled (default is DAG mode)
let mut builder = WorkflowBuilder::new();
builder.add_node("JSONTransformNode", "counter", config.clone());
builder.add_node("ConditionalNode", "check", config2.clone());
builder.connect("counter", "result", "check", "data");
builder.connect("check", "result", "counter", "data");  // Creates a cycle

let workflow = builder.build(&registry)?;
// BuildError::CycleDetected { nodes: ["counter", "check"] }
```

```rust
// :white_check_mark: Fix - enable cycles explicitly
let mut builder = WorkflowBuilder::new();
builder.enable_cycles(true);  // CRITICAL: must be set before build
builder.add_node("JSONTransformNode", "counter", config.clone());
builder.add_node("ConditionalNode", "check", config2.clone());
builder.connect("counter", "result", "check", "data");
builder.connect("check", "result", "counter", "data");

let workflow = builder.build(&registry)?;  // OK - cycles permitted
```

### Issue 2: Cycle Runs Forever (No Convergence)

When cycles are enabled, you need a mechanism to break the loop. Without one, the workflow may run indefinitely or hit a runtime timeout.

```rust
// :x: Wrong - no convergence mechanism
let mut builder = WorkflowBuilder::new();
builder.enable_cycles(true);
builder.add_node("JSONTransformNode", "transform", config.clone());
builder.connect("transform", "result", "transform", "data");  // Self-loop, runs forever
```

```rust
// :white_check_mark: Fix - use ConditionalNode or LoopNode with termination condition
let mut builder = WorkflowBuilder::new();
builder.enable_cycles(true);

// Use LoopNode which has built-in max_iterations and condition checking
builder.add_node("LoopNode", "counter_loop", ValueMap::from([
    ("max_iterations".into(), Value::Integer(10)),
    ("condition".into(), Value::String("count >= 5".into())),
]));
```

### Issue 3: Max Iterations Exceeded at Runtime

```rust
// RuntimeError after hitting iteration limit
// "node execution failed: max iterations (100) exceeded"
```

**Fix**: Either increase the limit or fix the convergence condition so the loop terminates before hitting the cap.

```rust
builder.add_node("LoopNode", "loop", ValueMap::from([
    ("max_iterations".into(), Value::Integer(100)),   // Safety limit
    ("condition".into(), Value::String("done == true".into())),
]));
```

### Issue 4: RuntimeConfig Timeout for Long Cycles

If your cyclic workflow legitimately takes a long time, the default runtime timeout may fire first.

```rust
// :white_check_mark: Increase runtime timeout for long-running cyclic workflows
use std::time::Duration;

let config = RuntimeConfig {
    timeout: Some(Duration::from_secs(300)),  // 5 minutes
    max_concurrency: 4,
    ..RuntimeConfig::default()
};
let runtime = Runtime::new(config, registry);
```

## Complete Example

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();
builder.enable_cycles(true);  // Required for cyclic workflows

// A loop that increments a counter until it reaches 5
builder.add_node("LoopNode", "counter_loop", ValueMap::from([
    ("max_iterations".into(), Value::Integer(20)),
    ("condition".into(), Value::String("count >= 5".into())),
]));

builder.add_node("JSONTransformNode", "increment", ValueMap::from([
    ("expression".into(), Value::String("count + 1".into())),
]));

builder.connect("counter_loop", "data", "increment", "data");
builder.connect("increment", "result", "counter_loop", "data");

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::from([
    ("count".into(), Value::Integer(0)),  // Initial value
])).await?;
```

## Debugging Checklist

- [ ] Is `builder.enable_cycles(true)` set before `.build()`?
- [ ] Does the cycle have a termination condition (ConditionalNode, LoopNode)?
- [ ] Is `max_iterations` set to a reasonable safety limit?
- [ ] Are initial values provided in the `inputs` ValueMap?
- [ ] Is the runtime timeout sufficient for the expected iteration count?

## BuildError vs RuntimeError for Cycles

| Error                       | When               | Cause                                              |
| --------------------------- | ------------------ | -------------------------------------------------- |
| `BuildError::CycleDetected` | At `.build()` time | Cycle exists but `enable_cycles(true)` was not set |
| `RuntimeError::Timeout`     | During execution   | Cycle runs too long, exceeds runtime timeout       |
| `RuntimeError::NodeFailed`  | During execution   | Node inside cycle fails (e.g., max iterations)     |

## Related Patterns

- **Error types**: See `crates/kailash-core/src/error.rs` for `BuildError::CycleDetected`
- **LoopNode**: Built-in node with `max_iterations` and `condition` parameters
- **ConditionalNode**: Branch execution based on conditions
- **RuntimeConfig**: Set `timeout` for workflow-level time limits

## Quick Tips

- :bulb: **Enable cycles explicitly**: `builder.enable_cycles(true)` before `.build()`
- :bulb: **Always set max_iterations**: Prevent infinite loops with a safety cap
- :bulb: **Initial values matter**: Cycles need starting parameters in the `inputs` ValueMap
- :bulb: **Use LoopNode**: Prefer `LoopNode` over manual cycles -- it has built-in convergence support
- :bulb: **Timeout safety net**: Set `RuntimeConfig::timeout` as a last-resort guard

<!-- Trigger Keywords: cycle detected, CycleDetected, infinite loop, max iterations reached, cycle convergence failed, cyclic workflow error, loop not stopping, convergence criteria, cycle issue, enable_cycles -->
