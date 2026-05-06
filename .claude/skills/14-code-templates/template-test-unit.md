---
name: template-test-unit
description: "Generate Kailash unit test template (Tier 1). Use when requesting 'unit test template', 'Tier 1 test', 'create unit test', 'test structure', or 'unit test example'."
---

# Unit Test Template (Tier 1)

Fast, isolated unit test template for Kailash Rust SDK components (< 1 second execution).

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `HIGH`
> Related Skills: [`CLAUDE.md`](../../../../CLAUDE.md), [`template-test-integration`](template-test-integration.md), [`template-test-e2e`](template-test-e2e.md)
> Related Subagents: `testing-specialist` (test strategy), `tdd-implementer` (test-first development)

## Quick Reference

- **Purpose**: Fast, isolated component testing
- **Speed**: < 1 second per test
- **Dependencies**: None (mocks allowed for external services in Tier 1 only)
- **Location**: Inline `#[cfg(test)] mod tests` or `tests/` directory
- **Mocking**: Allowed in Tier 1 only
- **Run**: `cargo test --workspace` (or `cargo test -p kailash-core`)

## Basic Unit Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
    use kailash_core::value::{Value, ValueMap};
    use std::sync::Arc;

    fn test_registry() -> Arc<NodeRegistry> {
        Arc::new(NodeRegistry::default())
    }

    #[test]
    fn test_workflow_builds_successfully() {
        let mut builder = WorkflowBuilder::new();
        builder.add_node("LogNode", "log", ValueMap::from([
            ("message".into(), Value::String("test".into())),
        ]));

        let registry = test_registry();
        let result = builder.build(&registry);
        assert!(result.is_ok(), "Workflow should build without errors");
    }

    #[test]
    fn test_workflow_connection_validation() {
        let mut builder = WorkflowBuilder::new();
        builder.add_node("LogNode", "a", ValueMap::new());
        builder.add_node("LogNode", "b", ValueMap::new());
        builder.connect("a", "output", "b", "input");

        let registry = test_registry();
        let workflow = builder.build(&registry).expect("build should succeed");
        assert_eq!(workflow.node_count(), 2);
    }

    #[test]
    fn test_invalid_connection_rejected() {
        let mut builder = WorkflowBuilder::new();
        builder.add_node("LogNode", "a", ValueMap::new());
        // Connect to a node that does not exist
        builder.connect("a", "output", "nonexistent", "input");

        let registry = test_registry();
        let result = builder.build(&registry);
        assert!(result.is_err(), "Should reject connection to missing node");
    }

    #[tokio::test]
    async fn test_workflow_execution() {
        let mut builder = WorkflowBuilder::new();
        builder.add_node("LogNode", "step", ValueMap::from([
            ("message".into(), Value::String("hello".into())),
        ]));

        let registry = test_registry();
        let workflow = builder.build(&registry).expect("build should succeed");

        let runtime = Runtime::new(RuntimeConfig::default(), registry);
        let result = runtime.execute(&workflow, ValueMap::new()).await;

        assert!(result.is_ok(), "Execution should succeed");
        let exec_result = result.unwrap();
        assert!(!exec_result.run_id.is_empty());
        assert!(exec_result.results.contains_key("step"));
    }
}
```

## Custom Node Unit Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use kailash_core::{Node, NodeError, ExecutionContext};
    use kailash_core::value::{Value, ValueMap};

    #[test]
    fn test_node_type_name() {
        let node = CustomProcessingNode;
        assert_eq!(node.type_name(), "CustomProcessingNode");
    }

    #[test]
    fn test_node_declares_required_params() {
        let node = CustomProcessingNode;
        let params = node.input_params();

        let required: Vec<_> = params.iter()
            .filter(|p| p.required)
            .map(|p| p.name.as_str())
            .collect();

        assert!(required.contains(&"input_data"), "input_data must be required");
    }

    #[test]
    fn test_node_declares_outputs() {
        let node = CustomProcessingNode;
        let outputs = node.output_params();
        let names: Vec<_> = outputs.iter().map(|p| p.name.as_str()).collect();
        assert!(names.contains(&"result"));
        assert!(names.contains(&"status"));
    }

    #[tokio::test]
    async fn test_node_executes_with_valid_inputs() {
        let node = CustomProcessingNode;
        let ctx = ExecutionContext::default();

        let inputs = ValueMap::from([
            ("input_data".into(), Value::Object(ValueMap::from([
                ("key".into(), Value::String("value".into())),
            ]))),
            ("operation".into(), Value::String("transform".into())),
        ]);

        let result = node.execute(inputs, &ctx).await;
        assert!(result.is_ok());

        let outputs = result.unwrap();
        assert!(outputs.contains_key("result"));
        assert_eq!(
            outputs.get("status"),
            Some(&Value::String("success".into()))
        );
    }

    #[tokio::test]
    async fn test_node_rejects_missing_required_input() {
        let node = CustomProcessingNode;
        let ctx = ExecutionContext::default();

        // No input_data provided
        let inputs = ValueMap::from([
            ("operation".into(), Value::String("transform".into())),
        ]);

        let result = node.execute(inputs, &ctx).await;
        assert!(result.is_err());

        match result.unwrap_err() {
            NodeError::MissingInput { name } => {
                assert_eq!(name, "input_data");
            }
            other => panic!("Expected MissingInput, got: {other:?}"),
        }
    }

    #[tokio::test]
    async fn test_node_rejects_unknown_operation() {
        let node = CustomProcessingNode;
        let ctx = ExecutionContext::default();

        let inputs = ValueMap::from([
            ("input_data".into(), Value::String("data".into())),
            ("operation".into(), Value::String("invalid_op".into())),
        ]);

        let result = node.execute(inputs, &ctx).await;
        assert!(result.is_err());
    }
}
```

