# Ruby Binding Common Mistakes

Error resolution guide for the Rust-backed kailash Ruby gem.

## Top 10 Mistakes

### 1. Missing Registry in build()

```ruby
# WRONG — raises Kailash::Error
workflow = builder.build

# CORRECT
registry = Kailash::Registry.new
workflow = builder.build(registry)
```

**Why:** The registry validates node types at build time.

### 2. Missing Registry in Runtime.new

```ruby
# WRONG — raises Kailash::Error
runtime = Kailash::Runtime.new

# CORRECT
registry = Kailash::Registry.new
runtime = Kailash::Runtime.new(registry)
```

### 3. Not Closing Resources

```ruby
# WRONG — leaks resources
registry = Kailash::Registry.new
runtime = Kailash::Runtime.new(registry)
result = runtime.execute(workflow, inputs)
# registry and runtime never closed!

# CORRECT — block form (preferred)
Kailash::Registry.open do |registry|
  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow, inputs)
  end
end

# CORRECT — explicit close with ensure
registry = Kailash::Registry.new
runtime = Kailash::Runtime.new(registry)
begin
  result = runtime.execute(workflow, inputs)
ensure
  runtime.close
  registry.close
end
```

### 4. Using Symbol Keys in Config

```ruby
# WRONG — symbols not converted correctly
builder.add_node("NoOpNode", "n", { key: "value" })

# CORRECT — string keys
builder.add_node("NoOpNode", "n", { "key" => "value" })
```

**Why:** Rust expects String keys in the ValueMap. Symbol keys may not convert correctly.

### 5. Registering Callback After Runtime Creation

```ruby
# WRONG — raises Kailash::Error
registry = Kailash::Registry.new
runtime = Kailash::Runtime.new(registry)
registry.register_callback("MyNode", fn, ["in"], ["out"])  # Too late!

# CORRECT — register before creating runtime
registry = Kailash::Registry.new
registry.register_callback("MyNode", fn, ["in"], ["out"])
runtime = Kailash::Runtime.new(registry)
```

### 6. Wrong Connection Parameter Order

```ruby
# WRONG — swapped source/target or missing output/input names
builder.connect("target", "source")
builder.connect("source", "target", "output", "input")

# CORRECT — source_node, source_output, target_node, target_input
builder.connect("source", "output", "target", "input")
```

**Mnemonic**: "From node.output TO node.input" — source first, then target.

### 7. Using a Closed Registry/Runtime

```ruby
# WRONG — raises Kailash::Error with "closed" message
registry = Kailash::Registry.new
registry.close
workflow = builder.build(registry)  # Error: closed

# CORRECT — check before use
if registry.closed?
  registry = Kailash::Registry.new
end
```

### 8. Using Timeout.timeout with execute

```ruby
require "timeout"

# WRONG — Ruby Timeout doesn't interrupt Rust execution
Timeout.timeout(5) do
  result = runtime.execute(workflow, inputs)  # Won't be interrupted!
end

# CORRECT — use Rust-level timeouts
config = Kailash::RuntimeConfig.new
config.workflow_timeout = 5
config.node_timeout = 3
runtime = Kailash::Runtime.new(registry, config)
```

**Why:** `runtime.execute` releases the GVL. Ruby's UBF (Unblocking Function) cannot interrupt Rust code running without the GVL.

### 9. Node Type Name Misspelling

```ruby
# WRONG — case-sensitive, exact names required
builder.add_node("jsonTransformNode", "t", {})   # wrong case
builder.add_node("JSONTransform", "t", {})        # missing "Node"
builder.add_node("Json_Transform_Node", "t", {})  # wrong format

# CORRECT
builder.add_node("JSONTransformNode", "t", {})
```

**Tip**: Use `registry.list_types` to see all valid node type names.

### 10. Missing macOS Codesign

```bash
# WRONG — Ruby hangs indefinitely on require
cp target/release/libkailash.dylib lib/kailash/kailash.bundle
ruby -e 'require "kailash"'   # HANGS!

# CORRECT — codesign after copy
cp target/release/libkailash.dylib lib/kailash/kailash.bundle
codesign -fs - lib/kailash/kailash.bundle   # REQUIRED on macOS
ruby -e 'require "kailash"'   # Works
```

## Error Messages & Solutions

### "Unknown node type 'X'" (Kailash::Error)

**Cause**: Node type name not found in registry.

**Fix**:

1. Check spelling (case-sensitive): `JSONTransformNode` not `jsonTransformNode`
2. For custom nodes: ensure `register_callback()` was called
3. List available types: `puts registry.list_types.sort`

### "closed" (Kailash::Error)

**Cause**: Trying to use a closed Registry, Runtime, or Workflow.

**Fix**:

1. Don't call `close` before you're done using the resource
2. With block form, don't use the object after the block ends
3. Check `registry.closed?` / `runtime.closed?` before use

### "requires 1 or 2 arguments" (Kailash::Error)

**Cause**: Wrong number of arguments to `Runtime.new`.

**Fix**: `Runtime.new(registry)` or `Runtime.new(registry, config)`

### "block" (Kailash::Error)

**Cause**: Called `Runtime.open` or `Registry.open` without a block.

**Fix**: `Runtime.open(registry) { |rt| ... }`

### Kailash::ExecutionError

**Cause**: Workflow has structural issues or a node failed during execution.

**Fix**:

1. Check all connections are valid
2. For SwitchNode: ensure condition matches a case or has default
3. Check the error message for which node failed

### Kailash::ValueError

**Cause**: Invalid configuration value.

**Fix**:

1. `conditional_execution` must be "skip" or "evaluate_all"
2. `connection_validation` must be "strict", "warn", or "off"
3. Check RuntimeConfig setter constraints

### Ruby hangs on `require "kailash"` (macOS only)

**Cause**: cdylib not codesigned. macOS kills unsigned native extensions.

**Fix**: `codesign -fs - lib/kailash/kailash.bundle`

## Performance Tips

1. **Reuse Registry**: Create once, use for all workflows
2. **Reuse Runtime**: Create once, execute many workflows
3. **Block form**: Auto-cleanup prevents resource leaks
4. **Parallel execution**: Set `RuntimeConfig#max_concurrent_nodes=` for independent node groups
5. **GVL release**: `runtime.execute()` releases the GVL — safe with Ruby threads
6. **Timeouts**: Use `workflow_timeout` and `node_timeout` instead of Ruby `Timeout.timeout`
