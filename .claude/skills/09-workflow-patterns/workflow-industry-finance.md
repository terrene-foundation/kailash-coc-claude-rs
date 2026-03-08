---
name: workflow-industry-finance
description: "Finance industry workflows (payments, fraud, compliance). Use when asking 'finance workflow', 'payment processing', 'fraud detection', or 'financial compliance'."
---

# Finance Industry Workflows

> **Skill Metadata**
> Category: `industry-workflows`
> Priority: `MEDIUM`

## Pattern: Payment Processing with Fraud Detection

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Validate payment details — use SchemaValidatorNode
builder.add_node("SchemaValidatorNode", "validate", {
    "schema": {"amount": "decimal", "card_number": "credit_card"}
})

# 2. Fraud check
builder.add_node("HTTPRequestNode", "fraud_check", {
    "url": "https://api.fraudcheck.com/analyze",
    "method": "POST",
    "body": "{{validate.valid}}"
})

# 3. Risk assessment — use SwitchNode for multi-branch routing
builder.add_node("SwitchNode", "assess_risk", {
    "cases": {
        "low": "process_payment",
        "medium": "manual_review",
        "high": "reject_payment"
    }
})

# 4. Process payment
builder.add_node("HTTPRequestNode", "process_payment", {
    "url": "https://api.paymentgateway.com/charge",
    "method": "POST",
    "body": "{{validate.valid_data}}"
})

# 5. Record transaction
builder.add_node("SQLQueryNode", "record", {
    "query": "INSERT INTO transactions (amount, status, timestamp) VALUES (?, ?, NOW())",
    "params": ["{{input.amount}}", "completed"]
})

builder.connect("validate", "valid", "fraud_check", "body")
builder.connect("fraud_check", "body", "assess_risk", "input")
builder.connect("assess_risk", "matched", "process_payment", "body")
builder.connect("process_payment", "body", "record", "body")
```

<!-- Trigger Keywords: finance workflow, payment processing, fraud detection, financial compliance -->
