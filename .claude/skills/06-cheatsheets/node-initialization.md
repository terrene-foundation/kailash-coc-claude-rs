---
name: node-initialization
description: "Node initialization patterns and parameter handling. Use when asking 'node initialization', 'node parameters', 'initialize nodes', 'node setup', or 'parameter patterns'."
---

# Node Initialization

Node Initialization guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `advanced`
> Priority: `HIGH`
> SDK Version: `0.9.25+`

## Quick Reference

- **Primary Use**: Node Initialization
- **Category**: advanced
- **Priority**: HIGH
- **Trigger Keywords**: node initialization, node parameters, initialize nodes, node setup

## Core Pattern

```rust
use kailash_core::node::{Node, NodeParameter, NodeMetadata};
use kailash_core::runtime::NodeError;
use kailash_value::ValueMap;
use std::future::Future;
use std::pin::Pin;

/// Custom node with configurable parameters.
pub struct MyNode {
    name: String,
    my_param: String,
    threshold: f64,
}

impl MyNode {
    /// Construct from a config map. All attributes are set during construction.
    pub fn from_config(config: &ValueMap) -> Result<Self, NodeError> {
        let name = config
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("my_node")
            .to_string();
        let my_param = config
            .get("my_param")
            .and_then(|v| v.as_str())
            .unwrap_or("default")
            .to_string();
        let threshold = config
            .get("threshold")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.75);

        Ok(Self { name, my_param, threshold })
    }
}

impl Node for MyNode {
    fn type_name(&self) -> &str {
        "MyNode"
    }

    fn input_params(&self) -> Vec<NodeParameter> {
        vec![NodeParameter {
            name: "input_data".into(),
            description: "Data to process".into(),
            required: true,
            default: None,
        }]
    }

    fn output_params(&self) -> Vec<NodeParameter> {
        vec![NodeParameter {
            name: "result".into(),
            description: "Processing result".into(),
            required: true,
            default: None,
        }]
    }

    fn execute(
        &self,
        inputs: ValueMap,
    ) -> Pin<Box<dyn Future<Output = Result<ValueMap, NodeError>> + Send + '_>> {
        Box::pin(async move {
            let mut output = ValueMap::new();
            output.insert(
                "result".into(),
                format!("Processed with {}", self.my_param).into(),
            );
            Ok(output)
        })
    }
}
```

## Common Use Cases

- **Custom Node Development**: Building specialized nodes with proper parameter validation and initialization via `from_config`
- **LLM/Embedding Integration**: Correctly handling provider-specific formats and required parameters (provider, model, messages)
- **Fixing Missing Field Errors**: Resolving "field not found" errors by setting all fields during `from_config` construction
- **Parameter Type Validation**: Using `NodeParameter` for proper type checking instead of returning raw values
- **Provider-Specific Formats**: Handling different response formats from Ollama, OpenAI, etc. (embeddings as structs vs vectors)

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For patterns**: See [`workflow-patterns-library`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:

- **pattern-expert**: Complex patterns, multi-node workflows
- **testing-specialist**: Comprehensive testing strategies

## Documentation References

### Primary Sources

## Quick Tips

- **All fields in `from_config`**: Most common error -- set ALL struct fields during construction or the node will have uninitialized/missing data
- **Return `NodeParameter` objects**: `input_params()` and `output_params()` must return `Vec<NodeParameter>`, not raw types
- **Implement required trait methods**: All custom nodes need `type_name()`, `input_params()`, `output_params()`, and `execute()` -- missing any causes a compilation error
- **Provider parameter required**: LLM and embedding nodes require a `provider` field (e.g., `"ollama"`, `"openai"`) in config
- **Check provider response format**: Ollama embeddings return structs with an `embedding` field, not bare vectors -- destructure accordingly
- **Use `execute()` not `run()`**: The `Node` trait method is `execute()`
- **Test with real providers**: Mock data hides provider-specific format issues -- always test with actual Ollama/OpenAI/etc.

## Keywords for Auto-Trigger

<!-- Trigger Keywords: node initialization, node parameters, initialize nodes, node setup -->
