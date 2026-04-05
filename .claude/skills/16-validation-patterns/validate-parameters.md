---
name: validate-parameters
description: "Validate node parameters in the Kailash Rust SDK. Use when asking 'validate parameters', 'check node params', or 'parameter validation'."
---

# Validate Node Parameters

> **Skill Metadata**
> Category: `validation`
> Priority: `HIGH`

## Parameter Validation

```rust
use kailash_core::{WorkflowBuilder, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();

// Valid: All required parameters provided via ValueMap
builder.add_node("LLMNode", "llm1", ValueMap::from([
    ("provider".into(), Value::String("openai".into())),
    ("model".into(), Value::String(
        std::env::var("OPENAI_MODEL").unwrap_or_default().into()
    )),
    ("prompt".into(), Value::String("Hello".into())),
]));

// Validate at build time
let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;  // Returns Err if params invalid
```

## Node Trait Parameter Contract

Each node defines its parameter contract via `input_params()` and `output_params()`:

```rust
use kailash_core::node::{Node, ParamDef, ParamType};
use kailash_core::value::{Value, ValueMap};
use kailash_core::{ExecutionContext, NodeError};
use std::pin::Pin;
use std::future::Future;

pub struct MyNode {
    input_params: Vec<ParamDef>,
    output_params: Vec<ParamDef>,
}

impl MyNode {
    pub fn new() -> Self {
        Self {
            input_params: vec![
                ParamDef::new("file_path", ParamType::String, true)
                    .with_description("Path to input file"),
                ParamDef::new("threshold", ParamType::Integer, false)
                    .with_description("Processing threshold"),
            ],
            output_params: vec![
                ParamDef::new("result", ParamType::String, false)
                    .with_description("Processing result"),
            ],
        }
    }
}

impl Node for MyNode {
    fn type_name(&self) -> &str { "MyNode" }

    fn input_params(&self) -> &[ParamDef] {
        &self.input_params
    }

    fn output_params(&self) -> &[ParamDef] {
        &self.output_params
    }

    fn execute(
        &self,
        inputs: ValueMap,
        _ctx: &ExecutionContext,
    ) -> Pin<Box<dyn Future<Output = Result<ValueMap, NodeError>> + Send + '_>> {
        Box::pin(async move {
            let file_path = inputs.get("file_path")
                .ok_or(NodeError::MissingInput { name: "file_path".into() })?;

            let threshold = inputs.get("threshold")
                .and_then(|v| v.as_i64())
                .unwrap_or(100);

            if threshold < 0 {
                return Err(NodeError::ExecutionFailed {
                    message: "threshold must be non-negative".into(),
                    source: None,
                });
            }

            Ok(ValueMap::from([
                ("result".into(), Value::String("processed".into())),
            ]))
        })
    }
}
```

## ValueMap Construction

```rust
use kailash_core::value::{Value, ValueMap};

// Correct: Using ValueMap::from with tuples
let params = ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
    ("delimiter".into(), Value::String(",".into())),
    ("has_header".into(), Value::Bool(true)),
    ("max_rows".into(), Value::Integer(1000)),
]);

// Correct: Building incrementally
let mut params = ValueMap::new();
params.insert("file_path".into(), Value::String("data.csv".into()));
params.insert("threshold".into(), Value::Integer(100));
```

## Validation Errors

### Missing Required Parameters

```rust
// Will fail at execution if "file_path" is required but not provided
builder.add_node("CSVProcessorNode", "reader", ValueMap::from([
    ("delimiter".into(), Value::String(",".into())),
    // Missing "file_path" -- required!
]));
// build() may succeed, but execute() will return NodeError::MissingInput
```

### Wrong Value Types

```rust
// Wrong: Integer where String expected
builder.add_node("CSVProcessorNode", "reader", ValueMap::from([
    ("file_path".into(), Value::Integer(42)),  // Should be Value::String
]));
```

### Build-Time vs Execution-Time Validation

```rust
let registry = Arc::new(NodeRegistry::default());

// Build-time: validates structure (node types, connections, IDs)
let workflow = builder.build(&registry)?;

// Execution-time: validates parameters and business logic
let runtime = Runtime::new(RuntimeConfig::default(), registry);
match runtime.execute(&workflow, ValueMap::new()).await {
    Ok(result) => { /* success */ }
    Err(e) => {
        eprintln!("Execution failed: {}", e);
        // Could be NodeError::MissingInput, NodeError::ExecutionFailed, etc.
    }
}
```

## Common Validation Issues

1. **Missing required parameters** -- Provide all required parameters in ValueMap
2. **Wrong Value variant** -- Match the expected type (String, Integer, Bool, etc.)
3. **Wrong parameter names** -- Use snake_case, match node's `input_params()` names
4. **Empty ValueMap** -- Provide at least required parameters
5. **Env vars not loaded** -- Call `dotenvy::dotenv().ok()` at program entry

## Related Patterns

- **Value types**: See `crates/kailash-value/` -- Value enum definition
- **Node trait**: See `crates/kailash-core/src/node.rs` -- ParamDef
- **Workflow building**: See CLAUDE.md -- Essential Patterns

## Documentation References

### Primary Sources

- [`CLAUDE.md`](../../../../CLAUDE.md) -- kailash-value and kailash-core sections
- `crates/kailash-core/src/node.rs` -- Node trait, ParamDef

## Quick Tips

- `builder.build(&registry)?` validates structure; execution validates parameters
- Use `ParamDef::new(name, ParamType, required)` in custom nodes
- Always use `Value::String("...".into())` -- not raw strings
- ValueMap keys are `Arc<str>` -- use `.into()` to convert from `&str`
- Load env vars early: `dotenvy::dotenv().ok()` at program start

<!-- Trigger Keywords: validate parameters, check node params, parameter validation, node parameters, ValueMap -->
