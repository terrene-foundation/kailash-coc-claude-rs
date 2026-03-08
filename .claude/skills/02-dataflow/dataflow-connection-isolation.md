---
name: dataflow-connection-isolation
description: "DataFlow connection isolation and transaction context patterns. Use when asking about 'transaction context', 'ACID guarantees', 'connection sharing', 'multi-node transactions', 'TransactionScopeNode', or 'connection isolation'."
---

# DataFlow Connection Isolation & Transaction Context

**CRITICAL UNDERSTANDING**: DataFlow nodes do NOT automatically share transaction context.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `CRITICAL`
> Related Skills: [`dataflow-transactions`](dataflow-transactions.md), [`dataflow-crud-operations`](dataflow-crud-operations.md)
> Related Subagents: `dataflow-specialist` (transaction design)

## ⚠️ Critical Pattern: Connection Isolation by Default

### The Default Behavior (No Transaction Context)

**WITHOUT TransactionScopeNode**, each DataFlow node gets its own connection from the pool:

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# Each node gets SEPARATE connection from pool
builder.add_node("UserCreateNode", "create_user", {
    "name": "Alice",
    "email": "alice@example.com"
})

builder.add_node("OrderCreateNode", "create_order", {
    "user_id": "${create_user.id}",  # Will work
    "total": 100.0
})

builder.connect("create_user", "id", "create_order", "user_id")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# ❌ NO ACID GUARANTEES:
# - If create_order FAILS, create_user is NOT rolled back
# - Each operation commits independently
# - No transaction isolation between nodes
```

**This means:**
- ❌ No automatic rollback across multiple nodes
- ❌ No ACID guarantees between UserCreateNode → OrderCreateNode
- ❌ Partial data commits if workflow fails midway
- ✅ Each node gets fresh connection from pool
- ✅ Better concurrency (no connection blocking)

### Why This Design?

DataFlow prioritizes **concurrency and performance** over automatic transaction wrapping:

1. **Connection Pool Efficiency**: Connections returned to pool after each operation
2. **No Blocking**: Long-running workflows don't hold connections
3. **Explicit Intent**: Developers must explicitly opt-in to transactions
4. **Runtime Agnostic**: Same behavior in all execution contexts

## ✅ Solution: TransactionScopeNode for ACID Guarantees

### Pattern: Shared Transaction Context

**WITH TransactionScopeNode**, all nodes share the same database connection:

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# 1. Start transaction - creates shared connection
builder.add_node("TransactionScopeNode", "tx", {
    "isolation_level": "READ_COMMITTED",
    "timeout": 30,
    "rollback_on_error": True
})

# 2. All subsequent nodes use shared connection
builder.add_node("UserCreateNode", "create_user", {
    "name": "Alice",
    "email": "alice@example.com"
})

builder.add_node("OrderCreateNode", "create_order", {
    "user_id": "${create_user.id}",
    "total": 100.0
})

builder.add_node("PaymentCreateNode", "create_payment", {
    "order_id": "${create_order.id}",
    "amount": 100.0
})

# 3. Commit transaction - releases connection
builder.add_node("TransactionCommitNode", "commit", {})

# Connect nodes
builder.connect("tx", "result", "create_user", "input")
builder.connect("create_user", "id", "create_order", "user_id")
builder.connect("create_order", "id", "create_payment", "order_id")
builder.connect("create_payment", "result", "commit", "input")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# ✅ ACID GUARANTEES:
# - If ANY operation fails, ALL are rolled back
# - All operations in single transaction
# - Full isolation from concurrent workflows
```

## Connection Management Internals

### How DataFlow Nodes Check for Transaction Context

```python
# Pseudo-code from DataFlow node execution
async def async_run(self, **kwargs):
    # Check for active transaction context
    connection = self.get_workflow_context("transaction_connection")

    if connection:
        # Use shared transaction connection
        result = await connection.execute(query, params)
    else:
        # Create NEW connection from pool (default)
        connection = await create_connection()
        result = await connection.execute(query, params)
        await connection.close()  # Return to pool

    return result
```

### Connection Lifecycle

**Without Transaction:**
```
UserCreateNode:
  1. Get connection from pool
  2. Execute INSERT
  3. Commit
  4. Return connection to pool

OrderCreateNode:
  1. Get NEW connection from pool
  2. Execute INSERT
  3. Commit
  4. Return connection to pool
```

**With Transaction:**
```
TransactionScopeNode:
  1. Get connection from pool
  2. BEGIN transaction
  3. Store connection in workflow context

UserCreateNode:
  1. Use shared connection from context
  2. Execute INSERT (no commit)

OrderCreateNode:
  1. Use shared connection from context
  2. Execute INSERT (no commit)

TransactionCommitNode:
  1. COMMIT transaction
  2. Return connection to pool
```

## Comparison: kailash.Runtime vs kailash.Runtime

**IMPORTANT**: This behavior is **IDENTICAL** in both runtimes.

| Runtime | Connection Behavior | Transaction Context |
|---------|---------------------|---------------------|
| **kailash.Runtime** | Each node gets pool connection | ❌ No shared context |
| **kailash.Runtime** | Each node gets pool connection | ❌ No shared context |

**kailash.Runtime does NOT change connection isolation:**
- ❌ Does NOT automatically share connections
- ❌ Does NOT provide implicit transaction context
- ✅ Executes nodes concurrently (level-based parallelism)
- ✅ Requires TransactionScopeNode for ACID guarantees (same as kailash.Runtime)

