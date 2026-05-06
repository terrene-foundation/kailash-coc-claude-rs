---
name: code-templates
description: "Kailash Rust scaffolding — workflows, cyclic, custom nodes, MCP servers, 3-tier test boilerplate."
---

# Kailash Code Templates

Production-ready Rust code templates and boilerplate for common Kailash SDK development tasks.

## Reference Documentation

### Workflow Templates

- **[template-workflow-basic](template-workflow-basic.md)** -- WorkflowBuilder setup, node config, connections, sync/async execution, result access
- **[template-cyclic-workflow](template-cyclic-workflow.md)** -- ConditionalNode, LoopNode, SwitchNode, RetryNode, back-edge connections, iteration limits

### Custom Development Templates

- **[template-custom-node](template-custom-node.md)** -- Node trait, `input_params()`/`output_params()`, `Pin<Box<dyn Future>>`, NodeFactory, `#[kailash_node]` proc-macro
- **[template-mcp-server](template-mcp-server.md)** -- McpServer, McpTool registration, async handlers, stdio/SSE transports, Nexus integration

### Test Templates

- **[template-test-unit](template-test-unit.md)** -- `#[test]`/`#[tokio::test]`, WorkflowBuilder helpers, custom node testing (Tier 1, mocking allowed, < 1s)
- **[template-test-integration](template-test-integration.md)** -- `#[cfg(feature = "integration")]`, real DB via dotenvy, DataFlow CRUD, Nexus HTTP (Tier 2, NO MOCKING)
- **[template-test-e2e](template-test-e2e.md)** -- `#[cfg(feature = "e2e")]`, multi-node pipelines, cross-crate E2E, full stack (Tier 3, NO MOCKING)

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

## Quick Start Process

1. **Select template** from the table above
2. **Copy code** from the template sub-file as starting point
3. **Customize** -- replace placeholder nodes and config with your logic
4. **Build**: `cargo build` to verify compilation
5. **Test**: `cargo test` to verify correctness

## Best Practices

- Keep the core structure: builder -> build -> runtime -> execute
- Use `?` operator for error propagation in production code
- `.unwrap()` and `.expect()` are acceptable only in tests
- Never hardcode API keys -- use `dotenvy` + `std::env::var()`
- Always validate inputs before processing

All templates follow the **WorkflowBuilder + NodeRegistry + Runtime** pattern from `CLAUDE.md`.

## Related Skills

- **[01-core](../../01-core/)** -- Core SDK patterns (WorkflowBuilder, Runtime, Node)
- **[02-dataflow](../../02-dataflow/)** -- DataFlow model generation, queries
- **[03-nexus](../../03-nexus/)** -- Nexus handlers, middleware, presets
- **[04-kaizen](../../04-kaizen/)** -- AI agents, TAOD loop

## Support

- `tdd-implementer` -- Test-first development
- `testing-specialist` -- Test strategy and infrastructure