## Value Type Unit Tests

```rust
#[cfg(test)]
mod tests {
    use kailash_core::value::{Value, ValueMap};
    use std::sync::Arc;

    #[test]
    fn test_value_from_primitives() {
        assert_eq!(Value::from(42_i64), Value::Integer(42));
        assert_eq!(Value::from(3.14_f64), Value::Float(3.14));
        assert_eq!(Value::from(true), Value::Bool(true));
        assert_eq!(Value::from("hello"), Value::String(Arc::from("hello")));
    }

    #[test]
    fn test_value_map_construction() {
        let map = ValueMap::from([
            ("key".into(), Value::String("value".into())),
            ("count".into(), Value::Integer(42)),
        ]);

        assert_eq!(map.len(), 2);
        assert_eq!(map.get("key"), Some(&Value::String("value".into())));
        assert_eq!(map.get("count"), Some(&Value::Integer(42)));
    }

    #[test]
    fn test_value_null_handling() {
        let map = ValueMap::from([
            ("present".into(), Value::String("yes".into())),
            ("absent".into(), Value::Null),
        ]);

        assert!(map.get("present").is_some());
        assert_eq!(map.get("absent"), Some(&Value::Null));
        assert_eq!(map.get("missing"), None);
    }
}
```

## Mocking External Services (Allowed in Tier 1 Only)

```rust
#[cfg(test)]
mod tests {
    use super::*;

    /// Mock trait for external API client (Tier 1 only -- real services in Tier 2/3).
    trait ApiClient: Send + Sync {
        fn fetch(&self, url: &str) -> Result<String, Box<dyn std::error::Error>>;
    }

    struct MockApiClient {
        response: String,
    }

    impl ApiClient for MockApiClient {
        fn fetch(&self, _url: &str) -> Result<String, Box<dyn std::error::Error>> {
            Ok(self.response.clone())
        }
    }

    #[test]
    fn test_with_mock_api() {
        let client = MockApiClient {
            response: r#"{"status":"ok","value":42}"#.to_string(),
        };

        let result = client.fetch("https://api.example.com/data");
        assert!(result.is_ok());
        assert!(result.unwrap().contains("42"));
    }
}
```

## Quick Tips

- Unit tests must complete in < 1 second
- No external dependencies (database, APIs, filesystem I/O)
- Mocking is allowed in Tier 1 only -- use trait objects or test doubles
- Use `#[tokio::test]` for async tests, `#[test]` for sync
- Use `assert!`, `assert_eq!`, `assert_ne!` -- `.unwrap()` and `.expect()` are fine in tests
- Place tests in `#[cfg(test)] mod tests` within the source file for private API testing
- Place tests in `tests/` directory for public API / integration-style testing

## Related Patterns

- **Integration tests**: [`template-test-integration`](template-test-integration.md)
- **E2E tests**: [`template-test-e2e`](template-test-e2e.md)
- **Testing rules**: See `rules/testing.md` for 3-tier strategy

## When to Escalate to Subagent

Use `testing-specialist` subagent when:

- Designing comprehensive test strategy across crates
- Custom test infrastructure needed
- CI/CD integration planning

Use `tdd-implementer` when:

- Implementing test-first development
- Need complete test coverage plan

## Documentation References

### Primary Sources

- **Testing Rules**: [`rules/testing.md`](../../../../rules/testing.md) -- 3-tier strategy, NO MOCKING in Tiers 2/3
- **CLAUDE.md**: [`CLAUDE.md`](../../../../CLAUDE.md) -- Test commands (`cargo test --workspace`)
- **Core Crate Tests**: [`crates/kailash-core/tests/`](../../../../crates/kailash-core/tests/) -- Reference test implementations

<!-- Trigger Keywords: unit test template, Tier 1 test, create unit test, test structure, unit test example, unit test boilerplate, cargo test, fast test template -->
