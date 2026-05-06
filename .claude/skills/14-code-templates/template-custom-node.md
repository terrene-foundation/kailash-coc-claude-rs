---
name: template-custom-node
description: "Generate Kailash custom node template. Use when requesting 'custom node template', 'create custom node', 'extend node', 'node development', or 'custom node boilerplate'."
---

# Custom Node Template

Template for creating custom Kailash Rust SDK nodes with proper parameter declaration, async execution, and registration patterns.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`CLAUDE.md`](../../../../CLAUDE.md), [`01-core`](../../01-core/)
> Related Subagents: `node-implementer` (advanced node development), `rust-architect` (trait design)

## Basic Custom Node Template

```rust
//! Custom Node Implementation

use kailash_core::{Node, NodeError, ExecutionContext};
use kailash_core::node::{ParamDef, ParamType};
use kailash_core::value::{Value, ValueMap};
use std::pin::Pin;
use std::future::Future;
use std::sync::Arc;

/// Custom node for [specific purpose].
pub struct CustomProcessingNode {
    input_params: Vec<ParamDef>,
    output_params: Vec<ParamDef>,
}

impl CustomProcessingNode {
    pub fn new() -> Self {
        Self {
            input_params: vec![
                ParamDef::new("input_data", ParamType::Object, true),
                ParamDef::new("operation", ParamType::String, false)
                    .with_default(Value::String(Arc::from("transform"))),
                ParamDef::new("options", ParamType::Object, false),
            ],
            output_params: vec![
                ParamDef::new("result", ParamType::Any, false),
                ParamDef::new("status", ParamType::String, false),
            ],
        }
    }
}

impl Node for CustomProcessingNode {
    fn type_name(&self) -> &str {
        "CustomProcessingNode"
    }

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
            // Extract required input
            let input_data = inputs.get("input_data")
                .ok_or_else(|| NodeError::MissingInput {
                    name: "input_data".to_string(),
                })?;

            // Extract optional input with default
            let operation = inputs.get("operation")
                .and_then(|v| v.as_str())
                .unwrap_or("transform");

            // Dispatch to operation handler
            let result = match operation {
                "transform" => transform_data(input_data)?,
                "validate" => validate_data(input_data)?,
                other => {
                    return Err(NodeError::ExecutionFailed {
                        message: format!("Unknown operation: {other}"),
                        source: None,
                    });
                }
            };

            Ok(ValueMap::from([
                ("result".into(), result),
                ("status".into(), Value::String("success".into())),
            ]))
        })
    }
}

fn transform_data(data: &Value) -> Result<Value, NodeError> {
    // Implement transformation logic
    match data {
        Value::Object(map) => {
            let transformed: ValueMap = map.iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            Ok(Value::Object(transformed))
        }
        _ => Err(NodeError::ExecutionFailed {
            message: "Expected object input for transform".to_string(),
            source: None,
        }),
    }
}

fn validate_data(data: &Value) -> Result<Value, NodeError> {
    // Implement validation logic
    let valid = !matches!(data, Value::Null);
    Ok(Value::Object(ValueMap::from([
        ("valid".into(), Value::Bool(valid)),
    ])))
}
```

## Usage in Workflow

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry, NodeError};
use kailash_core::node::{NodeFactory, NodeMetadata, Node, ParamDef, ParamType};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

// Factory for CustomProcessingNode
struct CustomProcessingNodeFactory {
    metadata: NodeMetadata,
}

impl CustomProcessingNodeFactory {
    fn new() -> Self {
        Self {
            metadata: NodeMetadata {
                type_name: "CustomProcessingNode".into(),
                description: "Custom data processing node".into(),
                category: "transform".into(),
                input_params: vec![
                    ParamDef::new("input_data", ParamType::Object, true),
                    ParamDef::new("operation", ParamType::String, false)
                        .with_default(Value::String(Arc::from("transform"))),
                    ParamDef::new("options", ParamType::Object, false),
                ],
                output_params: vec![
                    ParamDef::new("result", ParamType::Any, false),
                    ParamDef::new("status", ParamType::String, false),
                ],
                version: "0.1.0".into(),
                author: "Kailash Authors".into(),
                tags: vec!["transform".into(), "custom".into()],
            },
        }
    }
}

impl NodeFactory for CustomProcessingNodeFactory {
    fn create(&self, _config: ValueMap) -> Result<Box<dyn Node>, NodeError> {
        Ok(Box::new(CustomProcessingNode::new()))
    }

