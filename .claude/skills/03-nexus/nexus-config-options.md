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

nexus = kailash.Nexus(
    # Server Configuration
    api_port=8000,                    # API server port
    api_host="0.0.0.0",               # API bind address
    mcp_port=3001,                    # MCP server port
    mcp_host="0.0.0.0",               # MCP bind address

    # Discovery (Default False for reliability)
    auto_discovery=False,             # Auto-discover workflows (P0-3)
                                      # False = prevents blocking with DataFlow
                                      # True = enables auto-discovery (adds 5-10s startup delay)
    discovery_paths=["./workflows"],  # Paths to scan

    # Security (Production-safe defaults)
    enable_auth=None,                 # Authentication (P0-1)
                                      # None = auto-enable if NEXUS_ENV=production
                                      # True = always enabled
                                      # False = always disabled (logs critical warning in production)
    rate_limit=100,                   # Requests per minute (P0-2)
                                      # Default 100 for DoS protection
                                      # None = disable (logs security warning)

    # Monitoring
    enable_monitoring=False,          # Enable monitoring
    monitoring_interval=60,           # Check interval (seconds)

    # Sessions
    session_timeout=3600,             # Session timeout (seconds)
    session_backend="memory",         # Session storage (memory/redis)
    redis_url="redis://localhost:6379",  # Redis URL if using redis

    # Logging
    log_level="INFO",                 # Log level
    log_format="text",                # Log format (text/json)
    log_file=None,                    # Log file path

    # Performance
    max_concurrent_workflows=100,     # Max concurrent executions
    request_timeout=30,               # Request timeout (seconds)
    enable_caching=False,             # Enable response caching

    # API Options
    enable_docs=True,                 # Enable OpenAPI docs
    enable_cors=True,                 # Enable CORS
    api_prefix="/api/v1",             # API prefix

    # Enterprise
    enable_circuit_breaker=False,     # Circuit breaker pattern
    health_check_interval=30          # Health check interval
)
```

## Progressive Configuration

### CORS Configuration

```python
# CORS is configured via constructor
app = kailash.Nexus(
    cors_origins=["https://example.com"],
    cors_allow_credentials=False,
)
```

### Authentication Configuration

Authentication is configured via the `NexusAuthPlugin`, not attribute access.

```python
import os
import kailash
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig

# Basic auth (JWT + audit)
auth = NexusAuthPlugin.basic_auth(
    jwt=JwtConfig(secret=os.environ["JWT_SECRET"])
)

# SaaS auth (JWT + RBAC + tenant isolation)
from kailash import RbacConfig
auth = NexusAuthPlugin.saas_app(
    jwt=JwtConfig(secret=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(["admin", "user"]),
    tenant_header="X-Tenant-ID",
)

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.add_plugin(auth)
```

### Rate Limiting Configuration

```python
from kailash import AuthRateLimitConfig

# Simple: via constructor
app = kailash.Nexus(rate_limit=1000)  # Requests per minute

# Advanced: via NexusAuthPlugin
from kailash.nexus import NexusAuthPlugin
from kailash import JwtConfig, RbacConfig

auth = NexusAuthPlugin(
    jwt=JwtConfig("secret-at-least-32-bytes-long!!"),
    rbac=RbacConfig(["admin"]),
)
app = kailash.Nexus()
app.add_plugin(auth)
```

### Monitoring Configuration

```python
# Monitoring is enabled via constructor
app = kailash.Nexus(enable_monitoring=True)

# Health check
health = app.health_check()
```

### Presets

```python
# One-line middleware stacks
app = kailash.Nexus(preset="saas")
app = kailash.Nexus(preset="enterprise")
```

### Middleware and Plugin API

```python
# Add custom middleware
app.add_middleware(SomeMiddleware, param="value")

# Include custom routers
app.include_router(my_router)

# Add plugins (NexusPlugin protocol)
app.add_plugin(auth_plugin)
```

## Environment Variables

```bash
# Environment (Controls security auto-enable)
export NEXUS_ENV=production          # Auto-enables authentication (P0-1)
                                      # development = default, no auto-enable
                                      # production = auto-enables auth

# Server
export NEXUS_API_PORT=8000
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
  api_port: 8000
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

app = kailash.Nexus(**config.get("server", {}))
```

## Production Configuration

```python
import os

app = kailash.Nexus(
    # Server
    api_port=int(os.getenv("PORT", "8000")),
    api_host="0.0.0.0",

    # Security
    enable_auth=True,
    enable_rate_limiting=True,
    rate_limit=5000,

    # Performance
    max_concurrent_workflows=200,
    enable_caching=True,
    request_timeout=60,

    # Monitoring
    enable_monitoring=True,
    monitoring_interval=30,

    # Sessions
    session_backend="redis",
    redis_url=os.getenv("REDIS_URL"),

    # Logging
    log_level="INFO",
    log_format="json",
    log_file="/var/log/nexus/app.log",

    # Discovery
    auto_discovery=False  # Manual registration in production
)
```

## Development Configuration

```python
app = kailash.Nexus(
    # Server
    api_port=8000,
    api_host="localhost",

    # Security (disabled for dev)
    enable_auth=False,
    enable_rate_limiting=False,

    # Discovery
    auto_discovery=True,
    discovery_paths=["./workflows", "./dev_workflows"],

    # Logging
    log_level="DEBUG",
    log_format="text",

    # Sessions
    session_backend="memory",

    # Monitoring (minimal)
    enable_monitoring=False
)
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
    result = sock.connect_ex(('localhost', config.get("api_port", 8000)))
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
    "api_port": 8000,
    "enable_auth": True,
    "auth_secret": "secret"
}

if validate_config(config):
    app = kailash.Nexus(**config)
```

## Security Features

### Security Defaults

Nexus includes production-safe security defaults:

**P0-1: Environment-Aware Authentication**

```python
# Production mode (auto-enables auth)
export NEXUS_ENV=production
app = kailash.Nexus()  # enable_auth automatically set to True

# Explicit override (logs critical warning in production)
app = kailash.Nexus(enable_auth=False)
# ⚠️  SECURITY WARNING: Authentication is DISABLED in production environment!
```

**P0-2: Rate Limiting Default**

```python
# DoS protection enabled by default
app = kailash.Nexus()  # rate_limit=100 req/min

# Disable (logs security warning)
app = kailash.Nexus(rate_limit=None)
# ⚠️  SECURITY WARNING: Rate limiting is DISABLED!
```

**P0-3: Auto-Discovery Default Changed**

```python
# Fast startup (no blocking)
app = kailash.Nexus()  # auto_discovery=False by default

# Enable if needed (adds 5-10s startup delay with DataFlow)
app = kailash.Nexus(auto_discovery=True)
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
