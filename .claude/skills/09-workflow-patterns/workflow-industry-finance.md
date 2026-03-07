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

# 1. Validate payment details
builder.add_node("DataValidationNode", "validate", {
    "input": "{{input.payment}}",
    "schema": {"amount": "decimal", "card_number": "credit_card"}
})

# 2. Fraud check
builder.add_node("APICallNode", "fraud_check", {
    "url": "https://api.fraudcheck.com/analyze",
    "method": "POST",
    "body": "{{validate.valid_data}}"
})

# 3. Risk assessment
builder.add_node("ConditionalNode", "assess_risk", {
    "condition": "{{fraud_check.risk_score}}",
    "branches": {
        "low": "process_payment",
        "medium": "manual_review",
        "high": "reject_payment"
    }
})

# 4. Process payment
builder.add_node("APICallNode", "process_payment", {
    "url": "https://api.paymentgateway.com/charge",
    "method": "POST",
    "body": "{{validate.valid_data}}"
})

# 5. Record transaction
builder.add_node("DatabaseExecuteNode", "record", {
    "query": "INSERT INTO transactions (amount, status, timestamp) VALUES (?, ?, NOW())",
    "parameters": ["{{input.amount}}", "completed"]
})

builder.add_connection("validate", "valid_data", "fraud_check", "body")
builder.add_connection("fraud_check", "risk_score", "assess_risk", "condition")
builder.add_connection("assess_risk", "output_low", "process_payment", "body")
builder.add_connection("process_payment", "result", "record", "parameters")
```

<!-- Trigger Keywords: finance workflow, payment processing, fraud detection, financial compliance -->
