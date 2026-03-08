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
builder.add_node("SQLQueryNode", "load_customer", {
    "query": "SELECT * FROM customers WHERE id = ?",
    "params": ["{{input.customer_id}}"]
})

# 2. Check membership tier — use SwitchNode for multi-branch routing
builder.add_node("SwitchNode", "check_tier", {
    "cases": {
        "gold": "gold_discount",
        "silver": "silver_discount",
        "bronze": "bronze_discount"
    }
})

# 3. Calculate discounts
builder.add_node("EmbeddedPythonNode", "gold_discount", {
    "code": "result = value * 0.80",  # 20% off
    "output_vars": ["result"]
})

builder.add_node("EmbeddedPythonNode", "silver_discount", {
    "code": "result = value * 0.90",  # 10% off
    "output_vars": ["result"]
})

builder.add_node("EmbeddedPythonNode", "bronze_discount", {
    "code": "result = value * 0.95",  # 5% off
    "output_vars": ["result"]
})

# 4. Apply additional rules — ConditionalNode takes no config
builder.add_node("ConditionalNode", "check_bulk", {})

builder.connect("load_customer", "rows", "check_tier", "input")
builder.connect("check_tier", "matched", "check_bulk", "condition")
```

<!-- Trigger Keywords: business rules, rule engine, conditional logic, decision workflow -->
