---
priority: 10
scope: path-scoped
paths:
  - "**/db/**"
  - "**/pool*"
  - "**/database*"
  - "**/infrastructure/**"
---

# Connection Pool Safety Rules


<!-- slot:neutral-body -->


### 1. Never Use Default Pool Size in Production

Set `DATAFLOW_MAX_CONNECTIONS` env var. Default (25/worker) exhausts PostgreSQL on small instances.

**Why:** The Rust connection pool pre-allocates all slots at startup; the default 25/worker saturates a t2.micro's 87-connection limit and causes immediate connection-refused errors under load.

**Formula**: `pool_size = postgres_max_connections / num_workers * 0.7`

| Instance        | `max_connections` | Workers | `DATAFLOW_MAX_CONNECTIONS` |
| --------------- | ----------------- | ------- | -------------------------- |
| t2.micro        | 87                | 2       | 30                         |
| t2.small/medium | 150               | 2       | 50                         |
| t3.medium       | 150               | 4       | 25                         |
| r5.large        | 1000              | 4       | 175                        |

```python
# ❌ relies on default pool size
import kailash
df = kailash.DataFlow("postgresql://...")

# ✅ explicit pool size from environment
import os, kailash
df = kailash.DataFlow(
    os.environ["DATABASE_URL"],
    max_connections=int(os.environ.get("DATAFLOW_MAX_CONNECTIONS", "10"))
)
```

### 2. Never Query DB Per-Request in Middleware

Creates N+1 connection usage, rapidly exhausting pool.

**Why:** Each middleware DB query checks out a connection from the Rust pool for every inbound request, turning the pool into a per-request bottleneck that triggers cascading timeouts under traffic spikes.

```python
# ❌ DB query on EVERY request (Rust SDK API)
class AuthMiddleware:
    async def __call__(self, request):
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("ReadUser", "read", {"filter": {"token": token}})
        rt = kailash.Runtime(reg)
        result = rt.execute(builder.build(reg))  # Pool checkout per request!

# ✅ JWT claims, no DB hit
class AuthMiddleware:
    async def __call__(self, request):
        claims = jwt.decode(token, key=os.environ["JWT_SECRET"], algorithms=["HS256"])
        request.state.user_id = claims["sub"]

# ✅ In-memory cache with TTL
_session_cache = TTLCache(maxsize=1000, ttl=300)
```

### 3. Health Checks Must Not Use Application Pool

Use lightweight `SELECT 1` with dedicated connection, never a full DataFlow workflow.

**Why:** Health-check workflows compete with application queries for the same Rust pool slots, so a pool-exhaustion incident makes health checks fail too, causing the orchestrator to restart a healthy-but-busy service.

### 4. Verify Pool Math at Deployment

```
DATAFLOW_MAX_CONNECTIONS × num_workers ≤ postgres_max_connections × 0.7
```

The 0.7 reserves 30% for admin, migrations, monitoring.

**Why:** Exceeding the 0.7 threshold leaves no headroom for migrations or admin queries, which then fail with "too many connections" during routine maintenance windows.

### 5. Connection Timeout Must Be Set

Without timeout, requests queue indefinitely when pool exhausted, leading to cascading failures.

**Why:** The Rust pool's default wait is unbounded, so a single slow query can back up the entire async task queue until the process is OOM-killed.

### 6. Async Workers Must Share Pool

Application-level singleton. MUST NOT create new pool per request or per route handler.

**Why:** Each new Rust pool opens its own set of TCP connections and spawns background reaper tasks; per-request creation leaks file descriptors and memory until the OS kills the process.

```python
# ❌ new pool per request
@app.post("/users")
async def create_user():
    df = kailash.DataFlow(os.environ["DATABASE_URL"])  # New pool!

# ✅ application-level singleton via lifespan
@asynccontextmanager
async def lifespan(app):
    app.state.df = kailash.DataFlow(os.environ["DATABASE_URL"], ...)
    yield
    await app.state.df.close()
```

## MUST NOT

- No unbounded connection creation in loops — use pool or batch queries
  **Why:** Each loop iteration allocates a new Rust-side connection handle that is not reclaimed until the loop completes, exhausting both pool slots and OS file descriptors.
- No pool size from user input (API params, form fields)
  **Why:** An attacker-controlled pool size can trivially DoS the database by requesting thousands of connections in a single request.

<!-- /slot:neutral-body -->
