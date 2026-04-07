---
name: nexus-security-best-practices
description: "Security in kailash-rs Nexus: NexusAuthPlugin, JWT, RBAC, API keys, CORS, rate limiting."
---

# Nexus Security Best Practices (kailash-rs)

Security configuration using NexusAuthPlugin, convenience methods, and best practices.

## Quick Setup with NexusApp Convenience Methods

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=3000))

# CORS
app.add_cors(origins=["https://example.com"])

# Rate limiting
app.add_rate_limit(max_requests=100, window_secs=60)

@app.handler("protected", description="Protected handler")
async def protected(data: str) -> dict:
    return {"data": data}

app.start()
```

## NexusAuthPlugin (Full Auth System)

For JWT, RBAC, API keys, and advanced security, use `NexusAuthPlugin`:

```python
import os
from kailash.nexus import NexusApp, NexusConfig, NexusAuthPlugin, JwtConfig

auth = NexusAuthPlugin.basic_auth(
    jwt=JwtConfig(secret=os.environ["JWT_SECRET"]),  # CRITICAL: `secret`, NOT `secret_key`
)

app = NexusApp(config=NexusConfig(port=3000))
# NexusAuthPlugin is added via the low-level Nexus
# Access the underlying Nexus if needed for plugin registration
```

### JWT Configuration

```python
from kailash.nexus import JwtConfig

# Symmetric (HS256)
jwt = JwtConfig(
    secret=os.environ["JWT_SECRET"],   # MUST be >= 32 chars for HS*
    algorithm="HS256",
    exempt_paths=["/health", "/docs"], # CRITICAL: `exempt_paths`, NOT `exclude_paths`
    verify_exp=True,
    leeway=0,
)

# Asymmetric (RS256) -- for SSO providers
jwt = JwtConfig(
    algorithm="RS256",
    jwks_url="https://your-tenant.auth0.com/.well-known/jwks.json",
    jwks_cache_ttl=3600,
    issuer="https://your-issuer.com",
    audience="your-api",
)
```

### RBAC

```python
from kailash.nexus import NexusAuthPlugin, JwtConfig, RbacConfig

auth = NexusAuthPlugin.saas_app(
    jwt=JwtConfig(secret=os.environ["JWT_SECRET"]),
    rbac={
        "admin": ["*"],                         # Full access
        "editor": ["read:*", "write:articles"], # Wildcard + specific
        "viewer": ["read:*"],                   # Read-only
    },
)
```

Permission wildcards:

- `"*"` -- matches everything
- `"read:*"` -- matches `read:users`, `read:articles`, etc.
- `"*:users"` -- matches `read:users`, `write:users`, etc.

### API Key Authentication

```python
from kailash.nexus import ApiKeyConfig

api_key_config = ApiKeyConfig(...)
```

### Rate Limiting via Auth Plugin

```python
from kailash.nexus import AuthRateLimitConfig

rate_limit = AuthRateLimitConfig(
    requests_per_minute=100,
    burst_size=20,
    backend="memory",  # or "redis"
)
```

## CORS Configuration

```python
app = NexusApp(config=NexusConfig(port=3000))
app.add_cors(origins=[
    "https://app.example.com",
    "https://admin.example.com",
])
```

## Rate Limiting

```python
app.add_rate_limit(max_requests=100, window_secs=60)
```

## Common Auth Gotchas

| Issue                                   | Cause                                | Fix                            |
| --------------------------------------- | ------------------------------------ | ------------------------------ |
| `TypeError: 'secret_key' unexpected`    | Wrong param name                     | Use `secret`, not `secret_key` |
| `TypeError: 'exclude_paths' unexpected` | JwtConfig uses different name        | Use `exempt_paths`             |
| Nexus dependency injection fails        | `from __future__ import annotations` | Remove PEP 563 import          |
| RBAC without JWT                        | RBAC requires JWT                    | Add `jwt=JwtConfig(...)`       |

## Security Checklist

1. Use HTTPS in production (via reverse proxy)
2. Configure CORS with specific origins (never `["*"]` in production)
3. Enable rate limiting on all public endpoints
4. Use environment variables for all secrets
5. Set `exempt_paths` only for truly public endpoints (health, docs)
6. Use RS256 (asymmetric) for production JWT
7. Never log tokens, passwords, or PII

## Key Differences from kailash-py

| Aspect           | kailash-py                                      | kailash-rs                                             |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------ |
| Auth imports     | `from nexus.auth.plugin import NexusAuthPlugin` | `from kailash.nexus import NexusAuthPlugin`            |
| JWT config class | `JWTConfig`                                     | `JwtConfig`                                            |
| CORS setup       | `Nexus(cors_origins=[...])`                     | `app.add_cors(origins=[...])`                          |
| Rate limit setup | `Nexus(rate_limit=1000)`                        | `app.add_rate_limit(max_requests=100, window_secs=60)` |
| Auth plugin      | `app.add_plugin(auth)` on Nexus                 | Same pattern via low-level Nexus                       |

## Related Skills

- [nexus-essential-patterns](nexus-essential-patterns.md) - Middleware and plugin patterns
- [nexus-production-deployment](nexus-production-deployment.md) - Production hardening
- [nexus-config-options](nexus-config-options.md) - Configuration reference