## Common Misconception

### ❌ WRONG: "DataFlow automatically wraps workflows in transactions"

```python
# This is MISLEADING (from old docs):
builder = kailash.WorkflowBuilder()

# These operations are automatically in a transaction ❌ FALSE
builder.add_node("UserCreateNode", "create_user", {...})
builder.add_node("AccountCreateNode", "create_account", {...})

# If any operation fails, all are rolled back ❌ FALSE
```

### ✅ CORRECT: "DataFlow requires TransactionScopeNode for ACID"

```python
# This is ACCURATE:
builder = kailash.WorkflowBuilder()

# WITHOUT TransactionScopeNode: separate connections ✅
builder.add_node("UserCreateNode", "create_user", {...})
builder.add_node("AccountCreateNode", "create_account", {...})
# If create_account fails, create_user is NOT rolled back

# WITH TransactionScopeNode: shared connection ✅
builder.add_node("TransactionScopeNode", "tx", {...})
builder.add_node("UserCreateNode", "create_user", {...})
builder.add_node("AccountCreateNode", "create_account", {...})
builder.add_node("TransactionCommitNode", "commit", {})
# If create_account fails, create_user IS rolled back
```

## When to Use Transaction Context

### Use TransactionScopeNode When:

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

## Examples

### Example 1: E-commerce Order (Requires Transaction)

```python
builder = kailash.WorkflowBuilder()

# Start transaction
builder.add_node("TransactionScopeNode", "tx", {
    "isolation_level": "SERIALIZABLE",
    "timeout": 60
})

# Create customer
builder.add_node("CustomerCreateNode", "create_customer", {
    "name": "John Doe",
    "email": "john@example.com"
})

# Create order
builder.add_node("OrderCreateNode", "create_order", {
    "customer_id": "${create_customer.id}",
    "total": 250.00
})

# Create order items
builder.add_node("OrderItemBulkCreateNode", "create_items", {
    "data": [
        {"order_id": "${create_order.id}", "product_id": 1, "quantity": 2},
        {"order_id": "${create_order.id}", "product_id": 2, "quantity": 1}
    ]
})

# Update inventory
builder.add_node("InventoryBulkUpdateNode", "update_inventory", {
    "filter": {"product_id": {"$in": [1, 2]}},
    "fields": {"quantity": "${quantity - reserved}"}
})

# Commit all or rollback
builder.add_node("TransactionCommitNode", "commit", {})

# Connect nodes (all share transaction)
builder.connect("tx", "result", "create_customer", "input")
builder.connect("create_customer", "id", "create_order", "customer_id")
builder.connect("create_order", "id", "create_items", "input")
builder.connect("create_items", "result", "update_inventory", "input")
builder.connect("update_inventory", "result", "commit", "input")
```

### Example 2: Bulk Import (No Transaction Needed)

```python
builder = kailash.WorkflowBuilder()

# No transaction - partial success acceptable
builder.add_node("ProductBulkCreateNode", "import_products", {
    "data": product_list,  # 10,000 products
    "batch_size": 1000,
    "on_conflict": "skip"  # Skip duplicates
})

# Better concurrency, no connection blocking
# If 9,000 succeed and 1,000 fail, that's acceptable
```

## Troubleshooting

### Issue: "My workflow has partial data after failure"

**Cause**: No TransactionScopeNode - each node commits independently

**Solution**: Add TransactionScopeNode + TransactionCommitNode

```python
# Before (partial commits):
builder.add_node("UserCreateNode", "create_user", {...})
builder.add_node("ProfileCreateNode", "create_profile", {...})

# After (atomic):
builder.add_node("TransactionScopeNode", "tx", {})
builder.add_node("UserCreateNode", "create_user", {...})
builder.add_node("ProfileCreateNode", "create_profile", {...})
builder.add_node("TransactionCommitNode", "commit", {})
```

### Issue: "kailash.Runtime doesn't maintain transaction"

**Reality**: kailash.Runtime has the SAME behavior as kailash.Runtime

**Solution**: Use TransactionScopeNode in BOTH runtimes

```python
# Works identically in all contexts:
import kailash

reg = kailash.NodeRegistry()

builder.add_node("TransactionScopeNode", "tx", {})
builder.add_node("UserCreateNode", "create_user", {...})
builder.add_node("TransactionCommitNode", "commit", {})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Documentation References

### Primary Sources
- **kailash.Runtime**: [`src/kailash/runtime/async_local.py`](../../../../src/kailash/runtime/async_local.py)

### Related Documentation
- **DataFlow CRUD**: [`dataflow-crud-operations`](dataflow-crud-operations.md)
- **DataFlow Transactions**: [`dataflow-transactions`](dataflow-transactions.md)

## Summary

✅ **Default Behavior**: Each DataFlow node gets separate connection (no ACID)
✅ **Explicit Opt-In**: Use TransactionScopeNode for ACID guarantees
✅ **Runtime Agnostic**: Same behavior in all execution contexts
✅ **Performance First**: Design prioritizes concurrency over implicit transactions
✅ **Clear Intent**: Developers must explicitly declare transactional boundaries

**Critical Takeaway**: If you need ACID guarantees across multiple DataFlow nodes, YOU MUST use TransactionScopeNode. There is no automatic transaction wrapping.

## Keywords for Auto-Trigger

<!-- Trigger Keywords: DataFlow transaction context, connection isolation, ACID guarantees, TransactionScopeNode, multi-node transactions, connection sharing, transaction propagation, separate connections, connection pool -->
