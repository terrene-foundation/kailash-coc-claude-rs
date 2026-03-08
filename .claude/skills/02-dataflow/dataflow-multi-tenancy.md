---
name: dataflow-multi-tenancy
description: "Multi-tenant patterns with DataFlow. Use when multi-tenant, tenant isolation, SaaS, tenant_id field, or QueryInterceptor."
---

# DataFlow Multi-Tenancy

Automatic tenant isolation for SaaS applications using DataFlow enterprise features.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> Related Skills: [`dataflow-models`](#), [`dataflow-crud-operations`](#)
> Related Subagents: `dataflow-specialist` (enterprise architecture)

## Quick Reference

- **Enable**: Add `tenant_id: str` field to your `@db.model` class
- **Auto-Filter**: Use `with_tenant` context manager for automatic tenant filtering
- **Validation**: QueryInterceptor prevents cross-tenant access at the SQL level

## Core Pattern

```python
import os
import kailash
from kailash.dataflow import db, with_tenant

df = kailash.DataFlow(os.environ["DATABASE_URL"])

@db.model
class Order:
    id: int
    customer_id: int
    total: float
    status: str
    tenant_id: str  # Tenant isolation field

# Use with_tenant context manager for automatic filtering
with with_tenant(df, "tenant_abc"):
    builder = kailash.WorkflowBuilder()
    builder.add_node("CreateOrder", "create", {
        "customer_id": 123,
        "total": 250.00,
        # tenant_id is auto-injected by QueryInterceptor
    })

    # List only shows current tenant's orders
    builder.add_node("ListOrder", "list", {
        "filter": {"status": "completed"},
        # tenant_id filter is auto-injected
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
```

## Auto-Wired Multi-Tenancy

Multi-tenancy is auto-wired via `QueryInterceptor`, which hooks into SQL execution:

- All SELECT, INSERT, UPDATE, DELETE operations are automatically intercepted
- Tenant filtering is injected at the SQL level, not the application level
- No manual `tenant_id` parameter needed in workflow nodes when tenant context is set

```python
from kailash.dataflow import with_tenant

# Set tenant context once; all queries are automatically filtered
with with_tenant(df, tenant_id="tenant_abc"):
    # All operations inside this block are tenant-scoped
    result = rt.execute(builder.build(reg))
```

## Multi-Tenant Features

- **Tenant Isolation**: Automatic filtering by tenant_id via QueryInterceptor
- **Data Partitioning**: Separate data per tenant
- **Security**: Prevents cross-tenant access at the SQL level
- **Audit Trails**: Track tenant-specific changes via enterprise audit

## Quick Tips

- Add `tenant_id: str` field to your model
- Use `with_tenant(df, "tenant_id")` context manager
- QueryInterceptor auto-filters all queries by tenant
- Prevents cross-tenant access at the SQL level
- Perfect for SaaS applications

## Keywords for Auto-Trigger

<!-- Trigger Keywords: multi-tenant, tenant isolation, SaaS, QueryInterceptor, tenant_id, multi-tenancy, tenant data, with_tenant -->
