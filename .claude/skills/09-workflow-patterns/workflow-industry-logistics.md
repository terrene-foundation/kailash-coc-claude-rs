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
    "parameters": ["{{input.origin}}", "{{input.destination}}"]
})

# 2. Calculate optimal route
builder.add_node("HTTPRequestNode", "route_optimization", {
    "url": "https://api.routingengine.com/optimize",
    "method": "POST",
    "body": {"origin": "{{input.origin}}", "destination": "{{input.destination}}"}
})

# 3. Assign to driver
builder.add_node("DatabaseQueryNode", "find_driver", {
    "query": "SELECT id FROM drivers WHERE status = 'available' AND location_near(?, 50) LIMIT 1",
    "parameters": ["{{input.origin}}"]
})

# 4. Update shipment with route
builder.add_node("SQLQueryNode", "update_shipment", {
    "query": "UPDATE shipments SET driver_id = ?, route = ?, status = 'in_transit' WHERE id = ?",
    "parameters": ["{{find_driver.id}}", "{{route_optimization.route}}", "{{create_shipment.id}}"]
})

# 5. Real-time tracking
builder.add_node("LoopNode", "track_location", {
    "condition": "{{current_status}} != 'delivered'",
    "interval": 300  # Check every 5 minutes
})

# 6. Update delivery status
builder.add_node("SQLQueryNode", "mark_delivered", {
    "query": "UPDATE shipments SET status = 'delivered', delivered_at = NOW() WHERE id = ?",
    "parameters": ["{{create_shipment.id}}"]
})

builder.connect("create_shipment", "id", "route_optimization", "shipment_id")
builder.connect("route_optimization", "route", "find_driver", "location")
builder.connect("find_driver", "id", "update_shipment", "driver_id")
builder.connect("update_shipment", "status", "track_location", "current_status")
builder.connect("track_location", "result", "mark_delivered", "trigger")
```

<!-- Trigger Keywords: logistics workflow, supply chain, shipment tracking, route optimization, delivery -->
