---
name: template-test-e2e
description: "Generate Kailash end-to-end test template (Tier 3). Use when requesting 'e2e test template', 'Tier 3 test', 'end-to-end test', 'complete workflow test', or 'business scenario test'."
---

# End-to-End Test Template (Tier 3)

Complete business scenario test template with full infrastructure stack. NO MOCKING.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`CLAUDE.md`](../../../../CLAUDE.md), [`template-test-integration`](template-test-integration.md), [`template-test-unit`](template-test-unit.md)
> Related Subagents: `testing-specialist`, `tdd-implementer`, `testing-specialist`

## Quick Reference

- **Purpose**: Test complete user workflows end-to-end
- **Speed**: < 10 seconds per test
- **Dependencies**: Full Docker infrastructure, `.env` configured
- **Location**: `tests/e2e/` or crate-level `tests/` with feature gate
- **Mocking**: FORBIDDEN -- complete real scenarios
- **Run**: `cargo test --workspace --features e2e`

## E2E Test Template

```rust
//! End-to-end tests for [Business Scenario].
//!
//! Run: cargo test --workspace --features e2e

#[cfg(feature = "e2e")]
mod e2e_tests {
    use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
    use kailash_core::value::{Value, ValueMap};
    use std::sync::Arc;

    fn setup() -> (Arc<NodeRegistry>, Runtime) {
        dotenvy::dotenv().ok();
        let registry = Arc::new(NodeRegistry::default());
        let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());
        (registry, runtime)
    }

    #[tokio::test]
    async fn test_complete_data_pipeline() {
        let (registry, runtime) = setup();

        let mut builder = WorkflowBuilder::new();

        // Step 1: Data ingestion
        builder.add_node("LogNode", "ingest", ValueMap::from([
            ("message".into(), Value::String("Ingesting data".into())),
        ]));

        // Step 2: Transformation
        builder.add_node("JSONTransformNode", "transform", ValueMap::from([
            ("expression".into(), Value::String("@".into())),
        ]));

        // Step 3: Validation
        builder.add_node("LogNode", "validate", ValueMap::from([
            ("message".into(), Value::String("Validating output".into())),
        ]));

        // Connect complete pipeline
        builder.connect("ingest", "output", "transform", "data");
        builder.connect("transform", "result", "validate", "input");

        // Execute complete workflow
        let workflow = builder.build(&registry)
            .expect("E2E workflow should build");
        let result = runtime.execute(&workflow, ValueMap::new()).await
            .expect("E2E execution should succeed");

        // Verify end-to-end results
        assert!(!result.run_id.is_empty(), "Must have a run ID");
        assert_eq!(result.results.len(), 3, "All 3 nodes must execute");
        assert!(result.results.contains_key("ingest"));
        assert!(result.results.contains_key("transform"));
        assert!(result.results.contains_key("validate"));
    }

    #[tokio::test]
    async fn test_database_to_api_pipeline() {
        let (registry, runtime) = setup();
        let db_url = std::env::var("DATABASE_URL")
            .expect("DATABASE_URL required for e2e tests");

        let mut builder = WorkflowBuilder::new();

        // Step 1: Read from database
        builder.add_node("SQLQueryNode", "db_read", ValueMap::from([
            ("connection_string".into(), Value::String(db_url.into())),
            ("query".into(), Value::String("SELECT id, name FROM users LIMIT 10".into())),
        ]));

        // Step 2: Transform for API response
        builder.add_node("JSONTransformNode", "format", ValueMap::from([
            ("expression".into(), Value::String("@".into())),
        ]));

        // Step 3: Log final output (simulates API response in E2E)
        builder.add_node("LogNode", "output", ValueMap::from([
            ("message".into(), Value::String("Pipeline complete".into())),
        ]));

        builder.connect("db_read", "data", "format", "data");
        builder.connect("format", "result", "output", "input");

        let workflow = builder.build(&registry)
            .expect("E2E workflow should build");
        let result = runtime.execute(&workflow, ValueMap::new()).await
            .expect("E2E execution should succeed");

        assert_eq!(result.results.len(), 3);
    }
}
```

## Nexus HTTP E2E Test Template

