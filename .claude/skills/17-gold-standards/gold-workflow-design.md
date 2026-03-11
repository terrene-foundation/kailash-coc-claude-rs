---
name: gold-workflow-design
description: "Gold standard for workflow design. Use when asking 'workflow design standard', 'workflow best practices', or 'design workflow'."
---

# Gold Standard: Workflow Design

> **Skill Metadata**
> Category: `gold-standards`
> Priority: `HIGH`

## Design Principles

### 1. Single Responsibility
```python
# ✅ GOOD: Each workflow does one thing
workflow_user_registration = kailash.WorkflowBuilder()
workflow_send_welcome_email = kailash.WorkflowBuilder()

# ❌ BAD: One workflow does too much
workflow_everything = kailash.WorkflowBuilder()  # Registration + email + billing...
```

### 2. Composability
```python
# ✅ GOOD: Reusable sub-workflows
def create_validation_workflow():
    builder = kailash.WorkflowBuilder()
    builder.add_node("SchemaValidatorNode", "validate", {...})
    reg = kailash.NodeRegistry()
    return builder.build(reg)

# Reuse builder pattern in multiple workflows
validation_wf = create_validation_workflow()
```

### 3. Error Handling
```python
# ✅ GOOD: Use RetryNode for error handling
builder.add_node("RetryNode", "api_retry", {
    "max_retries": 3, "initial_delay_ms": 1000
})
builder.connect("api_retry", "result", "log_error", "input")
```

### 4. Clear Naming
```python
# ✅ GOOD: Descriptive node IDs
builder.add_node("LLMNode", "generate_product_description", {...})

# ❌ BAD: Generic names
builder.add_node("LLMNode", "node1", {...})
```

### 5. Validate Before Execute

```python
# Build validates the workflow DAG, connections, and node types
reg = kailash.NodeRegistry()
wf = builder.build(reg)  # Raises on invalid workflow

rt = kailash.Runtime(reg)
result = rt.execute(wf)
```

### 6. Resource Lifecycle

```python
# Resources (database pools, caches) are managed by the Runtime
# and cleaned up automatically in LIFO order

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

builder = kailash.WorkflowBuilder()
builder.add_node("DatabaseConnectionNode", "connect", {
    "connection_string": os.environ["DATABASE_URL"]
})
builder.add_node("SQLQueryNode", "query", {
    "pool_key": "my_db",
    "query": "SELECT * FROM users",
    "operation": "select"
})
builder.connect("connect", "pool_key", "query", "pool_key")

result = rt.execute(builder.build(reg))
# Resources cleaned up when Runtime is garbage collected
```

## Gold Standard Checklist

- [ ] Single responsibility per workflow
- [ ] Descriptive node IDs (snake_case, describes purpose)
- [ ] `builder.build(reg)` called before execution (validation boundary)
- [ ] Error handlers for critical nodes (RetryNode, ConditionalNode)
- [ ] 4-parameter `connect()` calls
- [ ] No circular dependencies (validated by `build()`)
- [ ] Resource cleanup managed by Runtime lifecycle
- [ ] Composable via helper functions
- [ ] Unit tests for workflow logic

<!-- Trigger Keywords: workflow design standard, workflow best practices, design workflow, workflow gold standard -->
