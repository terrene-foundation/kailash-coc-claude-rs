---
name: distributed-transactions
description: "Distributed transaction patterns for workflows. Use when asking 'distributed transactions', 'transaction patterns', 'distributed SQL', 'transaction coordination', or 'ACID workflows'."
---

# Distributed Transactions

Distributed Transactions for database operations and query management.

> **Skill Metadata**
> Category: `database`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Distributed Transactions
- **Category**: database
- **Priority**: HIGH
- **Trigger Keywords**: distributed transactions, transaction patterns, distributed SQL

## Core Pattern

```python
import kailash

# Automatic pattern selection (Saga vs 2PC)
# In the Rust-backed SDK, nodes are string-based via builder.add_node()
builder = kailash.WorkflowBuilder()
builder.add_node("DistributedDistributedTransactionManagerNode", "manager", {
    "transaction_name": "business_process",
    "state_storage": "redis",
    "storage_config": {
        "redis_client": "redis://localhost:6379",
        "key_prefix": "transactions:"
    }
})

# Execute transaction with requirements
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), inputs={
    "manager": {
        "operation": "create_transaction",
        "requirements": {
            "consistency": "eventual",  # eventual, strong, immediate
            "availability": "high",     # high, medium, low
            "timeout": 300
        },
        "context": {"order_id": "123", "customer_id": "456"},
        "participants": [
            {
                "participant_id": "payment_service",
                "endpoint": "http://payment:8080/api",
                "supports_2pc": True,
                "supports_saga": True,
                "compensation_action": "refund_payment"
            }
        ]
    }
})
```

## Common Use Cases

- **Automatic Pattern Selection**: DTM intelligently chooses between Saga (high availability) or Two-Phase Commit (strong consistency) based on requirements and participant capabilities
- **Microservices Order Processing**: Coordinate multi-step order workflows across payment, inventory, shipping services with automatic compensation on failures
- **Financial Transfers**: Strong ACID guarantees with 2PC for money transfers between accounts/banks requiring immediate consistency
- **Cross-System Integration**: Handle mixed systems - legacy systems without 2PC support automatically trigger Saga pattern
- **Enterprise Workflows**: Production-ready patterns with Redis/database state persistence, monitoring, audit logging, and recovery

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

- 💡 **Let DTM Choose Pattern**: Specify requirements (consistency, availability) and let DistributedDistributedTransactionManagerNode select optimal pattern - "immediate" consistency forces 2PC, "eventual" prefers Saga
- 💡 **Mixed Capabilities Default to Saga**: If ANY participant doesn't support 2PC, DTM automatically uses Saga pattern for maximum compatibility
- 💡 **Use Redis for Production**: Configure state_storage="redis" with Redis cluster for high-performance, durable transaction state management
- 💡 **Implement Compensation Actions**: Every Saga step needs a compensation - refund payment, release inventory, cancel shipment, etc.
- 💡 **Monitor Transaction State**: Use get_status() to track execution, check for failures, and trigger manual recovery if needed
- 💡 **Pattern Selection Rules**: immediate consistency → 2PC (if supported), high availability → Saga, mixed systems → Saga, default → Saga

## Keywords for Auto-Trigger

<!-- Trigger Keywords: distributed transactions, transaction patterns, distributed SQL -->
