---
name: dataflow-connection-isolation
description: "DataFlow connection isolation and transaction context patterns. Use when asking about 'transaction context', 'ACID guarantees', 'connection sharing', 'multi-node transactions', 'TransactionContextNode', or 'connection isolation'."
---

# DataFlow Connection Isolation & Transaction Context

**CRITICAL UNDERSTANDING**: DataFlow nodes do NOT automatically share transaction context.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `CRITICAL`
> Related Skills: [`dataflow-transactions`](dataflow-transactions.md), [`dataflow-crud-operations`](dataflow-crud-operations.md)
> Related Subagents: `dataflow-specialist` (transaction design)

## Critical Pattern: Connection Isolation by Default

### The Default Behavior (No Transaction Context)

**WITHOUT TransactionContextNode**, each DataFlow node gets its own connection from the pool:

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# Each node gets SEPARATE connection from pool
builder.add_node("CreateUser", "create_user", {
    "name": "Alice",
    "email": "alice@example.com"
})

builder.add_node("CreateOrder", "create_order", {
    "total": 100.0
})

# Use connect() to pass data between nodes (NOT ${} template syntax)
builder.connect("create_user", "id", "create_order", "user_id")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# NO ACID GUARANTEES:
# - If create_order FAILS, create_user is NOT rolled back
# - Each operation commits independently
# - No transaction isolation between nodes
```

**This means:**

- No automatic rollback across multiple nodes
- No ACID guarantees between CreateUser -> CreateOrder
- Partial data commits if workflow fails midway
- Each node gets fresh connection from pool
- Better concurrency (no connection blocking)

### Why This Design?

DataFlow prioritizes **concurrency and performance** over automatic transaction wrapping:

1. **Connection Pool Efficiency**: Connections returned to pool after each operation
2. **No Blocking**: Long-running workflows don't hold connections
3. **Explicit Intent**: Developers must explicitly opt-in to transactions
4. **Runtime Agnostic**: Same behavior in all execution contexts

## Solution: TransactionContextNode for ACID Guarantees

### TransactionContextNode API

`TransactionContextNode` uses an **operations-based API** with a single node type that handles the full transaction lifecycle:

| Operation | Description                                 |
| --------- | ------------------------------------------- |
| `create`  | Create a new transaction context with UUID  |
| `get`     | Retrieve the current state of a transaction |
| `update`  | Add a participant or update metadata        |
| `end`     | End a transaction (commit or rollback)      |

**Inputs:**

| Name              | Type    | Required           | Description                           |
| ----------------- | ------- | ------------------ | ------------------------------------- |
| `operation`       | String  | Yes                | `create`, `get`, `update`, or `end`   |
| `transaction_id`  | String  | For get/update/end | Transaction identifier                |
| `timeout_seconds` | Integer | No                 | Timeout in seconds (default 300)      |
| `metadata`        | Object  | No                 | Metadata for create/update operations |
| `participant`     | String  | No                 | Participant name for update operation |
| `end_status`      | String  | For end            | `committed` or `rolled_back`          |

**Outputs:**

| Name             | Type    | Description                |
| ---------------- | ------- | -------------------------- |
| `transaction_id` | String  | Transaction identifier     |
| `status`         | String  | Current transaction status |
| `created_at`     | Integer | Unix timestamp of creation |
| `metadata`       | Object  | Transaction metadata       |
| `participants`   | Array   | List of participant names  |

### Pattern: Shared Transaction Context

**WITH TransactionContextNode**, all nodes share the same transaction context:

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# 1. Start transaction - creates shared context
builder.add_node("TransactionContextNode", "tx_begin", {
    "operation": "create",
    "timeout_seconds": 30,
    "metadata": {"isolation_level": "READ_COMMITTED"}
})

# 2. All subsequent nodes participate in the transaction
builder.add_node("CreateUser", "create_user", {
    "name": "Alice",
    "email": "alice@example.com"
})

builder.add_node("CreateOrder", "create_order", {
    "total": 100.0
})

builder.add_node("CreatePayment", "create_payment", {
    "amount": 100.0
})

# 3. End transaction with commit
builder.add_node("TransactionContextNode", "tx_commit", {
    "operation": "end",
    "end_status": "committed"
})

# Connect nodes
builder.connect("tx_begin", "transaction_id", "create_user", "transaction_id")
builder.connect("create_user", "id", "create_order", "user_id")
builder.connect("create_order", "id", "create_payment", "order_id")
builder.connect("tx_begin", "transaction_id", "tx_commit", "transaction_id")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# ACID GUARANTEES:
# - If ANY operation fails, ALL are rolled back
# - All operations in single transaction
# - Full isolation from concurrent workflows
```

