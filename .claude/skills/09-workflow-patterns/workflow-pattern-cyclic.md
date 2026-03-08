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
    "code": "result = {'counter': 0}"
})

# 2. Process iteration
builder.add_node("HTTPRequestNode", "check_status", {
    "url": "https://api.example.com/status",
    "method": "GET"
})

# 3. Evaluate condition
builder.add_node("ConditionalNode", "check_complete", {
    "condition": "{{check_status.status}} == 'completed'",
    "true_branch": "complete",
    "false_branch": "increment"
})

# 4. Increment counter
builder.add_node("EmbeddedPythonNode", "increment", {
    "code": "result = value + 1",
    "output_vars": ["result"]
})

# 5. Check max iterations
builder.add_node("ConditionalNode", "check_max", {
    "condition": "{{increment.result}} < 10",
    "true_branch": "wait",
    "false_branch": "timeout"
})

# 6. Wait before retry
builder.add_node("WaitNode", "wait", {
    "duration_seconds": 5
})

# 7. Loop back (connect to check_status)
builder.connect("init_counter", "counter", "check_status", "input")
builder.connect("check_status", "status", "check_complete", "condition")
builder.connect("check_complete", "result", "increment", "input")
builder.connect("increment", "result", "check_max", "condition")
builder.connect("check_max", "result", "wait", "trigger")
builder.connect("wait", "done", "check_status", "input")  # Loop!

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
    "query": "SELECT id, data FROM items WHERE processed = FALSE",
    "batch_size": 100
})

# 2. Split into batches
builder.add_node("EmbeddedPythonNode", "split_batches", {
    "code": """
items = results
batch_size = 10
batches = [items[i:i+batch_size] for i in range(0, len(items), batch_size)]
result = {'batches': batches, 'count': len(batches)}
"""
})

# 3. Process each batch
builder.add_node("EmbeddedPythonNode", "process_batch", {
    "code": """
ids = [item['id'] for batch in batches for item in batch]
result = {'ids': ids, 'processed': len(ids)}
"""
})

# 4. Update database
builder.add_node("SQLQueryNode", "mark_processed", {
    "query": "UPDATE items SET processed = TRUE WHERE id IN ({{process_batch.ids}})"
})

# 5. Check for more items
builder.add_node("ConditionalNode", "check_more", {
    "condition": "{{load_items.has_more}} == true",
    "true_branch": "load_items",  # Loop back!
    "false_branch": "complete"
})

builder.connect("load_items", "results", "split_batches", "input")
builder.connect("split_batches", "batches", "process_batch", "input")
builder.connect("process_batch", "ids", "mark_processed", "ids")
builder.connect("mark_processed", "result", "check_more", "condition")
builder.connect("check_more", "result", "load_items", "trigger")
```

## Pattern 3: Exponential Backoff Retry

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Initialize retry state
builder.add_node("EmbeddedPythonNode", "init_retry", {
    "code": "result = {'retry_count': 0, 'backoff_seconds': 1}"
})

# 2. Execute operation
builder.add_node("HTTPRequestNode", "api_call", {
    "url": "https://api.example.com/operation",
    "method": "POST",
    "timeout_ms": 30000
})

# 3. Check success
builder.add_node("ConditionalNode", "check_success", {
    "condition": "{{api_call.status_code}} == 200",
    "true_branch": "success",
    "false_branch": "check_retry"
})

# 4. Check retry count
builder.add_node("ConditionalNode", "check_retry", {
    "condition": "{{init_retry.retry_count}} < 5",
    "true_branch": "calculate_backoff",
    "false_branch": "failed"
})

# 5. Calculate exponential backoff
builder.add_node("EmbeddedPythonNode", "calculate_backoff", {
    "code": "result = value * 2",  # Exponential: 1, 2, 4, 8, 16 seconds
    "output_vars": ["result"]
})

# 6. Wait with backoff
builder.add_node("WaitNode", "backoff_wait", {
    "duration_seconds": "{{calculate_backoff.result}}"
})

# 7. Increment retry counter
builder.add_node("EmbeddedPythonNode", "increment_retry", {
    "code": "result = value + 1",
    "output_vars": ["result"]
})

# 8. Loop back to retry
builder.connect("init_retry", "retry_count", "api_call", "retry")
builder.connect("api_call", "status_code", "check_success", "condition")
builder.connect("check_success", "result", "check_retry", "condition")
builder.connect("check_retry", "result", "calculate_backoff", "input")
builder.connect("calculate_backoff", "result", "backoff_wait", "duration_seconds")
builder.connect("backoff_wait", "done", "increment_retry", "input")
builder.connect("increment_retry", "result", "api_call", "retry")  # Loop!
```

## Pattern 4: Iterative Refinement

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Initial prompt
builder.add_node("EmbeddedPythonNode", "init_prompt", {
    "code": "result = {'prompt': 'Write a product description for: ' + input_data.get('product_name', ''), 'iteration': 0}"
})

# 2. Generate content (LLM)
builder.add_node("LLMNode", "generate", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "{{init_prompt.prompt}}"
})

# 3. Evaluate quality
builder.add_node("LLMNode", "evaluate", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "Rate this description 1-10: {{generate.response}}"
})

# 4. Check quality threshold
builder.add_node("ConditionalNode", "check_quality", {
    "condition": "{{evaluate.score}} >= 8",
    "true_branch": "approved",
    "false_branch": "refine"
})

# 5. Refine prompt with feedback
builder.add_node("LLMNode", "refine", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "Improve this: {{generate.response}}. Feedback: {{evaluate.feedback}}"
})

# 6. Check max iterations
builder.add_node("ConditionalNode", "check_max", {
    "condition": "{{init_prompt.iteration}} < 3",
    "true_branch": "increment",
    "false_branch": "use_best"
})

# 7. Increment iteration
builder.add_node("EmbeddedPythonNode", "increment", {
    "code": "result = value + 1",
    "output_vars": ["result"]
})

# Loop back for refinement
builder.connect("init_prompt", "prompt", "generate", "prompt")
builder.connect("generate", "response", "evaluate", "prompt")
builder.connect("evaluate", "score", "check_quality", "condition")
builder.connect("check_quality", "result", "refine", "input")
builder.connect("refine", "response", "check_max", "condition")
builder.connect("check_max", "result", "increment", "input")
builder.connect("increment", "result", "generate", "iteration")  # Loop!
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
