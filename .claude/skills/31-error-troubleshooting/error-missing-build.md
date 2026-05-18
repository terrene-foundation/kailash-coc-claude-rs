---
name: error-missing-build
description: "Fix 'missing .build()' and wrong execution pattern errors in Kailash Rust workflows. Use when encountering compile errors about WorkflowBuilder vs Workflow, 'build() not called', 'no method named execute on WorkflowBuilder', or asking about correct execution pattern."
---

# Error: Missing .build() Call

Fix the most common Kailash Rust SDK error -- forgetting to call `.build(&registry)?` before executing workflows, or using the wrong execution pattern.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `CRITICAL` (Most common SDK error)
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md), [`runtime-execution`](../../01-core-sdk/runtime-execution.md)

## The Error

### In Rust, Most Variants Are Compile-Time Errors

Unlike dynamic languages where this error appears at runtime, the Rust compiler catches most missing-build errors **at compile time**:

```
error[E0599]: no method named `execute` found for struct `WorkflowBuilder`
  --> src/main.rs:12:20
   |
12 |     runtime.execute(&builder, inputs).await?;
   |                     ^^^^^^^^ expected `&Workflow`, found `&WorkflowBuilder`
```

```
error[E0308]: mismatched types
  --> src/main.rs:12:25
   |
12 |     runtime.execute(&builder, inputs).await?;
   |                      ^^^^^^^ expected `&Workflow`, found `&WorkflowBuilder`
```

### Runtime Build Errors (from `.build()`)

When you do call `.build()` but the workflow is invalid, you get a `BuildError`:

```
BuildError::UnknownNodeType { type_name: "FancyNode" }
BuildError::EmptyWorkflow
BuildError::CycleDetected { nodes: ["a", "b", "c"] }
BuildError::InvalidConnection { ... }
```

### Root Cause

The workflow is still a `WorkflowBuilder` -- a mutable construction object. It must be built into an immutable `Workflow` via `.build(&registry)?` before the `Runtime` can execute it.

## Quick Fix

### :x: **WRONG** - Missing .build()

```rust
let mut builder = WorkflowBuilder::new();
builder.add_node("CSVReaderNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));

let registry = Arc::new(NodeRegistry::default());
let runtime = Runtime::new(RuntimeConfig::default(), registry);

// COMPILE ERROR: expected &Workflow, found WorkflowBuilder
let result = runtime.execute(&builder, ValueMap::new()).await?;
```

### :white_check_mark: **CORRECT** - Always Call .build(&registry)?

```rust
let mut builder = WorkflowBuilder::new();
builder.add_node("CSVReaderNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;  // Consumes builder, returns Result<Workflow, BuildError>

let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());
let result = runtime.execute(&workflow, ValueMap::new()).await?;
```

## Common Variations of This Error

### Variation 1: Forgetting the Registry Argument

```rust
// COMPILE ERROR: build() requires &NodeRegistry
let workflow = builder.build()?;

// CORRECT: Pass the registry
let workflow = builder.build(&registry)?;
```

### Variation 2: Forgetting the ? Operator

```rust
// WRONG: workflow is Result<Workflow, BuildError>, not Workflow
let workflow = builder.build(&registry);
runtime.execute(&workflow, inputs).await?;  // COMPILE ERROR

// CORRECT: Propagate the error with ?
let workflow = builder.build(&registry)?;
runtime.execute(&workflow, inputs).await?;
```

### Variation 3: Using Builder After Build (Ownership)

```rust
let mut builder = WorkflowBuilder::new();
builder.add_node("EchoNode", "echo", ValueMap::new());

let workflow = builder.build(&registry)?;  // builder is CONSUMED (moved)

// COMPILE ERROR: use of moved value: `builder`
builder.add_node("EchoNode", "another", ValueMap::new());
```

### Variation 4: Async vs Sync Execution

```rust
// Async (primary path) -- inside an async fn or tokio::main
let result = runtime.execute(&workflow, inputs).await?;

// Sync (CLI/scripts) -- creates tokio runtime internally
let result = runtime.execute_sync(&workflow, inputs)?;
```

## Why .build() is Required

### WorkflowBuilder vs Workflow