## Connection Management Internals

### How DataFlow Nodes Check for Transaction Context

```
Pseudo-code of DataFlow node execution logic:

execute(inputs, ctx):
    connection = ctx.get("transaction_connection")

    if connection exists:
        # Use shared transaction connection
        result = connection.execute(query, params)
    else:
        # Create NEW connection from pool (default)
        connection = pool.acquire()
        result = connection.execute(query, params)
        connection.release()  # Return to pool

    return result
```

### Connection Lifecycle

**Without Transaction:**

```
CreateUser:
  1. Get connection from pool
  2. Execute INSERT
  3. Commit
  4. Return connection to pool

CreateOrder:
  1. Get NEW connection from pool
  2. Execute INSERT
  3. Commit
  4. Return connection to pool
```

**With Transaction:**

```
TransactionContextNode (operation: "create"):
  1. Get connection from pool
  2. BEGIN transaction
  3. Store connection in workflow context
  4. Return transaction_id

CreateUser:
  1. Use shared connection from context
  2. Execute INSERT (no commit)

CreateOrder:
  1. Use shared connection from context
  2. Execute INSERT (no commit)

TransactionContextNode (operation: "end", end_status: "committed"):
  1. COMMIT transaction
  2. Return connection to pool
```

## Runtime and Connection Isolation

**IMPORTANT**: `kailash.Runtime` does NOT change connection isolation behavior.

- Does NOT automatically share connections between nodes
- Does NOT provide implicit transaction context
- Executes nodes concurrently (level-based parallelism)
- Requires TransactionContextNode for ACID guarantees

## Common Misconception

### WRONG: "DataFlow automatically wraps workflows in transactions"

```python
# This is MISLEADING (from old docs):
builder = kailash.WorkflowBuilder()

# These operations are automatically in a transaction -- FALSE
builder.add_node("CreateUser", "create_user", {...})
builder.add_node("CreateAccount", "create_account", {...})

# If any operation fails, all are rolled back -- FALSE
```

### CORRECT: "DataFlow requires TransactionContextNode for ACID"

```python
# This is ACCURATE:
builder = kailash.WorkflowBuilder()

# WITHOUT TransactionContextNode: separate connections
builder.add_node("CreateUser", "create_user", {...})
builder.add_node("CreateAccount", "create_account", {...})
# If create_account fails, create_user is NOT rolled back

# WITH TransactionContextNode: shared connection
builder.add_node("TransactionContextNode", "tx_begin", {
    "operation": "create"
})
builder.add_node("CreateUser", "create_user", {...})
builder.add_node("CreateAccount", "create_account", {...})
builder.add_node("TransactionContextNode", "tx_commit", {
    "operation": "end",
    "end_status": "committed"
})
# If create_account fails, create_user IS rolled back
```

## When to Use Transaction Context

### Use TransactionContextNode When:

1. **Financial Operations**: Money transfers, payment processing
2. **Multi-Step Operations**: User registration with profile/settings
3. **Data Consistency**: Parent-child record creation
4. **Audit Requirements**: All-or-nothing compliance
5. **Rollback Needed**: Complex workflows requiring atomicity

### Skip Transaction Context When:

1. **Independent Operations**: Bulk imports where partial success is acceptable
2. **Read-Only Queries**: No data modification
3. **High Concurrency**: Connection blocking unacceptable
4. **Simple CRUD**: Single-node operations (already atomic)

## Related Transaction Nodes

The Kailash SDK also provides these higher-level transaction nodes:

| Node                                | Purpose                                  |
| ----------------------------------- | ---------------------------------------- |
| `TransactionContextNode`            | Core transaction lifecycle management    |
| `SagaCoordinatorNode`               | Saga pattern orchestration               |
| `SagaStepNode`                      | Individual saga step execution           |
| `TwoPhaseCommitCoordinatorNode`     | 2PC distributed transaction coordination |
| `DistributedTransactionManagerNode` | Cross-service distributed transactions   |

## Examples

### Example 1: E-commerce Order (Requires Transaction)

