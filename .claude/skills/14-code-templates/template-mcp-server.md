---
name: template-mcp-server
description: "Generate Kailash MCP server template. Use when requesting 'MCP server template', 'create MCP server', 'MCP server boilerplate', 'Model Context Protocol server', or 'MCP server example'."
---

# MCP Server Template

Production-ready MCP server template using `kailash-nexus` built-in MCP implementation.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `MEDIUM`
> Related Skills: [`CLAUDE.md`](../../../../CLAUDE.md), [`03-nexus`](../../03-nexus/)
> Related Subagents: `mcp-specialist` (enterprise MCP), `nexus-specialist` (deployment)

## Basic MCP Server Template

```rust
//! Basic MCP Server using kailash-nexus.

use kailash_nexus::mcp::{McpServer, McpTool};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut server = McpServer::new("my-tools");

    // Register a tool with input schema and async handler
    server.register_tool(
        McpTool::new("process_data")
            .description("Process data with specified operation")
            .input_schema(serde_json::json!({
                "type": "object",
                "properties": {
                    "data": {
                        "type": "string",
                        "description": "Input data to process"
                    },
                    "operation": {
                        "type": "string",
                        "enum": ["uppercase", "lowercase", "reverse"],
                        "default": "uppercase"
                    }
                },
                "required": ["data"]
            }))
            .handler(|params| async move {
                let data = params["data"].as_str().unwrap_or_default();
                let operation = params["operation"].as_str().unwrap_or("uppercase");

                let result = match operation {
                    "uppercase" => data.to_uppercase(),
                    "lowercase" => data.to_lowercase(),
                    "reverse" => data.chars().rev().collect(),
                    _ => data.to_string(),
                };

                Ok(serde_json::json!({
                    "result": result,
                    "operation": operation,
                    "input_length": data.len()
                }))
            }),
    )?;

    // Register a second tool
    server.register_tool(
        McpTool::new("search_records")
            .description("Search records by query")
            .input_schema(serde_json::json!({
                "type": "object",
                "properties": {
                    "query": { "type": "string" },
                    "limit": { "type": "integer", "default": 10 }
                },
                "required": ["query"]
            }))
            .handler(|params| async move {
                let query = params["query"].as_str().unwrap_or_default();
                let limit = params["limit"].as_i64().unwrap_or(10);

                // Implement your search logic here
                let results = vec![
                    serde_json::json!({"id": 1, "title": format!("Result for: {query}")}),
                    serde_json::json!({"id": 2, "title": format!("Another result for: {query}")}),
                ];

                Ok(serde_json::json!({
                    "results": &results[..std::cmp::min(results.len(), limit as usize)],
                    "count": results.len(),
                    "query": query
                }))
            }),
    )?;

    // Serve over stdio (for Claude Desktop, etc.)
    server.serve_stdio().await?;
    Ok(())
}
```

## SSE Transport Template

For HTTP-based MCP servers (browser clients, remote agents):

```rust
//! MCP Server with SSE transport via kailash-nexus.

use kailash_nexus::mcp::{McpServer, McpTool};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let mut server = McpServer::new("my-sse-tools");

    server.register_tool(
        McpTool::new("analyze")
            .description("Analyze input text")
            .input_schema(serde_json::json!({
                "type": "object",
                "properties": {
                    "text": { "type": "string" }
                },
                "required": ["text"]
            }))
            .handler(|params| async move {
                let text = params["text"].as_str().unwrap_or_default();
                Ok(serde_json::json!({
                    "word_count": text.split_whitespace().count(),
                    "char_count": text.len(),
                    "lines": text.lines().count()
                }))
            }),
    )?;

    // Serve over SSE on a given address
    server.serve_sse("0.0.0.0:3001").await?;
    Ok(())
}
```

## Production MCP Server Template

MCP server integrated with Nexus middleware (auth, rate limiting, metrics):

