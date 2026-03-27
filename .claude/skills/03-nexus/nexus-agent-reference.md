# Nexus Agent Reference

Extracted reference material for cc-artifacts compliance.


- `cors_allow_credentials=False` in both `NexusApp()` and `NexusConfig` (safe with wildcard origins)
- JWTConfig enforces **32-character minimum** for HS\* algorithm secrets
- RBAC errors return generic "Forbidden" (no role/permission leakage)
- SSO errors are sanitized (status-only to client, details logged server-side)
- `create_access_token()` filters reserved JWT claims from `extra_claims`

### Quick Start - Factory Methods

```python
import os
from kailash.nexus import NexusAuthPlugin
from kailash.nexus import JWTConfig, TenantConfig, RateLimitConfig, AuditConfig

# Basic auth (JWT + audit)
auth = NexusAuthPlugin.basic_auth(
    jwt=JWTConfig(secret_key=os.environ["JWT_SECRET"])  # Must be >= 32 chars for HS256
)

# SaaS app (JWT + RBAC + tenant + audit)
auth = NexusAuthPlugin.saas_app(
    jwt=JWTConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "user": ["read:*"]},
    tenant_isolation=TenantConfig()
)

# Enterprise (all features)
auth = NexusAuthPlugin.enterprise(
    jwt=JWTConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "editor": ["read:*", "write:*"], "viewer": ["read:*"]},
    rate_limit=RateLimitConfig(requests_per_minute=100),
    tenant_isolation=TenantConfig(),
    audit=AuditConfig(backend="logging")
)

from kailash.nexus import NexusApp
app = NexusApp()
app.add_plugin(auth)
```

### JWT Configuration

```python
import os
import kailash

# JwtConfig constructor: JwtConfig(secret_key, expiry_secs=3600, algorithm="HS256", issuer=None)
jwt_config = kailash.JwtConfig(
    secret_key=os.environ["JWT_SECRET"],  # MUST be `secret_key`, >= 32 chars
    expiry_secs=3600,                      # Token expiry in seconds
    algorithm="HS256",                     # Default algorithm
    issuer="https://my-domain.com",        # Optional issuer claim
)

# Use with NexusAuthPlugin
auth = kailash.NexusAuthPlugin(jwt=jwt_config)
```

### RBAC Setup

```python
import os
import kailash

# Define roles with RbacConfig
rbac = kailash.RbacConfig(
    roles={
        "admin": ["*"],                           # Full access
        "editor": ["read:*", "write:articles"],   # Wildcard + specific
        "viewer": ["read:*"],                     # Read-only
    },
    deny_by_default=True,
)

# Combine JWT + RBAC in auth plugin
auth = kailash.NexusAuthPlugin(
    jwt=kailash.JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=rbac,
)

```

**Permission Matching:**

- `"*"` matches everything
- `"read:*"` matches `read:users`, `read:articles`, etc.
- `"*:users"` matches `read:users`, `write:users`, etc.

### Tenant Isolation

```python
from kailash.nexus import TenantConfig

tenant_config = TenantConfig(
    tenant_id_header="X-Tenant-ID",
    jwt_claim="tenant_id",               # Claim name in JWT
    allow_admin_override=True,
    admin_role="super_admin",            # CRITICAL: Singular string, NOT `admin_roles`
    exclude_paths=["/health", "/docs"],
)

auth = NexusAuthPlugin(
    jwt=JWTConfig(secret_key=os.environ["JWT_SECRET"]),  # >= 32 chars
    tenant_isolation=tenant_config,
)
```

### Rate Limiting

```python
from kailash.nexus import RateLimitConfig

rate_config = RateLimitConfig(
    requests_per_minute=100,
    burst_size=20,
    backend="memory",                    # or "redis"
    redis_url="redis://localhost:6379",  # Required if backend="redis"
    route_limits={
        "/api/chat/*": {"requests_per_minute": 30},
        "/api/auth/login": {"requests_per_minute": 10, "burst_size": 5},
        "/health": None,                 # Disable rate limit
    },
    include_headers=True,                # X-RateLimit-* headers
    fail_open=True,                      # Allow when backend fails
)
# CRITICAL: RateLimitConfig has NO `exclude_paths` parameter
```

### Audit Logging

```python
from kailash.nexus import AuditConfig

audit_config = AuditConfig(
    backend="logging",                   # or "dataflow"
    log_level="INFO",
    log_request_body=False,              # PII risk
    log_response_body=False,
    exclude_paths=["/health", "/metrics"],
    redact_headers=["Authorization", "Cookie"],
    redact_fields=["password", "token", "api_key"],
)
```

### Middleware Ordering (CRITICAL)

Request execution order (outermost to innermost):

1. **Audit** - Captures everything
2. **RateLimit** - Before auth, prevents abuse
3. **JWT** - Core authentication
4. **Tenant** - Needs JWT user for tenant resolution
5. **RBAC** - Needs JWT user for role resolution

