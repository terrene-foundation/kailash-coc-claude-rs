---
skill: nexus-production-deployment
description: Production deployment patterns, Docker, Kubernetes, scaling, and best practices
priority: MEDIUM
tags: [nexus, production, deployment, docker, kubernetes, scaling]
---

# Nexus Production Deployment

Deploy Nexus to production with Docker and Kubernetes.

## Docker Deployment

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run application
CMD ["python", "app.py"]
```

### requirements.txt

```
kailash-enterprise  # All frameworks included
redis>=5.0.0
```

### app.py

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusConfig

# Production configuration
app = NexusApp(config=NexusConfig(
    port=int(os.getenv("PORT", "3000")),
    host="0.0.0.0",
))

# Security: Rate limiting and auth
app.add_rate_limit(5000)
# Auth configured via NexusAuthPlugin (see nexus-auth-plugin.md)

# Register workflows
from workflows import register_workflows
register_workflows(app)

if __name__ == "__main__":
    app.start()
```

### Build and Run

```bash
# Build image
docker build -t nexus-app:latest .

# Run container
docker run -d \
  --name nexus \
  -p 3000:3000 \
  -p 3001:3001 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e REDIS_URL="redis://redis:6379" \
  -e LOG_LEVEL="INFO" \
  nexus-app:latest

# Check logs
docker logs -f nexus

# Check health
curl http://localhost:3000/health
```

### Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  nexus:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/nexus
      - REDIS_URL=redis://redis:6379
      - LOG_LEVEL=INFO
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=nexus
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f nexus

# Stop services
docker-compose down
```

## Production Security Configuration

### Security Defaults

Nexus includes production-safe security defaults.

### Authentication in Production

> **Important**: `NEXUS_ENV` is NOT a supported environment variable. Auth must be configured explicitly via `NexusAuthPlugin`.

**Recommended (Explicit Auth)**:

```python
from kailash.nexus import NexusApp, NexusAuthPlugin, JwtConfig
import os

# Configure auth explicitly — there is no auto-enable via env vars
auth = NexusAuthPlugin(jwt=JwtConfig(secret=os.environ["JWT_SECRET"]))
app = NexusApp()
```

**Rate Limiting**:

```python
app.add_rate_limit(max_requests=100, window_secs=60)
```

**Docker Environment**:

```yaml
# docker-compose.yml
services:
  nexus:
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/nexus
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
```

### Rate Limiting

**Default Configuration**:

```python
app = NexusApp()  # rate_limit defaults to 100 req/min
```

**Custom Rate Limits**:

```python
# Higher limit for high-traffic APIs
app = NexusApp()
app.add_rate_limit(1000)

# Disable (NOT RECOMMENDED - logs security warning)
app = NexusApp()  # No rate limit
# ⚠️  SECURITY WARNING: Rate limiting is DISABLED!
#    This allows unlimited requests and may lead to DoS attacks.
```

**Per-Endpoint Rate Limiting**:

```python
import kailash

from kailash.nexus import NexusApp
app = NexusApp()
app.add_rate_limit(50)  # Global rate limit

# Use @app.handler() (NOT @app.endpoint())
@app.handler("search", description="Search endpoint")
async def search_endpoint(q: str) -> dict:
    """Search endpoint."""
    return {"query": q, "results": []}
```

### Input Validation

All channels (API, MCP, CLI) now validate inputs automatically:

**Protections Enabled**:

- ✅ **Dangerous Keys Blocked**: `__import__`, `eval`, `exec`, `compile`, `globals`, `locals`, etc.
- ✅ **Input Size Limits**: 10MB default (configurable)
- ✅ **Path Traversal Prevention**: Blocks `../`, `..\\`, absolute paths
- ✅ **Key Length Limits**: 256 characters max

Input size limits (default 10MB) are configured server-side by the Rust Nexus engine.
NexusApp does not expose `_max_input_size` as a settable attribute.

**No configuration needed** - automatically applied across all channels.

### Production Deployment Example

Complete production-ready configuration:

```python
import os
import kailash
from kailash.nexus import NexusApp, NexusConfig

