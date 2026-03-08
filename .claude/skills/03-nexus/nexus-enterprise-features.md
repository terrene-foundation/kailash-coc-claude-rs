---
skill: nexus-enterprise-features
description: Enterprise features including authentication, authorization, rate limiting, monitoring
priority: MEDIUM
tags: [nexus, enterprise, auth, security, monitoring]
---

# Nexus Enterprise Features

Production-grade features for enterprise deployments.

## Authentication

### NexusAuthPlugin -- The Unified Auth System

Authentication in Nexus is configured through the `NexusAuthPlugin`, which assembles
JWT, RBAC, tenant isolation, rate limiting, and audit logging into a single plugin.

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig

# Basic auth (JWT)
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"])  # secret_key is the parameter name
)

app = NexusApp()
app.start()
```

### JWT Configuration

```python
from kailash.nexus import JwtConfig

jwt_config = JwtConfig(
    secret_key=os.environ["JWT_SECRET"],      # Must be >= 32 chars for HS256
    algorithm="HS256",                        # Default
    expiry_secs=3600,                         # Default 3600
    issuer=None,                              # Optional
)
```

**JwtConfig only accepts:** `secret_key`, `expiry_secs`, `algorithm`, `issuer`. No other parameters exist.

### SaaS Application (JWT + RBAC + Tenant Isolation)

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig

auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "user": ["users.read"]}),
    tenant_header="X-Tenant-ID",
)

app = NexusApp()
app.start()
```

## Authorization (RBAC)

RBAC is configured as part of the NexusAuthPlugin.

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig

auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "editor": ["content.read", "content.write"], "viewer": ["content.read"]}),
    tenant_header="X-Tenant-ID",
)

app = NexusApp()

# Use handlers for role-protected operations
@app.handler("admin_dashboard", description="Admin only")
async def admin_only() -> dict:
    return {"admin": True}

@app.handler("get_profile", description="Get user profile")
async def profile() -> dict:
    return {"status": "ok"}
```

**Permission matching:**

- `"*"` matches everything
- `"read:*"` matches `read:users`, `read:articles`, etc.
- `"*:users"` matches `read:users`, `write:users`, etc.

## Rate Limiting

### Constructor-Level Rate Limiting

```python
app = NexusApp()
app.add_rate_limit(1000)
```

### Rate Limiting via NexusApp

```python
from kailash.nexus import NexusApp

app = NexusApp()
app.add_rate_limit(max_requests=100, window_secs=60)
```

**Note:** There is no `RateLimitConfig` class. Rate limiting is configured directly on the NexusApp instance.

## Monitoring and Observability

### Enable Monitoring via Constructor

```python
app = NexusApp()
# Monitoring configured separately

# Health endpoint: GET http://localhost:3000/health
```

### Health Check

```python
app = NexusApp()
health = app.health_check()
print(f"Status: {health['status']}")
```

## Audit Logging

Audit logging is handled at the application level via structured logging, not via NexusAuthPlugin configuration:

```python
import os
import logging
from kailash.nexus import NexusApp

app = NexusApp()

# Use structured logging for audit trails
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexus.audit")

@app.handler("sensitive_action", description="Audited action")
async def sensitive_action(data: str) -> dict:
    logger.info("Action performed", extra={"action": "sensitive_action"})
    return {"status": "ok"}
```

## Tenant Isolation

Tenant isolation is configured via the `tenant_header` parameter on NexusAuthPlugin:

```python
import os
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig

auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "user": ["users.read"]}),
    tenant_header="X-Tenant-ID",       # String header name, NOT a TenantConfig object
)

app = NexusApp()
app.start()
```

**Note:** There is no `TenantConfig` class. Use the `tenant_header` string parameter directly.

## Security Hardening

```python
import os
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig

auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "editor": ["content.read", "content.write"], "viewer": ["content.read"]}),
    tenant_header="X-Tenant-ID",
)

