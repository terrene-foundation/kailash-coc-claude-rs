---
name: template-workflow-basic
description: "Generate basic Kailash workflow template boilerplate code. Use when requesting 'workflow template', 'workflow boilerplate', 'scaffold workflow', 'starter code', or 'create new workflow from scratch'."
---

# Basic Workflow Template

Ready-to-use Kailash Rust SDK workflow template with all essential imports, structure, and execution pattern.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `CRITICAL`
> Related Skills: [`CLAUDE.md`](../../../../CLAUDE.md), [`01-core`](../../01-core/), [`02-dataflow`](../../02-dataflow/)
> Related Subagents: `rust-architect` (complex workflows), `tdd-implementer` (test-first development)

## Quick Start Template

Copy-paste this template to start any Kailash workflow:

```rust
//! Basic Kailash Workflow Template
//! Replace placeholders with your specific nodes and logic.

use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    // 1. Create workflow builder
    let mut builder = WorkflowBuilder::new();

    // 2. Add nodes (replace with your nodes)
    builder.add_node("LogNode", "step1", ValueMap::from([
        ("message".into(), Value::String("Hello from step1".into())),
    ]));

    builder.add_node("JSONTransformNode", "step2", ValueMap::from([
        ("expression".into(), Value::String("@.message".into())),
    ]));

    // 3. Connect nodes (define data flow)
    builder.connect("step1", "output", "step2", "data");

    // 4. Build workflow (validation boundary -- returns Result)
    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    // 5. Execute (sync wrapper for CLI/scripts)
    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::new())?;

    // 6. Access results
    println!("Run ID: {}", result.run_id);
    for (node_id, outputs) in &result.results {
        println!("{node_id}: {outputs:?}");
    }

    Ok(())
}
```

## Template Variations

### CLI/Script Template (Sync)

```rust
//! CLI Workflow Template for synchronous execution.

use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn create_workflow(registry: &Arc<NodeRegistry>) -> anyhow::Result<kailash_core::Workflow> {
    let mut builder = WorkflowBuilder::new();

    // Add your nodes here
    builder.add_node("LogNode", "process", ValueMap::from([
        ("message".into(), Value::String("Processing...".into())),
    ]));

    Ok(builder.build(registry)?)
}

fn main() -> anyhow::Result<()> {
    let registry = Arc::new(NodeRegistry::default());
    let workflow = create_workflow(&registry)?;
    let runtime = Runtime::new(RuntimeConfig::default(), registry);

    match runtime.execute_sync(&workflow, ValueMap::new()) {
        Ok(result) => {
            println!("Success (Run ID: {})", result.run_id);
            for (node_id, outputs) in &result.results {
                println!("  {node_id}: {outputs:?}");
            }
            Ok(())
        }
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}
```

### Async Web Service Template (axum/Nexus)

```rust
//! Async Web Service Template using kailash-nexus (axum + tower).

use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use kailash_nexus::{NexusApp, Preset};
use axum::Json;
use std::sync::Arc;

fn create_workflow(registry: &Arc<NodeRegistry>) -> anyhow::Result<kailash_core::Workflow> {
    let mut builder = WorkflowBuilder::new();

    builder.add_node("LogNode", "process", ValueMap::from([
        ("message".into(), Value::String("Processing request".into())),
    ]));

    Ok(builder.build(registry)?)
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let registry = Arc::new(NodeRegistry::default());
    let runtime = Arc::new(Runtime::new(RuntimeConfig::default(), registry.clone()));

    let app = NexusApp::builder()
        .preset(Preset::Standard)
        .build()?;

    app.register("process", |Json(input): Json<serde_json::Value>| async move {
        // Handler logic -- build and execute workflow
        Json(serde_json::json!({"status": "ok"}))
    }).await?;

    app.serve("0.0.0.0:3000").await?;
    Ok(())
}
```

### Data Processing Template (ETL)

