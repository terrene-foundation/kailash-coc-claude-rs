# MCP Development

You are an expert in Model Context Protocol (MCP) server development with Kailash SDK. Guide users through creating MCP servers, tools, resources, and prompts.

## Core Responsibilities

### 1. MCP Server Development

- Creating MCP servers with kailash-nexus MCP support
- Implementing tools, resources, and prompts
- Transport configuration (stdio, HTTP, WebSocket)
- Integration with LLM workflows

### 2. Basic MCP Server

```rust
use kailash_nexus::mcp::{McpServer, McpTool, McpResource};
use serde_json::json;

#[tokio::main]
async fn main() {
    // Create MCP server
    let mut server = McpServer::new(
        "my-mcp-server",
        "1.0.0",
        "My custom MCP server",
    );

    // Register tool
    server.register_tool(McpTool::new(
        "calculate_sum",
        "Calculate the sum of two numbers",
        |params| {
            Box::pin(async move {
                let a = params["a"].as_f64().unwrap_or(0.0);
                let b = params["b"].as_f64().unwrap_or(0.0);
                Ok(json!({
                    "result": a + b,
                    "operation": "addition"
                }))
            })
        },
    ));

    // Register resource
    server.register_resource(McpResource::new(
        "config://settings",
        "Server Settings",
        "Server configuration",
        || {
            Box::pin(async {
                Ok(json!({
                    "version": "1.0.0",
                    "environment": "production"
                }))
            })
        },
    ));

    // Run server
    server.run_stdio().await.unwrap();
}
```

### 3. Advanced MCP Tools

```rust
use kailash_nexus::mcp::{McpServer, McpTool};
use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Deserialize)]
struct SearchParams {
    query: String,
    #[serde(default = "default_limit")]
    limit: usize,
    #[serde(default = "default_category")]
    category: String,
}

fn default_limit() -> usize { 10 }
fn default_category() -> String { "all".into() }

let tool = McpTool::new(
    "search_database",
    "Search database with filters",
    |params| {
        Box::pin(async move {
            let search: SearchParams = serde_json::from_value(params)?;

            // Real database search
            let results = perform_search(
                &search.query,
                search.limit,
                &search.category,
            ).await?;

            Ok(json!({
                "results": results,
                "count": results.len(),
                "query": search.query
            }))
        })
    },
);

async fn perform_search(
    query: &str,
    limit: usize,
    category: &str,
) -> Result<Vec<serde_json::Value>, anyhow::Error> {
    // Implementation
    Ok(vec![])
}
```

### 4. MCP with Workflows

```rust
use kailash_core::workflow::WorkflowBuilder;
use kailash_core::runtime::Runtime;
use kailash_core::node::NodeRegistry;
use kailash_nexus::mcp::{McpServer, McpTool};
use serde_json::json;

let tool = McpTool::new(
    "process_data",
    "Process data through workflow",
    |params| {
        Box::pin(async move {
            // Create workflow
            let registry = NodeRegistry::default();
            let mut builder = WorkflowBuilder::new();

            builder.add_node("ProcessorNode", "processor", json!({
                "operation": "transform"
            }));

            // Execute workflow
            let workflow = builder.build(&registry)?;
            let runtime = Runtime::new(registry);
            let mut inputs = kailash_value::ValueMap::new();
            inputs.insert("processor.input_data".into(), params.into());

            let results = runtime.execute(&workflow, inputs).await?;
            Ok(results["processor"]["result"].clone())
        })
    },
);
```

### 5. Resource Management

```rust
use kailash_nexus::mcp::McpResource;
use serde_json::json;

// Static resource
let users_resource = McpResource::new(
    "database://users",
    "User Database",
    "Access user data",
    || {
        Box::pin(async {
            let users = fetch_users_from_db().await?;
            Ok(json!({
                "users": users,
                "count": users.len()
            }))
        })
    },
).with_mime_type("application/json");

// Parameterized resource
let logs_resource = McpResource::new_with_params(
    "file://logs/{date}",
    "Log Files",
    "Access log files by date",
    |params| {
        Box::pin(async move {
            let date = params["date"].as_str().unwrap_or("today");
            let logs = read_log_file(date).await?;
            Ok(json!({
                "date": date,
                "logs": logs,
                "lines": logs.len()
            }))
        })
    },
);
```

### 6. MCP Prompts

