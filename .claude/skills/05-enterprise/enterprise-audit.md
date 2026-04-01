---
name: enterprise-audit
description: "Structured audit logging for kailash-enterprise. Use when asking 'audit logging', 'AuditEvent', 'AuditLogger', 'AuditStore', 'audit trail', 'audit hooks', 'TracingAuditStore', 'InMemoryAuditStore', 'audit filter', 'audit query', 'redaction', 'workflow audit', 'authorization logging', 'authentication logging', or 'data modification audit'."
---

# Enterprise Audit Logging

Structured audit event capture, persistence, querying, and workflow lifecycle hooks using `kailash-enterprise::audit`.

## Architecture Overview

The audit subsystem has four layers:

| Module   | File              | Purpose                                                                                |
| -------- | ----------------- | -------------------------------------------------------------------------------------- |
| `types`  | `audit/types.rs`  | Core types: `AuditEvent`, `AuditActor`, `AuditResource`, `AuditOutcome`, `AuditFilter` |
| `stores` | `audit/stores.rs` | `AuditStore` trait + `TracingAuditStore`, `InMemoryAuditStore`                         |
| `logger` | `audit/logger.rs` | `AuditLogger` with typed convenience methods and field redaction                       |
| `hooks`  | `audit/hooks.rs`  | `AuditHook` for workflow lifecycle integration                                         |

All types are re-exported via `kailash_enterprise::prelude::*`.

## AuditEvent Structure

An `AuditEvent` captures **who** did **what**, to **what resource**, and **when**.

```rust
use kailash_enterprise::audit::types::*;
use kailash_value::Value;

let event = AuditEvent::new(
    AuditEventType::DataModification,
    AuditActor::new(ActorType::User, "alice").with_role("editor"),
    AuditResource::new("documents").with_id("doc-456").with_path("/api/v1/documents/456"),
    "update",
    AuditOutcome::Success,
)
.with_tenant_id("tenant-abc")
.with_session_id(uuid::Uuid::new_v4())
.with_ip_address("10.0.0.50")
.with_user_agent("kailash-cli/0.1.0")
.with_changes(serde_json::json!({
    "before": {"title": "Draft"},
    "after": {"title": "Final"}
}))
.with_metadata("request_id", Value::from("req-xyz"));
```

### AuditEvent Fields

| Field        | Type                        | Description                                       |
| ------------ | --------------------------- | ------------------------------------------------- |
| `event_id`   | `Uuid`                      | Auto-generated UUID v4                            |
| `event_type` | `AuditEventType`            | Category (see enum below)                         |
| `actor`      | `AuditActor`                | Who performed the action                          |
| `resource`   | `AuditResource`             | Target resource                                   |
| `action`     | `Arc<str>`                  | Action name (e.g., "login", "update", "delete")   |
| `outcome`    | `AuditOutcome`              | `Success`, `Failure(String)`, or `PartialSuccess` |
| `timestamp`  | `DateTime<Utc>`             | Auto-set to current UTC time                      |
| `tenant_id`  | `Option<Arc<str>>`          | For multi-tenant isolation                        |
| `session_id` | `Option<Uuid>`              | Session tracking                                  |
| `ip_address` | `Option<Arc<str>>`          | Client IP                                         |
| `user_agent` | `Option<Arc<str>>`          | Client user agent                                 |
| `changes`    | `Option<serde_json::Value>` | Before/after data for modifications               |
| `metadata`   | `BTreeMap<Arc<str>, Value>` | Arbitrary key-value metadata                      |

### AuditEventType Enum

```rust
AuditEventType::Authentication   // login, logout, token refresh
AuditEventType::Authorization    // permission granted/denied
AuditEventType::DataAccess       // reads, queries
AuditEventType::DataModification // creates, updates, deletes
AuditEventType::SystemEvent      // startup, shutdown, config changes
AuditEventType::SecurityEvent    // failed logins, brute force
AuditEventType::AdminAction      // role changes, user management
```

### AuditActor

```rust
// Human user with a role
let actor = AuditActor::new(ActorType::User, "user-123").with_role("admin");

// Service account
let svc = AuditActor::new(ActorType::ServiceAccount, "batch-processor");

// AI agent
let agent = AuditActor::new(ActorType::Agent, "agent-alpha");

// System actor (for automated events)
let system = AuditActor::system(); // actor_id = "system", type = System
```

### AuditResource

```rust
let resource = AuditResource::new("orders")
    .with_id("order-789")
    .with_path("/api/v1/orders/789");
```

### AuditOutcome

```rust
AuditOutcome::Success
AuditOutcome::Failure("insufficient permissions".into())
AuditOutcome::PartialSuccess
```

## AuditStore Trait

The `AuditStore` trait defines the persistence and query interface. Implementations must be `Send + Sync`.

```rust
#[async_trait]
pub trait AuditStore: Send + Sync {
    async fn persist(&self, event: &AuditEvent) -> Result<(), EnterpriseError>;
    async fn query(&self, filter: AuditFilter) -> Result<Vec<AuditEvent>, EnterpriseError>;
    async fn count(&self, filter: AuditFilter) -> Result<u64, EnterpriseError>;
}
```

