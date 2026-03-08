---
skill: nexus-auth-plugin
description: NexusAuthPlugin unified authentication with JWT, RBAC, tenant isolation, rate limiting, and audit logging
priority: HIGH
tags: [nexus, auth, jwt, rbac, tenant, rate-limit, audit, sso]
---

# NexusAuthPlugin - Unified Authentication

Complete auth package combining JWT, RBAC, rate limiting, tenant isolation, and audit logging into a single plugin.

**Security Defaults**:

- JwtConfig enforces **32-char minimum** for HS\* secrets (`ValueError` if shorter)
- RBAC errors return generic "Forbidden" (no role/permission leakage)
- SSO errors are sanitized (status-only to client, details logged server-side)
- `create_access_token()` filters reserved claims from `extra_claims`

## Quick Reference

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig
```

## Constructor Patterns

### Basic Auth (JWT only)

```python
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),  # Must be >= 32 chars for HS256
)
app = NexusApp()
```

### SaaS App (JWT + RBAC + Tenant)

```python
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "user": ["users.read"]}),
    tenant_header="X-Tenant-ID",
)
```

### Full Auth (JWT + RBAC)

```python
auth = NexusAuthPlugin(
    jwt=JwtConfig(
        secret_key=os.environ["JWT_SECRET"],  # >= 32 chars
        issuer="https://your-domain.com",
        algorithm="HS256",
    ),
    rbac=RbacConfig(roles={"super_admin": ["*"], "admin": ["*"], "editor": ["content.read", "content.write"], "viewer": ["content.read"]}),
    tenant_header="X-Tenant-ID",
)
```

## Component Configurations

### JwtConfig

```python
from kailash.nexus import JwtConfig

# Symmetric (HS256) - secret MUST be >= 32 chars
jwt = JwtConfig(
    secret_key=os.environ["JWT_SECRET"],   # REQUIRED; >= 32 chars or ValueError
    algorithm="HS256",                     # Default
    expiry_secs=3600,                      # Default 3600
    issuer=None,                           # Optional
)
```

**JwtConfig accepts only these parameters:**

- `secret_key` (required) - JWT signing secret
- `expiry_secs` (optional, default 3600) - Token expiry in seconds
- `algorithm` (optional, default "HS256") - Signing algorithm
- `issuer` (optional, default None) - Token issuer

**Token Extraction:**

Tokens are extracted from the `Authorization: Bearer <token>` header.

### RbacConfig

```python
from kailash.nexus import RbacConfig

rbac = RbacConfig(roles={"admin": ["*"], "editor": ["content.read", "content.write"], "viewer": ["content.read"]})
```

RBAC is configured via `RbacConfig(roles={...})` which takes a dict mapping role names to permission lists.

### Tenant Isolation

Tenant isolation is configured via the `tenant_header` parameter on NexusAuthPlugin:

```python
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    tenant_header="X-Tenant-ID",         # String header name, NOT a config object
)
```

**Note:** There is no `TenantConfig` class. Use the `tenant_header` string parameter directly.

### Rate Limiting

Rate limiting is configured via `app.add_rate_limit()`, not a config object:

```python
app = NexusApp()
app.add_rate_limit(max_requests=100, window_secs=60)
```

**Note:** There is no `RateLimitConfig` class. Use `app.add_rate_limit()` directly.

## Handler-Level Auth

Use `@app.handler()` with the auth plugin for role-based access:

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig

app = NexusApp()

auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "user": ["users.read"]}),
)

# Handlers are automatically protected by the auth plugin
@app.handler("admin_dashboard", description="Admin-only dashboard")
async def admin_dashboard() -> dict:
    return {"admin": True}

@app.handler("public_info", description="Public info")
async def public_info() -> dict:
    return {"public": True}
```

## Middleware Execution Order

NexusAuthPlugin installs middleware in the correct order automatically:

```
Request -> Audit -> RateLimit -> JWT -> Tenant -> RBAC -> Handler
Response <- Audit <- RateLimit <- JWT <- Tenant <- RBAC <- Handler
```

1. **Audit** (outermost) - Logs all requests/responses
2. **RateLimit** - Blocks before authentication overhead
3. **JWT** - Authenticates and populates `request.state.user`
4. **Tenant** - Resolves tenant from JWT claims
5. **RBAC** (innermost) - Resolves permissions from roles

## Common Gotchas

### Parameter Name Mismatches

| Wrong                  | Correct                                   | Component       |
| ---------------------- | ----------------------------------------- | --------------- |
| `secret`               | `secret_key`                              | JwtConfig       |
| `exempt_paths`         | (does not exist)                          | JwtConfig       |
| `verify_exp`           | (does not exist)                          | JwtConfig       |
| `leeway`               | (does not exist)                          | JwtConfig       |
| `jwt_secret_key=`      | `jwt=JwtConfig(secret_key=...)`           | NexusAuthPlugin |
| `TenantConfig(...)`    | `tenant_header="X-Tenant-ID"`             | NexusAuthPlugin |
| `RateLimitConfig(...)` | `app.add_rate_limit(max_requests=N, ...)` | NexusApp        |
| `.basic_auth()`        | Direct constructor `NexusAuthPlugin(...)` | NexusAuthPlugin |
| `.saas_app()`          | Direct constructor `NexusAuthPlugin(...)` | NexusAuthPlugin |
| `.enterprise()`        | Direct constructor `NexusAuthPlugin(...)` | NexusAuthPlugin |
| `app.add_plugin(auth)` | (no add_plugin method exists)             | NexusApp        |

### PEP 563 and Annotations

```python
# Avoid this in files that use runtime type inspection:
from __future__ import annotations  # May break type resolution
```

### RBAC Requires JWT

```python
# This will raise ValueError:
auth = NexusAuthPlugin(
    rbac={"admin": ["*"]},  # Error: RBAC requires JWT
)

# Correct:
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),  # >= 32 chars
    rbac={"admin": ["*"]},
)
```

### RequirePermission Checks Both Sources

`RequirePermission` checks:

1. User's direct permissions (from JWT `permissions` claim)
2. RBAC-resolved permissions (from roles via RBACMiddleware)

If using RBAC, ensure RBACMiddleware is installed (NexusAuthPlugin does this automatically).

## Token Creation

```python
# Get JWTMiddleware instance
jwt_middleware = ...

# Create access token
access_token = jwt_middleware.create_access_token(
    user_id="user123",
    email="user@example.com",
    roles=["editor"],
    permissions=["write:articles"],
    tenant_id="tenant456",
    expires_minutes=30,
)

# Create refresh token
refresh_token = jwt_middleware.create_refresh_token(
    user_id="user123",
    tenant_id="tenant456",
    expires_days=7,
)
```

## SSO / External JWT Verification

JwtConfig only supports symmetric signing (`secret_key`, `algorithm`, `expiry_secs`, `issuer`).
For SSO providers (Auth0, Okta, Azure AD), validate tokens at the application layer or
use a reverse proxy that handles JWT verification and passes claims as headers.

## Related Skills

- [nexus-enterprise-features](nexus-enterprise-features.md) - Enterprise deployment patterns
- [nexus-security-best-practices](nexus-security-best-practices.md) - Security hardening
- [nexus-production-deployment](nexus-production-deployment.md) - Production setup