NexusAuthPlugin handles this automatically. Do NOT add middleware manually.

### Common Auth Gotchas

| Issue                                   | Cause                                | Fix                                   |
| --------------------------------------- | ------------------------------------ | ------------------------------------- |
| `TypeError: 'secret_key' unexpected`    | Wrong param name                     | Use `secret`, not `secret_key`        |
| `TypeError: 'exclude_paths' unexpected` | JWTConfig uses different name        | Use `exempt_paths`                    |
| `TypeError: 'admin_roles' unexpected`   | TenantConfig uses singular           | Use `admin_role` (string)             |
| Dependency injection fails              | `from __future__ import annotations` | Remove PEP 563 import                 |
| Permission check fails                  | Only checking JWT direct             | Use `RequirePermission` (checks both) |
| RBAC without JWT                        | RBAC requires JWT                    | Add `jwt=JWTConfig(...)`              |

### PEP 563 Warning

**NEVER use `from __future__ import annotations` in files with NexusApp route handlers.**

PEP 563 turns type annotations into strings, which can break dependency injection and parameter resolution.

## MCP Transport

- **`receive_message()`**: MCP transport now supports `receive_message()` for bidirectional communication in custom MCP transports

## Performance & Monitoring

- **SQLite CARE Audit Storage** : Nexus creates `Runtime()` with `enable_monitoring=True` (default), so all workflow executions automatically get CARE audit persistence to SQLite WAL-mode database. Zero in-loop I/O (~35us/node overhead) with post-execution ACID flush.

## Common Issues & Solutions

| Issue                                | Solution                                                           |
| ------------------------------------ | ------------------------------------------------------------------ |
| Nexus blocks on startup              | Use `auto_discovery=False` with DataFlow                           |
| Workflow not found                   | Ensure `.build(reg)` called before registration                    |
| Parameter not accessible             | Use try/except in EmbeddedPythonNode OR use @app.handler() instead |
| Port conflicts                       | Use custom ports: `NexusApp(NexusConfig(port=8001))`               |
| Import blocked in EmbeddedPythonNode | Use @app.handler() to bypass sandbox restrictions                  |
| Sandbox warnings at registration     | Switch to handlers OR set sandbox_mode="permissive" (dev only)     |
| Auth dependency injection fails      | Remove `from __future__ import annotations`                        |
| RBAC not resolving permissions       | Ensure JWT middleware runs before RBAC (use NexusAuthPlugin)       |

## Skill References

### Quick Start

- **[nexus-quickstart](../../.claude/skills/03-nexus/nexus-quickstart.md)** - Basic setup
- **[nexus-workflow-registration](../../.claude/skills/03-nexus/nexus-workflow-registration.md)** - Registration patterns
- **[nexus-multi-channel](../../.claude/skills/03-nexus/nexus-multi-channel.md)** - Multi-channel architecture

### Channel Patterns

- **[nexus-api-patterns](../../.claude/skills/03-nexus/nexus-api-patterns.md)** - API deployment
- **[nexus-cli-patterns](../../.claude/skills/03-nexus/nexus-cli-patterns.md)** - CLI integration
- **[nexus-mcp-channel](../../.claude/skills/03-nexus/nexus-mcp-channel.md)** - MCP server

### Integration

- **[nexus-dataflow-integration](../../.claude/skills/03-nexus/nexus-dataflow-integration.md)** - DataFlow integration
- **[nexus-sessions](../../.claude/skills/03-nexus/nexus-sessions.md)** - Session management

### Authentication & Authorization

- **[nexus-auth-plugin](../../.claude/skills/03-nexus/nexus-auth-plugin.md)** - NexusAuthPlugin unified auth
- **[nexus-enterprise-features](../../.claude/skills/03-nexus/nexus-enterprise-features.md)** - Enterprise auth patterns

## Related Agents

- **dataflow-specialist**: Database integration with Nexus platform
- **mcp-specialist**: MCP channel implementation
- **pattern-expert**: Core SDK workflows for Nexus registration
- **framework-advisor**: Choose between Core SDK and Nexus
- **deployment-specialist**: Production deployment and scaling

## Full Documentation

When this guidance is insufficient, consult:

- `.claude/skills/03-nexus/nexus-quickstart.md` - Basic Nexus setup
- `.claude/skills/03-nexus/nexus-dataflow-integration.md` - Integration patterns
- `.claude/skills/03-nexus/nexus-api-patterns.md` - API endpoint patterns

---

**Use this agent when:**

- Setting up Nexus production deployments
- Implementing multi-channel orchestration
- Resolving DataFlow blocking issues
- Configuring enterprise features (auth, monitoring)
- Debugging channel-specific problems

**For basic patterns (setup, simple registration), use Skills directly for faster response.**
