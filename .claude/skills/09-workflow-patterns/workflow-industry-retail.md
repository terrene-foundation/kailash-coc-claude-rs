---
name: workflow-industry-retail
description: "Retail/e-commerce workflows (orders, inventory, shipping). Use when asking 'retail workflow', 'e-commerce', 'order processing', or 'inventory sync'."
---

# Retail/E-Commerce Workflows

> **Skill Metadata**
> Category: `industry-workflows`
> Priority: `MEDIUM`

## Pattern: Order Fulfillment Workflow

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Receive order
builder.add_node("SQLQueryNode", "create_order", {
    "query": "INSERT INTO orders (customer_id, items, total) VALUES (?, ?, ?)",
    "params": ["{{input.customer_id}}", "{{input.items}}", "{{input.total}}"]
})

# 2. Check inventory
builder.add_node("SQLQueryNode", "check_inventory", {
    "query": "SELECT quantity FROM inventory WHERE product_id = ?",
    "params": ["{{input.product_id}}"]
})

# 3. Reserve stock
builder.add_node("SQLQueryNode", "reserve_stock", {
    "query": "UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?",
    "params": ["{{input.quantity}}", "{{input.product_id}}"]
})

# 4. Process payment
builder.add_node("HTTPRequestNode", "payment", {
    "url": "https://api.stripe.com/charges",
    "method": "POST",
    "body": {"amount": "{{input.total}}", "customer": "{{input.customer_id}}"}
})

# 5. Create shipping label
builder.add_node("HTTPRequestNode", "shipping", {
    "url": "https://api.shippo.com/shipments",
    "method": "POST",
    "body": {"address": "{{input.address}}", "weight": "{{input.weight}}"}
})

# 6. Send confirmation
builder.add_node("HTTPRequestNode", "notify_customer", {
    "url": "https://api.sendgrid.com/mail/send",
    "method": "POST",
    "body": {"to": "{{input.email}}", "subject": "Order Confirmed"}
})

builder.connect("create_order", "rows", "check_inventory", "body")
builder.connect("check_inventory", "rows", "reserve_stock", "body")
builder.connect("reserve_stock", "rows", "payment", "body")
builder.connect("payment", "body", "shipping", "body")
builder.connect("shipping", "body", "notify_customer", "body")
```

<!-- Trigger Keywords: retail workflow, e-commerce, order processing, inventory sync, order fulfillment -->
