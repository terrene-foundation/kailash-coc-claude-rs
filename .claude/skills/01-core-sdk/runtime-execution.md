---
name: runtime-execution
description: "Execute workflows with kailash.Runtime, with parameter overrides and configuration options. Use when asking 'execute workflow', 'runtime.execute', 'kailash.Runtime', 'run workflow', 'execution options', 'runtime parameters', 'content-aware detection', or 'workflow execution'."
---

# Runtime Execution

Configuration and execution patterns for the Kailash Runtime.

## Usage

`/runtime-execution` -- Reference for Runtime creation, execute(), and reading results

## The Runtime

```python
import kailash

# Create registry and build a workflow
reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("LogNode", "logger", {"message": "Hello"})
wf = builder.build(reg)

# Create runtime (reuse across executions)
rt = kailash.Runtime(reg)

# Execute workflow
result = rt.execute(wf)
# result is a dict: {"results": {...}, "run_id": "...", "metadata": {...}}
```

## ExecutionResult

The `rt.execute()` method returns a dict with these keys:

```python
result = rt.execute(wf, inputs)

# result["run_id"]    -- Unique identifier for this execution run (str)
# result["results"]   -- Per-node output maps: {node_id: {output_key: value}} (dict)
# result["metadata"]  -- Execution metadata: timing, node counts, etc. (dict)
```

## Accessing Results

```python
result = rt.execute(wf, {"text": "hello"})

# Check the unique run ID
print(f"Run: {result['run_id']}")

# Access output from a specific node by ID
node_output = result["results"].get("my_transform_node")
if node_output:
    value = node_output.get("result")
    print(f"Result: {value}")

# Pattern: get or raise
output = result["results"].get("final_node")
if output is None:
    raise KeyError("node 'final_node' not in results")

# Pattern: get string value with default
text = (
    result["results"]
    .get("text_node", {})
    .get("text", "default")
)

# Iterate all node results
for node_id, outputs in result["results"].items():
    print(f"Node '{node_id}': {len(outputs)} outputs")
    for key, val in outputs.items():
        print(f"  {key}: {val}")
```

## Execution Model (Level-Based Parallelism)

```
Workflow DAG:
  A -> B -> D
  A -> C -> D

Level 0: [A]        -- runs first (no dependencies)
Level 1: [B, C]     -- runs in parallel (both depend only on A)
Level 2: [D]        -- runs last (depends on B and C)
```

The Runtime pre-computes execution levels at `builder.build(reg)` time and runs nodes at the same level concurrently.

## Passing Inputs to Workflows

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("TextTransformNode", "upper", {"operation": "uppercase"})
wf = builder.build(reg)
rt = kailash.Runtime(reg)

# Pass inputs as a dict
result = rt.execute(wf, {
    "text": "hello world",
    "count": 10,
    "enabled": True,
    "config": {"timeout": 30},
})
```

## Common Patterns

### Re-using Runtime for Multiple Executions

```python
import kailash

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

builder = kailash.WorkflowBuilder()
builder.add_node("LogNode", "logger", {})
wf = builder.build(reg)

# Execute multiple times with different inputs
for i in range(10):
    result = rt.execute(wf, {"id": i})
    print(f"Run {result['run_id']}")
```

### Concurrent Executions (asyncio)

```python
import kailash
import asyncio

async def run_batch():
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)

    builder = kailash.WorkflowBuilder()
    builder.add_node("LogNode", "logger", {})
    wf = builder.build(reg)

    # Run multiple workflows concurrently
    tasks = []
    for i in range(10):
        # Each execute call can be wrapped in asyncio
        tasks.append(asyncio.to_thread(rt.execute, wf, {"id": i}))

    results = await asyncio.gather(*tasks)
    for result in results:
        print(f"Run ID: {result['run_id']}")
```

### Error Handling

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "api", {
    "url": "https://api.example.com/data",
    "method": "GET",
})
wf = builder.build(reg)
rt = kailash.Runtime(reg)

try:
    result = rt.execute(wf)
    output = result["results"]["api"]
    print(f"Response: {output}")
except RuntimeError as e:
    print(f"Workflow execution failed: {e}")
```

## Ruby Equivalent

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("TextTransformNode", "upper", { "operation" => "uppercase" })
  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow, { "text" => "hello world" })
    puts result.results["upper"]["result"]
  end
  workflow.close
end
```

**Ruby RuntimeConfig**:

```ruby
config = Kailash::RuntimeConfig.new
config.debug = true
config.max_concurrent_nodes = 8
config.workflow_timeout = 120
config.node_timeout = 30

Kailash::Runtime.open(registry, config) do |runtime|
  result = runtime.execute(workflow, inputs)
end
```

## Resource Lifecycle (Three-Layer Model)

The Runtime manages resources through a three-layer model:

1. **Access layer** -- Global pool registry for key-based pool lookup
2. **Ownership layer** -- DataFlow and nodes own pools with explicit cleanup
3. **Lifecycle layer** -- Per-Runtime resource registry with LIFO shutdown

Database connections created by `DatabaseConnectionNode` are automatically registered and cleaned up when the Runtime is garbage collected (Python) or when the block closes (Ruby).

## Testing with Runtime

### Python

```python
import kailash

def test_workflow_produces_correct_output():
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("TextTransformNode", "upper", {
        "operation": "uppercase",
    })

    wf = builder.build(reg)
    rt = kailash.Runtime(reg)

    result = rt.execute(wf, {"text": "hello"})
    output = result["results"]["upper"]
    assert output.get("result") == "HELLO"
```

### Ruby

```ruby
require "kailash"

RSpec.describe "TextTransform workflow" do
  it "uppercases text" do
    Kailash::Registry.open do |registry|
      builder = Kailash::WorkflowBuilder.new
      builder.add_node("TextTransformNode", "upper", { "operation" => "uppercase" })
      workflow = builder.build(registry)

      Kailash::Runtime.open(registry) do |runtime|
        result = runtime.execute(workflow, { "text" => "hello" })
        expect(result.results["upper"]["result"]).to eq("HELLO")
      end
      workflow.close
    end
  end
end
```

## Verify

```bash
# Python
pip install kailash-enterprise
python -c "import kailash; print(kailash.NodeRegistry().list_types()[:5])"

# Ruby
gem install kailash
ruby -e 'require "kailash"; puts Kailash::Registry.new.list_types.first(5).inspect'
```

<!-- Trigger Keywords: execute workflow, runtime, kailash.Runtime, run workflow, execution, workflow execution -->