    fn metadata(&self) -> &NodeMetadata {
        &self.metadata
    }
}

// Register custom node in the registry
fn register_custom_nodes(registry: &mut NodeRegistry) {
    registry.register(Box::new(CustomProcessingNodeFactory::new()));
}

fn main() -> anyhow::Result<()> {
    // Build registry with custom node
    let mut registry = NodeRegistry::default();
    register_custom_nodes(&mut registry);
    let registry = Arc::new(registry);

    // Use in workflow
    let mut builder = WorkflowBuilder::new();

    builder.add_node("CustomProcessingNode", "custom", ValueMap::from([
        ("input_data".into(), Value::Object(ValueMap::from([
            ("name".into(), Value::String("test".into())),
            ("value".into(), Value::Integer(123)),
        ]))),
        ("operation".into(), Value::String("transform".into())),
    ]));

    let workflow = builder.build(&registry)?;
    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::new())?;

    println!("{:?}", result.results.get("custom"));
    Ok(())
}
```

## Advanced Template with Validation

```rust
use kailash_core::{Node, ParamDef, NodeError, ExecutionContext};
use kailash_core::value::{Value, ValueMap};
use std::pin::Pin;
use std::future::Future;

/// Advanced custom node with input validation.
pub struct AdvancedCustomNode;

impl AdvancedCustomNode {
    /// Validate inputs before execution.
    fn validate_inputs(inputs: &ValueMap) -> Result<(), NodeError> {
        // Require input_data
        let input_data = inputs.get("input_data")
            .ok_or_else(|| NodeError::MissingInput {
                name: "input_data".to_string(),
            })?;

        // Validate input_data is an object
        if !matches!(input_data, Value::Object(_)) {
            return Err(NodeError::ExecutionFailed {
                message: "input_data must be an object".to_string(),
                source: None,
            });
        }

        // Validate threshold range (0.0..=1.0)
        if let Some(Value::Float(threshold)) = inputs.get("threshold") {
            if !(&0.0..=&1.0).contains(&threshold) {
                return Err(NodeError::ExecutionFailed {
                    message: format!("threshold must be 0.0..=1.0, got {threshold}"),
                    source: None,
                });
            }
        }

        // Validate operation is one of allowed values
        if let Some(op) = inputs.get("operation").and_then(|v| v.as_str()) {
            if !["filter", "transform", "aggregate"].contains(&op) {
                return Err(NodeError::ExecutionFailed {
                    message: format!("operation must be filter|transform|aggregate, got {op}"),
                    source: None,
                });
            }
        }

        Ok(())
    }

    fn filter(data: &ValueMap, threshold: f64) -> Result<Value, NodeError> {
        // Filter implementation
        Ok(Value::Object(ValueMap::from([
            ("filtered".into(), Value::Object(data.clone())),
            ("threshold".into(), Value::Float(threshold)),
        ])))
    }
}

impl Node for AdvancedCustomNode {
    fn type_name(&self) -> &str {
        "AdvancedCustomNode"
    }

    fn input_params(&self) -> &[ParamDef] {
        use std::sync::LazyLock;
        static PARAMS: LazyLock<Vec<ParamDef>> = LazyLock::new(|| vec![
            ParamDef::new("input_data", ParamType::Object, true),
            ParamDef::new("threshold", ParamType::Float, false)
                .with_default(Value::Float(0.5)),
            ParamDef::new("operation", ParamType::String, false)
                .with_default(Value::String(Arc::from("filter"))),
        ]);
        &PARAMS
    }

    fn output_params(&self) -> &[ParamDef] {
        use std::sync::LazyLock;
        static PARAMS: LazyLock<Vec<ParamDef>> = LazyLock::new(|| vec![
            ParamDef::new("result", ParamType::Any, false),
        ]);
        &PARAMS
    }

    fn execute(
        &self,
        inputs: ValueMap,
        _ctx: &ExecutionContext,
    ) -> Pin<Box<dyn Future<Output = Result<ValueMap, NodeError>> + Send + '_>> {
        Box::pin(async move {
            // Validate all inputs upfront
            Self::validate_inputs(&inputs)?;

            let input_data = match inputs.get("input_data") {
                Some(Value::Object(map)) => map,
                _ => return Err(NodeError::ExecutionFailed {
                    message: "input_data must be an object".into(),
                    source: None,
                }),
            };

            let threshold = inputs.get("threshold")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.5);

            let operation = inputs.get("operation")
                .and_then(|v| v.as_str())
                .unwrap_or("filter");

            let result = match operation {
                "filter" => Self::filter(input_data, threshold)?,
                "transform" | "aggregate" => {
                    // Implement other operations
                    Value::Object(input_data.clone())
                }
                other => return Err(NodeError::ExecutionFailed {
                    message: format!("unsupported operation: {other}"),
                    source: None,
                }),
            };

            Ok(ValueMap::from([("result".into(), result)]))
        })
    }
}
```

## Proc-Macro Node Template

For a more concise declaration, use the `#[kailash_node]` proc-macro:

