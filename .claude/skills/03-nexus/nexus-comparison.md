---
name: nexus-comparison
description: "Nexus vs building from scratch. Use when asking 'why nexus' or 'nexus benefits'."
---

# Nexus vs Building From Scratch

> **Skill Metadata**
> Category: `nexus`
> Priority: `MEDIUM`
> Package: `pip install kailash-enterprise`

## Why Nexus

| Feature | Nexus (kailash-enterprise) | Manual Approach |
|---------|---------------------------|-----------------|
| **API** | Built-in | Assemble framework + routing |
| **CLI** | Built-in | Separate CLI tool needed |
| **MCP** | Built-in | Manual protocol implementation |
| **Session Management** | Unified across channels | Manual per-channel |
| **Auth (JWT/RBAC/Tenant)** | NexusAuthPlugin | Build from scratch |
| **Workflow Integration** | Native | Manual orchestration |

## When to Use Nexus

```python
# Use Nexus when you need:
# - API + CLI + MCP in one app
# - Session management across channels
# - Direct workflow execution
# - Built-in auth, rate limiting, monitoring

import kailash

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))

@nexus.handler("greet", description="Greet a user")
async def greet(name: str) -> dict:
    return {"message": f"Hello, {name}!"}

nexus.start()  # API + CLI + MCP all ready
```

## When NOT to Use Nexus

- Pure library code with no server component
- Embedding workflows in an existing application server (use `kailash.Runtime` directly)
- Standalone scripts (use `kailash.WorkflowBuilder` + `kailash.Runtime`)

## Key Benefits

1. **Zero boilerplate** -- Single decorator deploys to all channels
2. **Unified sessions** -- Same session across API/CLI/MCP
3. **Native workflows** -- Direct WorkflowBuilder and DataFlow integration
4. **Built-in CLI** -- Automatic CLI generation from handlers
5. **MCP ready** -- AI agent integration out of the box
6. **Auth included** -- NexusAuthPlugin for JWT, RBAC, tenant isolation

## Installation

```bash
pip install kailash-enterprise  # Nexus included alongside DataFlow, Kaizen, Enterprise
```

## Documentation

- [nexus-quickstart](nexus-quickstart.md) -- Get started in 30 seconds
- [nexus-handler-support](nexus-handler-support.md) -- Handler decorator patterns
- [nexus-auth-plugin](nexus-auth-plugin.md) -- Authentication and RBAC

<!-- Trigger Keywords: why nexus, nexus benefits, nexus alternatives -->
