---
name: enterprise-tenancy
description: "Multi-tenancy context, tenant registry, and data isolation for kailash-enterprise. Use when asking 'multi-tenancy', 'TenantContext', 'TenantRegistry', 'TenantInfo', 'TenantStatus', 'EnterpriseTenantContext', 'tenant isolation', 'tenant bypass', 'tenant metadata', or 'tenant registration'."
---

# Enterprise Multi-Tenancy

Tenant context propagation, registry management, and data isolation using `kailash.enterprise`.

## Imports

```python
from kailash.enterprise import (
    TenantStatus,
    TenantInfo,
    EnterpriseTenantContext,
    TenantRegistry,
    EnterpriseContext,
)
```

## EnterpriseTenantContext

Carries the current tenant identity through the execution stack. Set at the entry point and read by downstream components for data isolation.

### Creating a Tenant Context

```python
# Basic tenant context
ctx = EnterpriseTenantContext("tenant-abc")
ctx.tenant_id   # "tenant-abc"
ctx.name         # None

# With display name
ctx = EnterpriseTenantContext("tenant-abc", name="Acme Corp")
ctx.name         # "Acme Corp"

# With metadata
ctx = ctx.with_metadata("region", "us-east")
ctx = ctx.with_metadata("tier", "enterprise")
```

### Bypass Mode

System operations that need cross-tenant data access can enable bypass mode. The reason is recorded for audit trails.

```python
# Admin migration that needs all-tenant access
ctx = EnterpriseTenantContext("system", bypass=True, bypass_reason="scheduled data migration")
ctx.is_bypass()       # True
ctx.bypass_reason     # "scheduled data migration"

# Normal tenants are not in bypass mode
normal = EnterpriseTenantContext("tenant-abc")
normal.is_bypass()    # False
```

## TenantStatus

Represents a tenant's operational lifecycle state.

```python
active = TenantStatus.active()       # Can perform all operations
suspended = TenantStatus.suspended() # Operations blocked
pending = TenantStatus.pending()     # Pending deletion
```

## TenantInfo

Tenant metadata stored in the registry. Tracks name, status, plan, and arbitrary metadata.

```python
# Create tenant info (defaults to active status)
info = TenantInfo("tenant-abc", "Acme Corp")
info.tenant_id   # "tenant-abc"
info.name        # "Acme Corp"

# With explicit status
info = TenantInfo("tenant-abc", "Acme Corp", status=TenantStatus.active())

# With plan and metadata
info = info.with_plan("enterprise")
info = info.with_metadata("max_users", 500)
info = info.with_metadata("region", "us-east")

# With custom status
info = info.with_status(TenantStatus.suspended())
```

## TenantRegistry

Thread-safe registry for managing tenant lifecycle.

### Basic Operations

```python
registry = TenantRegistry()

# Register a tenant
info = TenantInfo("t-1", "Acme Corp").with_plan("pro")
registry.register(info)

# Duplicate registration raises RuntimeError
# registry.register(TenantInfo("t-1", "Duplicate"))  # Raises!

# Look up a tenant (returns TenantInfo or None)
found = registry.get("t-1")
if found:
    print(f"Found: {found.name}")

# List all tenants
all_tenants = registry.list_tenants()
for tenant in all_tenants:
    print(f"{tenant.tenant_id}: {tenant.name}")

# Count tenants
count = registry.tenant_count()  # 1
```

## EnterpriseContext

The `EnterpriseContext` combines tenant context with security classification and RBAC user. It is the aggregate context for enterprise operations.

```python
from kailash.enterprise import (
    EnterpriseContext,
    EnterpriseTenantContext,
    User,
    SecurityClassification,
)

# Create an enterprise context
ctx = EnterpriseContext(
    tenant_id="tenant-abc",
    user=User("alice").with_role("admin"),
    classification=SecurityClassification.confidential(),
)

ctx.tenant_id  # "tenant-abc"

# With full tenant context
ctx = ctx.with_tenant(EnterpriseTenantContext("tenant-abc", name="Acme"))
ctx = ctx.with_user(User("alice").with_role("admin"))
ctx = ctx.with_classification(SecurityClassification.restricted())
```

