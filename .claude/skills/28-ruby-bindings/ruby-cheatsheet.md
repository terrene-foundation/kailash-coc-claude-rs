# Ruby Binding Cheatsheet

30+ copy-paste patterns for the Rust-backed kailash Ruby gem.

## Basic Workflow

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("NoOpNode", "passthrough", {})
  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |rt|
    result = rt.execute(workflow, { "data" => "hello" })
    puts result.results["passthrough"]
  end
  workflow.close
end
```

## Multi-Node Workflow

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("JSONTransformNode", "parse", { "expression" => "@.name" })
  builder.add_node("TextTransformNode", "upper", { "operation" => "uppercase" })
  builder.connect("parse", "result", "upper", "text")

  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |rt|
    result = rt.execute(workflow, { "data" => { "name" => "alice" } })
    puts result.results["upper"]["result"]  # "ALICE"
  end
  workflow.close
end
```

## Custom Node (register_callback)

```ruby
require "kailash"

double = ->(inputs) { { "result" => inputs.fetch("value", 0) * 2 } }

registry = Kailash::Registry.new
registry.register_callback("DoubleNode", double, ["value"], ["result"])

builder = Kailash::WorkflowBuilder.new
builder.add_node("DoubleNode", "d", {})
workflow = builder.build(registry)

Kailash::Runtime.open(registry) do |rt|
  result = rt.execute(workflow, { "value" => 21 })
  puts result.results["d"]["result"]  # 42
end
workflow.close
registry.close
```

## Stateful Custom Node

```ruby
require "kailash"

class Counter
  def initialize
    @count = 0
    @mutex = Mutex.new
  end

  def call(inputs)
    @mutex.synchronize do
      @count += 1
      { "count" => @count }
    end
  end
end

counter = Counter.new
registry = Kailash::Registry.new
registry.register_callback("CounterNode", counter, [], ["count"])
```

## List All Node Types

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  types = registry.list_types
  puts "#{registry.length} node types"
  types.each { |t| puts t }
end
```

## Workflow Serialization

```ruby
require "kailash"

builder = Kailash::WorkflowBuilder.new
builder.add_node("NoOpNode", "n", {})
json_str = builder.to_json

# Restore
restored = Kailash::WorkflowBuilder.from_json(json_str)
```

## Runtime Configuration

```ruby
config = Kailash::RuntimeConfig.new
config.debug = true
config.max_concurrent_nodes = 4
config.workflow_timeout = 60
config.node_timeout = 10

runtime = Kailash::Runtime.new(registry, config)
```

## Auto-Generated Node IDs

```ruby
builder = Kailash::WorkflowBuilder.new
id = builder.add_node_auto_id("NoOpNode", {})
puts id  # "NoOpNode_1" or similar
```

## Enable Cyclic Workflows

```ruby
builder = Kailash::WorkflowBuilder.new
builder.enable_cycles(true)
builder.add_node("NoOpNode", "a", {})
builder.add_node("NoOpNode", "b", {})
builder.connect("a", "output", "b", "input")
builder.connect("b", "output", "a", "input")
```

## Inspect Workflow Structure

```ruby
builder = Kailash::WorkflowBuilder.new
builder.add_node("NoOpNode", "a", {})
builder.add_node("NoOpNode", "b", {})
builder.connect("a", "output", "b", "input")

builder.get_node_ids      # ["a", "b"]
builder.get_connections    # [{"from_node"=>"a", ...}]
builder.node_ids           # alias
builder.connections        # alias
```

## HTTP Request

```ruby
builder.add_node("HTTPRequestNode", "api", {
  "url" => "https://api.example.com/data",
  "method" => "GET",
  "headers" => { "Authorization" => "Bearer #{ENV.fetch('API_TOKEN')}" }
})
```

## JSON Transform

```ruby
builder.add_node("JSONTransformNode", "extract", {
  "expression" => "@.users[0].name"
})
builder.connect("source", "data", "extract", "data")
```

## File Reader

```ruby
builder.add_node("FileReaderNode", "reader", {
  "file_path" => "/path/to/file.txt"
})
```

## CSV Processor

```ruby
builder.add_node("CSVProcessorNode", "csv", {
  "file_path" => "data.csv",
  "has_header" => true
})
```

## Enterprise: RBAC

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

## Enterprise: ABAC

```ruby
policy = Kailash::Enterprise::AbacPolicy.new("dept-access", "allow")
policy.add_subject_condition("department", "eq", "engineering")
evaluator = Kailash::Enterprise::AbacEvaluator.new([policy])

