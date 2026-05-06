---
name: error-troubleshooting
description: "Kailash Rust errors — Nexus hangs, connection, runtime, cycles, validation, template syntax."
---

# Kailash Rust SDK Error Troubleshooting

Comprehensive troubleshooting guides for common Kailash Rust SDK errors and issues.

## Overview

Common error patterns and solutions for:

- Nexus (axum) blocking and async runtime issues
- Connection parameter errors (`BuildError::InvalidConnection`)
- Runtime execution failures (`RuntimeError`)
- Cycle detection (`BuildError::CycleDetected`)
- Missing `.build(&registry)?` calls (compile-time errors)
- Parameter validation errors (`NodeError::MissingInput`, `NodeError::InvalidInput`)
- DataFlow type mismatches

## Key Difference from Dynamic Languages

In Rust, many errors are caught at **compile time** rather than runtime:

| Error Category            | Dynamic Language         | Rust                                  |
| ------------------------- | ------------------------ | ------------------------------------- |
| Missing `.build()`        | Runtime `TypeError`      | **Compile error**: type mismatch      |
| Wrong method name         | Runtime `AttributeError` | **Compile error**: method not found   |
| Wrong arg count           | Runtime `TypeError`      | **Compile error**: argument count     |
| Builder reuse after build | Silent bug               | **Compile error**: use of moved value |

Runtime errors that remain are returned via `Result<T, E>` and must be handled with `?` or `match`.

## Error Type Hierarchy

```text
RuntimeError
  |-- BuildFailed { source: BuildError }
  |     |-- UnknownNodeType { type_name }
  |     |-- DuplicateNodeId { node_id }
  |     |-- InvalidConnection { source_node, source_output, target_node, target_input, reason }
  |     |-- CycleDetected { nodes }
  |     |-- DisconnectedGraph { components }
  |     |-- NodeCreationFailed { node_id, type_name, source: NodeError }
  |     |-- EmptyWorkflow
  |-- NodeFailed { node_id, source: NodeError }
  |     |-- MissingInput { name }
  |     |-- InvalidInput { name, expected, got }
  |     |-- ExecutionFailed { message, source }
  |     |-- Timeout { duration }
  |     |-- ResourceLimit { resource, limit }
  |     |-- Internal { message }
  |-- Timeout { duration }
  |-- Cancelled
  |-- Internal { message }
```

## Reference Documentation

### Critical Errors

#### Missing .build() Call (Compile-Time)

- **[error-missing-build](error-missing-build.md)** - Forgot to call `.build(&registry)?`
  - **Symptom**: Compile error: expected `&Workflow`, found `WorkflowBuilder`
  - **Cause**: Passing builder directly to `runtime.execute()`
  - **Solution**: Always call `builder.build(&registry)?` before execution
  - **Pattern**: `let workflow = builder.build(&registry)?;`

#### Nexus Blocking (Async Runtime)

- **[error-nexus-blocking](error-nexus-blocking.md)** - Nexus/axum handler blocks
  - **Symptom**: axum handler hangs, tokio panic, request timeout
  - **Cause**: Using `execute_sync()` inside an async handler
  - **Solution**: Use `runtime.execute(&workflow, inputs).await?` in async contexts
  - **Prevention**: Never call sync methods inside async functions

### Connection & Parameter Errors

#### Connection Parameter Errors

- **[error-connection-params](error-connection-params.md)** - Invalid connections
  - **Symptom**: `BuildError::InvalidConnection` at build time
  - **Cause**: Wrong 4-parameter order in `builder.connect()`
  - **Solution**: Use `builder.connect("source", "output", "target", "input")`
  - **Common mistake**: Swapping source_output and target positions

#### Parameter Validation Errors

- **[error-parameter-validation](error-parameter-validation.md)** - Missing required inputs
  - **Symptom**: `NodeError::MissingInput` or `NodeError::InvalidInput` at runtime
  - **Cause**: Missing or wrong-typed node parameters
  - **Solution**: Provide via config ValueMap, connections, or runtime inputs
  - **3 methods**: Config, connections, runtime inputs

### Runtime Errors

#### Runtime Execution Errors

- **[error-runtime-execution](error-runtime-execution.md)** - Runtime failures
  - **Symptom**: `RuntimeError::NodeFailed`, `RuntimeError::Timeout`
  - **Cause**: Node failures, timeouts, wrong runtime usage
  - **Solutions**: Check error chain, configure timeouts, use correct async/sync method
  - **Debug**: Match on `RuntimeError` variants, walk `.source()` chain

