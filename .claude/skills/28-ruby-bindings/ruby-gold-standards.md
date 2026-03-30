# Ruby Binding Gold Standards

Compliance checklist for code using the Rust-backed kailash Ruby gem.

## Core API Standards (MUST follow for all new code)

### 1. Registry Creation

```ruby
# GOLD STANDARD
require "kailash"

Kailash::Registry.open do |registry|
  # ... use registry ...
end
```

- Always create a registry first
- Prefer block form for auto-cleanup
- One registry per application (reuse across workflows)
- Register all custom callbacks before creating Runtime

### 2. Workflow Building

```ruby
# GOLD STANDARD
builder = Kailash::WorkflowBuilder.new
builder.add_node("NodeType", "unique_id", { "key" => "value" })
builder.connect("source_node", "source_output", "target_node", "target_input")
workflow = builder.build(registry)   # registry REQUIRED
```

- String-based node types: `"NodeType"` not `NodeType.new`
- Unique string IDs for each node
- Config as plain Ruby Hash with **String keys** (not Symbols)
- 4-parameter connections: source_node, source_output, target_node, target_input
- Always pass registry to `build()`

### 3. Execution

```ruby
# GOLD STANDARD
Kailash::Runtime.open(registry) do |runtime|
  result = runtime.execute(workflow, { "input_key" => "value" })
  output = result.results["node_id"]["output_key"]
  run_id = result.run_id
end
```

- Runtime requires registry
- `execute()` returns `Kailash::ExecutionResult` with `.results` and `.run_id`
- Access node outputs via `result.results["node_id"]["output_key"]`
- Prefer block form for auto-cleanup
- Reuse runtime across executions

### 4. Custom Nodes

```ruby
# GOLD STANDARD
my_processor = ->(inputs) {
  data = inputs.fetch("data", "")
  { "result" => data.upcase }
}

registry.register_callback(
  "MyProcessorNode",     # unique type name
  my_processor,          # callable (lambda/Proc/object with #call)
  ["data"],              # input parameter names
  ["result"]             # output parameter names
)
```

- Lambda, Proc, or object with `#call`
- Plain Hash input, plain Hash output
- Register before creating Runtime
- Use `Mutex` for stateful callbacks
- Type name should end with "Node" by convention

### 5. Resource Management

```ruby
# GOLD STANDARD — block form
Kailash::Registry.open do |registry|
  Kailash::Runtime.open(registry) do |runtime|
    # ...
  end
end

# GOLD STANDARD — explicit cleanup
registry = Kailash::Registry.new
runtime = Kailash::Runtime.new(registry)
begin
  # ...
ensure
  runtime.close
  registry.close
end
```

- All resources (Registry, Runtime, Workflow) must be closed
- Block form is strongly preferred
- `ensure` blocks for explicit cleanup
- `close` is idempotent (safe to call multiple times)
- RSpec: `after { registry.close unless registry.closed? }`

### 6. Error Handling

```ruby
# GOLD STANDARD
begin
  result = runtime.execute(workflow, inputs)
rescue Kailash::ExecutionError => e
  logger.error("Workflow failed: #{e.message}")
  raise
rescue Kailash::ValueError => e
  logger.error("Invalid config: #{e.message}")
  raise
rescue Kailash::Error => e
  logger.error("Kailash error: #{e.message}")
  raise
end
```

- Catch `Kailash::ExecutionError` for workflow execution failures
- Catch `Kailash::ValueError` for invalid configuration values
- Catch `Kailash::Error` as catch-all for all kailash errors
- Never silently swallow errors (`rescue => e; end`)
- Log errors with context

### 7. Environment Variables

```ruby
# GOLD STANDARD
api_key = ENV.fetch("OPENAI_API_KEY")   # never hardcode
model = ENV.fetch("LLM_MODEL", "gpt-5") # from .env, with fallback
```

- All API keys from environment
- All model names from environment
- `.env` is the single source of truth
- Never commit `.env` to git

### 8. Testing

```ruby
# GOLD STANDARD
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

- Real execution, no mocking of kailash internals
- Cleanup in `after` blocks
- Assert on actual results
- Test error cases too

## Anti-Patterns (NEVER do these)

| Anti-Pattern                            | Gold Standard                              |
| --------------------------------------- | ------------------------------------------ |
| `builder.build()` without registry      | `builder.build(registry)`                  |
| `Kailash::Runtime.new` without registry | `Kailash::Runtime.new(registry)`           |
| `builder.connect("a", "b")` (2 params)  | `builder.connect("a", "out", "b", "in")`   |
| `{ key: value }` symbol keys            | `{ "key" => value }` string keys           |
| Register callback after Runtime         | Register before Runtime                    |
| No `close` / no block form              | Block form or explicit `close` in `ensure` |
| Hardcoded API key                       | `ENV.fetch("API_KEY")`                     |
| `rescue => e; end` (swallowed)          | `rescue Kailash::Error => e; log(e)`       |
| Mocking kailash internals in tests      | Real execution                             |
| `Timeout.timeout` around execute        | `RuntimeConfig#workflow_timeout=`          |