```rust
//! End-to-end tests for Nexus HTTP endpoints.

#[cfg(feature = "e2e")]
mod nexus_e2e {
    use kailash_nexus::{NexusApp, Preset};
    use reqwest::Client;
    use tokio::net::TcpListener;

    #[tokio::test]
    async fn test_full_http_request_response() {
        // Build and start server on random port
        let app = NexusApp::builder()
            .preset(Preset::Standard)
            .build()
            .expect("App should build");

        app.register("echo", |axum::Json(body): axum::Json<serde_json::Value>| async move {
            axum::Json(serde_json::json!({
                "echo": body,
                "status": "ok"
            }))
        }).await.expect("Registration should succeed");

        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();

        let server = tokio::spawn(async move {
            app.serve_listener(listener).await.ok();
        });

        // Make real HTTP request
        let client = Client::new();
        let response = client
            .post(format!("http://{addr}/echo"))
            .json(&serde_json::json!({"message": "hello"}))
            .send()
            .await
            .expect("HTTP request should succeed");

        assert_eq!(response.status(), 200);

        let body: serde_json::Value = response.json().await
            .expect("Response should be valid JSON");
        assert_eq!(body["status"], "ok");
        assert_eq!(body["echo"]["message"], "hello");

        server.abort();
    }
}
```

## Multi-Crate E2E Test Template

```rust
//! End-to-end test spanning DataFlow + Nexus + Kaizen.

#[cfg(feature = "e2e")]
mod cross_crate_e2e {
    use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
    use kailash_core::value::{Value, ValueMap};
    use std::sync::Arc;

    #[tokio::test]
    async fn test_dataflow_to_nexus_to_kaizen() {
        dotenvy::dotenv().ok();

        let registry = Arc::new(NodeRegistry::default());
        let runtime = Runtime::new(RuntimeConfig::default(), registry.clone());

        let mut builder = WorkflowBuilder::new();

        // DataFlow: Read from DB
        builder.add_node("SQLQueryNode", "read_data", ValueMap::from([
            ("connection_string".into(), Value::String(
                std::env::var("DATABASE_URL").expect("DATABASE_URL").into(),
            )),
            ("query".into(), Value::String("SELECT * FROM products LIMIT 5".into())),
        ]));

        // Transform: Prepare for LLM
        builder.add_node("JSONTransformNode", "prepare", ValueMap::from([
            ("expression".into(), Value::String("@".into())),
        ]));

        // Kaizen: LLM analysis (requires OPENAI_API_KEY in .env)
        builder.add_node("LLMNode", "analyze", ValueMap::from([
            ("provider".into(), Value::String("openai".into())),
            ("model".into(), Value::String(
                std::env::var("OPENAI_MODEL").unwrap_or_else(|_| "gpt-5".into()).into(),
            )),
            ("prompt".into(), Value::String("Summarize this data".into())),
        ]));

        builder.connect("read_data", "data", "prepare", "data");
        builder.connect("prepare", "result", "analyze", "input");

        let workflow = builder.build(&registry)
            .expect("Cross-crate workflow should build");
        let result = runtime.execute(&workflow, ValueMap::new()).await
            .expect("Cross-crate E2E should succeed");

        assert!(result.results.contains_key("read_data"));
        assert!(result.results.contains_key("prepare"));
        assert!(result.results.contains_key("analyze"));
    }
}
```

## Quick Tips

- Gate all E2E tests with `#[cfg(feature = "e2e")]`
- Load `.env` with `dotenvy::dotenv().ok()` -- never hardcode credentials
- Use `#[tokio::test]` for all async tests
- Keep tests under 10 seconds
- NO MOCKING -- this is absolute for Tier 3
- Test complete user journeys, not individual components
- Use real HTTP clients (`reqwest`) for Nexus endpoint testing
- Model names must come from environment variables (see `rules/env-models.md`)
- Run with: `cargo test --workspace --features e2e`

## Related Patterns

- **Unit tests**: [`template-test-unit`](template-test-unit.md)
- **Integration tests**: [`template-test-integration`](template-test-integration.md)
- **Testing rules**: See `rules/testing.md` for 3-tier strategy and NO MOCKING

## When to Escalate

Use `testing-specialist` when:

- Complex E2E scenario design across multiple crates
- Performance or load testing needed
- CI/CD pipeline integration

Use `testing-specialist` when:

- Generating E2E test suites for new features
- Browser-based E2E tests with Playwright

## Documentation References

### Primary Sources

- **Testing Rules**: [`rules/testing.md`](../../../../rules/testing.md) -- 3-tier strategy, NO MOCKING
- **CLAUDE.md**: [`CLAUDE.md`](../../../../CLAUDE.md) -- `cargo test --workspace --features e2e`
- **E2E Examples**: [`examples/`](../../../../examples/) -- Runnable workflow examples

<!-- Trigger Keywords: e2e test template, Tier 3 test, end-to-end test, complete workflow test, business scenario test, e2e template, full workflow test -->
