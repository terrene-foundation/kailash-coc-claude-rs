---
name: error-parameter-validation
description: "Fix 'missing required inputs' and parameter validation errors in Kailash Rust workflows. Use when encountering 'MissingInput', 'InvalidInput', 'NodeError::MissingInput', 'required parameter not provided', or parameter-related errors."
---

# Error: Missing Required Parameters

Fix parameter validation errors including missing required inputs, wrong parameter types, and the parameter passing methods in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `CRITICAL` (Common error #3)
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)

## Common Error Messages

These are **runtime** errors returned from `Result` -- the Rust type system cannot check ValueMap contents at compile time:

```
RuntimeError::NodeFailed {
    node_id: "create",
    source: NodeError::MissingInput { name: "email" }
}
// Display: "node 'create' failed"
// Source:  "missing required input: email"

NodeError::InvalidInput { name: "count", expected: "integer", got: "string" }
// Display: "invalid input 'count': expected integer, got string"
```

## Root Cause

Nodes declare required inputs via `input_params()` returning `&[ParamDef]`. When a node executes, it checks that all required inputs are present in the `ValueMap`. Missing or wrong-typed inputs produce `NodeError::MissingInput` or `NodeError::InvalidInput`.

Parameters must be provided through one of **3 methods**.

## Quick Fix: The 3 Methods

### Method 1: Node Configuration (Most Reliable)

```rust
// Provide parameters directly in the config ValueMap
let mut builder = WorkflowBuilder::new();
builder.add_node("HTTPRequestNode", "api_call", ValueMap::from([
    ("url".into(), Value::String("https://api.example.com".into())),
    ("method".into(), Value::String("GET".into())),  // Required parameter provided
]));
```

### Method 2: Workflow Connections (Dynamic)

```rust
// Connect parameter from another node's output
builder.connect("form_data", "email", "create_user", "email");
// The "email" output of "form_data" feeds into "create_user"'s "email" input
```

### Method 3: Runtime Inputs (Override)

```rust
// Provide values at execution time via the inputs ValueMap
// Note: runtime inputs are global; node-level routing depends on workflow structure
let inputs = ValueMap::from([
    ("email".into(), Value::String("alice@example.com".into())),
]);
let result = runtime.execute(&workflow, inputs).await?;
```

## Complete Example

### :x: Wrong: Missing Required Parameter

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();

// Missing required 'url' parameter -- will fail at RUNTIME
builder.add_node("HTTPRequestNode", "api_call", ValueMap::from([
    ("method".into(), Value::String("GET".into())),
    // url is required but not provided!
]));

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::new()).await;
// Err(RuntimeError::NodeFailed {
//     node_id: "api_call",
//     source: NodeError::MissingInput { name: "url" }
// })
```

### :white_check_mark: Fix Option 1: Add to Node Config

```rust
builder.add_node("HTTPRequestNode", "api_call", ValueMap::from([
    ("url".into(), Value::String("https://api.example.com".into())),  // Required
    ("method".into(), Value::String("GET".into())),                   // Required
]));
```

### :white_check_mark: Fix Option 2: Use Connection from Another Node

```rust
let mut builder = WorkflowBuilder::new();

// Source node produces the URL
builder.add_node("JSONTransformNode", "config", ValueMap::from([
    ("expression".into(), Value::String("@.api_url".into())),
]));

// Target node receives URL via connection
builder.add_node("HTTPRequestNode", "api_call", ValueMap::from([
    ("method".into(), Value::String("GET".into())),
    // url comes from the connection
]));

// Connect url from config node to api_call node
builder.connect("config", "result", "api_call", "url");
```

### :white_check_mark: Fix Option 3: Runtime Inputs

```rust
let inputs = ValueMap::from([
    ("url".into(), Value::String("https://api.example.com".into())),
]);

let result = runtime.execute(&workflow, inputs).await?;
```

## Parameter Method Selection Guide

| Scenario               | Best Method               | Why                             |
| ---------------------- | ------------------------- | ------------------------------- |
| **Static values**      | Method 1 (Config)         | Clear, explicit, easy to test   |
| **Dynamic data flow**  | Method 2 (Connections)    | Data from previous nodes        |
| **User input**         | Method 3 (Runtime inputs) | Dynamic values at execution     |
| **Environment config** | Method 1 (Config) via env | `std::env::var()` at build time |
| **Testing**            | Method 1 (Config)         | Most reliable, deterministic    |

## NodeError Variants for Parameters

| Error                                             | Meaning                                      | Fix                                               |
| ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------- |
| `NodeError::MissingInput { name }`                | Required input not in ValueMap               | Provide via config, connection, or runtime inputs |
| `NodeError::InvalidInput { name, expected, got }` | Input has wrong Value variant                | Check Value type matches what node expects        |
| `NodeError::ExecutionFailed { message, source }`  | Node logic failed (may include param issues) | Check the `message` for details                   |

## Common Variations

### Missing Multiple Parameters

```rust
// :x: Multiple missing parameters
builder.add_node("HTTPRequestNode", "api", ValueMap::new());
// Both "url" and "method" are required!

// :white_check_mark: Provide all required parameters
builder.add_node("HTTPRequestNode", "api", ValueMap::from([
    ("url".into(), Value::String("https://api.example.com".into())),
    ("method".into(), Value::String("GET".into())),
]));
```

### Wrong Value Type

```rust
// :x: Wrong type -- url expects a String, not Integer
builder.add_node("HTTPRequestNode", "api", ValueMap::from([
    ("url".into(), Value::Integer(42)),  // InvalidInput error!
    ("method".into(), Value::String("GET".into())),
]));

// :white_check_mark: Use correct Value variant
builder.add_node("HTTPRequestNode", "api", ValueMap::from([
    ("url".into(), Value::String("https://api.example.com".into())),
    ("method".into(), Value::String("GET".into())),
]));
```

### Optional vs Required Parameters

```rust
// Some parameters have defaults and are optional
builder.add_node("CSVReaderNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),  // Required
    // has_header: optional (defaults to true)
    // delimiter: optional (defaults to ",")
]));
```

## Discovering Node Parameters

To find out what parameters a node requires, check its `input_params()`:

```rust
// At runtime, inspect a node's declared parameters
let registry = NodeRegistry::default();
if let Some(metadata) = registry.get_metadata("HTTPRequestNode") {
    // metadata.input_params and metadata.output_params
    // show the node's declared interface
    println!("Category: {}", metadata.category);
    println!("Description: {}", metadata.description);
}
```

Or check the node implementation in `crates/kailash-nodes/src/` for `input_params()`.

## Related Patterns

- **Error types**: See `crates/kailash-core/src/error.rs` for `NodeError::MissingInput`, `NodeError::InvalidInput`
- **Node trait**: See `crates/kailash-core/src/node.rs` for `input_params()` and `ParamDef`
- **Connection errors**: [`error-connection-params`](error-connection-params.md)
- **Build errors**: [`error-missing-build`](error-missing-build.md)

## Quick Tips

- :bulb: **Default to Method 1**: Most reliable for static, known values
- :bulb: **Check node source**: Look at `input_params()` in the node implementation to find required params
- :bulb: **Combine methods**: Config for defaults, connections for data flow, runtime inputs for dynamic values
- :bulb: **Match Value types**: `Value::String` for strings, `Value::Integer` for ints, etc.
- :bulb: **Test first**: Use Method 1 in tests for deterministic, reliable results

<!-- Trigger Keywords: missing required inputs, MissingInput, InvalidInput, parameter validation, required parameter not provided, parameter error, node missing inputs, validation error, missing parameter, required param, parameter validation failed, NodeError -->
