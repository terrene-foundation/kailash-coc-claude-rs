---
name: code-templates
description: "Production-ready Rust code templates for the Kailash SDK including basic workflows, cyclic workflows, custom nodes, MCP servers, and all three test tiers (unit, integration, end-to-end). Use when asking about 'template', 'example code', 'starter code', 'boilerplate', 'scaffold', 'workflow template', 'custom node template', 'MCP server template', 'test template', 'unit test template', 'integration test template', or 'E2E test template'."
---

# Kailash Code Templates

Production-ready Rust code templates and boilerplate for common Kailash SDK development tasks.

## Overview

Complete templates for:

- Basic workflows (sync and async)
- Cyclic/iterative workflows
- Custom node development
- MCP server creation
- Unit tests (Tier 1)
- Integration tests (Tier 2)
- End-to-end tests (Tier 3)

## Reference Documentation

### Workflow Templates

#### Basic Workflow

- **[template-workflow-basic](template-workflow-basic.md)** -- Standard workflow template
  - WorkflowBuilder setup with `NodeRegistry`
  - Node addition with `ValueMap` config
  - Connection pattern (`builder.connect()`)
  - Sync execution (`execute_sync()`) and async execution (`execute()`)
  - Result access via `ExecutionResult`
  - Error handling with `Result` and `?`

#### Cyclic Workflow

- **[template-cyclic-workflow](template-cyclic-workflow.md)** -- Cyclic workflow template
  - `ConditionalNode` and `LoopNode` patterns
  - Back-edge connections for cycles
  - `SwitchNode` for multi-branch iteration
  - `RetryNode` for fault-tolerant cycling
  - Iteration limits and convergence

### Custom Development Templates

#### Custom Node

- **[template-custom-node](template-custom-node.md)** -- Custom node template
  - `Node` trait implementation
  - `input_params()` / `output_params()` with `ParamDef`
  - `execute()` with `Pin<Box<dyn Future>>`
  - Input validation patterns
  - `NodeFactory` + `NodeMetadata` registration
  - `#[kailash_node]` proc-macro alternative

#### MCP Server

- **[template-mcp-server](template-mcp-server.md)** -- MCP server template
  - `McpServer` initialization
  - `McpTool` registration with input schema
  - Async handler pattern
  - stdio and SSE transports
  - Nexus integration for production deployment

### Test Templates

#### Unit Tests (Tier 1)

- **[template-test-unit](template-test-unit.md)** -- Unit test template
  - `#[test]` and `#[tokio::test]` patterns
  - `WorkflowBuilder` test helpers
  - Custom node testing (params, execution, errors)
  - `Value` type tests
  - Mocking allowed (Tier 1 only)
  - < 1 second execution

#### Integration Tests (Tier 2)

- **[template-test-integration](template-test-integration.md)** -- Integration test template
  - `#[cfg(feature = "integration")]` gating
  - Real database tests with `dotenvy` + `DATABASE_URL`
  - DataFlow CRUD integration tests
  - Nexus HTTP handler tests
  - NO MOCKING policy (absolute)
  - Docker setup instructions

#### End-to-End Tests (Tier 3)

- **[template-test-e2e](template-test-e2e.md)** -- E2E test template
  - `#[cfg(feature = "e2e")]` gating
  - Complete multi-node pipeline tests
  - Nexus HTTP E2E with `reqwest`
  - Cross-crate E2E (DataFlow + Nexus + Kaizen)
  - Full infrastructure stack
  - NO MOCKING policy (absolute)

## Template Usage

### Quick Start Process

1. **Select Template**: Choose relevant template for your task
2. **Copy Code**: Copy the `rust` code block as a starting point
3. **Customize**: Replace placeholder nodes and config with your logic
4. **Build**: `cargo build` to verify compilation
5. **Test**: `cargo test` to verify correctness

### Template Categories

**Workflow Development**:

- `template-workflow-basic` -- Standard sync/async workflows
- `template-cyclic-workflow` -- Iterative/looping workflows

**Custom Development**:

- `template-custom-node` -- New `Node` trait implementations
- `template-mcp-server` -- MCP tool servers

**Testing**:

- `template-test-unit` -- Fast unit tests (< 1s)
- `template-test-integration` -- Real infrastructure tests (< 5s)
- `template-test-e2e` -- Complete system tests (< 10s)