app = NexusApp()
app.add_rate_limit(max_requests=5000, window_secs=60)
app.add_cors(["https://app.example.com"])
app.start()
```

## CORS Configuration

```python
# CORS via constructor
app = NexusApp()
app.add_cors(["https://app.example.com"])
```

## Presets

```python
# One-line middleware stacks
app = NexusApp()          # Configure SaaS features via plugins
app = NexusApp()    # Configure enterprise features via plugins
```

## Production Deployment Example

```python
import os
from kailash.nexus import NexusApp, NexusConfig, NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig

def create_production_app():
    auth = NexusAuthPlugin(
        jwt=JwtConfig(
            secret_key=os.environ["JWT_SECRET"],
            algorithm="HS256",
            issuer="https://auth.company.com",
        ),
        rbac=RbacConfig(roles={"admin": ["*"], "editor": ["content.read", "content.write"], "viewer": ["content.read"]}),
        tenant_header="X-Tenant-ID",
    )

    app = NexusApp(config=NexusConfig(
        port=int(os.getenv("PORT", "3000")),
        host="0.0.0.0",
    ))

    # Security: Rate limiting and CORS
    app.add_rate_limit(max_requests=5000, window_secs=60)
    app.add_cors(["https://app.example.com"])

    return app

# Create and start
app = create_production_app()
app.start()
```

## Best Practices

1. **Use NexusAuthPlugin** for all authentication needs
2. **Use HTTPS** for all traffic (via reverse proxy)
3. **Configure Rate Limiting** appropriately (default 100 req/min)
4. **Enable Monitoring** in production
5. **Use Redis** for distributed sessions and rate limiting
6. **Enable Audit Logging** for compliance
7. **Regular Security Audits**
8. **Use `auto_discovery=False`** with DataFlow integration

## Common Auth Gotchas

| Issue                                    | Cause                                 | Fix                                           |
| ---------------------------------------- | ------------------------------------- | --------------------------------------------- |
| `TypeError: 'secret' unexpected`         | Wrong param name                      | Use `secret_key`, not `secret`                |
| `TypeError: 'exempt_paths' unexpected`   | JwtConfig has no exempt_paths         | Remove it (not a valid param)                 |
| `TypeError: 'jwt_secret_key' unexpected` | Wrong NexusAuthPlugin param           | Use `jwt=JwtConfig(secret_key=...)`           |
| `NameError: TenantConfig`                | TenantConfig does not exist           | Use `tenant_header="X-Tenant-ID"` string      |
| `NameError: RateLimitConfig`             | RateLimitConfig does not exist        | Use `app.add_rate_limit(max_requests=N, ...)` |
| `AttributeError: basic_auth`             | No factory methods on NexusAuthPlugin | Use direct constructor `NexusAuthPlugin(...)` |
| `AttributeError: add_plugin`             | NexusApp wraps Nexus                  | Use `app._nexus.add_plugin(plugin)`           |
| Dependency injection fails               | `from __future__ import annotations`  | Remove PEP 563 import                         |

## Key Takeaways

- Authentication configured via `NexusAuthPlugin` constructor (no factory methods)
- NexusAuthPlugin accepts: `jwt=JwtConfig(...)`, `rbac=RbacConfig(...)`, `rate_limit=None`, `tenant_header=None`
- JwtConfig only accepts: `secret_key`, `expiry_secs`, `algorithm`, `issuer`
- Plugin access via `app._nexus.add_plugin(plugin)` (Nexus has `add_plugin()` and `add_middleware()`)
- Rate limiting via `app.add_rate_limit(max_requests=N, window_secs=N)`
- There are NO `TenantConfig` or `RateLimitConfig` classes

## Related Skills

- [nexus-auth-plugin](#) - Full NexusAuthPlugin reference
- [nexus-config-options](#) - Configuration reference
- [nexus-quickstart](#) - Basic setup
- [nexus-troubleshooting](#) - Fix production issues
