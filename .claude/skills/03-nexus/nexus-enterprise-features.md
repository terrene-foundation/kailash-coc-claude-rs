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
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig

# Basic auth (JWT + audit)
auth = NexusAuthPlugin.basic_auth(
    jwt=JwtConfig(os.environ["JWT_SECRET"])  # CRITICAL: use `secret`, NOT `secret_key`
)

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.add_plugin(auth)
nexus.start()
```

### JWT Configuration (Symmetric -- HS256)

```python
from kailash import JwtConfig

jwt_config = JwtConfig(
    secret=os.environ["JWT_SECRET"],      # CRITICAL: `secret`, NOT `secret_key`
    algorithm="HS256",
    exempt_paths=["/health", "/docs"],    # CRITICAL: `exempt_paths`, NOT `exclude_paths`
    verify_exp=True,
    leeway=0,
)
```

### JWT Configuration (Asymmetric -- RS256 / SSO)

```python
from kailash import JwtConfig

# JWKS for SSO providers (Auth0, Okta, etc.)
jwt_config = JwtConfig(
    algorithm="RS256",
    jwks_url="https://your-tenant.auth0.com/.well-known/jwks.json",
    jwks_cache_ttl=3600,
    issuer="https://your-issuer.com",
    audience="your-api",
)
```

### SaaS Application (JWT + RBAC + Tenant Isolation)

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig, TenantConfig

auth = NexusAuthPlugin.saas_app(
    jwt=JwtConfig(os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "user": ["read:*"]},
    tenant_isolation=TenantConfig(admin_role="admin"),  # singular `admin_role`
)

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.add_plugin(auth)
nexus.start()
```

## Authorization (RBAC)

RBAC is configured as part of the NexusAuthPlugin.

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig, RbacConfig

auth = NexusAuthPlugin(
    jwt=JwtConfig(os.environ["JWT_SECRET"]),
    rbac=RbacConfig(["admin", "editor", "viewer"]),
    tenant_header="X-Tenant-ID",
)

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.add_plugin(auth)

# Use handlers for role-protected operations
@nexus.handler("admin_dashboard", description="Admin only")
async def admin_only() -> dict:
    return {"admin": True}

@nexus.handler("get_profile", description="Get user profile")
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
app = kailash.Nexus(
    rate_limit=1000,  # Requests per minute (default: 100)
)
```

### Fine-Grained Rate Limiting via NexusAuthPlugin

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig
from kailash import AuthRateLimitConfig

auth = NexusAuthPlugin.enterprise(
    jwt=JwtConfig(os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "user": ["read:*"]},
    rate_limit=RateLimitConfig(
        requests_per_minute=100,
        burst_size=20,
        backend="memory",                    # or "redis"
        redis_url="redis://localhost:6379",  # Required if backend="redis"
        route_limits={
            "/api/chat/*": {"requests_per_minute": 30},
            "/api/auth/login": {"requests_per_minute": 10, "burst_size": 5},
            "/health": None,                 # Disable rate limit for health
        },
        include_headers=True,                # X-RateLimit-* headers
        fail_open=True,                      # Allow when backend fails
    ),
)
# CRITICAL: RateLimitConfig has NO `exclude_paths` parameter

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.add_plugin(auth)
nexus.start()
```

## Monitoring and Observability

### Enable Monitoring via Constructor

```python
app = kailash.Nexus(
    enable_monitoring=True,
)

# Health endpoint: GET http://localhost:8000/health
```

### Health Check

```python
app = kailash.Nexus()
health = app.health_check()
print(f"Status: {health['status']}")
```

## Audit Logging

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig
from kailash.nexus import NexusAuthPlugin

auth = NexusAuthPlugin.enterprise(
    jwt=JwtConfig(os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "user": ["read:*"]},
    audit=AuditConfig(
        backend="logging",                   # or "dataflow"
        log_level="INFO",
        log_request_body=False,              # PII risk
        log_response_body=False,
        exclude_paths=["/health", "/metrics"],
        redact_headers=["Authorization", "Cookie"],
        redact_fields=["password", "token", "api_key"],
    ),
)

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.add_plugin(auth)
nexus.start()
```

## Tenant Isolation

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig
from kailash.nexus import NexusAuthPlugin

auth = NexusAuthPlugin.saas_app(
    jwt=JwtConfig(os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "user": ["read:*"]},
    tenant_isolation=TenantConfig(
        tenant_id_header="X-Tenant-ID",
        jwt_claim="tenant_id",               # Claim name in JWT
        allow_admin_override=True,
        admin_role="super_admin",            # CRITICAL: singular string, NOT `admin_roles`
        exclude_paths=["/health", "/docs"],
    ),
)

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.add_plugin(auth)
nexus.start()
```