```python
builder = kailash.WorkflowBuilder()

# Start transaction
builder.add_node("TransactionContextNode", "tx_begin", {
    "operation": "create",
    "timeout_seconds": 60,
    "metadata": {"isolation_level": "SERIALIZABLE"}
})

# Create customer
builder.add_node("CreateCustomer", "create_customer", {
    "name": "John Doe",
    "email": "john@example.com"
})

# Create order
builder.add_node("CreateOrder", "create_order", {
    "total": 250.00
})

# Create order items
builder.add_node("BulkCreateOrderItem", "create_items", {
    "data": [
        {"product_id": 1, "quantity": 2},
        {"product_id": 2, "quantity": 1}
    ]
})

# Update inventory
builder.add_node("BulkUpdateInventory", "update_inventory", {
    "filter": {"product_id": {"$in": [1, 2]}},
    "fields": {"reserved": True}
})

# Commit all or rollback
builder.add_node("TransactionContextNode", "tx_commit", {
    "operation": "end",
    "end_status": "committed"
})

# Connect nodes (all share transaction)
builder.connect("tx_begin", "transaction_id", "create_customer", "transaction_id")
builder.connect("create_customer", "id", "create_order", "customer_id")
builder.connect("create_order", "id", "create_items", "input")
builder.connect("create_items", "result", "update_inventory", "input")
builder.connect("tx_begin", "transaction_id", "tx_commit", "transaction_id")
```

### Example 2: Bulk Import (No Transaction Needed)

```python
builder = kailash.WorkflowBuilder()

# No transaction - partial success acceptable
builder.add_node("BulkCreateProduct", "import_products", {
    "data": product_list,  # 10,000 products
    "batch_size": 1000,
    "on_conflict": "skip"  # Skip duplicates
})

# Better concurrency, no connection blocking
# If 9,000 succeed and 1,000 fail, that's acceptable
```

### Example 3: Transaction Rollback on Error

```python
builder = kailash.WorkflowBuilder()

# Start transaction
builder.add_node("TransactionContextNode", "tx_begin", {
    "operation": "create",
    "timeout_seconds": 30
})

builder.add_node("CreateUser", "create_user", {...})
builder.add_node("CreateProfile", "create_profile", {...})

# If an error occurs, explicitly roll back
builder.add_node("TransactionContextNode", "tx_rollback", {
    "operation": "end",
    "end_status": "rolled_back"
})

# On success path, commit
builder.add_node("TransactionContextNode", "tx_commit", {
    "operation": "end",
    "end_status": "committed"
})
```

## Troubleshooting

### Issue: "My workflow has partial data after failure"

**Cause**: No TransactionContextNode - each node commits independently

**Solution**: Add TransactionContextNode with create and end operations

```python
# Before (partial commits):
builder.add_node("CreateUser", "create_user", {...})
builder.add_node("CreateProfile", "create_profile", {...})

# After (atomic):
builder.add_node("TransactionContextNode", "tx_begin", {
    "operation": "create"
})
builder.add_node("CreateUser", "create_user", {...})
builder.add_node("CreateProfile", "create_profile", {...})
builder.add_node("TransactionContextNode", "tx_commit", {
    "operation": "end",
    "end_status": "committed"
})
```

### Issue: "kailash.Runtime doesn't maintain transaction"

**Reality**: kailash.Runtime does not implicitly maintain transactions across nodes

**Solution**: Use TransactionContextNode to explicitly manage transaction lifecycle

```python
# Works identically in all contexts:
import kailash

reg = kailash.NodeRegistry()

builder.add_node("TransactionContextNode", "tx_begin", {
    "operation": "create"
})
builder.add_node("CreateUser", "create_user", {...})
builder.add_node("TransactionContextNode", "tx_commit", {
    "operation": "end",
    "end_status": "committed"
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Documentation References

### Primary Sources

- **kailash.Runtime**: `crates/kailash-core/src/runtime.rs`

### Related Documentation

- **DataFlow CRUD**: [`dataflow-crud-operations`](dataflow-crud-operations.md)
- **DataFlow Transactions**: [`dataflow-transactions`](dataflow-transactions.md)

## Summary

- **Default Behavior**: Each DataFlow node gets separate connection (no ACID)
- **Explicit Opt-In**: Use TransactionContextNode for ACID guarantees
- **Operations API**: Single node type with `create`, `get`, `update`, `end` operations
- **Runtime Agnostic**: Same behavior in all execution contexts
- **Performance First**: Design prioritizes concurrency over implicit transactions
- **Clear Intent**: Developers must explicitly declare transactional boundaries

**Critical Takeaway**: If you need ACID guarantees across multiple DataFlow nodes, YOU MUST use TransactionContextNode. There is no automatic transaction wrapping. Use `"operation": "create"` to begin and `"operation": "end"` with `"end_status": "committed"` or `"rolled_back"` to finalize.

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow transaction context, connection isolation, ACID guarantees, TransactionContextNode, multi-node transactions, connection sharing, transaction propagation, separate connections, connection pool -->