```rust
//! Production MCP Server with Nexus middleware.

use kailash_nexus::{NexusApp, Preset};
use kailash_nexus::mcp::{McpServer, McpTool};
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt::init();

    // Build Nexus app with enterprise preset (auth, rate limiting, CORS)
    let app = NexusApp::builder()
        .preset(Preset::Enterprise)
        .build()?;

    // Create MCP server
    let mut mcp = McpServer::new("production-tools");

    mcp.register_tool(
        McpTool::new("process_data")
            .description("Process data securely")
            .input_schema(serde_json::json!({
                "type": "object",
                "properties": {
                    "data": { "type": "string" }
                },
                "required": ["data"]
            }))
            .handler(|params| async move {
                let data = params["data"].as_str().unwrap_or_default();
                info!("Processing data: {}...", &data[..data.len().min(50)]);
                Ok(serde_json::json!({
                    "result": data.to_uppercase(),
                    "processed": true
                }))
            }),
    )?;

    // Mount MCP server on the Nexus app
    app.mount_mcp(mcp);

    info!("Starting production MCP server on 0.0.0.0:3000");
    app.serve("0.0.0.0:3000").await?;
    Ok(())
}
```

## MCP Server with Workflow Execution

Expose Kailash workflows as MCP tools:

```rust
//! MCP Server that executes Kailash workflows as tools.

use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use kailash_nexus::mcp::{McpServer, McpTool};
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let registry = Arc::new(NodeRegistry::default());
    let runtime = Arc::new(Runtime::new(RuntimeConfig::default(), registry.clone()));

    let reg = registry.clone();
    let rt = runtime.clone();

    let mut server = McpServer::new("workflow-tools");

    server.register_tool(
        McpTool::new("run_etl")
            .description("Run an ETL pipeline on the given file")
            .input_schema(serde_json::json!({
                "type": "object",
                "properties": {
                    "file_path": { "type": "string" }
                },
                "required": ["file_path"]
            }))
            .handler(move |params| {
                let reg = reg.clone();
                let rt = rt.clone();
                async move {
                    let file_path = params["file_path"]
                        .as_str()
                        .unwrap_or("data.csv");

                    let mut builder = WorkflowBuilder::new();
                    builder.add_node("CSVReaderNode", "read", ValueMap::from([
                        ("file_path".into(), Value::String(file_path.into())),
                    ]));
                    builder.add_node("JSONTransformNode", "transform", ValueMap::from([
                        ("expression".into(), Value::String("@".into())),
                    ]));
                    builder.connect("read", "data", "transform", "data");

                    let workflow = builder.build(&reg)
                        .map_err(|e| anyhow::anyhow!("{e}"))?;
                    let result = rt.execute(&workflow, ValueMap::new()).await
                        .map_err(|e| anyhow::anyhow!("{e}"))?;

                    Ok(serde_json::json!({
                        "run_id": result.run_id,
                        "status": "completed",
                        "nodes_executed": result.results.len()
                    }))
                }
            }),
    )?;

    server.serve_stdio().await?;
    Ok(())
}
```

## Related Patterns

- **MCP protocol**: See `crates/kailash-nexus/` for McpServer, transports (stdio, SSE, HTTP)
- **Nexus deployment**: See `.claude/skills/03-nexus/` for NexusApp, Preset, middleware
- **Tool registration**: Each `McpTool` has name, description, input_schema, handler

## When to Escalate

Use `mcp-specialist` subagent when:

- Enterprise MCP architecture
- Multi-transport configuration (stdio + SSE + HTTP)
- Advanced features (resources, progress reporting, structured content)

Use `nexus-specialist` when:

- Integrating MCP with full Nexus middleware stack
- Production deployment with auth, rate limiting, CORS

## Documentation References

### Primary Sources

- **MCP in Nexus**: [`crates/kailash-nexus/`](../../../../crates/kailash-nexus/) -- McpServer, McpTool, transports
- **Nexus Skills**: [`.claude/skills/03-nexus/`](../../03-nexus/) -- Handler patterns, middleware
- **CLAUDE.md**: [`CLAUDE.md`](../../../../CLAUDE.md) -- MCP channel overview

## Quick Tips

- Start with `serve_stdio()` for local development and Claude Desktop integration
- Use `serve_sse()` for HTTP-based clients and browser agents
- Mount on `NexusApp` for production with middleware (auth, rate limiting)
- Each tool handler is an async closure returning `Result<serde_json::Value, _>`
- Never hardcode API keys in handlers -- use `std::env::var()` with `dotenvy`

<!-- Trigger Keywords: MCP server template, create MCP server, MCP server boilerplate, Model Context Protocol server, MCP server example, MCP template, production MCP server -->