```rust
use kailash_nexus::mcp::McpPrompt;
use serde_json::json;

let prompt = McpPrompt::new(
    "data_analysis",
    "Prompt for data analysis tasks",
    |params| {
        let dataset = params["dataset"].as_str().unwrap_or("default");
        let question = params["question"].as_str().unwrap_or("");
        json!({
            "messages": [
                {
                    "role": "system",
                    "content": "You are a data analysis expert."
                },
                {
                    "role": "user",
                    "content": format!("Analyze the {} dataset and answer: {}", dataset, question)
                }
            ]
        })
    },
);
```

### 7. Transport Configuration

**stdio (Standard Input/Output)**:

```rust
// Best for: Claude Desktop, CLI tools
server.run_stdio().await?;
```

**HTTP**:

```rust
// Best for: Web integrations, REST APIs
server.run_http("0.0.0.0", 8000).await?;
```

**WebSocket**:

```rust
// Best for: Real-time communication
server.run_websocket("0.0.0.0", 8001).await?;
```

### 8. Using MCP Server in LLM Workflows

```rust
use kailash_core::workflow::WorkflowBuilder;
use kailash_core::runtime::Runtime;
use kailash_core::node::NodeRegistry;
use serde_json::json;

let registry = NodeRegistry::default();
let mut builder = WorkflowBuilder::new();

builder.add_node("IterativeLLMAgentNode", "agent", json!({
    "provider": std::env::var("LLM_PROVIDER").unwrap_or_else(|_| "openai".into()),
    "model": std::env::var("LLM_MODEL").unwrap_or_else(|_| "gpt-4".into()),
    "messages": [{"role": "user", "content": "Search for Rust tutorials"}],
    "mcp_servers": [
        {
            "name": "my-mcp-server",
            "transport": "stdio",
            "command": "./target/release/mcp-server"
        }
    ],
    "auto_discover_tools": true,
    "max_iterations": 5
}));

let workflow = builder.build(&registry)?;
let runtime = Runtime::new(registry);
let results = runtime.execute(&workflow, Default::default()).await?;
```

### 9. Error Handling in MCP Tools

```rust
use kailash_nexus::mcp::McpTool;
use serde_json::json;

let tool = McpTool::new(
    "safe_operation",
    "Operation with error handling",
    |params| {
        Box::pin(async move {
            // Validate input
            if params.is_null() || params.as_object().map_or(true, |o| o.is_empty()) {
                return Ok(json!({
                    "success": false,
                    "error": "No data provided"
                }));
            }

            match process(&params).await {
                Ok(result) => Ok(json!({
                    "success": true,
                    "result": result
                })),
                Err(e) => Ok(json!({
                    "success": false,
                    "error": "internal_error",
                    "message": e.to_string()
                })),
            }
        })
    },
);
```

### 10. MCP Server Testing

```rust
use kailash_nexus::mcp::McpServer;
use serde_json::json;

#[test]
fn test_mcp_tool() {
    // Test MCP tool execution.
    let mut server = McpServer::new("test-server", "1.0.0", "Test server");

    server.register_tool(McpTool::new(
        "test_tool",
        "Test tool",
        |params| {
            Box::pin(async move {
                let value = params["value"].as_i64().unwrap_or(0);
                Ok(json!({ "result": value * 2 }))
            })
        },
    ));

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(server.call_tool("test_tool", json!({"value": 5}))).unwrap();
    assert_eq!(result["result"], 10);
}

#[test]
fn test_mcp_resource() {
    // Test MCP resource.
    let mut server = McpServer::new("test-server", "1.0.0", "Test server");

    server.register_resource(McpResource::new(
        "test://resource",
        "Test",
        "Test resource",
        || {
            Box::pin(async { Ok(json!({ "data": "test" })) })
        },
    ));

    let rt = tokio::runtime::Runtime::new().unwrap();
    let result = rt.block_on(server.read_resource("test://resource")).unwrap();
    assert_eq!(result["data"], "test");
}
```

## When to Engage

- User asks about "MCP development", "build MCP server", "MCP guide"
- User needs to create MCP tools
- User wants to integrate MCP with workflows
- User has MCP server questions

## Integration with Other Skills

- Route to **mcp-specialist** for advanced MCP patterns
- Route to **mcp-advanced-features** for structured tools, progress
- Route to **mcp-transport-layers** for transport configuration
- Route to **mcp-tool-execution** for tool execution patterns
