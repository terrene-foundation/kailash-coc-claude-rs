---
name: enterprise-tenancy
description: "Multi-tenancy context propagation, tenant registry, and data isolation for kailash-enterprise. Use when asking 'multi-tenancy', 'TenantContext', 'TenantRegistry', 'tenant isolation', 'tenant propagation', 'tenant bypass', 'TenantInfo', 'TenantStatus', 'tenant metadata', 'tenant registration', 'EnterpriseContext tenant', or 'data isolation'."
---

# Enterprise Multi-Tenancy

Tenant context propagation, registry management, and data isolation using `kailash-enterprise::tenancy`.

## Architecture Overview

The tenancy subsystem provides three core types:

| Type             | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `TenantContext`  | Request-scoped tenant identity, propagated through the execution stack |
| `TenantInfo`     | Tenant metadata (name, status, plan) stored in the registry            |
| `TenantRegistry` | Thread-safe registry for managing tenant lifecycle                     |

All types are re-exported via `kailash_enterprise::prelude::*`.

## TenantContext

`TenantContext` carries the current tenant identity through the entire execution stack. It is set at the entry point (Nexus middleware, CLI, or test setup) and read by downstream components for data isolation.

### Creating a TenantContext

```rust
use kailash_enterprise::tenancy::TenantContext;
use kailash_value::Value;

let ctx = TenantContext::new("tenant-abc")
    .with_name("Acme Corp")
    .with_metadata("region", Value::from("us-east"))
    .with_metadata("tier", Value::from("enterprise"));

assert_eq!(ctx.tenant_id.as_ref(), "tenant-abc");
assert_eq!(ctx.tenant_name.as_deref(), Some("Acme Corp"));
assert!(!ctx.bypass);
```

### TenantContext Fields

| Field                 | Type                        | Description                          |
| --------------------- | --------------------------- | ------------------------------------ |
| `tenant_id`           | `Arc<str>`                  | Unique tenant identifier             |
| `tenant_name`         | `Option<Arc<str>>`          | Display name                         |
| `tenant_metadata`     | `BTreeMap<Arc<str>, Value>` | Arbitrary key-value metadata         |
| `bypass`              | `bool`                      | Whether to bypass tenant isolation   |
| `admin_bypass_reason` | `Option<Arc<str>>`          | Audit trail for bypass justification |

### Bypass Mode

System operations that need cross-tenant data access can enable bypass mode. The reason is recorded for the audit trail.

```rust
use kailash_enterprise::tenancy::TenantContext;

// Admin migration that needs to access all tenants
let ctx = TenantContext::new("system")
    .with_bypass("scheduled data migration across tenants");

assert!(ctx.bypass);
assert_eq!(ctx.admin_bypass_reason.as_deref(), Some("scheduled data migration across tenants"));
```

## TenantInfo

`TenantInfo` represents detailed tenant metadata stored in the `TenantRegistry`. It tracks the tenant's operational status and subscription plan.

```rust
use kailash_enterprise::tenancy::{TenantInfo, TenantStatus};
use kailash_value::Value;

let info = TenantInfo::new("tenant-abc", "Acme Corp")
    .with_status(TenantStatus::Active)
    .with_plan("enterprise")
    .with_metadata("max_users", Value::Integer(500));

assert_eq!(info.tenant_id.as_ref(), "tenant-abc");
assert_eq!(info.name.as_ref(), "Acme Corp");
assert_eq!(info.status, TenantStatus::Active);
assert_eq!(info.plan.as_deref(), Some("enterprise"));
```

### TenantStatus

```rust
use kailash_enterprise::tenancy::TenantStatus;

TenantStatus::Active          // can perform all operations
TenantStatus::Suspended       // operations blocked
TenantStatus::PendingDeletion // marked for removal
```

## TenantRegistry

Thread-safe registry for managing tenant lifecycle. Backed by `RwLock<HashMap>` for concurrent async access.

### Basic Operations

```rust
use std::sync::Arc;
use kailash_enterprise::tenancy::{TenantRegistry, TenantInfo, TenantStatus};

// Create a shared registry
let registry = TenantRegistry::new_shared(); // returns Arc<TenantRegistry>

// Register a new tenant
let info = TenantInfo::new("t-1", "Acme Corp").with_plan("pro");
registry.register(info).await?;

// Duplicate registration returns an error
let result = registry.register(TenantInfo::new("t-1", "Duplicate")).await;
assert!(result.is_err()); // EnterpriseError::RbacPolicyError

// Look up a tenant
if let Some(info) = registry.lookup("t-1").await {
    println!("Found tenant: {}", info.name);
}

// Check if tenant is active
let active = registry.is_active("t-1").await; // true
let missing = registry.is_active("nonexistent").await; // false

// Update tenant info
let updated = TenantInfo::new("t-1", "Acme Corporation")
    .with_status(TenantStatus::Suspended);
registry.update(updated).await?;
// Updating a nonexistent tenant returns EnterpriseError::TenantNotFound

// List all tenant IDs
let ids = registry.list_tenant_ids().await;

// Count tenants
let count = registry.count().await;

// Remove a tenant (returns the removed TenantInfo)
let removed = registry.remove("t-1").await?;
// Removing nonexistent returns EnterpriseError::TenantNotFound
```

