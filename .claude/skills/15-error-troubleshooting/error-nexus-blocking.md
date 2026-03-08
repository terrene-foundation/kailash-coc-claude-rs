---
name: error-nexus-blocking
description: "Fix Nexus blocking and slow startup issues with DataFlow integration. Use when encountering 'Nexus blocking', 'Nexus slow startup', 'Nexus hangs', 'DataFlow Nexus integration slow', or startup delays."
---

# Error: Nexus Blocking / Slow Startup

Fix Nexus blocking and 5-30 second startup delays when integrating with DataFlow.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH` (Critical integration issue)
> Related Skills: [`dataflow-quickstart`](../../02-dataflow/dataflow-quickstart.md), [`nexus-quickstart`](../../03-nexus/nexus-quickstart.md)
> Related Subagents: `nexus-specialist` (integration debugging), `dataflow-specialist`

## The Problem

**Symptoms**:

- Nexus startup hangs or blocks indefinitely
- 5-10 second delay per DataFlow model
- Server never starts
- Blocking during initialization

**Root Cause**: Configuration conflict between Nexus auto-discovery and DataFlow model registration

## Quick Fix

### ❌ WRONG: Default Configuration (Blocks)

```python
import kailash

# This pattern can cause slow startup if misconfigured
from kailash.nexus import NexusApp

app = NexusApp()
df = kailash.DataFlow(os.environ["DATABASE_URL"])  # Registers models with workflows

@db.model
class User:
    name: str

app.start()  # ✗ HANGS or very slow
```

### ✅ FIX: Critical Settings (<2s Startup)

```python

# Step 1: Create NexusApp
from kailash.nexus import NexusApp

app = NexusApp()

# Step 2: Create kailash.DataFlow (defaults work correctly)
df = kailash.DataFlow(
    "postgresql://user:pass@localhost/db",
    auto_migrate=True,  # Default - DataFlow handles table creation automatically
)

# Step 3: Define models (now instant!)
@db.model
class User:
    name: str
    email: str

# Step 4: Register workflows manually
builder = kailash.WorkflowBuilder()
builder.add_node("UserCreateNode", "create", {
    "name": "Alice",
    "email": "alice@example.com"
})

reg = kailash.NodeRegistry()
app.register("create_user", builder.build(reg))

# Fast startup: <2 seconds!
app.start()
```

## Why This Happens

1. `auto_discovery=True` → Nexus scans Python files
2. Importing DataFlow models → Triggers workflow execution
3. Each model registration → Runs `Runtime.execute()` synchronously
4. Creates blocking loop → Prevents server startup

## What You Keep

With `auto_discovery=False` + DataFlow defaults:

- All CRUD operations (11 nodes per model)
- Connection pooling, caching, metrics
- All Nexus channels (API, CLI, MCP)
- Automatic schema migration (DataFlow handles table creation automatically)
- Fast startup

## What You Lose

With `auto_discovery=False`:

- Auto-discovery of workflows (must register manually with `app.register()`)

## Related Patterns

- **Nexus basics**: [`nexus-quickstart`](../../03-nexus/nexus-quickstart.md)
- **DataFlow basics**: [`dataflow-quickstart`](../../02-dataflow/dataflow-quickstart.md)
- **Integration guide**: [`dataflow-nexus-integration`](../integrations/dataflow-nexus-integration.md)

## When to Escalate to Subagent

Use `nexus-specialist` subagent when:

- Still experiencing blocking after fix
- Need full-feature configuration guidance
- Complex multi-framework integration
- Production deployment planning

## Documentation References

### Primary Sources

- **Nexus Specialist**: [`.claude/agents/frameworks/nexus-specialist.md` (lines 320-386)](../../../../.claude/agents/frameworks/nexus-specialist.md#L320-L386)
- **DataFlow Specialist**: [`.claude/agents/frameworks/dataflow-specialist.md` (lines 13-25)](../../../../.claude/agents/frameworks/dataflow-specialist.md#L13-L25)
- **Integration Guide**: [`.claude/skills/03-nexus/nexus-dataflow-integration.md`](../../skills/03-nexus/nexus-dataflow-integration.md)

## Quick Tips

- 💡 **Use NexusApp**: `from kailash.nexus import NexusApp; app = NexusApp()`
- 💡 **Order matters**: Create NexusApp FIRST, then DataFlow
- 💡 **Manual registration**: Register workflows explicitly with `app.register()`
- 💡 **DataFlow**: `auto_migrate=True` (default) works correctly in Docker/NexusApp

<!-- Trigger Keywords: Nexus blocking, Nexus slow startup, Nexus hangs, DataFlow Nexus integration slow, startup delay, Nexus initialization slow, blocking on startup, slow Nexus, integration blocking -->
