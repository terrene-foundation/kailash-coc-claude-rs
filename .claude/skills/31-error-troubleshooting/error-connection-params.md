---
name: error-connection-params
description: "Fix connection parameter errors in Kailash workflows. Use when encountering 'InvalidConnection', 'unknown node type', 'connection parameter order', 'wrong connection syntax', or '4-parameter connection' errors."
---

# Error: Connection Parameter Issues

Fix connection-related errors including wrong parameter order, missing parameters, and invalid connection issues in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `CRITICAL` (Very common error #2)
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md), [`connection-patterns`](../../01-core-sdk/connection-patterns.md)

## Common Error Messages

```
BuildError::InvalidConnection { source_node: "prep", source_output: "result",
    target_node: "missing_node", target_input: "data", reason: "target node not found" }

"invalid connection from prep.result to missing_node.data: target node not found"
"unknown node type: NonExistentNode"
```

In Rust, many connection errors are caught at **build time** by `builder.build(&registry)?` rather than at runtime. The compiler also prevents type errors that would be runtime exceptions in dynamic languages.

## Root Causes

1. **Wrong parameter order** - Swapping source_output and target node positions
2. **Missing node ID** - Referencing a node that was not added to the builder
3. **Node type not in registry** - Using a type name not registered in `NodeRegistry`
4. **Wrong output/input names** - Using parameter names the node does not declare

## Quick Fixes

### :x: Error 1: Wrong Parameter Order (VERY COMMON)

```rust
let mut builder = WorkflowBuilder::new();
builder.add_node("JSONTransformNode", "prepare_filters", config.clone());
builder.add_node("HTTPRequestNode", "execute_search", ValueMap::new());

// Wrong - parameters swapped (source_output and target positions)
builder.connect(
    "prepare_filters",   // source node OK
    "execute_search",    // source_output WRONG (should be "result")
    "result",            // target node WRONG (should be "execute_search")
    "input",             // target_input OK
);
// BuildError: "invalid connection from prepare_filters.execute_search to result.input: ..."
```

### :white_check_mark: Fix: Correct Parameter Order

```rust
// Correct - proper order: source, source_output, target, target_input
builder.connect(
    "prepare_filters",   // source: node ID
    "result",            // source_output: output field from source
    "execute_search",    // target: node ID
    "input",             // target_input: input field on target
);
```

**Mnemonic**: **Source first** (node + output), **then Target** (node + input)

### :x: Error 2: Node Type Not in Registry

```rust
let registry = Arc::new(NodeRegistry::default());

let mut builder = WorkflowBuilder::new();
builder.add_node("NonExistentNode", "my_node", ValueMap::new());

let workflow = builder.build(&registry)?;
// BuildError::UnknownNodeType { type_name: "NonExistentNode" }
```

### :white_check_mark: Fix: Use Registered Node Types

```rust
let mut registry = NodeRegistry::default();
// Register your custom nodes, or use a pre-populated registry

let mut builder = WorkflowBuilder::new();
builder.add_node("JSONTransformNode", "my_node", ValueMap::new());

let registry = Arc::new(registry);
let workflow = builder.build(&registry)?; // OK - JSONTransformNode is registered
```

### :x: Error 3: Referencing Non-Existent Node in Connection

```rust
let mut builder = WorkflowBuilder::new();
builder.add_node("JSONTransformNode", "prep", ValueMap::new());

// Wrong - "search" was never added via add_node
builder.connect("prep", "result", "search", "data");

let workflow = builder.build(&registry)?;
// BuildError::InvalidConnection { ... reason: "target node not found" }
```

### :white_check_mark: Fix: Add All Nodes Before Connecting

```rust
let mut builder = WorkflowBuilder::new();
builder.add_node("JSONTransformNode", "prep", ValueMap::new());
builder.add_node("HTTPRequestNode", "search", ValueMap::new()); // Add the target node

builder.connect("prep", "result", "search", "data"); // Now both nodes exist
```

## Complete Example: Before & After

### :x: Wrong Code (All Common Mistakes)

```rust
use kailash_core::{WorkflowBuilder, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();

builder.add_node("JSONTransformNode", "prep", ValueMap::from([
    ("expression".into(), Value::String("@.filters".into())),
]));

builder.add_node("HTTPRequestNode", "search", ValueMap::new());

// WRONG: Parameter order swapped
builder.connect("prep", "search", "result", "data");

// WRONG: Target node does not exist
builder.connect("prep", "result", "missing_node", "data");

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?; // BuildError!
```

