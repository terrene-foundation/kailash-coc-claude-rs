# Domain Event Bus

Pluggable event bus with topic-based publish/subscribe and an execution-event routing bridge.

## Key Types

| Type               | Source                                     | Purpose                                         |
| ------------------ | ------------------------------------------ | ----------------------------------------------- |
| `DomainEvent`      | `crates/kailash-core/src/domain_event.rs`  | Structured event with correlation/causation IDs |
| `DomainEventBus`   | `crates/kailash-core/src/event_bus.rs`     | Pluggable async pub/sub trait                   |
| `InMemoryEventBus` | same                                       | DashMap-backed implementation                   |
| `EventHandler`     | same                                       | `Arc<dyn Fn(DomainEvent) -> Pin<Box<...>>>`     |
| `EventBusError`    | same                                       | PublishFailed, SubscribeFailed, Shutdown        |
| `SubscriptionId`   | same                                       | UUID handle for unsubscribe                     |
| `EventBridge`      | `crates/kailash-core/src/event_routing.rs` | ExecutionEvent -> DomainEvent router            |

## DomainEvent Construction

```rust
use kailash_core::domain_event::DomainEvent;
use serde_json::json;
use uuid::Uuid;

let event = DomainEvent::new(
    "order.created",      // event_type
    "orders",             // topic (for routing)
    "api-gateway",        // actor
    json!({"id": 42}),    // payload
);

// Builder methods for optional fields
let event = DomainEvent::new("user.registered", "users", "auth-service", json!({}))
    .with_correlation(Uuid::new_v4())   // link related events
    .with_causation(Uuid::new_v4())     // what caused this event
    .with_metadata("env", "production"); // arbitrary key-value
```

Key properties:

- `id`: fresh UUID per event
- `correlation_id`: defaults to `id` (override with `with_correlation()`)
- `causation_id`: `None` by default
- `schema_version`: always `1`
- `timestamp`: `Utc::now()` at construction
- Implements `Serialize + Deserialize + Clone + Send + Sync`

## Subscribe and Publish

```rust
use kailash_core::event_bus::{DomainEventBus, InMemoryEventBus, EventHandler};
use std::sync::Arc;

let bus = InMemoryEventBus::new();

// Subscribe with an async handler
let received = Arc::new(tokio::sync::Mutex::new(Vec::new()));
let r = Arc::clone(&received);
let sub_id = bus.subscribe("orders", Arc::new(move |event| {
    let r = Arc::clone(&r);
    Box::pin(async move {
        r.lock().await.push(event);
    })
})).await?;

// Publish (spawns handler tasks via tokio::spawn)
bus.publish(event).await?;

// Unsubscribe
bus.unsubscribe(sub_id).await?;

// Shutdown (clears all subscriptions, rejects new operations)
bus.shutdown();
```

## DomainEventBus Trait

```rust
pub trait DomainEventBus: Send + Sync {
    fn publish(&self, event: DomainEvent) -> Pin<Box<dyn Future<Output = Result<(), EventBusError>> + Send + '_>>;
    fn subscribe(&self, topic_pattern: &str, handler: EventHandler) -> Pin<Box<dyn Future<Output = Result<SubscriptionId, EventBusError>> + Send + '_>>;
    fn unsubscribe(&self, id: SubscriptionId) -> Pin<Box<dyn Future<Output = Result<(), EventBusError>> + Send + '_>>;
    fn subscription_count(&self) -> usize;
}
```

Implementations must be `Send + Sync`. The `InMemoryEventBus` uses exact topic matching. Custom implementations can support wildcards or delegate to Redis Pub/Sub, Kafka, NATS, etc.

## EventBridge (ExecutionEvent Routing)

Converts workflow `ExecutionEvent`s into `DomainEvent`s and publishes them:

```rust
use kailash_core::event_routing::EventBridge;
use kailash_core::event_bus::InMemoryEventBus;
use kailash_core::events::ExecutionEvent;
use std::sync::Arc;

let bus = Arc::new(InMemoryEventBus::new());
let bridge = EventBridge::new(Arc::clone(&bus));

let event = ExecutionEvent::WorkflowStarted {
    run_id: "run-1".to_string(),
    node_count: 3,
};
bridge.route_execution_event(&event).await?;
```

### Topic Mapping

| ExecutionEvent Variant | Domain Event Topic     | Actor               |
| ---------------------- | ---------------------- | ------------------- |
| `WorkflowStarted`      | `"workflow.started"`   | `"kailash-runtime"` |
| `NodeStarted`          | `"node.started"`       | `"kailash-runtime"` |
| `NodeCompleted`        | `"node.completed"`     | `"kailash-runtime"` |
| `NodeFailed`           | `"node.failed"`        | `"kailash-runtime"` |
| `WorkflowCompleted`    | `"workflow.completed"` | `"kailash-runtime"` |

Payloads include the relevant fields from the `ExecutionEvent` variant as JSON (e.g., `run_id`, `node_id`, `type_name`, `duration_ms`, `error`).

## Gotchas

1. **Handlers run on spawned tasks**: `InMemoryEventBus` calls `tokio::spawn` for each matching handler. This means handlers execute concurrently and may complete after `publish()` returns. In tests, use `tokio::task::yield_now()` + a short sleep to flush.

2. **Exact topic matching**: `InMemoryEventBus` uses string equality on topics. If you subscribe to `"orders"` and publish to `"orders.us"`, the handler will NOT fire.

3. **Shutdown is one-way**: After `shutdown()`, the bus rejects all publish/subscribe calls with `EventBusError::Shutdown`. There is no restart. Create a new bus if needed.

4. **EventBridge is Clone**: It holds an `Arc<dyn DomainEventBus>` internally, so cloning is cheap and you can share across tasks.

## Cross-References

- `01-core/core-events-visualization.md` -- `ExecutionEvent` enum definition
- `audit-chain.md` -- for persistent audit trails (the event bus is ephemeral)
