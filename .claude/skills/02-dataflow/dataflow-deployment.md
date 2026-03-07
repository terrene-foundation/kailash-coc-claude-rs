---
name: dataflow-deployment
description: "DataFlow production deployment patterns. Use when asking 'deploy dataflow', 'dataflow production', 'dataflow docker', or 'dataflow nexus'."
---

# DataFlow Production Deployment

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`

## Docker/Nexus Deployment

✅ **`auto_migrate=True` works in Docker!**

DataFlow handles table creation internally using synchronous DDL, completely bypassing event loop boundary issues.

### Zero-Config Pattern (Recommended)

```python
import kailash
from kailash.nexus import NexusApp

# Zero-config: auto_migrate=True (default) now works!
df = kailash.DataFlow("postgresql://user:pass@localhost:5432/mydb")

@df.model  # Tables created immediately via sync DDL
class User:
    id: str
    name: str
    email: str

reg = kailash.NodeRegistry()
app = NexusApp()

@app.handler()
def create_user(name: str, email: str):
    builder = kailash.WorkflowBuilder()
    builder.add_node("UserCreateNode", "create", {
        "name": name, "email": email
    })
    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))

@app.handler()
def get_user(id: str):
    builder = kailash.WorkflowBuilder()
    builder.add_node("UserReadNode", "read", {"id": id})
    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))

@app.handler()
def list_users(limit: int = 100):
    builder = kailash.WorkflowBuilder()
    builder.add_node("UserListNode", "list", {"limit": limit})
    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))
```

### How It Works

- Table creation is handled synchronously by the Rust engine - no asyncio conflicts
- Tables are created at model registration time
- CRUD operations use async execution as before
- No event loop conflicts because DDL and CRUD use separate execution paths

### Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install DataFlow with PostgreSQL support
RUN pip install kailash-enterprise  # DataFlow included

COPY . /app

# No special setup needed - auto_migrate=True works!
CMD ["python", "app.py"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/mydb
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: mydb
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Alternative: Manual Table Creation

For explicit control over table creation timing:

```python
import kailash

# Use auto_migrate=False for manual control
df = kailash.DataFlow("postgresql://...", auto_migrate=False)

@df.model
class User:
    id: str
    name: str

# Explicitly create tables when ready
df.create_tables()
```

## ⚠️ In-Memory SQLite Limitation

In-memory databases (`:memory:`) **cannot** use sync DDL because each connection gets a separate database. They automatically fall back to lazy table creation:

```python
# In-memory SQLite: Uses lazy creation (still works, just deferred)
db = kailash.DataFlow(":memory:", auto_migrate=True)  # Tables created on first access
```

## Environment Configuration

```python
import os
import kailash

# Use environment variables for production
df = kailash.DataFlow(
    os.getenv("DATABASE_URL"),
)
```

## Production Settings

| Setting | Development | Production |
|---------|-------------|------------|
| `auto_migrate` | `True` (default) | `True` or `False` |
| `log_config` | `LoggingConfig.development()` | `LoggingConfig.production()` |
| `pool_size` | Default | Configure via database URL |

<!-- Trigger Keywords: deploy dataflow, dataflow production, dataflow docker, dataflow kubernetes, dataflow nexus -->
