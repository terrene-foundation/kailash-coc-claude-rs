---
name: nexus-production-deployment
description: "Production deployment patterns: NexusConfig, presets, graceful shutdown, health checks, monitoring."
---

# Nexus Production Deployment (kailash-rs)

Production-ready configuration and deployment patterns.

## Minimal Production Setup

```python
import os
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(
    config=NexusConfig(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
        graceful_shutdown_timeout_secs=30,
    ),
)

app.add_cors(origins=[os.environ["ALLOWED_ORIGIN"]])
app.add_rate_limit(max_requests=100, window_secs=60)

@app.handler("status", description="Platform status")
async def status() -> dict:
    return app.health_check()

app.start()
```

## Enterprise Setup with Preset

```python
from kailash.nexus import NexusApp, NexusConfig, Preset

app = NexusApp(
    config=NexusConfig(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "3000")),
        graceful_shutdown_timeout_secs=30,
    ),
    preset="enterprise",  # or Preset.enterprise()
)

app.add_cors(origins=["https://app.example.com"])
app.add_rate_limit(max_requests=500, window_secs=60)

# Register production handlers...

app.start()
```

## Full Production Example with Auth

```python
import os
from kailash.nexus import (
    NexusApp, NexusConfig, Nexus, Preset,
    NexusAuthPlugin, JwtConfig,
)

def create_production_app():
    # Auth plugin
    auth = NexusAuthPlugin.enterprise(
        jwt=JwtConfig(
            algorithm="RS256",
            jwks_url=os.environ["JWKS_URL"],
            jwks_cache_ttl=3600,
            issuer=os.environ["JWT_ISSUER"],
            audience=os.environ["JWT_AUDIENCE"],
        ),
        rbac={
            "admin": ["*"],
            "editor": ["read:*", "write:*"],
            "viewer": ["read:*"],
        },
    )

    app = NexusApp(
        config=NexusConfig(
            host="0.0.0.0",
            port=int(os.getenv("PORT", "3000")),
            graceful_shutdown_timeout_secs=30,
            enable_api=True,
            enable_cli=False,   # Disable CLI in production containers
            enable_mcp=True,
        ),
        preset="enterprise",
    )

    app.add_cors(origins=[os.environ["ALLOWED_ORIGIN"]])
    app.add_rate_limit(max_requests=500, window_secs=60)

    # Register handlers...

    return app

app = create_production_app()
app.start()
```

## Health Checks

```python
# Programmatic health check
health = app.health_check()
print(health)

# HTTP health endpoint (automatic)
# GET http://localhost:3000/health
```

```bash
# External health check
curl http://localhost:3000/health
```

## Graceful Shutdown

Configure shutdown timeout to allow in-flight requests to complete:

```python
config = NexusConfig(
    graceful_shutdown_timeout_secs=30,  # Wait up to 30s for requests to finish
)
```

## Channel Selection for Production

```python
# Web service (API + MCP, no CLI)
config = NexusConfig(enable_api=True, enable_cli=False, enable_mcp=True)

# Internal service (API only)
config = NexusConfig(enable_api=True, enable_cli=False, enable_mcp=False)

# Agent platform (all channels)
config = NexusConfig(enable_api=True, enable_cli=True, enable_mcp=True)
```

## Docker Deployment

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 3000
CMD ["python", "main.py"]
```

```yaml
# docker-compose.yml
services:
  nexus:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - ALLOWED_ORIGIN=https://app.example.com
      - JWKS_URL=https://auth.example.com/.well-known/jwks.json
      - JWT_ISSUER=https://auth.example.com
      - JWT_AUDIENCE=https://api.example.com
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Scaling

```bash
# Multiple instances behind load balancer
docker-compose up --scale nexus=3
```

## Introspection (Low-Level Nexus)

For production monitoring via the low-level Nexus:

```python
from kailash.nexus import Nexus

nexus = Nexus(config=NexusConfig(port=3000))

# Registration counts
print(f"Workflows: {nexus.workflow_count()}")
print(f"Handlers: {nexus.handler_count()}")
print(f"Plugins: {nexus.plugin_count()}")

# Lists
print(f"Workflows: {nexus.list_workflows()}")
print(f"Handlers: {nexus.get_registered_handlers()}")
print(f"Plugins: {nexus.plugin_names()}")
```

## Key Differences from kailash-py

| Aspect         | kailash-py                                 | kailash-rs                               |
| -------------- | ------------------------------------------ | ---------------------------------------- |
| Port config    | `Nexus(api_port=8000, api_host="0.0.0.0")` | `NexusConfig(host="0.0.0.0", port=3000)` |
| Shutdown       | Not explicitly configurable                | `graceful_shutdown_timeout_secs`         |
| Monitoring     | `Nexus(enable_monitoring=True)`            | Health check built-in                    |
| Auto-discovery | `Nexus(auto_discovery=False)` for DataFlow | Not applicable                           |

## Checklist

1. Use `NexusConfig` with explicit host/port
2. Configure `graceful_shutdown_timeout_secs`
3. Add CORS with specific origins
4. Enable rate limiting
5. Use RS256 JWT for production auth
6. Disable unused channels
7. Set up health check monitoring
8. Use environment variables for all configuration
9. Deploy behind a reverse proxy for HTTPS

## Related Skills

- [nexus-security-best-practices](nexus-security-best-practices.md) - Auth and security
- [nexus-config-options](nexus-config-options.md) - Configuration reference
- [nexus-multi-channel](nexus-multi-channel.md) - Channel selection
