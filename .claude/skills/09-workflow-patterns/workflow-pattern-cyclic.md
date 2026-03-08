---
name: workflow-pattern-cyclic
description: "Cyclic workflow patterns with loops and iterations. Use when asking 'loop workflow', 'cyclic', 'iterate', 'repeat until', or 'workflow cycles'."
---

# Cyclic Workflow Patterns

Patterns for implementing loops, iterations, and cyclic workflows.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `HIGH`
> Related Skills: [`workflow-pattern-etl`](workflow-pattern-etl.md), [`pattern-expert`](../../01-core-sdk/pattern-expert.md)
> Related Subagents: `pattern-expert` (cyclic workflows)

> **Note**: `{{...}}` values in node configs below are illustrative placeholders.
> Actual data flows via `builder.connect()` — template syntax does NOT work at runtime.

## Quick Reference

Cyclic workflows enable:

- **Loop until condition** - Repeat until success/threshold
- **Batch processing** - Process items in chunks
- **Retry logic** - Automatic retry with backoff
- **Iterative refinement** - Multi-pass processing

## Pattern 1: Loop Until Condition

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Initialize counter
builder.add_node("EmbeddedPythonNode", "init_counter", {
    "code": "result = {'counter': 0}",
    "output_vars": ["result"]
})

# 2. Process iteration
builder.add_node("HTTPRequestNode", "check_status", {
    "url": "https://api.example.com/status",
    "method": "GET"
})

# 3. Evaluate condition — ConditionalNode takes no config; condition/if_value/else_value via connections
builder.add_node("ConditionalNode", "check_complete", {})

# 4. Increment counter
builder.add_node("EmbeddedPythonNode", "increment", {
    "code": "result = value + 1",
    "output_vars": ["result"]
})

# 5. Check max iterations — ConditionalNode takes no config
builder.add_node("ConditionalNode", "check_max", {})

# 6. Wait before retry — WaitNode uses duration_ms, output is "data"
builder.add_node("WaitNode", "wait", {
    "duration_ms": 5000
})

# 7. Loop back (connect to check_status)
builder.connect("init_counter", "outputs", "check_status", "url")
builder.connect("check_status", "body", "check_complete", "condition")
builder.connect("check_complete", "result", "increment", "inputs")
builder.connect("increment", "outputs", "check_max", "condition")
builder.connect("check_max", "result", "wait", "data")
builder.connect("wait", "data", "check_status", "url")  # Loop!

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Pattern 2: Batch Processing

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Load all items
builder.add_node("SQLQueryNode", "load_items", {
    "query": "SELECT id, data FROM items WHERE processed = FALSE LIMIT 100"
})

# 2. Split into batches
builder.add_node("EmbeddedPythonNode", "split_batches", {
    "code": """
items = results
batch_size = 10
batches = [items[i:i+batch_size] for i in range(0, len(items), batch_size)]
result = {'batches': batches, 'count': len(batches)}
""",
    "output_vars": ["result"]
})

# 3. Process each batch
builder.add_node("EmbeddedPythonNode", "process_batch", {
    "code": """
ids = [item['id'] for batch in batches for item in batch]
result = {'ids': ids, 'processed': len(ids)}
""",
    "output_vars": ["result"]
})

# 4. Update database
builder.add_node("SQLQueryNode", "mark_processed", {
    "query": "UPDATE items SET processed = TRUE WHERE id IN ({{process_batch.ids}})"
})

# 5. Check for more items — ConditionalNode takes no config
builder.add_node("ConditionalNode", "check_more", {})

