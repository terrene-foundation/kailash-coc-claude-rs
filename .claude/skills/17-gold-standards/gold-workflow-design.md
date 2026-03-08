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

## Gold Standard Checklist

- [ ] Single responsibility per workflow
- [ ] Descriptive node IDs
- [ ] Error handlers for critical nodes
- [ ] Input validation nodes
- [ ] Clear connection flow
- [ ] No circular dependencies
- [ ] Documented with comments
- [ ] Unit tests for workflow logic

<!-- Trigger Keywords: workflow design standard, workflow best practices, design workflow, workflow gold standard -->