### TracingAuditStore

Write-only store that emits each event as a structured `tracing::info!` span. Query and count always return empty/zero.

```rust
use std::sync::Arc;
use kailash_enterprise::audit::stores::TracingAuditStore;
use kailash_enterprise::audit::logger::AuditLogger;

let store = Arc::new(TracingAuditStore::new());
let logger = AuditLogger::new(store);
// Events are emitted as tracing::info! with structured fields:
//   audit=true, event_id, event_type, actor_type, actor_id,
//   resource_type, resource_id, action, outcome, tenant_id, timestamp
```

### InMemoryAuditStore

Thread-safe in-memory store backed by `RwLock<Vec<AuditEvent>>`. Supports full filtering, pagination, and count. Suitable for testing.

```rust
use std::sync::Arc;
use kailash_enterprise::audit::stores::InMemoryAuditStore;

let store = Arc::new(InMemoryAuditStore::new());

// Helper methods (not on the trait):
let all_events = store.events().await;   // snapshot of all events
let count = store.len().await;           // number of stored events
let empty = store.is_empty().await;      // check if empty
store.clear().await;                     // remove all events
```

## AuditLogger

The `AuditLogger` wraps an `AuditStore` and provides typed convenience methods. It automatically handles:

- **Field redaction**: sensitive field names (password, token, secret, authorization, api_key) are replaced with `[REDACTED]` in `changes` data
- **Minimum level filtering**: events below the configured `AuditLevel` are silently dropped
- **Tracing emission**: optionally emits a `tracing::info!` event alongside store persistence

### Basic Setup

```rust
use std::sync::Arc;
use kailash_enterprise::audit::logger::{AuditLogger, AuditLoggerConfig};
use kailash_enterprise::audit::stores::InMemoryAuditStore;

// Default config: emit_tracing=true, include_changes=true, redact common fields
let store = Arc::new(InMemoryAuditStore::new());
let logger = AuditLogger::new(store);

// Custom config
let config = AuditLoggerConfig::new()
    .with_emit_tracing(false)           // disable tracing emission
    .with_include_changes(true)         // include before/after in modifications
    .with_min_level(AuditLevel::SecurityOnly)  // only log security events
    .with_redacted_field("ssn");        // add custom field to redaction list

let store = Arc::new(InMemoryAuditStore::new());
let logger = AuditLogger::with_config(store, config);
```

### AuditLevel (Minimum Emission Level)

```rust
use kailash_enterprise::audit::types::AuditLevel;

AuditLevel::All           // emit all events (default)
AuditLevel::SecurityOnly  // only Authentication, Authorization, SecurityEvent
AuditLevel::FailuresOnly  // only events with AuditOutcome::Failure
```

### Convenience Methods

```rust
use kailash_enterprise::audit::types::*;
use kailash_enterprise::audit::logger::AuditLogger;
use kailash_enterprise::rbac::evaluator::AccessDecision;

// Log authentication
logger.log_authentication(
    AuditActor::new(ActorType::User, "alice"),
    true,                    // success
    Some("192.168.1.1"),     // IP address (optional)
).await?;

// Log authorization decision
logger.log_authorization(
    AuditActor::new(ActorType::User, "bob"),
    AuditResource::new("admin_panel"),
    "access",
    &AccessDecision::DenyWithReason("insufficient permissions".into()),
).await?;

// Log data access (read)
logger.log_data_access(
    AuditActor::new(ActorType::User, "alice"),
    AuditResource::new("users").with_path("/api/v1/users"),
    42,    // record_count
).await?;

// Log data modification (create, update, delete)
logger.log_data_modification(
    AuditActor::new(ActorType::User, "bob"),
    AuditResource::new("users").with_id("user-123"),
    "update",
    Some(serde_json::json!({"name": "Bob", "password": "old_secret"})),
    Some(serde_json::json!({"name": "Robert", "password": "new_secret"})),
).await?;
// The "password" fields are automatically redacted to "[REDACTED]"

// Log a raw event (for custom event types)
let event = AuditEvent::new(
    AuditEventType::AdminAction,
    AuditActor::new(ActorType::User, "admin-1"),
    AuditResource::new("roles"),
    "grant_role",
    AuditOutcome::Success,
);
logger.log(event).await?;
```

### Default Redacted Fields

The default `AuditLoggerConfig` redacts these field names (case-insensitive substring match):

- `password`
- `token`
- `secret`
- `authorization`
- `api_key`

Add custom fields with `.with_redacted_field("ssn")`.

## AuditFilter (Querying Events)

`AuditFilter` supports filtering by actor, tenant, event type, outcome, time range, and pagination.

```rust
use kailash_enterprise::audit::types::*;

// Query all failure events for a specific actor
let filter = AuditFilter::new()
    .with_actor_id("alice")
    .with_outcome(AuditOutcomeFilter::FailureOnly)
    .with_limit(100)
    .with_offset(0);

let events = store.query(filter.clone()).await?;
let count = store.count(filter).await?;

// Filter by time range
use chrono::Utc;
let filter = AuditFilter::new()
    .from_time(Utc::now() - chrono::Duration::hours(24))
    .to_time(Utc::now());

// Filter by tenant and event type
let filter = AuditFilter::new()
    .with_tenant_id("tenant-abc")
    .with_event_type(AuditEventType::SecurityEvent);

// The filter's `matches()` method can be used directly:
let matches = filter.matches(&some_event); // -> bool
```

