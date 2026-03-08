---
name: dataflow-transactions
description: "DataFlow distributed transactions. Use when DataFlow transactions, saga, distributed transactions, 2PC, or transaction coordination."
---

# DataFlow Distributed Transactions

Distributed transaction patterns with saga and two-phase commit support.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> Related Skills: [`dataflow-crud-operations`](#), [`workflow-pattern-cyclic`](../09-workflow-patterns/workflow-pattern-cyclic.md)
> Related Subagents: `dataflow-specialist` (complex transactions)

## Quick Reference

- **DistributedTransactionManagerNode**: Unified entry point for distributed transactions
- **Operations**: `begin`, `enlist`, `status`, `list`, `rollback`, `commit`
- **Transaction Types**: `saga` (compensating) or `2pc` (two-phase commit)
- **Related Nodes**: `SagaCoordinatorNode`, `SagaStepNode`, `TwoPhaseCommitCoordinatorNode`, `TransactionContextNode`

## DistributedTransactionManagerNode

Operations-based node for managing distributed transactions.

### Inputs

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `operation` | String | Yes | `begin`, `enlist`, `status`, `list`, `rollback`, `commit` |
| `transaction_type` | String | No | `saga` or `2pc` (for `begin`) |
| `transaction_id` | String | No | Transaction identifier (for `enlist`/`status`/`rollback`/`commit`) |
| `resource` | Object | No | Resource to enlist |
| `timeout_seconds` | Integer | No | Transaction timeout (default: 300) |

### Outputs

| Name | Type | Description |
|------|------|-------------|
| `transaction_id` | String | Transaction identifier |
| `status` | String | Transaction status |
| `enlisted_resources` | Array | Resources in the transaction |
| `active_transactions` | Integer | Count of active transactions |
| `transaction_type` | String | `saga` or `2pc` |

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# 1. Begin a saga transaction
builder.add_node("DistributedTransactionManagerNode", "begin_tx", {
    "operation": "begin",
    "transaction_type": "saga",
    "timeout_seconds": 30
})

# 2. Enlist resources
builder.add_node("DistributedTransactionManagerNode", "enlist_payment", {
    "operation": "enlist",
    "transaction_id": "tx-123",
    "resource": {"type": "payment", "amount": 99.99}
})

# 3. Commit the transaction
builder.add_node("DistributedTransactionManagerNode", "commit_tx", {
    "operation": "commit",
    "transaction_id": "tx-123"
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
# result["results"]["begin_tx"]["transaction_id"] -> "tx-123"
# result["results"]["begin_tx"]["status"] -> "active"
```

## Transaction Operations

### Begin

```python
builder.add_node("DistributedTransactionManagerNode", "begin", {
    "operation": "begin",
    "transaction_type": "saga",     # or "2pc"
    "timeout_seconds": 60
})
# Returns: {"transaction_id": "...", "status": "active", "transaction_type": "saga"}
```

### Enlist Resource

```python
builder.add_node("DistributedTransactionManagerNode", "enlist", {
    "operation": "enlist",
    "transaction_id": "tx-123",
    "resource": {"type": "inventory", "item_id": "item-456", "quantity": 1}
})
# Returns: {"transaction_id": "tx-123", "enlisted_resources": [...]}
```

### Check Status

```python
builder.add_node("DistributedTransactionManagerNode", "check", {
    "operation": "status",
    "transaction_id": "tx-123"
})
# Returns: {"transaction_id": "tx-123", "status": "active", ...}
```

### Commit

```python
builder.add_node("DistributedTransactionManagerNode", "commit", {
    "operation": "commit",
    "transaction_id": "tx-123"
})
# Returns: {"transaction_id": "tx-123", "status": "committed"}
```

### Rollback

```python
builder.add_node("DistributedTransactionManagerNode", "rollback", {
    "operation": "rollback",
    "transaction_id": "tx-123"
})
# Returns: {"transaction_id": "tx-123", "status": "rolled_back"}
```

### List Active

```python
builder.add_node("DistributedTransactionManagerNode", "list_all", {
    "operation": "list"
})
# Returns: {"active_transactions": 3, ...}
```

## Related Transaction Nodes

| Node | Purpose |
|------|---------|
| `SagaCoordinatorNode` | Orchestrate multi-step saga with automatic compensation |
| `SagaStepNode` | Define individual saga steps with forward/compensating actions |
| `TwoPhaseCommitCoordinatorNode` | 2PC protocol with prepare/commit/abort phases |
| `TransactionContextNode` | Manage transaction context (begin/commit/rollback) |

## Quick Tips

- Use saga for long-running, eventually-consistent transactions
- Use 2PC for strong ACID consistency across resources
- Set appropriate `timeout_seconds` to prevent orphaned transactions
- Use `list` operation to monitor active transactions
- All transaction nodes use the standard async `Node` trait -- execute via `Runtime`

<!-- Trigger Keywords: DataFlow transactions, saga, distributed transactions, 2PC, transaction coordination, compensating transactions -->