result = evaluator.evaluate(
  { "department" => "engineering" },
  { "type" => "project" },
  "read",
  {}
)
# result["allowed"] == true
```

## Kaizen: Agent

```ruby
config = Kailash::Kaizen::AgentConfig.new
config.model = ENV.fetch("LLM_MODEL", "gpt-5")
agent = Kailash::Kaizen::Agent.new(config)
result = agent.run("What is the capital of France?")
```

## Kaizen: Tool Registry

```ruby
tools = Kailash::Kaizen::ToolRegistry.new
tool = Kailash::Kaizen::ToolDef.new(
  "search",
  "Search the web",
  ->(args) { { "results" => "Results for: #{args['query']}" } }
)
tools.register(tool)
```

## Kaizen: Memory

```ruby
memory = Kailash::Kaizen::SessionMemory.new
memory.store("user_name", "Alice")
memory.recall("user_name")  # "Alice"
```

## Nexus: Config

```ruby
config = Kailash::Nexus::NexusConfig.new
config.host = "0.0.0.0"
config.port = 3000
```

## Nexus: JWT

```ruby
jwt = Kailash::Nexus::JwtConfig.new("secret-at-least-32-bytes-long!!")
```

## DataFlow: Model

```ruby
config = Kailash::DataFlow::DataFlowConfig.new("sqlite::memory:")
model = Kailash::DataFlow::ModelDefinition.new("User", "users")
model.add_field("name", "text", required: true)
model.add_field("email", "text", nullable: true)
```

## Error Handling

```ruby
begin
  result = runtime.execute(workflow, inputs)
rescue Kailash::ExecutionError => e
  puts "Workflow execution error: #{e.message}"
rescue Kailash::ValueError => e
  puts "Invalid config: #{e.message}"
rescue Kailash::Error => e
  puts "General error: #{e.message}"
end
```

## Testing Pattern (RSpec)

```ruby
require "spec_helper"

RSpec.describe "My workflow" do
  let(:registry) { Kailash::Registry.new }
  after { registry.close unless registry.closed? }

  it "executes successfully" do
    builder = Kailash::WorkflowBuilder.new
    builder.add_node("NoOpNode", "n", {})
    wf = builder.build(registry)

    Kailash::Runtime.open(registry) do |rt|
      result = rt.execute(wf, { "data" => "test" })
      expect(result.results).to have_key("n")
      expect(result.run_id).to be_a(String)
    end
    wf.close
  end
end
```

## Multiple Custom Nodes in One Workflow

```ruby
step1 = ->(inputs) { { "intermediate" => inputs["data"] + " processed" } }
step2 = ->(inputs) { { "final" => inputs["intermediate"].upcase } }

registry = Kailash::Registry.new
registry.register_callback("Step1", step1, ["data"], ["intermediate"])
registry.register_callback("Step2", step2, ["intermediate"], ["final"])

builder = Kailash::WorkflowBuilder.new
builder.add_node("Step1", "s1", {})
builder.add_node("Step2", "s2", {})
builder.connect("s1", "intermediate", "s2", "intermediate")
workflow = builder.build(registry)

Kailash::Runtime.open(registry) do |rt|
  result = rt.execute(workflow, { "data" => "hello" })
  puts result.results["s2"]["final"]  # "HELLO PROCESSED"
end
workflow.close
registry.close
```

## Resource Cleanup with ensure

```ruby
registry = Kailash::Registry.new
runtime = Kailash::Runtime.new(registry)
begin
  # ... use runtime ...
