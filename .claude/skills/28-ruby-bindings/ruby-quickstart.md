# Ruby Bindings Quickstart

Fastest path to running workflows with the Rust-backed `kailash` Ruby gem.

## Usage

`/ruby-quickstart` — Complete working Ruby script using the kailash gem

---

## Installation

```bash
# From source (development)
cd /path/to/kailash
cargo build -p kailash-ruby --release
cp target/release/libkailash.dylib bindings/kailash-ruby/lib/kailash/kailash.bundle
codesign -fs - bindings/kailash-ruby/lib/kailash/kailash.bundle  # REQUIRED on macOS

# From gem (when published)
gem install kailash
```

---

## Complete Working Script

```ruby
require "kailash"

# Step 1: Create registry
# Auto-registers all 139 built-in node types (HTTP, SQL, File, AI, Auth, Security, etc.)
registry = Kailash::Registry.new

# Step 2: Build a workflow
builder = Kailash::WorkflowBuilder.new
builder.add_node("MathOperationsNode", "calc", {})      # type_name, node_id, config
builder.add_node("NoOpNode", "passthrough", {})
builder.connect("calc", "result", "passthrough", "data") # src, src_port, tgt, tgt_port
workflow = builder.build(registry)                        # must pass registry

# Step 3: Execute
runtime = Kailash::Runtime.new(registry)
result = runtime.execute(workflow, {
  "operation" => "add",
  "a" => 10,
  "b" => 5,
})

# Step 4: Read results
puts result.results["calc"]["result"]         # 15
puts result.results["passthrough"]["data"]    # 15
puts "Run ID: #{result.run_id}"

# Step 5: Clean up
runtime.close
workflow.close
registry.close
```

---

## Block-Based API (Preferred)

Ruby convention: use blocks for automatic resource cleanup.

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("MathOperationsNode", "calc", {})
  builder.add_node("NoOpNode", "out", {})
  builder.connect("calc", "result", "out", "data")
  workflow = builder.build(registry)

  result = Kailash::Runtime.open(registry) do |runtime|
    runtime.execute(workflow, { "operation" => "add", "a" => 10, "b" => 5 })
  end

  puts result.results["calc"]["result"]  # 15
  workflow.close
end
# registry auto-closed by block
```

---

## Result Structure

`runtime.execute()` returns a `Kailash::ExecutionResult` with:

```ruby
result.results    # Hash: { "node_id" => { "output_key" => value, ... }, ... }
result.run_id     # String: UUID for this execution
```

---

## Node Configuration

Nodes accept an optional config Hash as the third argument to `add_node`:

```ruby
builder.add_node(
  "HTTPRequestNode",
  "fetch",
  {
    "url" => "https://api.example.com/data",
    "method" => "GET",
    "headers" => { "Authorization" => "Bearer #{ENV.fetch('API_TOKEN')}" },
  }
)
```

Config keys and types depend on the specific node. Inputs passed to `runtime.execute()` are merged with node config at execution time.

---

## RuntimeConfig (Optional Tuning)

```ruby
config = Kailash::RuntimeConfig.new
config.debug = true                    # enable verbose tracing
config.max_concurrent_nodes = 8        # semaphore limit for parallel node execution
config.workflow_timeout = 120          # overall workflow deadline (seconds)
config.node_timeout = 30               # per-node deadline (seconds)

runtime = Kailash::Runtime.new(registry, config)
```

---

## Inspect Available Node Types

```ruby
registry = Kailash::Registry.new
types = registry.list_types   # sorted Array of Strings
puts "#{registry.length} node types registered"

# Check a specific type
puts "Math available" if types.include?("MathOperationsNode")

registry.close
```

---

## Workflow Serialization

Serialize and restore builder state as JSON:

```ruby
# Build and serialize
builder = Kailash::WorkflowBuilder.new
builder.add_node("NoOpNode", "n1", {})
builder.add_node("NoOpNode", "n2", {})
builder.connect("n1", "data", "n2", "data")
json_str = builder.to_json

# Restore and build
restored = Kailash::WorkflowBuilder.from_json(json_str)
workflow = restored.build(registry)
```

---

## Key Constraints

- `builder.build(registry)` — builder is consumed, create a new one for each workflow
- `registry.register_callback()` must be called **before** `Runtime.new(registry)` — once shared, the registry is immutable
- `runtime.execute()` releases the GVL — other Ruby threads can run concurrently
- Node IDs must be **unique strings** within a workflow
- Config hashes must use **String keys**, not Symbol keys
- All resources (Registry, Runtime, Workflow) must be `close`d or managed via blocks

---

## Framework Quickstart

All four framework modules are available in Ruby:

### Kaizen (AI Agents)

```ruby
config = Kailash::Kaizen::AgentConfig.new
config.model = ENV.fetch("LLM_MODEL", "gpt-5")

agent = Kailash::Kaizen::Agent.new(config)
result = agent.run("What is the capital of France?")
```

### Enterprise (RBAC)

```ruby
evaluator = Kailash::Enterprise::RbacEvaluator.new
role = Kailash::Enterprise::Role.new("admin")
perm = Kailash::Enterprise::Permission.new("users", "read")
role.add_permission(perm)
evaluator.add_role(role)

user = Kailash::Enterprise::User.new("alice")
user.add_role("admin")
evaluator.check(user, "users", "read")  # true
```

### Nexus (Server)

```ruby
config = Kailash::Nexus::NexusConfig.new
config.host = "0.0.0.0"
config.port = 3000
```

### DataFlow (Database)

```ruby
config = Kailash::DataFlow::DataFlowConfig.new("sqlite::memory:")
model = Kailash::DataFlow::ModelDefinition.new("User", "users")
model.add_field("name", "text", required: true)
```

---

For custom Ruby nodes, see `/ruby-custom-nodes`.
For all available node types, see `/ruby-available-nodes`.
For framework details, see `/ruby-framework-bindings`.