## Template Examples

All templates follow the **WorkflowBuilder + NodeRegistry + Runtime** pattern from `CLAUDE.md`.

### Basic Workflow

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

fn main() -> anyhow::Result<()> {
    let mut builder = WorkflowBuilder::new();

    builder.add_node("LogNode", "step1", ValueMap::from([
        ("message".into(), Value::String("Hello".into())),
    ]));
    builder.add_node("JSONTransformNode", "step2", ValueMap::from([
        ("expression".into(), Value::String("@".into())),
    ]));
    builder.connect("step1", "output", "step2", "data");

    let registry = Arc::new(NodeRegistry::default());
    let workflow = builder.build(&registry)?;

    let runtime = Runtime::new(RuntimeConfig::default(), registry);
    let result = runtime.execute_sync(&workflow, ValueMap::new())?;

    println!("Run ID: {}", result.run_id);
    Ok(())
}
```

### Custom Node

```rust
use kailash_core::{Node, NodeError, ExecutionContext};
use kailash_core::node::{ParamDef, ParamType};
use kailash_core::value::{Value, ValueMap};
use std::pin::Pin;
use std::future::Future;

pub struct MyNode {
    input_params: Vec<ParamDef>,
    output_params: Vec<ParamDef>,
}

impl MyNode {
    pub fn new() -> Self {
        Self {
            input_params: vec![ParamDef::new("data", ParamType::Any, true)],
            output_params: vec![ParamDef::new("result", ParamType::Any, false)],
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
            let data = inputs.get("data")
                .ok_or_else(|| NodeError::MissingInput { name: "data".to_string() })?;
            Ok(ValueMap::from([("result".into(), data.clone())]))
        })
    }
}
```

### Unit Test

```rust
#[cfg(test)]
mod tests {
    use kailash_core::{WorkflowBuilder, NodeRegistry};
    use kailash_core::value::{Value, ValueMap};
    use std::sync::Arc;

    #[test]
    fn test_workflow_builds() {
        let mut builder = WorkflowBuilder::new();
        builder.add_node("LogNode", "log", ValueMap::new());
        let registry = Arc::new(NodeRegistry::default());
        assert!(builder.build(&registry).is_ok());
    }
}
```

## Best Practices

### Using Templates

- Start with template, then customize
- Keep core structure (builder -> build -> runtime -> execute)
- Use `?` operator for error propagation in production code
- `.unwrap()` and `.expect()` are acceptable only in tests
- Never hardcode API keys -- use `dotenvy` + `std::env::var()`
- Never skip error handling in production templates
- Always validate inputs before processing

### Testing Templates

- Tier 1 (Unit): `cargo test` -- fast, isolated, mocking allowed
- Tier 2 (Integration): `cargo test --features integration` -- real services, NO MOCKING
- Tier 3 (E2E): `cargo test --features e2e` -- full stack, NO MOCKING

## Template Selection Guide

| Task                 | Template                    | Run Command                         |
| -------------------- | --------------------------- | ----------------------------------- |
| **New workflow**     | `template-workflow-basic`   | `cargo run`                         |
| **Iterative logic**  | `template-cyclic-workflow`  | `cargo run`                         |
| **Custom node**      | `template-custom-node`      | `cargo build`                       |
| **MCP integration**  | `template-mcp-server`       | `cargo run`                         |
| **Fast tests**       | `template-test-unit`        | `cargo test`                        |
| **Real infra tests** | `template-test-integration` | `cargo test --features integration` |
| **Full system**      | `template-test-e2e`         | `cargo test --features e2e`         |

## Related Skills

- **[01-core](../../01-core/)** -- Core SDK patterns (WorkflowBuilder, Runtime, Node)
- **[02-dataflow](../../02-dataflow/)** -- DataFlow model generation, queries
- **[03-nexus](../../03-nexus/)** -- Nexus handlers, middleware, presets
- **[04-kaizen](../../04-kaizen/)** -- AI agents, TAOD loop
- **[05-enterprise](../../05-enterprise/)** -- RBAC, ABAC, audit

## Support

For template help, invoke:

- `rust-architect` -- Architecture and trait design
- `node-implementer` -- Custom node implementation
- `tdd-implementer` -- Test-first development
- `testing-specialist` -- Test strategy and infrastructure
