# Ruby DataFlow — DSL Model Definition + Express API

Define database models with the Ruby DSL (`db.model "User" do |m| m.string ... end`), run direct CRUD with the Express API (`db.express.create`), and use the 11 generated nodes per model in workflows.

## Usage

`/ruby-dataflow` — DataFlow reference for Ruby (DSL model definition, Express API, 11 generated nodes, DB support matrix, pooling)

This file carries the DSL + Express depth. The class-API reference (`DataFlowConfig`, `ModelDefinition`, `FilterCondition`, `TenantContext`) lives in `ruby-framework-bindings.md` §DataFlow.

---

## Overview

DataFlow is a zero-config database framework built on the Core SDK. Each model definition automatically generates 11 workflow nodes. The Ruby gem wraps the Rust DataFlow engine via native extensions and delegates all database work to the Rust `sqlx` engine — no Ruby database drivers are required.

- **Automatic node generation** — 11 nodes per DSL-defined model
- **Multi-database** — PostgreSQL, MySQL, SQLite (all SQL via `sqlx`)
- **Enterprise features** — multi-tenancy, multi-instance isolation, transactions
- **Express API** — direct CRUD without workflow overhead
- **Sync Express** — blocking API suitable for scripts, CLI tools, and Rack apps

Install:

```bash
gem install kailash-dataflow
```

```ruby
# Gemfile
gem "kailash-dataflow"
```

---

## DSL Model Definition

`Kailash::DataFlow.new` takes a config block; `db.model` takes a model-definition block. Each field method (`m.string`, `m.integer`, ...) declares a column with options.

```ruby
require "kailash/dataflow"

db = Kailash::DataFlow.new do |config|
  config.database_url = ENV["DATABASE_URL"]
  config.auto_migrate = true
end

db.model "User" do |m|
  m.string  :name
  m.string  :email
  m.boolean :active, default: true
end

db.initialize!   # applies deferred schema operations
```

### Full Field Form

```ruby
db.model "Product" do |m|
  m.string    :name,  null: false
  m.string    :sku,   unique: true
  m.decimal   :price, precision: 10, scale: 2
  m.integer   :quantity, default: 0
  m.boolean   :active,   default: true
  m.timestamp :created_at
  m.timestamp :updated_at
end
```

Supported field types: `string`, `integer`, `boolean`, `decimal`, `float`, `text`, `timestamp`, `date`, `json`.

Field options: `null:`, `default:`, `unique:`, and (for `decimal`) `precision:` / `scale:`.

---

## Express API — Direct CRUD

The Express API performs CRUD directly, without building a workflow. Use keyword arguments for the record fields. It is a synchronous, blocking API — suitable for scripts, CLI tools, and Rack request handlers.

```ruby
user  = db.express.create("User", name: "Alice", email: "alice@example.com")
found = db.express.read("User", user["id"])
users = db.express.list("User", filter: { active: true })
count = db.express.count("User")
db.express.update("User", user["id"], name: "Bob")
db.express.delete("User", user["id"])
```

Result records are hashes keyed by column name; access the primary key via `record["id"]`. String IDs are preserved (no UUID conversion).

---

## Generated Nodes (11 per model)

Each model definition generates these workflow nodes (`{Model}` is the model name):

1. `{Model}_Create` — create a single record
2. `{Model}_Read` — read by ID
3. `{Model}_Update` — update a record
4. `{Model}_Delete` — delete a record
5. `{Model}_List` — list with filters
6. `{Model}_Upsert` — insert or update (atomic)
7. `{Model}_Count` — efficient `COUNT(*)`
8. `{Model}_BulkCreate` — bulk insert
9. `{Model}_BulkUpdate` — bulk update
10. `{Model}_BulkDelete` — bulk delete
11. `{Model}_BulkUpsert` — bulk upsert

### Using Generated Nodes In A Workflow

Use `WorkflowBuilder` only when you need multiple nodes with data flowing between them; for single-record CRUD prefer the Express API.

```ruby
require "kailash"
require "kailash/dataflow"

registry = Kailash::Registry.new
builder  = Kailash::WorkflowBuilder.new

builder.add_node("User_Create", "create_user", {
  "data" => { "name" => "John", "email" => "john@example.com" }
})

workflow = builder.build(registry)
Kailash::Runtime.open(registry) do |rt|
  result  = rt.execute(workflow, {})
  user_id = result.results["create_user"]["result"]
end
workflow.close
```

Result access pattern: `result.results["node_id"]["result"]`.

---

## Database Support Matrix

| Database   | Type | Nodes/Model | Driver           |
| ---------- | ---- | ----------- | ---------------- |
| PostgreSQL | SQL  | 11          | `sqlx` (via FFI) |
| MySQL      | SQL  | 11          | `sqlx` (via FFI) |
| SQLite     | SQL  | 11          | `sqlx` (via FFI) |

The Ruby gem delegates all database operations to the Rust `sqlx` engine via native extensions; no Ruby database drivers are required.

---

## Connection Pooling

The `sqlx` engine maintains a connection pool per `Kailash::DataFlow` instance. Create ONE DataFlow per database and share it across the application — each instance owns its own pool, so multiple instances against the same database fragment the pool and waste connections.

```ruby
# DO -- one DataFlow per database, shared across the app
db = Kailash::DataFlow.new do |config|
  config.database_url = ENV["DATABASE_URL"]
end
db.initialize!
# reuse `db` everywhere

# DO NOT -- a fresh DataFlow per request (each opens its own pool)
```

Deferred schema operations make construction safe at boot before a Rack/Puma fork. Multi-instance isolation holds: one DataFlow per database is the supported topology.

---

## Integration Patterns

### With Nexus (auto-CRUD across all channels)

`db.workflows` exposes the generated nodes; Nexus turns them into API + CLI + MCP endpoints.

```ruby
require "kailash/dataflow"
require "kailash/nexus"

db = Kailash::DataFlow.new do |config|
  config.database_url = ENV["DATABASE_URL"]
end

db.model "User" do |m|
  m.string :name
  m.string :email
end

nexus = Kailash::Nexus.new(db.workflows)
nexus.run(port: 8000)

# GET    /api/User/list
# POST   /api/User/create
# GET    /api/User/read/:id
# PUT    /api/User/update/:id
# DELETE /api/User/delete/:id
```

### With Rack Middleware

```ruby
# config.ru
require "kailash/dataflow"

db = Kailash::DataFlow.new do |config|
  config.database_url = ENV["DATABASE_URL"]
end
db.initialize!

use Kailash::DataFlow::Middleware, dataflow: db
run MyApp
```

---

## Critical Rules

- Always close DataFlow, Registry, and Workflow objects — use block form (`Kailash::Runtime.open`) where possible.
- Create ONE DataFlow per database and share it; do NOT construct a fresh instance per request.
- String IDs are preserved (no UUID conversion).
- Deferred schema operations are safe for Rack/Puma startup.
- Result access: `result.results["node_id"]["result"]`.
- Use keyword arguments for the Express API: `db.express.create("User", name: "Alice")`.
- NEVER use raw SQL when DataFlow nodes exist; NEVER run ActiveRecord/Sequel alongside DataFlow against the same tables.

---

## Related Skills

- `ruby-framework-bindings.md` §DataFlow — DataFlow class API (`DataFlowConfig`, `ModelDefinition`, `FilterCondition`, `TenantContext`)
- `ruby-nexus-rack.md` — auto-generated CRUD across API + CLI + MCP
- `ruby-mcp.md` — exposing DataFlow reads/writes as MCP resources and tools
- `ruby-kaizen.md` — data-driven agents querying DataFlow
