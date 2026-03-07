---
name: dataflow-multi-tenancy
description: "Multi-tenant patterns with DataFlow. Use when multi-tenant, tenant isolation, SaaS, __dataflow__ config, or tenant_id field."
---

# DataFlow Multi-Tenancy

Automatic tenant isolation for SaaS applications using DataFlow enterprise features.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> Related Skills: [`dataflow-models`](#), [`dataflow-crud-operations`](#)
> Related Subagents: `dataflow-specialist` (enterprise architecture)

## Quick Reference

- **Enable**: `__dataflow__ = {'multi_tenant': True}`
- **Auto-Adds**: `tenant_id` field to model
- **Auto-Filter**: All queries filtered by current tenant
- **Validation**: Prevents cross-tenant access

## Core Pattern

```python
import kailash

df = kailash.DataFlow()

@df.model
class Order:
    customer_id: int
    total: float
    status: str = 'pending'

    __dataflow__ = {
        'multi_tenant': True,     # Automatic tenant isolation
        'soft_delete': True,      # Preserve deleted data
        'audit_log': True         # Track all changes
    }

# Automatically adds tenant_id field
# All queries filtered by tenant automatically

builder = kailash.WorkflowBuilder()
builder.add_node("OrderCreateNode", "create", {
    "customer_id": 123,
    "total": 250.00,
    "tenant_id": "tenant_abc"  # Automatic isolation
})

# List only shows current tenant's orders
builder.add_node("OrderListNode", "list", {
    "filter": {"status": "completed"},
    "tenant_id": "tenant_abc"  # Filters automatically
})
```

## Auto-Wired Multi-Tenancy

Multi-tenancy is now auto-wired into the engine via `QueryInterceptor`, which hooks into 8 SQL execution points:

- All SELECT, INSERT, UPDATE, DELETE operations are automatically intercepted
- Tenant filtering is injected at the SQL level, not the application level
- No manual `tenant_id` parameter needed in workflow nodes when tenant context is set

```python
# Set tenant context once; all queries are automatically filtered
from kailash.dataflow.tenancy import TenantContextSwitch

async with TenantContextSwitch(db, tenant_id="tenant_abc"):
    # All operations inside this block are tenant-scoped
    result = rt.execute(builder.build(reg))
```

## Multi-Tenant Features

- **Tenant Isolation**: Automatic filtering by tenant_id
- **Data Partitioning**: Separate data per tenant
- **Security**: Prevents cross-tenant access
- **Audit Trails**: Track tenant-specific changes
- **Auto-Wired Interceptor**: QueryInterceptor at 8 SQL execution points

## Documentation References

### Specialist Reference
- **DataFlow Specialist**: [`.claude/skills/dataflow-specialist.md`](../../dataflow-specialist.md#L296-L303)

## Quick Tips

- Add `multi_tenant: True` to `__dataflow__`
- tenant_id automatically added to model
- All queries filtered by tenant
- Prevents cross-tenant access
- Perfect for SaaS applications

## Keywords for Auto-Trigger

<!-- Trigger Keywords: multi-tenant, tenant isolation, SaaS, __dataflow__ config, tenant_id, multi-tenancy, tenant data -->