## Integration with EnterpriseContext

The `EnterpriseContext` wraps `ExecutionContext` with enterprise fields including tenant context. It implements `Deref` to `ExecutionContext` for transparent access to standard fields.

```rust
use kailash_core::node::ExecutionContext;
use kailash_enterprise::context::{EnterpriseContext, SecurityClassification};
use kailash_enterprise::tenancy::TenantContext;
use kailash_enterprise::audit::types::{AuditActor, ActorType};
use kailash_enterprise::rbac::types::{User, Permission};

let inner = ExecutionContext::new("run-1", "node-1");
let ctx = EnterpriseContext::new(inner)
    .with_tenant(TenantContext::new("tenant-abc").with_name("Acme"))
    .with_actor(AuditActor::new(ActorType::User, "alice"))
    .with_user(User::new("alice").with_role("admin"))
    .with_classification(SecurityClassification::Confidential);

// Read tenant context
if let Some(tenant) = ctx.tenant() {
    let tenant_id = tenant.tenant_id.as_ref();   // "tenant-abc"
    let is_bypass = tenant.bypass;                // false
}

// Deref gives access to ExecutionContext fields
assert_eq!(ctx.run_id, "run-1");
assert_eq!(ctx.node_id, "node-1");

// Mutable setters are available too
let mut ctx = ctx;
ctx.set_tenant(TenantContext::new("tenant-xyz"));
```

## Tenant Propagation Pattern

The typical flow for tenant propagation in a Kailash application:

1. **Entry point** (Nexus middleware): Extract tenant ID from JWT claims or request header
2. **Create TenantContext**: Attach to `EnterpriseContext`
3. **Propagate through workflow**: All nodes read tenant context for data isolation
4. **DataFlow QueryInterceptor**: Automatically injects `WHERE tenant_id = $1` into SQL queries

```rust
// Step 1-2: At the Nexus middleware layer
use kailash_enterprise::tenancy::TenantContext;
use kailash_enterprise::context::EnterpriseContext;
use kailash_core::node::ExecutionContext;

fn extract_tenant_from_request(claims: &serde_json::Value) -> Option<TenantContext> {
    let tenant_id = claims.get("tenant_id")?.as_str()?;
    Some(TenantContext::new(tenant_id))
}

// Step 3: In workflow execution
// The EnterpriseContext carries the tenant through the DAG
let inner = ExecutionContext::new("run-1", "node-1");
let ctx = EnterpriseContext::new(inner)
    .with_tenant(TenantContext::new("tenant-abc"));
```

## Tenant Validation Pattern

Validate that a tenant exists and is active before processing requests:

```rust
use kailash_enterprise::tenancy::{TenantRegistry, TenantInfo};
use kailash_enterprise::error::EnterpriseError;

async fn validate_tenant(
    registry: &TenantRegistry,
    tenant_id: &str,
) -> Result<TenantInfo, EnterpriseError> {
    let info = registry.lookup(tenant_id).await
        .ok_or_else(|| EnterpriseError::TenantNotFound(tenant_id.to_string()))?;

    if info.status != kailash_enterprise::tenancy::TenantStatus::Active {
        return Err(EnterpriseError::TenantSuspended(tenant_id.to_string()));
    }

    Ok(info)
}
```

## Error Handling

Tenancy operations use these `EnterpriseError` variants:

| Error Variant                              | When                                           |
| ------------------------------------------ | ---------------------------------------------- |
| `EnterpriseError::TenantNotFound(String)`  | `update()` or `remove()` on nonexistent tenant |
| `EnterpriseError::TenantSuspended(String)` | Tenant is suspended (used in validation)       |
| `EnterpriseError::RbacPolicyError(String)` | Duplicate `register()` with same tenant ID     |

## Thread Safety

All tenancy types are `Send + Sync`:

- `TenantContext` -- cloneable, serializable (`Serialize`, `Deserialize`)
- `TenantInfo` -- cloneable, serializable
- `TenantStatus` -- cloneable, serializable
- `TenantRegistry` -- uses `Arc<RwLock<HashMap>>` internally; share via `Arc<TenantRegistry>` or use `TenantRegistry::new_shared()`

## Source Files

- `crates/kailash-enterprise/src/tenancy/mod.rs`
- `crates/kailash-enterprise/src/context.rs`

<!-- Trigger Keywords: multi-tenancy, TenantContext, TenantRegistry, tenant isolation, tenant propagation, tenant bypass, TenantInfo, TenantStatus, tenant metadata, tenant registration, EnterpriseContext tenant, data isolation, tenant_id, tenant context, tenant middleware, tenant validation, bypass mode -->
