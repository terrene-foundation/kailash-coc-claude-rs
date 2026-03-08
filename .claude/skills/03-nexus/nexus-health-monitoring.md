---
skill: nexus-health-monitoring
description: Health checks, monitoring, metrics, and observability for Nexus platform
priority: HIGH
tags: [nexus, health, monitoring, metrics, observability]
---

# Nexus Health Monitoring

Monitor Nexus platform health, metrics, and performance.

## Basic Health Check

```python
import kailash

from kailash.nexus import NexusApp
app = NexusApp()

# Check platform health
health = app.health_check()
print(f"Status: {health['status']}")
print(f"Workflows: {list(health['workflows'].keys())}")
```

## Health Endpoints

```bash
# Basic health check
curl http://localhost:3000/health

# Response
{
  "status": "healthy",
  "version": "1.0.0",
  "uptime": 3600,
  "workflows": 5,
  "active_sessions": 3
}

# Detailed health check
curl http://localhost:3000/health/detailed

# Response
{
  "status": "healthy",
  "components": {
    "api": {"status": "healthy", "latency": 12},
    "database": {"status": "healthy"},
    "cache": {"status": "healthy"}
  },
  "workflows": {
    "total": 5,
    "healthy": 5,
    "unhealthy": 0
  }
}
```

## Enable Monitoring

Monitoring is configured server-side via the Rust Nexus engine and tower middleware.
Use presets or reverse-proxy-level monitoring (e.g., Prometheus + nginx) for production.

```python
from kailash.nexus import NexusApp

app = NexusApp()
# Monitoring is configured via presets or external tools, not app.monitoring.*
```

## Prometheus Metrics

```bash
# Prometheus metrics endpoint
curl http://localhost:3000/metrics

# Response (Prometheus format)
# HELP nexus_requests_total Total requests
# TYPE nexus_requests_total counter
nexus_requests_total{workflow="my-workflow"} 123

# HELP nexus_request_duration_seconds Request duration
# TYPE nexus_request_duration_seconds histogram
nexus_request_duration_seconds_bucket{le="0.1"} 50
nexus_request_duration_seconds_bucket{le="0.5"} 100
```

## Custom Health Checks

NexusApp does not have a `@app.health_check_handler()` decorator. Health checks are
built into the platform and available at the `/health` endpoint. For custom health
logic, use a regular handler:

```python
@app.handler("custom_health", description="Custom health check")
async def custom_health() -> dict:
    checks = {}
    try:
        # Check database connection
        db.execute("SELECT 1")
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}

    try:
        cache.ping()
        checks["cache"] = {"status": "healthy"}
    except Exception as e:
        checks["cache"] = {"status": "unhealthy", "error": str(e)}

    overall = "healthy" if all(
        c["status"] == "healthy" for c in checks.values()
    ) else "unhealthy"

    return {"status": overall, "components": checks}
```

## Workflow Health Monitoring

NexusApp does not have `app.workflows` or `app.execute_workflow()`. Use
`app.get_registered_handlers()` to list handlers and test them individually:

```python
class WorkflowHealthMonitor:
    def __init__(self, nexus_app):
        self.app = nexus_app

    def get_registered_workflows(self):
        """List registered handlers."""
        return self.app.get_registered_handlers()

# Usage
monitor = WorkflowHealthMonitor(app)
handlers = monitor.get_registered_workflows()
print(f"Registered handlers: {handlers}")
```

## Alerting

NexusApp does not have `app.monitoring.*` attributes or `@app.on_alert()` decorators.
For alerting, use external monitoring tools (Prometheus Alertmanager, PagerDuty, etc.)
that scrape the `/health` and `/metrics` endpoints, or implement alerting logic
in a custom handler.

## Logging

```python
import logging

# NexusApp does not have an app.logger attribute.
# Use Python's standard logging module:
logger = logging.getLogger("nexus")
logger.info("Custom log message")
logger.error("Error occurred", extra={"workflow": "my-workflow"})
```

## Performance Metrics

NexusApp does not have `app.get_metrics()` or `app.get_workflow_metrics()` methods.
For performance metrics, use external tools that scrape Prometheus-format metrics
from the `/metrics` endpoint (if enabled via presets), or implement custom tracking
in your handlers.

## Best Practices

1. **Enable Monitoring in Production**
2. **Set Appropriate Alert Thresholds**
3. **Monitor All Components** (API, database, cache)
4. **Track Workflow-Specific Metrics**
5. **Use Structured Logging**
6. **Implement Graceful Degradation**
7. **Regular Health Checks**

## Key Takeaways

- Health checks available at /health endpoint
- Enable monitoring for production systems
- Custom health checks for components
- Prometheus metrics for observability
- Alerting for proactive monitoring
- Per-workflow health tracking

## Related Skills

- [nexus-enterprise-features](#) - Production features
- [nexus-production-deployment](#) - Deploy with monitoring
- [nexus-troubleshooting](#) - Fix health issues
