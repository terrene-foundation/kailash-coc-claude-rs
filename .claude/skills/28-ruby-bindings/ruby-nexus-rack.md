# Ruby Nexus — Rack/Sinatra Mount + Deployment

Deploy Kailash Nexus from Ruby: mount as Rack middleware, run under Puma with multiple workers, register handlers via the App DSL, and scale behind a load balancer.

## Usage

`/ruby-nexus-rack` — Deployment reference for Nexus on Ruby (Rack, Sinatra, Puma, handler DSL, CORS/rate-limit, scale-out)

This file carries the DEPLOYMENT depth. The class-API reference (`NexusConfig`, `JwtConfig`, `McpServer`, `Preset`, `RbacConfig`) lives in `ruby-framework-bindings.md` §Nexus.

---

## Overview

Nexus is a zero-config multi-channel platform built on the Kailash Core SDK. One deployment exposes a workflow (or a handler) as **API + CLI + MCP** simultaneously. The Ruby gem wraps the Rust Nexus engine via native extensions and adds Rack middleware integration so Nexus can sit alongside an existing Rails or Sinatra application.

Install:

```bash
gem install kailash-nexus
```

```ruby
# Gemfile
gem "kailash-nexus"
```

---

## Quick Start — Workflow Deployment

```ruby
require "kailash/nexus"

# Build (or load) a workflow, then deploy to all channels at once
workflow = build_my_workflow

nexus = Kailash::Nexus.new(workflow)
nexus.run(port: 8000)

# Now available via:
#   HTTP API: POST http://localhost:8000/api/workflow/{workflow_id}
#   CLI:      nexus run {workflow_id} --input '{"key": "value"}'
#   MCP:      connect via any MCP client
```

---

## Handler DSL — `Kailash::Nexus::App`

`Kailash::Nexus::App.new` provides a block-based handler DSL. Each registered handler is deployed to all three channels at once — no per-channel route wiring.

```ruby
require "kailash/nexus"

app = Kailash::Nexus::App.new(port: 3000)

# Register a handler -- reachable from API, CLI, and MCP
app.handler("greet", description: "Greet a user") do |params|
  { message: "Hello, #{params[:name]}!" }
end

app.start

# HTTP: POST http://localhost:3000/api/greet  body {"name": "World"}
# CLI:  nexus run greet --name "World"
# MCP:  exposed as the MCP tool "greet"
```

Host and port are set at construction; `start` blocks and serves. Use a preset to pick a feature profile:

```ruby
app = Kailash::Nexus::App.new(
  host: "0.0.0.0",
  port: 3000,
  preset: :enterprise   # :none | :lightweight | :standard | :saas | :enterprise
)
```

### CORS + Rate Limiting

```ruby
app = Kailash::Nexus::App.new(host: "0.0.0.0", port: 3000, preset: :enterprise)

app.cors(origins: ["https://app.example.com"])
app.rate_limit(max_requests: 100, window_secs: 60)

app.handler("status", description: "Platform status") do |_params|
  app.health_check
end

app.start
```

---

## Rack Mount — `Kailash::Nexus::Middleware`

Mount Nexus inside an existing Rack stack (Rails, Sinatra, or any `rackup`-served app) by inserting the middleware in `config.ru`. The host application continues to handle its own routes; Nexus handles the workflow/handler routes.

```ruby
# config.ru
require "kailash/nexus"

nexus = Kailash::Nexus.new(my_workflows)

# Mount Nexus as Rack middleware in front of the host app
use Kailash::Nexus::Middleware, nexus: nexus
run MyRackApp
```

### Sinatra Mount

```ruby
# app.rb
require "sinatra/base"
require "kailash/nexus"

nexus = Kailash::Nexus.new(my_workflows)

class MyApp < Sinatra::Base
  use Kailash::Nexus::Middleware, nexus: nexus

  get "/" do
    "Host app routes coexist with Nexus workflow routes"
  end
end

# config.ru
require_relative "app"
run MyApp
```

NEVER mix raw Rack/Sinatra routes with Nexus for the SAME endpoint path — the middleware claims the workflow/handler routes; overlapping host routes shadow each other unpredictably.

---

## Puma — Multi-Worker Production Serving

Run the Rack-mounted Nexus under Puma with multiple worker processes and a thread pool per worker. Nexus uses deferred schema operations, so it is safe to construct at boot before workers fork.

```ruby
# config/puma.rb
workers 4
threads 2, 4
port 3000

preload_app!
```

```ruby
# config.ru
require "kailash/nexus"

nexus = Kailash::Nexus.new(my_workflows)
use Kailash::Nexus::Middleware, nexus: nexus
run MyApp
```

Tune `workers` to the host core count and `threads min, max` to the workload's IO/CPU mix. Each worker is an independent OS process; Nexus state that must be shared across workers belongs in the database (via DataFlow) or an external store, NOT in process memory.

---

## Scale-Out — Load Balancer

For horizontal scale, run multiple Nexus instances behind a reverse proxy / load balancer (nginx, traefik) or via the container orchestrator's scaling primitive.

```bash
# Run N identical Nexus instances behind the proxy
docker-compose up --scale nexus=3
```

```nginx
# nginx upstream across three Nexus instances
upstream nexus_backend {
  server nexus_1:3000;
  server nexus_2:3000;
  server nexus_3:3000;
}

server {
  listen 80;
  location /api/ {
    proxy_pass http://nexus_backend;
  }
}
```

Unified sessions are tracked across channels per instance; for cross-instance session continuity, back the session store with a shared database (DataFlow) rather than in-process memory so any instance can serve any request.

---

## Deployment Profiles

### Development — single process

```ruby
nexus = Kailash::Nexus.new(workflows)
nexus.run(port: 8000)   # one process, all channels
```

### Production — Docker + Puma + enterprise preset

```ruby
app = Kailash::Nexus::App.new(host: "0.0.0.0", port: 3000, preset: :enterprise)
# register handlers...
app.start   # host/port fixed at init; serve under Puma per config/puma.rb
```

### Production — horizontal scale

Multiple Nexus instances behind nginx/traefik (see § Scale-Out). Health checks enabled, shared session store in the database.

---

## Channel Comparison

| Feature       | API  | CLI       | MCP         |
| ------------- | ---- | --------- | ----------- |
| **Access**    | HTTP | Terminal  | MCP clients |
| **Input**     | JSON | Args/JSON | Structured  |
| **Output**    | JSON | Text/JSON | Structured  |
| **Sessions**  | yes  | yes       | yes         |
| **Auth**      | yes  | yes       | yes         |
| **Streaming** | yes  | yes       | yes         |

---

## Critical Rules

- Use Nexus for workflow platforms instead of hand-building Rack/Sinatra/Rails API routes.
- Register workflows or handlers, not individual routes — Nexus generates the routes.
- Leverage unified sessions across channels; back the session store with a shared database when scaling horizontally.
- Enable health monitoring in production (`app.health_check`); scale-out load balancers depend on it.
- NEVER mix raw Rack routes with Nexus for the same endpoint path.
- NEVER hand-implement a separate API/CLI/MCP server when Nexus already produces all three.
- Construct Nexus at boot (deferred schema ops make this Puma-fork-safe); do NOT defer construction into per-request code.

---

## Related Skills

- `ruby-framework-bindings.md` §Nexus — the Nexus class API (`NexusConfig`, `JwtConfig`, `Preset`, `RbacConfig`, `McpServer`)
- `ruby-dataflow.md` — auto-CRUD API generation feeding Nexus channels
- `ruby-mcp.md` — the MCP channel in depth
- `ruby-kaizen.md` — deploying AI agents as Nexus handlers