### Cyclic Workflow Errors

#### Cycle Detection Errors

- **[error-cycle-convergence](error-cycle-convergence.md)** - Cycle issues
  - **Symptom**: `BuildError::CycleDetected` or infinite loop at runtime
  - **Cause**: Cycles without `enable_cycles(true)`, no convergence condition
  - **Solution**: Enable cycles explicitly, use LoopNode with max_iterations
  - **Pattern**: `builder.enable_cycles(true)` before `.build()`

### DataFlow Errors

#### DataFlow Type Errors

- **[error-dataflow-template-syntax](error-dataflow-template-syntax.md)** - Type mismatches
  - **Symptom**: `NodeError::InvalidInput` on DataFlow-generated nodes
  - **Cause**: Wrong `Value` variant for model field type
  - **Solution**: Match Value types to model field types (i64 -> Value::Integer, etc.)
  - **Pattern**: Use connections for dynamic values between nodes

## Quick Error Reference

### Error by Symptom

| Symptom                              | Error Type                      | Quick Fix                                  |
| ------------------------------------ | ------------------------------- | ------------------------------------------ |
| **Compile: expected &Workflow**      | Missing `.build()`              | Add `builder.build(&registry)?`            |
| **axum handler hangs**               | Nexus blocking                  | Use `execute().await` not `execute_sync()` |
| **"invalid connection from..."**     | `BuildError::InvalidConnection` | Check 4-parameter order                    |
| **"unknown node type"**              | `BuildError::UnknownNodeType`   | Register node in `NodeRegistry`            |
| **"missing required input"**         | `NodeError::MissingInput`       | Provide via config, connection, or inputs  |
| **"invalid input...expected...got"** | `NodeError::InvalidInput`       | Match Value variant to expected type       |
| **"cycle detected"**                 | `BuildError::CycleDetected`     | Add `builder.enable_cycles(true)`          |
| **"timed out after..."**             | `RuntimeError::Timeout`         | Increase `RuntimeConfig::timeout`          |
| **"use of moved value"**             | Ownership (compile)             | Don't use builder after `.build()`         |

### Error Prevention Checklist

**Before Building Workflow**:

- [ ] Called `.build(&registry)?` on WorkflowBuilder?
- [ ] Used `?` to propagate the `BuildError`?
- [ ] All `connect()` calls use 4 parameters in correct order?
- [ ] All required node parameters provided in config ValueMap?
- [ ] Cyclic workflows have `enable_cycles(true)` set?
- [ ] All node types registered in `NodeRegistry`?

**Before Executing Workflow**:

- [ ] Using `execute().await?` in async contexts (axum, tokio::main)?
- [ ] Using `execute_sync()` only in sync contexts (CLI, scripts)?
- [ ] `RuntimeConfig::timeout` set appropriately?
- [ ] Error result handled with `?` or `match`?

## Common Error Patterns

### 1. Missing .build() (Compile-Time)

```rust
// :x: WRONG (compile error)
let mut builder = WorkflowBuilder::new();
builder.add_node("EchoNode", "echo", ValueMap::new());
let result = runtime.execute(&builder, ValueMap::new()).await?;

// :white_check_mark: CORRECT
let mut builder = WorkflowBuilder::new();
builder.add_node("EchoNode", "echo", ValueMap::new());
let workflow = builder.build(&registry)?;
let result = runtime.execute(&workflow, ValueMap::new()).await?;
```

### 2. Nexus Blocking (Async/Sync Mismatch)

```rust
// :x: WRONG (panics or deadlocks in async handler)
async fn handle(State(rt): State<Arc<Runtime>>) -> impl IntoResponse {
    let result = rt.execute_sync(&workflow, inputs);  // Blocks async runtime!
}

// :white_check_mark: CORRECT (async in async)
async fn handle(State(rt): State<Arc<Runtime>>) -> impl IntoResponse {
    let result = rt.execute(&workflow, inputs).await?;
}
```

### 3. Connection Parameter Order

```rust
// :x: WRONG (swapped parameters)
builder.connect("node1", "node2", "result", "input");

// :white_check_mark: CORRECT (source, output, target, input)
builder.connect("node1", "result", "node2", "input");
```

### 4. Cycle Detection