builder.connect("load_items", "rows", "split_batches", "inputs")
builder.connect("split_batches", "outputs", "process_batch", "inputs")
builder.connect("process_batch", "outputs", "mark_processed", "body")
builder.connect("mark_processed", "row_count", "check_more", "condition")
builder.connect("check_more", "result", "load_items", "body")
```

## Pattern 3: Exponential Backoff Retry

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Initialize retry state
builder.add_node("EmbeddedPythonNode", "init_retry", {
    "code": "result = {'retry_count': 0, 'backoff_seconds': 1}",
    "output_vars": ["result"]
})

# 2. Execute operation
builder.add_node("HTTPRequestNode", "api_call", {
    "url": "https://api.example.com/operation",
    "method": "POST",
    "timeout_ms": 30000
})

# 3. Check success — ConditionalNode takes no config
builder.add_node("ConditionalNode", "check_success", {})

# 4. Check retry count — ConditionalNode takes no config
builder.add_node("ConditionalNode", "check_retry", {})

# 5. Calculate exponential backoff
builder.add_node("EmbeddedPythonNode", "calculate_backoff", {
    "code": "result = value * 2",  # Exponential: 1, 2, 4, 8, 16 seconds
    "output_vars": ["result"]
})

# 6. Wait with backoff — WaitNode uses duration_ms, output is "data"
builder.add_node("WaitNode", "backoff_wait", {
    "duration_ms": 1000
})

# 7. Increment retry counter
builder.add_node("EmbeddedPythonNode", "increment_retry", {
    "code": "result = value + 1",
    "output_vars": ["result"]
})

# 8. Loop back to retry
builder.connect("init_retry", "outputs", "api_call", "url")
builder.connect("api_call", "status_code", "check_success", "condition")
builder.connect("check_success", "result", "check_retry", "condition")
builder.connect("check_retry", "result", "calculate_backoff", "inputs")
builder.connect("calculate_backoff", "outputs", "backoff_wait", "data")
builder.connect("backoff_wait", "data", "increment_retry", "inputs")
builder.connect("increment_retry", "outputs", "api_call", "url")  # Loop!
```

## Pattern 4: Iterative Refinement

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Initial prompt
builder.add_node("EmbeddedPythonNode", "init_prompt", {
    "code": "result = {'prompt': 'Write a product description for: ' + input_data.get('product_name', ''), 'iteration': 0}",
    "output_vars": ["result"]
})

# 2. Generate content (LLM)
builder.add_node("LLMNode", "generate", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
})

# 3. Evaluate quality
builder.add_node("LLMNode", "evaluate", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
})

# Data flows via connect(), NOT template strings:
builder.connect("init_prompt", "outputs", "generate", "prompt")
builder.connect("generate", "response", "evaluate", "prompt")

# 4. Check quality threshold — ConditionalNode takes no config
builder.add_node("ConditionalNode", "check_quality", {})

# 5. Refine prompt with feedback
builder.add_node("LLMNode", "refine", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "Improve this: {{generate.response}}. Feedback: {{evaluate.response}}"
})

# 6. Check max iterations — ConditionalNode takes no config
builder.add_node("ConditionalNode", "check_max", {})

# 7. Increment iteration
builder.add_node("EmbeddedPythonNode", "increment", {
    "code": "result = value + 1",
    "output_vars": ["result"]
})

# Loop back for refinement
builder.connect("init_prompt", "outputs", "generate", "prompt")
builder.connect("generate", "response", "evaluate", "prompt")
builder.connect("evaluate", "response", "check_quality", "condition")
builder.connect("check_quality", "result", "refine", "prompt")
builder.connect("refine", "response", "check_max", "condition")
builder.connect("check_max", "result", "increment", "inputs")
builder.connect("increment", "outputs", "generate", "prompt")  # Loop!
```

## Best Practices

1. **Always set max iterations** - Prevent infinite loops
2. **Use explicit loop counters** - Track iteration count
3. **Implement backoff delays** - Avoid overwhelming systems
4. **Store intermediate results** - Enable debugging/recovery
5. **Clear exit conditions** - Define success/failure states
6. **Monitor loop metrics** - Track iterations, duration, success rate

## Common Pitfalls

- **No exit condition** - Infinite loops
- **Missing max iterations** - Runaway processes
- **No backoff delay** - API rate limiting
- **Memory leaks** - Accumulating state in loops
- **Poor error handling** - Unhandled failures in iterations

## Related Skills

- **ETL Patterns**: [`workflow-pattern-etl`](workflow-pattern-etl.md)
- **Error Handling**: [`gold-error-handling`](../../17-gold-standards/gold-error-handling.md)
- **Conditional Logic**: [`nodes-logic-reference`](../nodes/nodes-logic-reference.md)

<!-- Trigger Keywords: loop workflow, cyclic, iterate, repeat until, workflow cycles, retry logic, batch processing -->
