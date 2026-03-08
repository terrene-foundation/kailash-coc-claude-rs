---
skill: nexus-event-system
description: EventBus for pub/sub event-driven communication and workflow lifecycle tracking
priority: LOW
tags: [nexus, events, eventbus, lifecycle, pub-sub]
---

# Nexus Event System

Event-driven pub/sub architecture using the Rust-backed EventBus.

## EventBus (Rust-backed)

The `EventBus` class provides publish/subscribe for lifecycle events and custom events.

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()
bus = app.event_bus()

# Subscribe to all events
bus.subscribe(lambda event: print(f"Event: {event}"))

# Publish a custom event
bus.publish("user.created", {"user_id": "123", "email": "alice@example.com"})
```

## Subscribing to Events

### Subscribe to All Events

```python
bus = app.event_bus()

# All events delivered as dicts with at least a "type" field
bus.subscribe(lambda event: print(f"[{event['type']}] {event}"))
```

### Subscribe to Specific Event Types

```python
# Filter by event type using app.on()
app.on("workflow_started", lambda event: print(f"Started: {event}"))
app.on("workflow_completed", lambda event: print(f"Completed: {event}"))
app.on("workflow_failed", lambda event: print(f"Failed: {event}"))
```

### Multiple Handlers

```python
bus = app.event_bus()

# Multiple handlers for the same event
bus.subscribe(lambda event: log_event(event))
bus.subscribe(lambda event: update_metrics(event))
bus.subscribe(lambda event: send_notification(event))
```

## Publishing Events

### Custom Events

```python
bus = app.event_bus()

# Publish with payload (optional dict)
bus.publish("order.completed", {"order_id": "456", "total": 99.99})
bus.publish("user.login", {"user_id": "alice", "method": "sso"})

# Publish without payload
bus.publish("system.maintenance_start")
```

## Production Patterns

### Event-Driven Side Effects

```python
import os
import kailash
from kailash.nexus import NexusApp

app = NexusApp()
bus = app.event_bus()

# Wire up event-driven side effects
bus.subscribe(lambda data: handle_event(data))

def handle_event(event):
    if event.get("type") == "user.created":
        send_welcome_email(event)
        provision_resources(event)
    elif event.get("type") == "user.deleted":
        cleanup_resources(event)

@app.handler(name="create_user", description="Create a new user")
async def create_user(name: str, email: str) -> dict:
    user = {"user_id": "generated-id", "name": name, "email": email}
    # Publish event -- subscribers handle side effects
    bus.publish("user.created", user)
    return user
```

### Workflow Monitoring

```python
import logging

logger = logging.getLogger("nexus")

# Track all workflow events
app.on("workflow_started", lambda e: logger.info(f"Workflow started: {e}"))
app.on("workflow_completed", lambda e: logger.info(f"Workflow completed: {e}"))
app.on("workflow_failed", lambda e: logger.error(f"Workflow failed: {e}"))
```

### Slack Notifications

```python
import requests as http_requests

bus = app.event_bus()

def notify_slack(event):
    if event.get("type") != "workflow_failed":
        return
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    message = {
        "text": f"Workflow failed: {event}",
    }
    http_requests.post(webhook_url, json=message)

bus.subscribe(notify_slack)
```

## EventBus API Reference

| Method | Description |
| --- | --- |
| `app.event_bus()` | Get the EventBus for this Nexus instance |
| `bus.publish(event_type, payload)` | Publish an event (payload is optional dict) |
| `bus.subscribe(callback)` | Subscribe to all events |
| `app.on(event_type, callback)` | Subscribe to events of a specific type |
| `app.subscribe(callback)` | Subscribe to all events (convenience wrapper) |

## Custom Event Router (Python)

For more sophisticated routing beyond EventBus:

```python
class EventRouter:
    def __init__(self):
        self.handlers = {}

    def register(self, event_type, handler):
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)

    def route(self, event_type, event):
        handlers = self.handlers.get(event_type, [])
        for handler in handlers:
            try:
                handler(event)
            except Exception as e:
                print(f"Handler error: {e}")

# Usage
router = EventRouter()
router.register("workflow_completed", log_completion)
router.register("workflow_completed", notify_completion)

# Wire into EventBus
bus.subscribe(lambda event: router.route(event.get("type", ""), event))
```

## Best Practices

1. **Use EventBus for decoupled communication** -- publishers and subscribers are independent
2. **Keep event payloads small** -- store large data externally, reference by ID
3. **Handle errors in subscribers** -- a failing subscriber should not crash others
4. **Use `app.on()` for typed events** -- filter early rather than in each handler
5. **Log events for debugging** -- subscribe a logger during development

## Related Skills

- [nexus-multi-channel](#) - Multi-channel architecture
- [nexus-sessions](#) - Workflow state management
- [nexus-health-monitoring](#) - Health and monitoring
