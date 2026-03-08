---
name: nodes-transaction-reference
description: "Transaction nodes reference (Saga, 2PC, DTM). Use when asking 'transaction node', 'Saga', '2PC', 'distributed transaction', or 'transaction coordinator'."
---

# Transaction Nodes Reference

Complete reference for distributed transaction management nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `MEDIUM`
> Related Skills: [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (transaction patterns)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available transaction nodes: DistributedDistributedTransactionManagerNode (auto-select pattern),
#   SagaCoordinatorNode (high availability), SagaStepNode,
#   TwoPhaseCommitCoordinatorNode (strong consistency)
```

## Automatic Pattern Selection

### DistributedDistributedTransactionManagerNode ⭐
```python
import kailash

builder = kailash.WorkflowBuilder()

# Auto-select Saga or 2PC based on requirements
builder.add_node("DistributedDistributedTransactionManagerNode", "dtm", {
    "transaction_id": "txn_123",
    "participants": [
        {"service": "order_service", "supports_2pc": True},
        {"service": "payment_service", "supports_2pc": True},
        {"service": "inventory_service", "supports_2pc": False}
    ],
    "pattern": "auto"  # or "saga", "2pc"
})
```

## Saga Pattern (High Availability)

### SagaCoordinatorNode
```python
builder.add_node("SagaCoordinatorNode", "saga", {
    "saga_id": "saga_123",
    "steps": [
        {"service": "order", "action": "create_order", "compensation": "cancel_order"},
        {"service": "payment", "action": "charge", "compensation": "refund"},
        {"service": "inventory", "action": "reserve", "compensation": "release"}
    ]
})
```

### SagaStepNode
```python
builder.add_node("SagaStepNode", "step", {
    "saga_id": "saga_123",
    "step_name": "create_order",
    "action": "execute",
    "compensation_action": "cancel_order"
})
```

## Two-Phase Commit (Strong Consistency)

### TwoPhaseCommitCoordinatorNode
```python
builder.add_node("TwoPhaseCommitCoordinatorNode", "2pc", {
    "transaction_id": "txn_123",
    "participants": [
        {"service": "order_db", "endpoint": "/prepare"},
        {"service": "payment_db", "endpoint": "/prepare"},
        {"service": "inventory_db", "endpoint": "/prepare"}
    ],
    "timeout": 30
})
```

## When to Use Each Pattern

| Pattern | Use When | Benefits |
|---------|----------|----------|
| **DistributedDistributedTransactionManagerNode** | Mixed capabilities | Auto-selection |
| **SagaCoordinatorNode** | High availability needed | Eventual consistency |
| **TwoPhaseCommitCoordinatorNode** | Strong consistency required | ACID properties |

## Related Skills

- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: transaction node, Saga, 2PC, distributed transaction, transaction coordinator, SagaCoordinatorNode, TwoPhaseCommitCoordinatorNode -->
