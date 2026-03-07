---
name: workflow-pattern-business-rules
description: "Business rule engine patterns. Use when asking 'business rules', 'rule engine', 'conditional logic', or 'decision workflow'."
---

# Business Rule Engine Patterns

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `MEDIUM`

## Pattern: Discount Calculation Rules

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Load customer data
builder.add_node("DatabaseQueryNode", "load_customer", {
    "query": "SELECT * FROM customers WHERE id = ?",
    "parameters": ["{{input.customer_id}}"]
})

# 2. Check membership tier
builder.add_node("ConditionalNode", "check_tier", {
    "condition": "{{load_customer.tier}}",
    "branches": {
        "gold": "gold_discount",
        "silver": "silver_discount",
        "bronze": "bronze_discount"
    }
})

# 3. Calculate discounts
builder.add_node("TransformNode", "gold_discount", {
    "input": "{{input.amount}}",
    "transformation": "value * 0.80"  # 20% off
})

builder.add_node("TransformNode", "silver_discount", {
    "input": "{{input.amount}}",
    "transformation": "value * 0.90"  # 10% off
})

builder.add_node("TransformNode", "bronze_discount", {
    "input": "{{input.amount}}",
    "transformation": "value * 0.95"  # 5% off
})

# 4. Apply additional rules
builder.add_node("ConditionalNode", "check_bulk", {
    "condition": "{{input.quantity}} > 10",
    "true_branch": "bulk_discount",
    "false_branch": "final_price"
})

builder.add_connection("load_customer", "tier", "check_tier", "condition")
builder.add_connection("check_tier", "result", "check_bulk", "input")
```

<!-- Trigger Keywords: business rules, rule engine, conditional logic, decision workflow -->
