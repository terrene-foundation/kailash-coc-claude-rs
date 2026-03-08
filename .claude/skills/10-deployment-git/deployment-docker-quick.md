---
name: deployment-docker-quick
description: "Docker deployment quick start. Use when asking 'docker deployment', 'containerize kailash', or 'docker setup'."
---

# Docker Deployment Quick Start

> **Skill Metadata**
> Category: `deployment`
> Priority: `HIGH`

## Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Non-root user for security
RUN useradd --create-home appuser
USER appuser

# Use async runtime (Docker-optimized)
ENV RUNTIME_TYPE=async

# Expose API port
EXPOSE 3000

# Health check using python (curl not available on slim images)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3000/health')" || exit 1

# Run with async runtime
CMD ["python", "app.py"]
```

## Application Setup

```python
# app.py
import kailash
import os

builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "chat", {
    "provider": "openai",
    "model": os.environ["DEFAULT_LLM_MODEL"],  # from .env — never hardcode
    "prompt": "{{input.message}}"
})

# Deploy with NexusApp
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("chat")
def handle_chat(message: str):
    builder = kailash.WorkflowBuilder()
    builder.add_node("LLMNode", "chat", {
        "provider": "openai",
        "model": os.environ["DEFAULT_LLM_MODEL"],  # from .env — never hardcode
        "prompt": message
    })
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["chat"]

app.run(host="0.0.0.0", port=3000)
```

## Build and Run

```bash
# Build image
docker build -t my-kailash-app .

# Run container
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=${OPENAI_API_KEY} \
  -e DEFAULT_LLM_MODEL=${DEFAULT_LLM_MODEL} \
  my-kailash-app

# Access API
curl http://localhost:3000/health
```

## Docker Compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - DEFAULT_LLM_MODEL=${DEFAULT_LLM_MODEL}
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      - RUNTIME_TYPE=async
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

## Production Considerations

1. **Use Runtime** - Default in NexusApp
2. **Environment variables** - For secrets
3. **Health checks** - `/health` endpoint
4. **Multi-stage builds** - Smaller images
5. **Non-root user** - Security best practice
6. **Volume mounts** - For persistent data

<!-- Trigger Keywords: docker deployment, containerize kailash, docker setup, kailash docker -->