## Security Hardening

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig, TenantConfig
from kailash import AuthRateLimitConfig
from kailash.nexus import NexusAuthPlugin

auth = NexusAuthPlugin.enterprise(
    jwt=JwtConfig(os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "editor": ["read:*", "write:*"], "viewer": ["read:*"]},
    rate_limit=RateLimitConfig(requests_per_minute=5000),
    tenant_isolation=TenantConfig(admin_role="admin"),
    audit=AuditConfig(backend="logging"),
)

nexus = kailash.Nexus(
    cors_origins=["https://app.example.com"],
    cors_allow_credentials=False,
    rate_limit=5000,
)
nexus.add_plugin(auth)
nexus.start()
```

## CORS Configuration

```python
# CORS via constructor
app = kailash.Nexus(
    cors_origins=["https://app.example.com"],
    cors_allow_credentials=False,
)
```

## Presets

```python
# One-line middleware stacks
app = kailash.Nexus(preset="saas")          # Sensible SaaS defaults
app = kailash.Nexus(preset="enterprise")    # Full enterprise stack
```

## Production Deployment Example

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig, TenantConfig
from kailash import AuthRateLimitConfig
from kailash.nexus import NexusAuthPlugin

def create_production_app():
    # Auth via NexusAuthPlugin
    auth = NexusAuthPlugin.enterprise(
        jwt=JwtConfig(
            algorithm="RS256",
            jwks_url="https://auth.company.com/.well-known/jwks.json",
            jwks_cache_ttl=3600,
        ),
        rbac={"admin": ["*"], "editor": ["read:*", "write:*"], "viewer": ["read:*"]},
        rate_limit=RateLimitConfig(
            requests_per_minute=5000,
            backend="redis",
            redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379"),
        ),
        tenant_isolation=TenantConfig(admin_role="admin"),
        audit=AuditConfig(backend="logging"),
    )

    nexus = kailash.Nexus(
        # Server
        api_port=int(os.getenv("PORT", "8000")),
        api_host="0.0.0.0",

        # Security
        rate_limit=5000,
        cors_origins=["https://app.example.com"],
        cors_allow_credentials=False,

        # Monitoring
        enable_monitoring=True,

        # Logging
        log_level="INFO",

        # Discovery
        auto_discovery=False,
    )
    nexus.add_plugin(auth)

    return nexus

# Create and start
nexus = create_production_app()
nexus.start()
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

| Issue                                   | Cause                                | Fix                            |
| --------------------------------------- | ------------------------------------ | ------------------------------ |
| `TypeError: 'secret_key' unexpected`    | Wrong param name                     | Use `secret`, not `secret_key` |
| `TypeError: 'exclude_paths' unexpected` | JwtConfig uses different name        | Use `exempt_paths`             |
| `TypeError: 'admin_roles' unexpected`   | TenantConfig uses singular           | Use `admin_role` (string)      |
| Dependency injection fails              | `from __future__ import annotations` | Remove PEP 563 import          |
| RBAC without JWT                        | RBAC requires JWT                    | Add `jwt=JwtConfig(...)`       |

## Key Takeaways

- Authentication configured via `NexusAuthPlugin` (not attribute access)
- Factory methods: `basic_auth()`, `saas_app()`, `enterprise()`
- Middleware ordering handled automatically by the plugin
- RBAC uses wildcard patterns for permission matching
- Rate limiting available at constructor level or via plugin
- Audit logging integrated into the auth plugin

## Related Skills

- [nexus-auth-plugin](#) - Full NexusAuthPlugin reference
- [nexus-config-options](#) - Configuration reference
- [nexus-quickstart](#) - Basic setup
- [nexus-troubleshooting](#) - Fix production issues
