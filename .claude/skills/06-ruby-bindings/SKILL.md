# Ruby Binding Skills

Skills for building applications with the Kailash Ruby gem (`gem install kailash`).

All classes are Rust-backed via Magnus. You write Ruby — you never touch Rust.

## Skills

| Skill | Purpose |
|-------|---------|
| `ruby-quickstart` | Complete working script, result structure, RuntimeConfig |
| `ruby-custom-nodes` | register_callback patterns, callable types, GVL behavior |
| `ruby-available-nodes` | All 139 node types by category |
| `ruby-cheatsheet` | 30+ copy-paste patterns |
| `ruby-common-mistakes` | Top 10 mistakes and error resolution |
| `ruby-framework-bindings` | Kaizen, Enterprise, Nexus, DataFlow Ruby APIs |
| `ruby-gold-standards` | Compliance checklist, anti-patterns |

## Quick Reference

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("NoOpNode", "step", {})
  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow, { "data" => "hello" })
    puts result.results["step"]
  end
  workflow.close
end
```

## Key Differences from Python

| Feature | Python | Ruby |
|---------|--------|------|
| Import | `import kailash` | `require "kailash"` |
| Registry | `kailash.NodeRegistry()` | `Kailash::Registry.new` |
| Builder | `kailash.WorkflowBuilder()` | `Kailash::WorkflowBuilder.new` |
| Runtime | `kailash.Runtime(reg)` | `Kailash::Runtime.new(registry)` |
| Cleanup | Implicit (GC) | Block form or explicit `close` |
| Errors | `RuntimeError` | `Kailash::Error` hierarchy |
| Config keys | `{"key": "value"}` | `{ "key" => "value" }` (String keys) |
