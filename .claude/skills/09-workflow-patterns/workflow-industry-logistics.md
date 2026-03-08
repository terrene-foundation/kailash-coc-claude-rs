---
name: workflow-industry-logistics
description: "Logistics/supply chain workflows (tracking, routing, delivery). Use when asking 'logistics workflow', 'supply chain', 'shipment tracking', or 'route optimization'."
---

# Logistics/Supply Chain Workflows

> **Skill Metadata**
> Category: `industry-workflows`
> Priority: `MEDIUM`

## Pattern: Shipment Tracking and Delivery

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. Create shipment
builder.add_node("SQLQueryNode", "create_shipment", {
    "query": "INSERT INTO shipments (origin, destination, status) VALUES (?, ?, 'pending')",
    "params": ["{{input.origin}}", "{{input.destination}}"]
})

# 2. Calculate optimal route
builder.add_node("HTTPRequestNode", "route_optimization", {
    "url": "https://api.routingengine.com/optimize",
    "method": "POST",
    "body": {"origin": "{{input.origin}}", "destination": "{{input.destination}}"}
})

# 3. Assign to driver
builder.add_node("SQLQueryNode", "find_driver", {
    "query": "SELECT id FROM drivers WHERE status = 'available' AND location_near(?, 50) LIMIT 1",
    "params": ["{{input.origin}}"]
})

# 4. Update shipment with route
builder.add_node("SQLQueryNode", "update_shipment", {
    "query": "UPDATE shipments SET driver_id = ?, route = ?, status = 'in_transit' WHERE id = ?",
    "params": ["{{find_driver.rows}}", "{{route_optimization.body}}", "{{create_shipment.rows}}"]
})

# 5. Real-time tracking — LoopNode input is "items", outputs "results" and "count"
builder.add_node("LoopNode", "track_location", {})

# 6. Update delivery status
builder.add_node("SQLQueryNode", "mark_delivered", {
    "query": "UPDATE shipments SET status = 'delivered', delivered_at = NOW() WHERE id = ?",
    "params": ["{{create_shipment.rows}}"]
})

builder.connect("create_shipment", "rows", "route_optimization", "body")
builder.connect("route_optimization", "body", "find_driver", "body")
builder.connect("find_driver", "rows", "update_shipment", "body")
builder.connect("update_shipment", "row_count", "track_location", "items")
builder.connect("track_location", "results", "mark_delivered", "body")
```

<!-- Trigger Keywords: logistics workflow, supply chain, shipment tracking, route optimization, delivery -->