reg = kailash.NodeRegistry()

# Production configuration with all security features
app = NexusApp(config=NexusConfig(
    port=int(os.getenv("PORT", "3000")),
    host="0.0.0.0",
))

# Security: Rate limiting and auth
app.add_rate_limit(1000)  # P0-2: DoS protection (default 100)
# Auth configured via NexusAuthPlugin (see nexus-auth-plugin.md)

# Register workflows explicitly (manual registration)
from workflows import user_workflow, order_workflow
rt = kailash.Runtime(reg)
users_wf = user_builder.build(reg)
orders_wf = order_builder.build(reg)
app.register("users", lambda **inputs: rt.execute(users_wf, inputs))
app.register("orders", lambda **inputs: rt.execute(orders_wf, inputs))

if __name__ == "__main__":
    app.start()
```

### Docker Production Deployment

**Dockerfile** (with security):

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# NOTE: NEXUS_ENV is not a supported env var — configure auth in code

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Run with production settings
CMD ["python", "app.py"]
```

**docker-compose.yml** (with security):

```yaml
version: "3.8"

services:
  nexus:
    build: .
    ports:
      - "3000:3000"
      - "3001:3001"
    environment:
      # Database and auth secrets
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/nexus
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379

      # Logging
      - LOG_LEVEL=INFO
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=nexus
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  postgres_data:
  redis_data:
```

### Security Monitoring

**Monitor security events**:

```python
# Check health status
health = app.health_check()
print(f"Health: {health}")

# NOTE: NexusApp does not expose _rate_limit as a private attribute.
# Verify your rate limiting setup at the application level.
```

### Common Security Mistakes

❌ **DON'T**:

```python
# Disable auth in production
app = NexusApp()  # WARNING: No auth plugin  # CRITICAL WARNING

# Disable rate limiting
app = NexusApp()  # No rate limit    # SECURITY WARNING

# NexusApp has no auto_discovery param — workflows always registered manually
```

✅ **DO**:

```python
from kailash.nexus import NexusApp, NexusAuthPlugin, JwtConfig

# Configure auth via NexusAuthPlugin (NEXUS_ENV does not exist)
auth = NexusAuthPlugin(jwt=JwtConfig(secret="from-env-var"))
app = NexusApp()

# Add rate limiting
app.add_rate_limit(max_requests=1000, window_secs=60)

# Register workflows manually (NexusApp has no auto_discovery param)
```

## Kubernetes Deployment

### Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nexus
  labels:
    app: nexus
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nexus
  template:
    metadata:
      labels:
        app: nexus
    spec:
      containers:
        - name: nexus
          image: nexus-app:latest
          ports:
            - containerPort: 3000
              name: api
            - containerPort: 3001
              name: mcp
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: nexus-secrets
                  key: database-url
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: nexus-secrets
                  key: redis-url
            - name: LOG_LEVEL
              value: "INFO"
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "2000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nexus
spec:
  selector:
    app: nexus
  ports:
    - name: api
      port: 3000
      targetPort: 3000
    - name: mcp
      port: 3001
      targetPort: 3001
  type: LoadBalancer
```

### Ingress

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nexus-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - nexus.example.com
      secretName: nexus-tls
  rules:
    - host: nexus.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nexus
                port:
                  number: 3000
```

### ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nexus-config
data:
  LOG_LEVEL: "INFO"
  MONITORING_ENABLED: "true"
  RATE_LIMIT: "5000"
```

### Secrets

```yaml
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: nexus-secrets
type: Opaque
stringData:
  database-url: "postgresql://user:password@postgres:5432/nexus"
  redis-url: "redis://redis:6379"
  jwt-secret: "your-secret-key"
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace nexus

