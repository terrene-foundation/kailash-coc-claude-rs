# Custom Ruby Nodes

Register Ruby callables as workflow node types using `register_callback`.

## Usage

`/ruby-custom-nodes` — Complete patterns for custom Ruby nodes in the Rust-backed binding

---

## Overview

The Ruby binding registers custom Ruby logic as workflow node types via `registry.register_callback()`. The Rust executor calls the Ruby callable within the workflow execution engine, reacquiring the GVL for the Ruby callback.

---

## Basic Pattern

```ruby
require "kailash"

# 1. Define the callback
#    Signature: (Hash) -> Hash
#    - Input: Hash mapping input names to Ruby values
#    - Output: Hash mapping output names to Ruby values
uppercase = ->(inputs) {
  text = inputs.fetch("text", "")
  { "result" => text.upcase }
}

# 2. Register BEFORE creating Runtime
registry = Kailash::Registry.new
registry.register_callback(
  "UppercaseNode",   # type name — used in add_node()
  uppercase,         # callable (lambda, Proc, or object with #call)
  ["text"],          # declared input parameter names
  ["result"]         # declared output parameter names
)

# 3. Build workflow using the custom type
builder = Kailash::WorkflowBuilder.new
builder.add_node("UppercaseNode", "upper", {})
workflow = builder.build(registry)

# 4. Execute
runtime = Kailash::Runtime.new(registry)
result = runtime.execute(workflow, { "text" => "hello world" })
puts result.results["upper"]["result"]   # "HELLO WORLD"

runtime.close
workflow.close
registry.close
```

---

## Callable Types

Any Ruby object responding to `#call` can be registered:

```ruby
# Lambda (preferred — strict arity)
handler = ->(inputs) { { "result" => inputs["data"].reverse } }

# Proc
handler = Proc.new { |inputs| { "result" => inputs["data"].reverse } }

# Object with #call method
class MyHandler
  def call(inputs)
    { "result" => inputs["data"].reverse }
  end
end
handler = MyHandler.new
```

---

## Value Types in Callbacks

All Ruby/Rust type conversions are transparent. Values arrive as native Ruby types:

| Input Ruby type | What you get in `inputs` Hash                              |
| --------------- | ---------------------------------------------------------- |
| `nil`           | `nil`                                                      |
| `true`/`false`  | Ruby boolean                                               |
| `Integer`       | Ruby Integer                                               |
| `Float`         | Ruby Float                                                 |
| `String`        | Ruby String                                                |
| `Array`         | Ruby Array (elements recursively converted)                |
| `Hash`          | Ruby Hash (keys are Strings, values recursively converted) |

Return values follow the same mapping in reverse. Nested structures work correctly.

---

## Error Handling

Ruby exceptions raised inside a callback are caught by the Rust executor and converted to a workflow node error:

```ruby
safe_divide = ->(inputs) {
  a = inputs.fetch("a", 0)
  b = inputs.fetch("b", 1)

  raise ArgumentError, "'a' must be numeric" unless a.is_a?(Numeric)
  raise ZeroDivisionError, "Cannot divide by zero" if b == 0

  { "quotient" => a.to_f / b, "remainder" => a % b }
}

registry.register_callback("SafeDivideNode", safe_divide, ["a", "b"], ["quotient", "remainder"])
```

The exception type and message are propagated as the workflow error.

---

## Multi-Output Callbacks

Return all declared output keys for downstream nodes to consume:

```ruby
text_stats = ->(inputs) {
  text = inputs.fetch("text", "")
  words = text.split
  {
    "word_count" => words.length,
    "char_count" => text.length,
    "line_count" => text.count("\n") + 1,
    "upper"      => text.upcase,
  }
}

registry.register_callback(
  "TextStatsNode",
  text_stats,
  ["text"],
  ["word_count", "char_count", "line_count", "upper"]
)

# Downstream nodes can connect to any of the four outputs
builder.add_node("TextStatsNode", "stats", {})
builder.add_node("NoOpNode", "word_sink", {})
builder.connect("stats", "word_count", "word_sink", "data")
```