ensure
  runtime.close
  registry.close
end
```

## Ruby Idiom Cheatsheet

Ruby-divergent forms of cross-language rules. The rule PRINCIPLE lives in the global rule; only the Ruby syntax differs here.

**Kaizen agent — define signatures with a `signature do ... end` block** (`agent-reasoning`):

```ruby
class TriageAgent < Kailash::Kaizen::BaseAgent
  signature do
    input  :ticket,   desc: "Support ticket content"
    output :priority, desc: "urgent, high, normal, low"
  end
end
# LLM-first routing — never include?/match?/=~/scan on input to decide
router = Kailash::Kaizen::Pipeline.router(agents: [billing, tech])
delegate = Kailash::Kaizen::Delegate.new(model: ENV["LLM_MODEL"])
delegate.run("Analyze this") { |event| puts event }   # block-streaming
```

**SQL — Sequel/ActiveRecord, `?` placeholders, transaction blocks** (`infrastructure-sql`):

```ruby
DB[:users].where(id: user_id).first                       # parameterized via Sequel
DB.fetch("SELECT * FROM users WHERE id = ?", user_id)     # ? not $1 (dialect-portable)
DB.transaction { ...read-then-write... }                  # auto-commit releases locks
DB[:cp].insert_conflict(target: [:k], update: {...}).insert(...)  # upsert, not check-then-act
```

**Logging — `SemanticLogger` / `Rails.logger`, never `puts`** (`observability`):

```ruby
logger = SemanticLogger['UserService']
logger.info("user.create.ok", user_id: uid, request_id: req_id)   # fields as kwargs
Rails.logger.tagged(request_id: request.request_id) { ... }       # correlation id
# DO NOT: puts / p / pp / logger.info("User #{uid}")  (unstructured)
```

**Connection pool — env-driven `max_connections`, share via singleton** (`connection-pool`):

```ruby
config.max_connections = ENV.fetch("DATAFLOW_MAX_CONNECTIONS", "10").to_i
config.connection_timeout = 5
# Puma/Unicorn fork: pool_size = pg_max_connections / num_workers * 0.7
# health check: ActiveRecord::Base.connection.execute("SELECT 1"), not a workflow
```

**DataFlow pool — single source via `Config#pool_size`, bounded overflow** (`dataflow-pool`):

```ruby
pool_size = config.pool_size(environment)        # not Etc.nprocessors*4 / ad-hoc default
max_overflow = [2, pool_size / 2].max            # not pool_size * 2
# subsystems take runtime: nil; #close calls @runtime.release (no orphan runtimes)
```

**PACT — frozen `GovernanceContext`, `Float#finite?`, `@mutex.synchronize`** (`pact-governance`):

```ruby
ctx = Kailash::Pact::GovernanceContext.new(envelope:, engine:, frozen: true)
agent.set_governance(ctx)                         # never the bare engine
child = Kailash::Pact.intersect_envelopes(parent, requested)   # monotonic tightening
raise ArgumentError unless max_cost.finite?       # NaN < x is always false
@mutex.synchronize { @envelopes[address.key] }    # Puma is multi-threaded
```

**RSpec — real runtime, `let` + `after` cleanup** (`testing`):

```ruby
let(:registry) { Kailash::Registry.new }
after { registry.close unless registry.closed? }  # let is lazy → explicit close
# integration specs: NO instance_double(Kailash::Runtime) — exercise the FFI boundary
```

**E2E god-mode — `Net::HTTP` create-on-404, discover IDs at runtime** (`e2e-god-mode`):

```ruby
resp = Net::HTTP.get_response(URI("#{base}/api/users/#{id}"))
if resp.code == "404"                             # create the missing record, don't skip
  Net::HTTP.post(URI("#{base}/api/users"),
    { name: "test_user", role: "admin" }.to_json, "Content-Type" => "application/json")
end
# never hardcode emails/IDs — query the API first
```