```rust
//! Data Processing (ETL) Workflow Template.

use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn create_etl_workflow(
    input_file: &str,
    registry: &Arc<NodeRegistry>,
) -> anyhow::Result<kailash_core::Workflow> {
    let mut builder = WorkflowBuilder::new();

    // Extract
    builder.add_node("CSVReaderNode", "extract", ValueMap::from([
        ("file_path".into(), Value::String(input_file.into())),
        ("has_header".into(), Value::Bool(true)),
    ]));

    // Transform
    builder.add_node("JSONTransformNode", "transform", ValueMap::from([
        ("expression".into(), Value::String("@[?(@.value > 10)]".into())),
    ]));

    // Load (write results)
    builder.add_node("LogNode", "load", ValueMap::from([
        ("message".into(), Value::String("ETL complete".into())),
    ]));

    // Connect pipeline
    builder.connect("extract", "data", "transform", "data");
    builder.connect("transform", "result", "load", "input");

    Ok(builder.build(registry)?)
}

fn main() -> anyhow::Result<()> {
    let registry = Arc::new(NodeRegistry::default());
    let workflow = create_etl_workflow("input.csv", &registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::new())?;

    println!("ETL pipeline completed: run_id={}", result.run_id);
    Ok(())
}
```

## Template Customization Guide

### Step 1: Choose Your Nodes

Replace placeholders with actual node types based on your needs:

| Need               | Node Type           | Example Config                                    |
| ------------------ | ------------------- | ------------------------------------------------- |
| **Read CSV**       | `CSVReaderNode`     | `("file_path", Value::String("data.csv".into()))` |
| **HTTP Call**      | `HTTPRequestNode`   | `("url", Value::String("https://...".into()))`    |
| **Database Query** | `SQLQueryNode`      | `("query", Value::String("SELECT ...".into()))`   |
| **LLM Processing** | `LLMNode`           | `("provider", Value::String("openai".into()))`    |
| **JSON Transform** | `JSONTransformNode` | `("expression", Value::String("@.field".into()))` |
| **Logging**        | `LogNode`           | `("message", Value::String("...".into()))`        |
| **Conditional**    | `ConditionalNode`   | `("condition", Value::String("x > 0".into()))`    |

### Step 2: Define Data Flow

Connect your nodes using the 4-parameter pattern:

```rust
builder.connect(
    "source_node_id",   // from_node
    "output_field",     // from_output
    "target_node_id",   // to_node
    "input_field",      // to_input
);
```

### Step 3: Error Handling

Use Rust's `Result` and `?` operator for clean error propagation:

```rust
let workflow = builder.build(&registry)?;
let result = runtime.execute_sync(&workflow, inputs)?;

// Or match for custom error handling:
match runtime.execute_sync(&workflow, inputs) {
    Ok(result) => println!("Success: {}", result.run_id),
    Err(e) => eprintln!("Workflow failed: {e}"),
}
```

## Related Patterns

- **Node reference**: See `CLAUDE.md` node table for all 139+ node types
- **Connection patterns**: See `crates/kailash-core/` for WorkflowBuilder API
- **Runtime selection**: `execute()` for async, `execute_sync()` for CLI/scripts
- **Examples**: See `examples/` directory for runnable samples

## When to Escalate to Subagent

Use `rust-architect` subagent when:

- Need cross-crate workflow design
- Complex trait hierarchy or ownership patterns
- Performance optimization required

Use `tdd-implementer` subagent when:

- Implementing test-first development
- Need complete test coverage strategy
- Building production-grade workflows

## Documentation References

### Primary Sources

- **Essential Patterns**: [`CLAUDE.md`](../../../../CLAUDE.md) -- WorkflowBuilder, Runtime, Node trait
- **Core Crate**: [`crates/kailash-core/`](../../../../crates/kailash-core/) -- Source of truth for API
- **Examples**: [`examples/`](../../../../examples/) -- Runnable workflow examples

### Related Documentation

- **Skills**: [`.claude/skills/01-core/`](../../01-core/) -- Core SDK patterns
- **DataFlow**: [`.claude/skills/02-dataflow/`](../../02-dataflow/) -- Database workflows
- **Nexus**: [`.claude/skills/03-nexus/`](../../03-nexus/) -- Web service workflows

## Quick Tips

- Start simple: Use LogNode for prototyping before specialized nodes
- Extract workflow creation into a separate function for reusability
- Always call `builder.build(&registry)?` -- this is the validation boundary
- Use `execute_sync()` for CLI/scripts, `execute()` for async contexts
- Never hardcode API keys -- use `dotenvy::dotenv().ok()` and `std::env::var()`

<!-- Trigger Keywords: workflow template, workflow boilerplate, scaffold workflow, starter code, create new workflow from scratch, workflow skeleton, basic workflow template, empty workflow, workflow starter, generate workflow code -->