# Apply configurations
kubectl apply -f k8s/configmap.yaml -n nexus
kubectl apply -f k8s/secrets.yaml -n nexus
kubectl apply -f k8s/deployment.yaml -n nexus
kubectl apply -f k8s/service.yaml -n nexus
kubectl apply -f k8s/ingress.yaml -n nexus

# Check deployment
kubectl get pods -n nexus
kubectl get services -n nexus
kubectl get ingress -n nexus

# View logs
kubectl logs -f deployment/nexus -n nexus

# Scale deployment
kubectl scale deployment/nexus --replicas=5 -n nexus
```

## Scaling Strategies

### Horizontal Scaling

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: nexus-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: nexus
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Vertical Scaling

Adjust resource limits in deployment:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "1000m"
  limits:
    memory: "4Gi"
    cpu: "4000m"
```

## Production Best Practices

### 1. Use Redis for Sessions

```python
app = NexusApp()
# Session backend and timeout configured separately via environment or session manager
```

### 2. Enable Monitoring

```python
app = NexusApp()
# Monitoring configured separately
```

### 3. Configure Logging

```python
app = NexusApp()
# Logging configured separately
```

### 4. Disable Auto-Discovery

```python
app = NexusApp()
# Register workflows manually (no auto_discovery param)

# Register workflows explicitly
from workflows import workflow1, workflow2
rt = kailash.Runtime(reg)
wf1 = workflow1.build(reg)
wf2 = workflow2.build(reg)
app.register("workflow1", lambda **inputs: rt.execute(wf1, inputs))
app.register("workflow2", lambda **inputs: rt.execute(wf2, inputs))
```

### 5. Enable Security Features

```python
app = NexusApp()
app.add_rate_limit(5000)
# Auth configured via NexusAuthPlugin
# Rate limiting via app.add_rate_limit()
# Use reverse proxy for HTTPS
```

### 6. Health Checks

NexusApp does not have a `@app.health_check_handler()` decorator. Health checks
are built into the platform at `/health`. For custom health logic, use a handler:

```python
@app.handler("custom_health", description="Custom health check")
async def custom_health() -> dict:
    # Verify database and cache connectivity
    return {"database": "healthy", "cache": "healthy"}
```

### 7. Graceful Shutdown

NexusApp does not have an `app.stop()` method. Graceful shutdown is handled
by the Rust Nexus engine when the process receives SIGTERM/SIGINT. For Docker
and Kubernetes, the default signal handling works correctly.

```python
# The Rust runtime handles SIGTERM/SIGINT gracefully.
# No explicit shutdown code needed in Python.
```

## Monitoring in Production

### Prometheus Metrics

```bash
# Metrics endpoint
curl http://nexus:3000/metrics

# Add to Prometheus config
scrape_configs:
  - job_name: 'nexus'
    static_configs:
      - targets: ['nexus:3000']
```

### Grafana Dashboard

Import Nexus Grafana dashboard for visualization.

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t nexus-app:${{ github.sha }} .

      - name: Push to registry
        run: |
          docker tag nexus-app:${{ github.sha }} registry.example.com/nexus-app:${{ github.sha }}
          docker push registry.example.com/nexus-app:${{ github.sha }}

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/nexus nexus=registry.example.com/nexus-app:${{ github.sha }} -n nexus
          kubectl rollout status deployment/nexus -n nexus
```

## Key Takeaways

- Use Docker for containerization
- Deploy to Kubernetes for orchestration
- Enable Redis for distributed sessions
- Configure monitoring and logging
- Implement health checks
- Use horizontal scaling for high load
- Enable security features
- Automate deployments with CI/CD

## Related Skills

- [nexus-config-options](#) - Configuration reference
- [nexus-enterprise-features](#) - Production features
- [nexus-health-monitoring](#) - Monitor production
- [nexus-troubleshooting](#) - Fix production issues
