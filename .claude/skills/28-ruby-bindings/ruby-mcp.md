# Ruby MCP — Server, Tools, Resources, Prompts, Transports

Build a Model Context Protocol server from Ruby with block-based tool/resource/prompt registration, choose a transport (stdio / SSE / HTTP), and integrate with Core SDK, Nexus, DataFlow, and Kaizen.

## Usage

`/ruby-mcp` — MCP server reference for Ruby (`Kailash::MCP::Server`, block registration, transport selection, framework integration)

This file is NEW depth — `ruby-framework-bindings.md` does not cover MCP at all.

---

## Overview

The Kailash MCP module is a production-ready Model Context Protocol server built into the Core SDK. The Ruby gem wraps the Rust MCP engine via native extensions and exposes:

- **Full MCP specification** — tools, resources, prompts, sampling
- **Multiple transports** — stdio, SSE, HTTP
- **Block-based registration** — type-safe tool/resource/prompt definitions via Ruby blocks
- **Authentication** — secure MCP server access
- **Progress reporting** — real-time status for long operations
- **Nexus integration** — automatic MCP channel when deployed via Nexus

Install:

```bash
gem install kailash-mcp
```

```ruby
# Gemfile
gem "kailash-mcp"
```

---

## Server + Block-Based Tool Registration

`Kailash::MCP::Server.new(name, version)` creates a server. Register tools with blocks; the block body IS the tool implementation. `server.run` serves over stdio by default.

```ruby
require "kailash/mcp"

server = Kailash::MCP::Server.new("my-server", "1.0")

# Simple tool: block receives params, returns the result
server.tool("greet", description: "Greet someone") do |params|
  "Hello, #{params[:name]}!"
end

# Tool returning structured data
server.tool("search", description: "Search the web") do |params|
  results = perform_search(params[:query])
  { results: results, count: results.length }
end

server.run   # stdio transport (default)
```

### Tools With Explicit Schemas

For complex inputs, declare a JSON schema so the calling agent gets a typed contract:

```ruby
server.tool("calculate", description: "Evaluate a math expression",
  schema: {
    type: "object",
    properties: {
      expression: { type: "string", description: "Math expression to evaluate" }
    },
    required: ["expression"]
  }
) do |params|
  compute(params[:expression]).to_s
end
```

NEVER pass untrusted input to `eval`; route expression evaluation through a safe evaluator. Validate every tool input before use.

---

## Resources

Resources expose data sources to the calling agent under a URI scheme. The block receives the requested URI and returns the resource body.

```ruby
require "kailash/mcp"

server = Kailash::MCP::Server.new("data-server", "1.0")

# Static resource
server.resource("config://settings", name: "Settings") do |_uri|
  '{"theme": "dark", "language": "en"}'
end

# Dynamic resource (computed on each read)
server.resource("data://users", name: "Users") do |_uri|
  db.express.list("User").to_json
end

server.run
```

---

## Prompt Templates

Prompts are reusable message templates. The block receives the supplied arguments and returns an array of role/content message hashes.

```ruby
require "kailash/mcp"

server = Kailash::MCP::Server.new("prompt-server", "1.0")

server.prompt("summarize", description: "Summarize text") do |arguments|
  [{ role: "user", content: "Please summarize: #{arguments[:text]}" }]
end

server.prompt("code_review", description: "Review code") do |arguments|
  [
    { role: "system", content: "You are a senior code reviewer." },
    { role: "user", content: "Review this code:\n#{arguments[:code]}" }
  ]
end

server.run
```

---

## Transport Selection

MCP supports three transports. Pass `transport:` (and `port:` for the network transports) to `server.run`.

```ruby
# stdio (default) -- simplest, local only
server.run

# SSE (Server-Sent Events) -- real-time updates, for web clients
server.run(transport: :sse, port: 8080)

# HTTP (RESTful) -- standard protocol, for HTTP services
server.run(transport: :http, port: 8080)
```

| Transport | Use case         | Pros              | Cons         |
| --------- | ---------------- | ----------------- | ------------ |
| **stdio** | Local tools, CLI | Simple, reliable  | Local only   |
| **SSE**   | Web apps         | Real-time updates | More setup   |
| **HTTP**  | APIs, services   | Standard protocol | No streaming |

---

## Integration Patterns

### With Core SDK (workflow tools)

A tool can build and execute a workflow, returning the result. Use block form for runtime so registry/workflow resources close.

```ruby
require "kailash"
require "kailash/mcp"

server = Kailash::MCP::Server.new("workflow-server", "1.0")

server.tool("process_data", description: "Process data via a workflow") do |params|
  registry = Kailash::Registry.new
  builder  = Kailash::WorkflowBuilder.new
  builder.add_node("TransformNode", "transform", { "input" => params[:data] })
  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |rt|
    result = rt.execute(workflow, {})
    result.results["transform"]["result"]
  end
ensure
  workflow&.close
  registry&.close
end

server.run
```

### With Nexus (MCP channel on by default)

Deployed via Nexus, the MCP channel is created automatically — every handler is also an MCP tool.

```ruby
require "kailash/nexus"

app = Kailash::Nexus::App.new(port: 3000, enable_mcp: true)

app.handler("summarize", description: "Summarize text") do |params|
  { summary: params[:text][0..99] }
end

app.start   # includes the MCP server
```

### With DataFlow (database access)

Expose database reads as resources and writes as tools.

```ruby
require "kailash/mcp"
require "kailash/dataflow"

db = Kailash::DataFlow.new do |config|
  config.database_url = ENV["DATABASE_URL"]
end

server = Kailash::MCP::Server.new("db-server", "1.0")

server.resource("data://users", name: "Users") do |_uri|
  db.express.list("User").to_json
end

server.tool("create_user", description: "Create a user") do |params|
  # Validate every tool input before use (see Critical Rules below) — MCP tool
  # args are untrusted. db.express is parameterized (no SQLi), but shape-check anyway.
  name  = params[:name].to_s.strip
  email = params[:email].to_s.strip
  raise ArgumentError, "name required" if name.empty?
  raise ArgumentError, "invalid email" unless email.match?(/\A[^@\s]+@[^@\s]+\z/)
  db.express.create("User", name: name, email: email)
end

server.run
```

### With Kaizen (agent-backed tools)

A tool can delegate to a Kaizen agent. Read the model name from the environment.

```ruby
require "kailash/mcp"
require "kailash/kaizen"

server = Kailash::MCP::Server.new("agent-server", "1.0")

server.tool("analyze", description: "Analyze text with AI") do |params|
  delegate = Kailash::Kaizen::Delegate.new(model: ENV["LLM_MODEL"])
  delegate.run_sync("Analyze: #{params[:text]}")
end

server.run
```

---

## Critical Rules

- Use stdio transport for local development and CLI integration; SSE/HTTP for networked clients.
- Declare explicit schemas for tools with complex inputs so callers get a typed contract.
- Validate every tool input before use; NEVER `eval` untrusted input.
- Use authentication for production servers; NEVER expose sensitive data without it.
- Use block form for tool/resource registration so resources close properly.
- NEVER mock the MCP protocol in tests — exercise the real transport.
- Implement progress reporting for long-running operations.

---

## Related Skills

- `ruby-framework-bindings.md` — Core SDK + framework class APIs
- `ruby-nexus-rack.md` — Nexus deployment (the MCP channel ships with it)
- `ruby-dataflow.md` — database resources and tools
- `ruby-kaizen.md` — AI agents exposed as MCP tools
