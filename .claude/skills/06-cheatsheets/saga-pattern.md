---
name: saga-pattern
description: "Saga pattern for distributed workflows. Use when asking 'saga pattern', 'distributed saga', 'compensating transactions', 'saga workflows', or 'distributed coordination'."
---

# Saga Pattern

Saga Pattern for database operations and query management.

> **Skill Metadata**
> Category: `database`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Saga Pattern
- **Category**: database
- **Priority**: HIGH
- **Trigger Keywords**: saga pattern, distributed saga, compensating transactions, saga workflows

## Core Pattern

```python
import kailash

# Start a saga with ordered steps and compensating actions.
# SagaCoordinatorNode accepts: operation, saga_id, steps, step_id, step_result.
# Valid operations: start, step_complete, step_failed, abort, get_status.

builder = kailash.WorkflowBuilder()

# Start a new saga -- provide operation="start" and steps array as inputs
builder.add_node("SagaCoordinatorNode", "saga", {})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

result = rt.execute(builder.build(reg), {
    "saga.operation": "start",
    "saga.steps": [
        {
            "step_id": "validate_order",
            "action": {"type": "validate", "check_inventory": True},
            "compensate_action": {"type": "cancel_validation"}
        },
        {
            "step_id": "charge_payment",
            "action": {"type": "charge", "amount": 100.0},
            "compensate_action": {"type": "refund_payment"}
        }
    ]
})

saga_id = result["saga"]["saga_id"]
# status will be "executing" after start
```

## Common Use Cases

- **Order Processing Workflows**: Multi-step order processing with inventory checks, payment processing, and shipment creation - each with automatic compensations on failure
- **Microservices Coordination**: Distributed transactions across multiple services where each service operation can be independently compensated
- **Multi-Database Operations**: Coordinating writes across multiple databases with automatic rollback through compensation actions
- **Long-Running Business Processes**: Managing complex workflows with state persistence, resumability, and automatic error recovery
- **API Integration Workflows**: Chaining external API calls where failures require undoing previous operations (e.g., cancel reservation, refund payment)

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For patterns**: See [`workflow-patterns-library`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:

- **pattern-expert**: Complex patterns, multi-node workflows
- **sdk-navigator**: Error resolution, parameter issues
- **testing-specialist**: Comprehensive testing strategies

## Quick Tips

- 💡 **Always Define Compensations**: Every saga step must have a compensation action to handle failures and maintain consistency
- 💡 **Make Steps Idempotent**: Steps should be safely retryable - use idempotency keys or check-before-execute patterns
- 💡 **Keep Steps Atomic**: Each step should be a single, coherent operation that can be independently compensated
- 💡 **Test Compensation Paths**: Explicitly test failure scenarios to ensure compensations work correctly before production
- 💡 **Use State Persistence**: Configure Redis or database storage for saga state to enable resumability after system failures
- 💡 **Handle Partial Failures**: Plan for compensation failures with manual intervention workflows and alerting
- 💡 **Set Realistic Timeouts**: Configure appropriate timeouts for both steps and compensations based on expected operation duration

## Keywords for Auto-Trigger

<!-- Trigger Keywords: saga pattern, distributed saga, compensating transactions, saga workflows -->