| WorkflowBuilder                      | Workflow (after .build())               |
| ------------------------------------ | --------------------------------------- |
| Construction phase (mutable)         | Ready for execution (immutable)         |
| Can add nodes via `add_node()`       | Finalized, no modifications             |
| Not accepted by `Runtime::execute()` | Accepted by `Runtime::execute()`        |
| Validation not yet run               | Fully validated                         |
| Graph not finalized                  | DAG compiled with topological sort      |
| Owned (consumed by `.build()`)       | Shared reference `&Workflow` in execute |

### What .build() Does

1. **Validates** the workflow is non-empty
2. **Checks** for duplicate node IDs
3. **Resolves** node types against the `NodeRegistry`
4. **Instantiates** nodes via their factories
5. **Validates** all connections (source/target existence)
6. **Detects** cycles (in non-cyclic mode)
7. **Computes** topological sort and execution levels
8. **Pre-computes** input routing for efficient execution

## Complete Example

### The Wrong Way (All Common Mistakes)

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();
builder.add_node("CSVReaderNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));
builder.add_node("JSONTransformNode", "processor", ValueMap::from([
    ("expression".into(), Value::String("@.length".into())),
]));
builder.connect("reader", "data", "processor", "data");

let registry = Arc::new(NodeRegistry::default());
let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());

// ALL WRONG:
// runtime.execute(&builder, inputs).await?;        // Type error: not a Workflow
// let wf = builder.build();                         // Missing registry argument
// let wf = builder.build(&registry);                // Missing ? operator
// builder.execute(&runtime);                        // No such method on WorkflowBuilder
```

### The Right Way

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();
builder.add_node("CSVReaderNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));
builder.add_node("JSONTransformNode", "processor", ValueMap::from([
    ("expression".into(), Value::String("@.length".into())),
]));
builder.connect("reader", "data", "processor", "data");

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;  // Build returns Result, validates everything

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::new()).await?;
//                           ^^^^^^^^^ &Workflow, not &WorkflowBuilder

println!("Run ID: {}", result.run_id);
for (node_id, outputs) in &result.results {
    println!("{node_id}: {outputs:?}");
}
```

## Rust Compile-Time Safety Advantage

In Rust, the type system prevents most missing-build errors at **compile time**:

| Mistake                      | Dynamic Language         | Rust                                  |
| ---------------------------- | ------------------------ | ------------------------------------- |
| Pass builder to execute      | Runtime `TypeError`      | **Compile error**: type mismatch      |
| Call `.execute()` on builder | Runtime `AttributeError` | **Compile error**: no such method     |
| Forget `?` on build          | N/A                      | **Compile error**: `Result` not used  |
| Use builder after build      | N/A                      | **Compile error**: use of moved value |
| Forget registry argument     | N/A                      | **Compile error**: missing argument   |

Only **graph validation errors** remain as runtime `BuildError` values (returned via `Result`), such as unknown node types, invalid connections, and cycle detection.

## Related Patterns

- **Error types**: See `crates/kailash-core/src/error.rs` for `BuildError`, `RuntimeError`
- **Workflow builder**: See `crates/kailash-core/src/workflow.rs` for builder API
- **Runtime**: See `crates/kailash-core/src/runtime.rs` for `execute()` and `execute_sync()`
- **Connection errors**: [`error-connection-params`](error-connection-params.md)
- **Parameter errors**: [`error-parameter-validation`](error-parameter-validation.md)

## Quick Diagnostic

Run this mental checklist when you see build or execution errors:

- [ ] Did I call `.build(&registry)?` on the builder?
- [ ] Did I pass `&registry` to `.build()`?
- [ ] Did I use `?` to propagate the `BuildError`?
- [ ] Am I passing `&workflow` (not `&builder`) to `runtime.execute()`?
- [ ] Am I NOT trying to use the builder after `.build()` consumed it?

## Prevention Tips

- :bulb: **Type system**: Rust's compiler catches builder-vs-workflow misuse at compile time
- :bulb: **Ownership**: `.build()` consumes the builder -- you cannot accidentally use the builder after building
- :bulb: **Pattern**: `let workflow = builder.build(&registry)?;` then `runtime.execute(&workflow, inputs).await?`
- :bulb: **Think "compile"**: `.build()` is the compilation step -- validates and freezes the graph
- :bulb: **Two registries**: `build()` takes `&NodeRegistry`, `Runtime::new()` takes `Arc<NodeRegistry>`

<!-- Trigger Keywords: missing .build, WorkflowBuilder vs Workflow, execute error, compile error workflow, runtime.execute without build, forgot to build, build() missing, execution pattern error, workflow execution error, cannot execute workflow, BuildError -->
