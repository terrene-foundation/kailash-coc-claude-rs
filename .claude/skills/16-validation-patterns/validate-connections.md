---
name: validate-connections
description: "Validate workflow connections in the Kailash Rust SDK. Use when asking 'validate workflow', 'check connections', or 'workflow validation'."
---

# Validate Workflow Connections

> **Skill Metadata**
> Category: `validation`
> Priority: `HIGH`

## Validation Checks

```rust
use kailash_core::{WorkflowBuilder, NodeRegistry};
use kailash_core::value::ValueMap;
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();
builder.add_node("LLMNode", "node1", ValueMap::new());
builder.add_node("JSONTransformNode", "node2", ValueMap::new());

// CORRECT: 4-parameter connection pattern
builder.connect("node1", "result", "node2", "data");

// Validation happens at build time
let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;  // Raises error if invalid
```

## Connection Rules

### 4-Parameter Format (Required)

```rust
// CORRECT: source_node, source_output, target_node, target_input
builder.connect("reader", "data", "processor", "input");
builder.connect("processor", "result", "writer", "data");

// WRONG: Missing parameters
// builder.connect("reader", "processor");  // Only 2 params -- invalid
```

### Valid vs Invalid Connections

```rust
let mut builder = WorkflowBuilder::new();
builder.add_node("CSVProcessorNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));
builder.add_node("JSONTransformNode", "transform", ValueMap::new());

// CORRECT: Both nodes exist, valid parameter names
builder.connect("reader", "data", "transform", "data");

// WRONG: Target node does not exist
// builder.connect("reader", "data", "nonexistent", "input");
// -> build() will return Err(...)
```

## Common Issues

1. **Missing connections** -- Isolated nodes with no data flow
2. **Invalid node IDs** -- Typos in connection source/target
3. **Circular dependencies** -- A -> B -> A (detected at build time)
4. **Unreachable nodes** -- No path from workflow entry point

## Build-Time Validation

The `builder.build(&registry)?` call is the validation boundary. It checks:

- All connected node IDs exist in the builder
- All node type names exist in the registry
- No unresolvable circular dependencies
- DAG structure is valid

```rust
let registry = Arc::new(NodeRegistry::default());

match builder.build(&registry) {
    Ok(workflow) => {
        // Workflow is valid, safe to execute
        let runtime = Runtime::new(RuntimeConfig::default(), registry);
        let result = runtime.execute(&workflow, ValueMap::new()).await?;
    }
    Err(e) => {
        eprintln!("Workflow validation failed: {}", e);
    }
}
```

## Documentation

- **Workflow Building**: [`CLAUDE.md`](../../../../CLAUDE.md) -- Essential Patterns section
- **WorkflowBuilder**: `crates/kailash-core/src/workflow/builder.rs`

<!-- Trigger Keywords: validate workflow, check connections, workflow validation, connection errors, builder.connect -->
