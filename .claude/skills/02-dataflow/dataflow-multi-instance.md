---
name: dataflow-multi-instance
description: "Multiple isolated DataFlow instances. Use when multiple DataFlow, dev and prod, string IDs, context isolation, or separate DataFlow instances."
---

# DataFlow Multi-Instance Setup

Run multiple isolated DataFlow instances (dev/prod) with proper context separation.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`
> Related Skills: [`dataflow-models`](#), [`dataflow-connection-config`](#)
> Related Subagents: `dataflow-specialist`

## Quick Reference

- **Context Isolation**: Each instance maintains separate models
- **String IDs**: Preserved per instance
- **Pattern**: Dev + prod instances with different configs

## Core Pattern

```python
import kailash
from kailash.dataflow import db

# Development instance
df_dev = kailash.DataFlow(
    "sqlite:///dev.db",
    auto_migrate=True,  # Default - auto-creates and migrates tables
)

# Production instance (existing database, no schema changes)
df_prod = kailash.DataFlow(
    "postgresql://user:pass@localhost/prod",
    auto_migrate=False,  # Don't modify schema
)

# Models use @db.model (the module-level singleton decorator)
@db.model
class DevModel:
    id: str
    name: str

@db.model
class ProdModel:
    id: str
    name: str
```

## Common Use Cases

- **Multi-Environment**: Dev/staging/prod isolation
- **Multi-Tenant**: Separate database per tenant
- **Read/Write Split**: Separate read replica
- **Migration Testing**: Test database + production
- **Multi-Database**: Different databases in same app

## Common Mistakes

### Mistake 1: Confusing DataFlow Instances with Model Registration

```python
# The @db.model decorator is a module-level singleton
# All models are registered via @db.model, not @instance.model
from kailash.dataflow import db

df1 = kailash.DataFlow("sqlite:///db1.db")
df2 = kailash.DataFlow("postgresql://db2")

@db.model
class Model1:
    id: str
    name: str
# Model1 registered via the db singleton
```

## Documentation References

### Specialist Reference

- **DataFlow Specialist**: [`.claude/skills/dataflow-specialist.md`](../../dataflow-specialist.md#L86-L116)

## Quick Tips

- Each instance maintains separate models
- Proper context isolation enforced
- String IDs preserved per instance
- Use different configs per environment

## Keywords for Auto-Trigger

<!-- Trigger Keywords: multiple DataFlow, dev and prod, string IDs, context isolation, separate instances, multi-instance DataFlow, multiple databases -->