### :white_check_mark: Correct Code

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();

builder.add_node("JSONTransformNode", "prep", ValueMap::from([
    ("expression".into(), Value::String("@.filters".into())),
]));

builder.add_node("HTTPRequestNode", "search", ValueMap::new());

// CORRECT: 4 parameters in right order
builder.connect("prep", "result", "search", "data");

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?; // OK

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::new()).await?;
```

## 4-Parameter Connection Pattern

### Parameter Breakdown

```rust
builder.connect(
    source,         // 1. Source node ID (&str)
    source_output,  // 2. Output field name from source (&str)
    target,         // 3. Target node ID (&str)
    target_input,   // 4. Input parameter name on target (&str)
);
```

### Common Patterns

| Scenario         | source_output | Example                                                   |
| ---------------- | ------------- | --------------------------------------------------------- |
| **Simple field** | `"data"`      | `builder.connect("reader", "data", "processor", "input")` |
| **Result field** | `"result"`    | `builder.connect("prep", "result", "process", "input")`   |
| **Named output** | `"count"`     | `builder.connect("counter", "count", "display", "value")` |

## Debugging Connection Errors

### Step 1: Verify Node IDs Exist

```rust
// All node IDs used in connect() must match add_node() IDs
let mut builder = WorkflowBuilder::new();
builder.add_node("JSONTransformNode", "prep", ValueMap::new());   // ID: "prep"
builder.add_node("HTTPRequestNode", "search", ValueMap::new());   // ID: "search"

builder.connect("prep", "result", "search", "input");  // Both "prep" and "search" exist
```

### Step 2: Check Output Structure

```rust
// After execution, inspect what a node actually outputs
let result = runtime.execute(&workflow, ValueMap::new()).await?;

// See available output keys for a node
if let Some(prep_output) = result.results.get("prep") {
    for key in prep_output.keys() {
        println!("prep output key: {key}");
    }
}
```

### Step 3: Verify Parameter Order

```rust
// Remember the order: source, source_output, target, target_input
//                     ^SOURCE^  ^SOURCE^^^^  ^TARGET^  ^TARGET^^^
builder.connect(
    "source_node",     // 1. source
    "output_field",    // 2. source_output
    "target_node",     // 3. target
    "input_param",     // 4. target_input
);
```

## Rust Compile-Time Safety

Unlike dynamic languages, the Rust compiler catches many errors at compile time:

| Error Type              | Dynamic Language         | Rust                                                |
| ----------------------- | ------------------------ | --------------------------------------------------- |
| Wrong method name       | Runtime `AttributeError` | Compile error: method not found                     |
| Wrong argument count    | Runtime `TypeError`      | Compile error: wrong number of args                 |
| Type mismatch in config | Runtime error            | `Value` enum is type-safe                           |
| Missing `.build()`      | Runtime `TypeError`      | Compile error: `WorkflowBuilder` has no `execute()` |

Build-time errors (from `builder.build(&registry)?`) catch graph-level issues:

- Unknown node types (`BuildError::UnknownNodeType`)
- Invalid connections (`BuildError::InvalidConnection`)
- Duplicate node IDs (`BuildError::DuplicateNodeId`)
- Cycles in DAG mode (`BuildError::CycleDetected`)

## Related Patterns

- **Connection basics**: See `crates/kailash-core/src/workflow.rs` for `connect()` API
- **Error types**: See `crates/kailash-core/src/error.rs` for `BuildError` variants
- **Other errors**: [`error-missing-build`](error-missing-build.md), [`error-parameter-validation`](error-parameter-validation.md)
- **CLAUDE.md**: Essential patterns and workflow architecture

## Quick Tips

- :bulb: **Mnemonic**: Source (node + output) -> Target (node + input)
- :bulb: **Debug order**: If "node not found" in build error, check if you swapped source_output and target
- :bulb: **Registry check**: Ensure your node type is registered in `NodeRegistry` before building
- :bulb: **Verify IDs**: All node IDs in `connect()` must match IDs from `add_node()`
- :bulb: **Inspect outputs**: Use `result.results.get("node_id")` to see available output fields

<!-- Trigger Keywords: target node not found, InvalidConnection, connection error, connection parameter order, wrong connection syntax, 4-parameter connection, connect error, connection mapping error, node not found in workflow, connection issues, BuildError -->