---

## Stateful Callbacks

The callback can capture external state through closures or objects:

```ruby
require "kailash"

# Thread-safe stateful callback using Mutex
class Counter
  def initialize
    @count = 0
    @mutex = Mutex.new
  end

  def call(inputs)
    @mutex.synchronize do
      @count += 1
      { "count" => @count, "data" => inputs["data"] }
    end
  end
end

counter = Counter.new
registry = Kailash::Registry.new
registry.register_callback("CounterNode", counter, ["data"], ["count", "data"])
```

**Warning**: The Rust executor may run nodes concurrently. Use `Mutex` around shared mutable state.

---

## Registration Constraint: Before Runtime

`register_callback` modifies the registry. Once the registry is shared with a `Runtime`, registration raises `Kailash::Error`.

```ruby
registry = Kailash::Registry.new

# CORRECT order:
registry.register_callback("MyNode", my_fn, ["x"], ["y"])   # register first
runtime = Kailash::Runtime.new(registry)                      # then create runtime

# WRONG order (raises Kailash::Error):
registry2 = Kailash::Registry.new
runtime2 = Kailash::Runtime.new(registry2)
registry2.register_callback("MyNode", my_fn, ["x"], ["y"])   # Error!
```

---

## Testing Custom Nodes

```ruby
require "spec_helper"

RSpec.describe "Custom nodes" do
  let(:registry) { Kailash::Registry.new }
  after { registry.close unless registry.closed? }

  let(:double_fn) { ->(inputs) { { "result" => inputs.fetch("value", 0) * 2 } } }

  before do
    registry.register_callback("DoubleNode", double_fn, ["value"], ["result"])
  end

  it "doubles the input" do
    builder = Kailash::WorkflowBuilder.new
    builder.add_node("DoubleNode", "double", {})
    wf = builder.build(registry)

    Kailash::Runtime.open(registry) do |rt|
      result = rt.execute(wf, { "value" => 21 })
      expect(result.results["double"]["result"]).to eq(42)
    end
    wf.close
  end

  it "handles missing input with default" do
    builder = Kailash::WorkflowBuilder.new
    builder.add_node("DoubleNode", "double", {})
    wf = builder.build(registry)

    Kailash::Runtime.open(registry) do |rt|
      result = rt.execute(wf, {})
      expect(result.results["double"]["result"]).to eq(0)
    end
    wf.close
  end
end
```

---

## Combining Custom and Built-In Nodes

Custom callback nodes and built-in Rust nodes work together in the same workflow:

```ruby
enrich = ->(inputs) {
  data = inputs.fetch("data", {})
  data["enriched"] = true
  data["source"] = "ruby_callback"
  { "data" => data }
}

registry = Kailash::Registry.new
registry.register_callback("EnrichNode", enrich, ["data"], ["data"])

builder = Kailash::WorkflowBuilder.new
builder.add_node("NoOpNode", "input", {})
builder.add_node("EnrichNode", "enrich", {})     # custom Ruby node
builder.add_node("NoOpNode", "output", {})        # built-in Rust node
builder.connect("input", "data", "enrich", "data")
builder.connect("enrich", "data", "output", "data")

workflow = builder.build(registry)
```

---

## GVL Behavior During Callbacks

- When `runtime.execute` runs, it **releases the GVL** so other Ruby threads can run
- When a callback node executes, the Rust executor **reacquires the GVL** via `rb_thread_call_with_gvl`
- After the callback returns, the GVL is **released again** for the next Rust node
- This means callback nodes safely access all Ruby APIs (string operations, Mutex, etc.)

---

## What Is NOT Supported

- **Class-based nodes**: There is no `BaseNode` class to inherit from. Use `register_callback`.
- **Node metadata**: Cannot declare required/optional input status in the Ruby binding — all declared inputs are treated as optional.
- **Streaming output**: Callbacks must return a complete Hash. Streaming is not supported.
- **Async blocks**: Callbacks run synchronously within the GVL. Do not use `Thread.new` inside callbacks.