### SecurityClassification Levels

```python
SecurityClassification.public()        # Level 1
SecurityClassification.internal()      # Level 2
SecurityClassification.confidential()  # Level 3
SecurityClassification.restricted()    # Level 4
```

## Tenant Propagation Pattern

The typical flow for tenant propagation in a Kailash application:

1. **Entry point**: Extract tenant ID from JWT claims or request header
2. **Create EnterpriseTenantContext**: Attach tenant identity
3. **Propagate**: All downstream components read tenant context for data isolation
4. **DataFlow**: QueryInterceptor automatically injects `WHERE tenant_id = ?` into SQL queries

```python
from kailash.enterprise import EnterpriseTenantContext, TenantRegistry, TenantInfo

# Step 1: Set up tenant registry
registry = TenantRegistry()
registry.register(TenantInfo("acme-001", "Acme Corp").with_plan("enterprise"))
registry.register(TenantInfo("globex-002", "Globex Inc").with_plan("pro"))

# Step 2: On incoming request, resolve tenant
def handle_request(tenant_id: str):
    tenant = registry.get(tenant_id)
    if tenant is None:
        raise ValueError(f"Unknown tenant: {tenant_id}")

    ctx = EnterpriseTenantContext(tenant_id, name=tenant.name)
    # ctx is now available for downstream data isolation
    return ctx
```

## Python Compat: Context Variables

The Python compat layer provides thread-local context for tenant and user propagation:

```python
from kailash.enterprise import (
    set_current_tenant,
    get_current_tenant,
    set_current_user,
    get_current_user,
    clear_context,
    User,
)

# Set context for the current thread
set_current_tenant("tenant-abc")
set_current_user(User("alice").with_role("admin"))

# Read context
tenant_id = get_current_tenant()    # "tenant-abc"
user = get_current_user()           # User("alice")

# Clear all context
clear_context()
```

### Tenant-Scoped Decorator

The `@tenant_scoped` decorator validates that tenant context is set before a function runs:

```python
from kailash.enterprise import tenant_scoped, set_current_tenant

@tenant_scoped
def get_orders():
    tenant = get_current_tenant()
    # ... fetch orders for this tenant ...
    return orders

# Must set tenant context first
set_current_tenant("acme-001")
orders = get_orders()  # Works

clear_context()
# get_orders()  # Would raise RuntimeError: "No tenant context set"
```

## Testing Multi-Tenancy

```python
def test_tenant_registry():
    registry = TenantRegistry()
    registry.register(TenantInfo("t-1", "Acme Corp"))
    registry.register(TenantInfo("t-2", "Globex Inc"))

    assert registry.tenant_count() == 2
    assert registry.get("t-1").name == "Acme Corp"
    assert registry.get("nonexistent") is None


def test_tenant_context_bypass():
    ctx = EnterpriseTenantContext("system", bypass=True, bypass_reason="migration")
    assert ctx.is_bypass() is True
    assert ctx.bypass_reason == "migration"

    normal = EnterpriseTenantContext("tenant-abc")
    assert normal.is_bypass() is False


def test_tenant_info_metadata():
    info = TenantInfo("t-1", "Acme").with_plan("enterprise")
    info = info.with_metadata("region", "us-east")
    assert info.tenant_id == "t-1"
    assert info.name == "Acme"
```

## API Reference

| Class                     | Key Methods                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `EnterpriseTenantContext` | `__init__(tenant_id, name=None, bypass=False, bypass_reason=None)`, `.with_metadata(k, v)`, `.is_bypass()`                  |
| `TenantStatus`            | `.active()`, `.suspended()`, `.pending()`                                                                                   |
| `TenantInfo`              | `__init__(tenant_id, name, status=None)`, `.with_plan(plan)`, `.with_status(status)`, `.with_metadata(k, v)`                |
| `TenantRegistry`          | `__init__()`, `.register(info)`, `.get(id)`, `.list_tenants()`, `.tenant_count()`                                           |
| `EnterpriseContext`       | `__init__(tenant_id, user=None, classification=None)`, `.with_tenant(ctx)`, `.with_user(user)`, `.with_classification(cls)` |