### AuditOutcomeFilter

```rust
AuditOutcomeFilter::SuccessOnly
AuditOutcomeFilter::FailureOnly
AuditOutcomeFilter::PartialSuccessOnly
```

## AuditHook (Workflow Lifecycle Integration)

The `AuditHook` integrates audit logging into workflow execution without requiring direct dependency on audit internals. It provides lifecycle callbacks for node and workflow events.

### Setup

```rust
use std::sync::Arc;
use kailash_enterprise::audit::hooks::AuditHook;
use kailash_enterprise::audit::logger::AuditLogger;
use kailash_enterprise::audit::stores::InMemoryAuditStore;
use kailash_enterprise::audit::types::{AuditActor, ActorType};

let store = Arc::new(InMemoryAuditStore::new());
let logger = Arc::new(AuditLogger::new(store));

// The actor extractor derives an AuditActor from ExecutionContext.
// This decouples the hook from the authentication mechanism.
let hook = AuditHook::new(
    logger,
    Arc::new(|ctx| {
        // Extract actor from context metadata, JWT claims, etc.
        // Return None to fall back to AuditActor::system()
        Some(AuditActor::new(ActorType::User, "current-user"))
    }),
);
```

### Lifecycle Callbacks

```rust
use kailash_core::node::ExecutionContext;
use kailash_value::value_map;

let ctx = ExecutionContext::new("run-abc", "transform_1");

// Node starts execution
hook.on_node_execute(&ctx, "transform_1", &value_map! {}).await?;

// Node completes execution (with elapsed time in ms)
hook.on_node_complete(&ctx, "transform_1", &value_map! {}, 150).await?;

// Workflow starts
hook.on_workflow_start(&ctx, "my-workflow").await?;

// Workflow completes (success or failure)
hook.on_workflow_complete(&ctx, "my-workflow", true).await?;  // success
hook.on_workflow_complete(&ctx, "my-workflow", false).await?; // failure
```

### Event Types Emitted by AuditHook

| Callback               | `event_type`  | `action`     | Metadata                          |
| ---------------------- | ------------- | ------------ | --------------------------------- |
| `on_node_execute`      | `DataAccess`  | `"execute"`  | `run_id`, `node_id`               |
| `on_node_complete`     | `DataAccess`  | `"complete"` | `run_id`, `node_id`, `elapsed_ms` |
| `on_workflow_start`    | `SystemEvent` | `"start"`    | `run_id`                          |
| `on_workflow_complete` | `SystemEvent` | `"complete"` | `run_id`                          |

When the actor extractor returns `None`, the hook falls back to `AuditActor::system()`.

## Integration with EnterpriseContext

The `EnterpriseContext` wraps `ExecutionContext` with enterprise fields including the audit actor:

```rust
use kailash_core::node::ExecutionContext;
use kailash_enterprise::context::EnterpriseContext;
use kailash_enterprise::audit::types::{AuditActor, ActorType};
use kailash_enterprise::tenancy::TenantContext;

let inner = ExecutionContext::new("run-1", "node-1");
let ctx = EnterpriseContext::new(inner)
    .with_actor(AuditActor::new(ActorType::User, "alice").with_role("admin"))
    .with_tenant(TenantContext::new("tenant-abc"));

// Use context fields for audit logging
if let Some(actor) = ctx.actor() {
    logger.log_data_access(
        actor.clone(),
        AuditResource::new("reports"),
        10,
    ).await?;
}
```

## Error Handling

All audit operations return `Result<(), EnterpriseError>`. The relevant error variant is:

```rust
EnterpriseError::AuditStoreError(String)
```

This is returned when the underlying store backend fails to persist or query events.

## Thread Safety

All audit types are `Send + Sync`:

- `AuditEvent`, `AuditActor`, `AuditResource`, `AuditOutcome` -- cloneable, serializable
- `AuditStore` trait requires `Send + Sync`
- `InMemoryAuditStore` uses `Arc<RwLock<Vec<AuditEvent>>>` internally
- `AuditLogger` holds `Arc<dyn AuditStore>` -- share via `Arc<AuditLogger>`
- `AuditHook` holds `Arc<AuditLogger>` and `Arc<ActorExtractor>`

## Source Files

- `crates/kailash-enterprise/src/audit/types.rs`
- `crates/kailash-enterprise/src/audit/stores.rs`
- `crates/kailash-enterprise/src/audit/logger.rs`
- `crates/kailash-enterprise/src/audit/hooks.rs`

<!-- Trigger Keywords: audit logging, AuditEvent, AuditLogger, AuditStore, audit trail, audit hooks, TracingAuditStore, InMemoryAuditStore, audit filter, audit query, redaction, workflow audit, authorization logging, authentication logging, data modification audit, AuditActor, AuditResource, AuditOutcome, AuditLevel, AuditHook, ActorExtractor -->