```rust
// :x: WRONG (cycle without enable_cycles)
builder.connect("a", "out", "b", "in");
builder.connect("b", "out", "a", "in");  // Cycle!
let wf = builder.build(&registry)?;  // BuildError::CycleDetected

// :white_check_mark: CORRECT (enable cycles explicitly)
builder.enable_cycles(true);
builder.connect("a", "out", "b", "in");
builder.connect("b", "out", "a", "in");
let wf = builder.build(&registry)?;  // OK
```

### 5. DataFlow Type Mismatch

```rust
// :x: WRONG (String where Integer expected)
builder.add_node("OrderCreateNode", "create", ValueMap::from([
    ("customer_id".into(), Value::String("42".into())),
]));

// :white_check_mark: CORRECT (matching Value variant)
builder.add_node("OrderCreateNode", "create", ValueMap::from([
    ("customer_id".into(), Value::Integer(42)),
]));
```

## Debugging Strategies

### Step 1: Check Error Type

- **Compile error?** Fix the Rust code -- type system is guiding you
- **`BuildError`?** Fix workflow construction (nodes, connections, types)
- **`RuntimeError`?** Fix execution (inputs, timeouts, node logic)
- **`NodeError`?** Fix individual node configuration or inputs

### Step 2: Walk the Error Chain

```rust
use std::error::Error;

if let Err(e) = runtime.execute(&workflow, inputs).await {
    eprintln!("Error: {e}");
    let mut source = e.source();
    while let Some(cause) = source {
        eprintln!("  Caused by: {cause}");
        source = cause.source();
    }
}
```

### Step 3: Test Components

- Build and execute a minimal workflow with one node
- Add nodes incrementally to isolate the failing one
- Inspect `result.results.get("node_id")` for output structure

### Step 4: Check Source Code

- Error types: `crates/kailash-core/src/error.rs`
- Workflow builder: `crates/kailash-core/src/workflow.rs`
- Runtime: `crates/kailash-core/src/runtime.rs`
- Node implementations: `crates/kailash-nodes/src/`
- CLAUDE.md for essential patterns

## CRITICAL Debugging Tips

1. **ALWAYS** call `.build(&registry)?` on WorkflowBuilder before execution
2. **NEVER** use `execute_sync()` inside async contexts (axum handlers, tokio::main)
3. **ALWAYS** handle `Result` values with `?` or explicit error matching
4. **NEVER** ignore `BuildError` -- it means your workflow graph is invalid
5. **ALWAYS** verify connection parameter order: source, output, target, input

## Related Skills

- **[01-core](../../01-core/)** - Core SDK patterns
- **[02-dataflow](../../02-dataflow/)** - DataFlow specifics
- **[03-nexus](../../03-nexus/)** - Nexus/axum specifics
- **[13-testing-strategies](../../13-testing-strategies/)** - Testing patterns
- **[15-code-templates](../../15-code-templates/)** - Working code templates

## CI Debugging Patterns

### Documentation job fails (`-D warnings`)

CI runs `RUSTDOCFLAGS="-D warnings" cargo doc --workspace --exclude kailash-ruby --exclude kailash-python --no-deps`. Intradoc links like `[TypeName]` fail unless the type is in scope — use fully qualified: `[crate::module::TypeName]`.

### Test job fails (doc-tests)

CI runs `cargo test --workspace` which includes doc-tests. Common failures:

- **Non-exhaustive match**: New enum variant added but doc example match not updated (e.g., `CallerEvent::ToolCallDelta`)
- **Result API change**: Constructor changed to return `Result` but doc example doesn't use `?` (e.g., `WorkerAgent::new()`)
- **Signature change**: Args added/removed but doc example uses old count (e.g., `SupervisorAgent::new()` now 4 args)

### Cargo Deny fails

Usually corrupt advisory DB cache on self-hosted runner (panics on `RUSTSEC-0000-0000.md`). Fix: re-run the job via `gh run rerun <run-id> --job <job-id>`.

### CI traps

- `cargo check --workspace` fails on magnus 0.8.2 — always `--exclude kailash-ruby` (#247)
- kailash-python rustdoc ICE on numpy ToPyArray — excluded from CI doc build
- nightly fmt required (`cargo +nightly fmt`) — stable fmt produces different output

## Support

For error troubleshooting, consult:

- `build-fix` agent - Fix Rust compilation errors with minimal changes
- `dataflow-specialist` - DataFlow-specific patterns
- `nexus-specialist` - Nexus/axum integration debugging
- `testing-specialist` - Test debugging