```rust
use kailash_macros::kailash_node;
use kailash_core::value::{Value, ValueMap};
use kailash_core::{NodeError, ExecutionContext, NodeExecute};
use async_trait::async_trait;

#[kailash_node(description = "Transforms JSON data", category = "transform")]
pub struct MyTransformNode {
    #[input(required)]
    data: Value,
    #[input(default = "\"@\"")]
    expression: String,
    #[output]
    result: Value,
}

#[async_trait]
impl NodeExecute for MyTransformNode {
    async fn execute(
        &self,
        inputs: ValueMap,
        _ctx: &ExecutionContext,
    ) -> Result<ValueMap, NodeError> {
        let data = inputs.get("data")
            .ok_or_else(|| NodeError::MissingInput {
                name: "data".to_string(),
            })?;

        // Transform logic here
        let transformed = data.clone();

        Ok(ValueMap::from([("result".into(), transformed)]))
    }
}
```

## Related Patterns

- **Node trait reference**: See `CLAUDE.md` for the `Node` trait signature
- **Node categories**: See `crates/kailash-nodes/` for 139+ built-in nodes
- **Registration**: Use `NodeFactory` + `NodeMetadata` for registry integration
- **Proc-macro**: See `crates/kailash-macros/` for `#[kailash_node]`

## Resource-Aware Node Pattern

For nodes that access shared resources (database pools, caches), use `ExecutionContext::extension()`:

```rust
fn execute(
    &self,
    inputs: ValueMap,
    ctx: &ExecutionContext,
) -> Pin<Box<dyn Future<Output = Result<ValueMap, NodeError>> + Send + '_>> {
    Box::pin(async move {
        // Access typed extension injected by Runtime
        let pool_registry = ctx.extension::<PoolRegistry>()
            .ok_or_else(|| NodeError::ExecutionFailed {
                message: "PoolRegistry not available".into(),
                source: None,
            })?;

        // Register new resources for lifecycle management
        if let Some(resources) = &ctx.resources {
            resources.register("key", resource).await
                .map_err(|e| NodeError::ExecutionFailed {
                    message: format!("Resource registration failed: {e}"),
                    source: None,
                })?;
        }

        let mut outputs = ValueMap::new();
        // ... build outputs ...
        Ok(outputs)
    })
}
```

See `crates/kailash-nodes/src/sql/database_connection.rs` for the reference implementation.

## When to Escalate

Use `node-implementer` when:

- Complex async node with external I/O
- Nodes requiring connection pooling or state
- Nodes that register resources with ResourceRegistry

Use `rust-architect` when:

- Cross-crate trait design decisions
- Ownership and lifetime patterns for node state

## Documentation References

### Primary Sources

- **Node Trait**: [`CLAUDE.md`](../../../../CLAUDE.md) -- `Node` trait definition, `ParamDef`, `NodeError`
- **Core Crate**: [`crates/kailash-core/`](../../../../crates/kailash-core/) -- Node trait source
- **Existing Nodes**: [`crates/kailash-nodes/`](../../../../crates/kailash-nodes/) -- Reference implementations
- **Proc-Macros**: [`crates/kailash-macros/`](../../../../crates/kailash-macros/) -- `#[kailash_node]`

## Quick Tips

- Always implement all three trait methods: `type_name()`, `input_params()`/`output_params()`, `execute()`
- Use `ParamDef::new(name, ParamType, required)` with optional `.with_default()` / `.with_description()`
- Return `Pin<Box<dyn Future<...> + Send + '_>>` from `execute()` -- use `Box::pin(async move { ... })`
- Use `NodeError::MissingInput` for absent required params, `NodeError::ExecutionFailed` for logic errors
- Implement `NodeFactory` trait and register via `registry.register(Box::new(factory))`

<!-- Trigger Keywords: custom node template, create custom node, extend node, node development, custom node boilerplate, custom node example, develop node -->
