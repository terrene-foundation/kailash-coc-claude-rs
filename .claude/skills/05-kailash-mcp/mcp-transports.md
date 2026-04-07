---
name: mcp-transports
description: "MCP transport options: STDIO, SSE, HTTP. Use when asking 'MCP transport', 'SSE transport', 'stdio transport', 'HTTP transport', 'serve MCP tools'."
---

# MCP Transports

MCP uses JSON-RPC 2.0 as its wire protocol. The transport layer handles how messages are sent and received. The Kailash Rust SDK provides transport enums and configuration via `kailash-nexus`, with standalone MCP serving through the Nexus multi-channel platform.

## Transport Summary

| Transport | Enum Variant          | Best For                                    |
| --------- | --------------------- | ------------------------------------------- |
| **STDIO** | `McpTransport::Stdio` | Local tools, Claude Desktop, editor plugins |
| **SSE**   | `McpTransport::Sse`   | Browser/web clients, Nexus auto-integration |
| **HTTP**  | `McpTransport::Http`  | Web services, remote servers                |

## Transport Enum

```rust
use kailash_nexus::mcp::server::{McpServer, McpTransport};

let stdio = McpTransport::Stdio;
let sse = McpTransport::Sse;
let http = McpTransport::Http;

println!("{}", stdio.as_str());  // "stdio"
println!("{}", sse.as_str());    // "sse"
println!("{}", http.as_str());   // "http"
```

## Configuring Transports on McpServer

```rust
use kailash_nexus::mcp::server::{McpServer, McpTransport};

// Set transport at construction
let mut server = McpServer::with_transport("my-server", "1.0.0", McpTransport::Sse);
println!("Transport: {:?}", server.transport());  // Sse

// Configure SSE binding
server.set_sse_config("0.0.0.0", 3000);

// Switch transport
server.set_transport(McpTransport::Http);
server.set_http_config("0.0.0.0", 8080);

// Query current config
let config = server.transport_config();
println!("Host: {}, Port: {}", config.host, config.port);
```

## Serving MCP Tools via Nexus

Nexus automatically exposes all registered handlers as MCP tools when `enable_mcp` is true (the default).

### Basic Nexus with MCP

```rust
use kailash_nexus::prelude::*;

let mut nexus = Nexus::new();

nexus.handler("greet", ClosureHandler::new(|inputs: ValueMap| async move {
    let name = inputs.get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("World");
    Ok(Value::from(format!("Hello, {name}!")))
}));

nexus.handler("add", ClosureHandler::new(|inputs: ValueMap| async move {
    let a = inputs.get("a").and_then(|v| v.as_i64()).unwrap_or(0);
    let b = inputs.get("b").and_then(|v| v.as_i64()).unwrap_or(0);
    Ok(Value::from(a + b))
}));

// All handlers are automatically available as:
//   POST /api/greet     (HTTP API)
//   POST /api/add       (HTTP API)
//   MCP tool "greet"    (via /mcp/message)
//   MCP tool "add"      (via /mcp/message)
nexus.start().await?;
```

### Nexus with MCP Configuration

```rust
use kailash_nexus::prelude::*;
use kailash_nexus::config::NexusConfig;

let config = NexusConfig {
    host: "0.0.0.0".into(),
    port: 3000,
    enable_mcp: true,  // default is true
    ..NexusConfig::default()
};

let mut nexus = Nexus::with_config(config);

nexus.handler("process", ClosureHandler::new(|inputs: ValueMap| async move {
    let data = inputs.get("data")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    Ok(Value::from(data))
}));

// MCP routes are automatically included:
//   POST /mcp/message  -- JSON-RPC endpoint
//   GET  /mcp/sse      -- SSE status endpoint
nexus.start().await?;
```

## McpServer Tool Registration

`McpServer` provides direct tool registration for lower-level control.

```rust
use kailash_nexus::mcp::server::{McpServer, McpTransport};

let mut server = McpServer::with_transport("my-app", "1.0.0", McpTransport::Sse);
server.set_sse_config("0.0.0.0", 3000);

server.register_tool(
    "echo",
    Some("Echo input"),
    serde_json::json!({
        "type": "object",
        "properties": {
            "message": {"type": "string"}
        }
    }),
    |args: serde_json::Value| async move {
        Ok(args)
    },
);

// Access server metadata
println!("Transport: {:?}", server.transport());
println!("Config: {:?}", server.transport_config());
println!("Tools: {}", server.tool_count());
```

## Re-Exports from kailash_nexus::mcp

The `kailash_nexus::mcp` module provides key MCP types:

```rust
use kailash_nexus::mcp::server::{
    McpServer,         // MCP server with tool/resource/prompt registration
    McpTransport,      // Transport enum: Stdio, Sse, Http
    TransportConfig,   // Host + port configuration
    McpToolInfo,       // Tool metadata (name, description, schema)
    McpResource,       // Resource metadata (uri, name, description)
    McpPrompt,         // Prompt metadata (name, description, arguments)
    PromptArgument,    // Prompt argument definition
};
use kailash_nexus::mcp::auth::{
    McpAuthConfig,     // Auth configuration (enabled, methods)
    McpAuthMethod,     // ApiKey { valid_keys } or Jwt { secret, issuer, audience }
};
```

## Authentication with Transports

```rust
use kailash_nexus::mcp::server::{McpServer, McpTransport};
use kailash_nexus::mcp::auth::{McpAuthConfig, McpAuthMethod};

let mut server = McpServer::with_transport("secure-app", "1.0.0", McpTransport::Sse);

server.register_tool(
    "protected",
    Some("A protected tool"),
    serde_json::json!({"type": "object"}),
    |_args: serde_json::Value| async move {
        Ok(serde_json::json!({"secret": "data"}))
    },
);

// API key authentication
server.with_auth(McpAuthConfig {
    enabled: true,
    methods: vec![McpAuthMethod::ApiKey {
        valid_keys: vec!["my-secret-key".into()],
    }],
});

// Or JWT authentication
server.with_auth(McpAuthConfig {
    enabled: true,
    methods: vec![McpAuthMethod::Jwt {
        secret: "my-jwt-secret".into(),
        issuer: Some("my-issuer".into()),
        audience: None,
    }],
});
```

## Important Notes

1. **McpServer::new(name, version)**: `name` is required. `version` is required (no default).
2. **Nexus auto-integration**: When `enable_mcp` is `true` (default), all Nexus handlers become MCP tools automatically.
3. **Transport enum**: Use `McpTransport::Stdio`, `McpTransport::Sse`, `McpTransport::Http`.
4. **Auth config**: Use `McpAuthConfig` with `McpAuthMethod::ApiKey` or `McpAuthMethod::Jwt` variants.
5. **PromptArgument**: Available from `kailash_nexus::mcp::server::PromptArgument`.

<!-- Trigger Keywords: MCP transport, SSE transport, stdio transport, HTTP transport, serve MCP, Nexus MCP, transport constants, McpServer -->
