---
skill: nexus-config-options
description: Configuration options for Nexus including ports, auth, rate limiting, monitoring
priority: MEDIUM
tags: [nexus, configuration, options, settings]
---

# Nexus Configuration Options

Complete reference for Nexus configuration options.

## Constructor Options

```python
import kailash
from kailash.nexus import NexusApp, NexusConfig

# NexusConfig accepts these parameters:
app = NexusApp(NexusConfig(
    port=3000,                        # API port (default 3000)
    host="0.0.0.0",                   # Bind address
    cli_name="nexus",                 # CLI command name
    enable_api=True,                  # Enable API channel
    enable_cli=True,                  # Enable CLI channel
    enable_mcp=True,                  # Enable MCP channel
))

# Additional features configured via methods:
app.add_rate_limit(100)                             # DoS protection (requests per minute)
app.add_cors(["https://app.example.com"])           # CORS origins
# Auth: NexusAuthPlugin(jwt=JwtConfig(secret_key=...))  # See nexus-auth-plugin.md
```

## Progressive Configuration

### CORS Configuration

```python
# CORS is configured via constructor
app = NexusApp()
app.add_cors(["https://example.com"])
```

### Authentication Configuration

Authentication is configured via the `NexusAuthPlugin` constructor, not factory methods.

```python
import os
from kailash.nexus import NexusApp, NexusAuthPlugin
from kailash.nexus import JwtConfig, RbacConfig

# Basic auth (JWT only)
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"])
)

# With RBAC and tenant isolation
auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "user": ["users.read"]}),
    tenant_header="X-Tenant-ID",
)

app = NexusApp()
```

### Rate Limiting Configuration

```python
from kailash.nexus import NexusApp

# Rate limiting via NexusApp method
app = NexusApp()
app.add_rate_limit(max_requests=1000, window_secs=60)
```

### Monitoring Configuration

```python
# Monitoring is enabled via constructor
app = NexusApp()  # Monitoring configured separately

# Health check
health = app.health_check()
```

### Presets

```python
# One-line middleware stacks
app = NexusApp()          # Configure SaaS features via plugins
app = NexusApp()    # Configure enterprise features via plugins
```

### Middleware and Router API

```python
# Add custom middleware
app.add_middleware(SomeMiddleware, param="value")

# Include custom routers
app.include_router(my_router)
```

**Note:** NexusApp has NO `add_plugin()` method. Auth is configured via `NexusAuthPlugin` constructor.

## Environment Variables

```bash
# Environment (Controls security auto-enable)
export NEXUS_ENV=production          # Auto-enables authentication (P0-1)
                                      # development = default, no auto-enable
                                      # production = auto-enables auth

# Server
export NEXUS_API_PORT=3000
export NEXUS_MCP_PORT=3001
export NEXUS_HOST=0.0.0.0

# Security
export NEXUS_ENABLE_AUTH=true
export NEXUS_AUTH_SECRET=your-secret-key

# Database
export NEXUS_DATABASE_URL=postgresql://localhost/nexus

# Redis
export NEXUS_REDIS_URL=redis://localhost:6379

# Logging
export NEXUS_LOG_LEVEL=INFO
export NEXUS_LOG_FILE=/var/log/nexus.log

# Monitoring
export NEXUS_ENABLE_MONITORING=true
export NEXUS_MONITORING_BACKEND=prometheus
```

## Configuration Files

### YAML Configuration

```yaml
# nexus.yaml
server:
  api_port: 3000
  mcp_port: 3001
  host: "0.0.0.0"

security:
  enable_auth: true
  enable_rate_limiting: true
  rate_limit: 1000

monitoring:
  enable_monitoring: true
  monitoring_interval: 60
  backend: prometheus

sessions:
  timeout: 3600
  backend: redis
  redis_url: "redis://localhost:6379"

logging:
  level: INFO
  format: json
  file: /var/log/nexus.log
```

### Load from YAML

```python
import yaml

with open("nexus.yaml") as f:
    config = yaml.safe_load(f)

app = NexusApp(NexusConfig(port=config["server"]["api_port"]))
```

## Production Configuration

```python
import os
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(NexusConfig(
    port=int(os.getenv("PORT", "3000")),
    host="0.0.0.0",
))

# Security: Rate limiting and auth
app.add_rate_limit(5000)
# Auth configured via NexusAuthPlugin (see nexus-auth-plugin.md)

# Register workflows manually
app.register("workflow_name", builder.build(reg))
```

## Development Configuration

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(NexusConfig(port=3000))
# No rate limiting or auth in development
```

## Best Practices

1. **Use Environment Variables** for sensitive config
2. **Separate Dev/Prod Configs** with different files
3. **Enable Monitoring in Production**
4. **Disable Auto-Discovery in Production**
5. **Use Redis for Distributed Sessions**
6. **Set Appropriate Timeouts**
7. **Enable Rate Limiting in Production**
8. **Use Structured Logging (JSON)**

## Configuration Validation

```python
def validate_config(config):
    """Validate configuration before starting"""

    # Check required fields
    if config.get("enable_auth") and not config.get("auth_secret"):
        raise ValueError("auth_secret required when auth is enabled")

    # Check port availability
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', config.get("api_port", 3000)))
    if result == 0:
        raise ValueError(f"Port {config['api_port']} already in use")

    # Check Redis connection if using redis backend
    if config.get("session_backend") == "redis":
        import redis
        try:
            r = redis.from_url(config.get("redis_url"))
            r.ping()
        except:
            raise ValueError("Cannot connect to Redis")

    return True

# Usage
config = {
    "api_port": 3000,
    "enable_auth": True,
    "auth_secret": "secret"
}

if validate_config(config):
    app = NexusApp()
```

## Security Features

### Security Defaults

Nexus includes production-safe security defaults:

**P0-1: Environment-Aware Authentication**

```python
# Production mode (auto-enables auth)
export NEXUS_ENV=production
app = NexusApp()  # enable_auth automatically set to True

# Explicit override (logs critical warning in production)
app = NexusApp()  # WARNING: No auth plugin
# ⚠️  SECURITY WARNING: Authentication is DISABLED in production environment!
```

**P0-2: Rate Limiting Default**

```python
# DoS protection enabled by default
app = NexusApp()  # rate_limit=100 req/min

# Disable (logs security warning)
app = NexusApp()  # No rate limit
# ⚠️  SECURITY WARNING: Rate limiting is DISABLED!
```

**P0-3: Auto-Discovery Default Changed**

```python
# Fast startup (no blocking)
app = NexusApp()  # auto_discovery=False by default

# Enable if needed (adds 5-10s startup delay with DataFlow)
app = NexusApp()  # auto_discovery not a NexusApp param
```

**P0-5: Unified Input Validation**

All channels (API, CLI, MCP) now validate inputs automatically:

- ✅ Dangerous keys blocked (`__import__`, `eval`, `exec`, etc.)
- ✅ Input size limits enforced (10MB default)
- ✅ Path traversal attacks prevented

No configuration needed - automatically applied across all channels.

## Key Takeaways

- Flexible configuration via constructor, attributes, env vars, files
- Different configs for development vs production
- Progressive configuration allows fine-tuning
- Validate configuration before starting
- Use environment variables for secrets
- Separate concerns (server, security, monitoring)
- Production-safe defaults (auth auto-enable, rate limiting, no auto-discovery)

## Related Skills

- [nexus-quickstart](#) - Basic setup
- [nexus-enterprise-features](#) - Production features
- [nexus-production-deployment](#) - Deploy configuration
