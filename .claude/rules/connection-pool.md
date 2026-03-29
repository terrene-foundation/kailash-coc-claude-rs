---
paths:
  - "**/*.py"
  - "**/*.rb"
---

# Connection Pool Safety Rules

## Scope

These rules apply to all code that uses DataFlow, creates database connections, or configures application workers. Covers Python and Ruby applications using `kailash-enterprise`.

**Applies to**: `**/*.py`, `**/*.rb`

## MUST Rules

### 1. Never Use Default Pool Size in Production

MUST set `DATAFLOW_MAX_CONNECTIONS` environment variable. The default pool size (typically 25 per worker) will exhaust PostgreSQL's connection limit on small-to-medium instances.

**Formula**: `pool_size = postgres_max_connections / num_workers * 0.7`

| Instance Size | `max_connections` | Workers | `DATAFLOW_MAX_CONNECTIONS` |
| ------------- | ----------------- | ------- | -------------------------- |
| t2.micro      | 87                | 2       | 30                         |
| t2.small      | 150               | 2       | 50                         |
| t2.medium     | 150               | 2       | 50                         |
| t3.medium     | 150               | 4       | 25                         |
| r5.large      | 1000              | 4       | 175                        |

#### Python

```python
# WRONG — relies on default pool size
import kailash
df = kailash.DataFlow("postgresql://...")

# RIGHT — explicit pool size from environment
import os, kailash
df = kailash.DataFlow(
    os.environ["DATABASE_URL"],
    max_connections=int(os.environ.get("DATAFLOW_MAX_CONNECTIONS", "10"))
)
```

#### Ruby

```ruby
# WRONG — relies on default pool size
config = Kailash::DataFlow::Config.new("postgresql://...")
df = Kailash::DataFlow.new(config)

# RIGHT — explicit pool size from environment
config = Kailash::DataFlow::Config.new(ENV.fetch("DATABASE_URL"))
config.max_connections = ENV.fetch("DATAFLOW_MAX_CONNECTIONS", "10").to_i
df = Kailash::DataFlow.new(config)
```

**Enforced by**: deployment-specialist agent, pool-safety skill
**Violation**: BLOCK deployment

### 2. Never Query DB Per-Request in Middleware

MUST NOT call DataFlow workflows (ReadUser, ReadSession, etc.) in middleware that runs on every HTTP request. This creates N+1 connection usage where N is concurrent requests, rapidly exhausting the pool.

#### Python — Detection patterns

```python
# WRONG — DB query runs on EVERY request
class AuthMiddleware:
    async def __call__(self, request):
        reg = kailash.NodeRegistry()
        builder = kailash.WorkflowBuilder()
        builder.add_node("ReadUser", "read", {"filter": {"token": token}})
        rt = kailash.Runtime(reg)
        result = rt.execute(builder.build(reg))  # Pool checkout per request!
        request.state.user = result["results"]["read"]
```

#### Python — Correct patterns

```python
# RIGHT — JWT claims, no DB hit
class AuthMiddleware:
    async def __call__(self, request):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ")
        claims = jwt.decode(token, key=os.environ["JWT_SECRET"], algorithms=["HS256"])
        request.state.user_id = claims["sub"]
        request.state.permissions = claims.get("permissions", [])

# RIGHT — In-memory cache with TTL for session data
from cachetools import TTLCache

_session_cache = TTLCache(maxsize=1000, ttl=300)  # 5-minute TTL

class AuthMiddleware:
    async def __call__(self, request):
        token = extract_token(request)
        if token in _session_cache:
            request.state.user = _session_cache[token]
        else:
            user = await self._fetch_user(token)  # DB hit only on cache miss
            _session_cache[token] = user
            request.state.user = user
```

#### Ruby — Detection patterns

```ruby
# WRONG — DB query runs on EVERY request
class AuthMiddleware
  def call(env)
    Kailash::Registry.open do |registry|
      builder = Kailash::WorkflowBuilder.new
      builder.add_node("ReadUser", "read", { "token" => token })
      workflow = builder.build(registry)
      Kailash::Runtime.open(registry) do |rt|
        result = rt.execute(workflow, {})  # Pool checkout per request!
      end
    end
  end
end
```

#### Ruby — Correct patterns

```ruby
# RIGHT — JWT claims, no DB hit
class AuthMiddleware
  def call(env)
    token = env["HTTP_AUTHORIZATION"]&.delete_prefix("Bearer ")
    claims = JWT.decode(token, ENV.fetch("JWT_SECRET"), true, algorithm: "HS256").first
    env["user_id"] = claims["sub"]
    @app.call(env)
  end
end
```

**Enforced by**: intermediate-reviewer agent, pool-safety skill
**Violation**: BLOCK commit

### 3. Health Checks Must Not Use Application Pool

MUST use a lightweight query or a dedicated connection for health checks, never a full DataFlow workflow. Health checks run every 10-30 seconds per load balancer target — if they use the application pool, they consume connections continuously.

#### Python

```python
# WRONG — full DataFlow workflow for health check
@app.get("/health")
async def health():
    builder = kailash.WorkflowBuilder()
    builder.add_node("ListUser", "check", {"limit": 1})
    result = rt.execute(builder.build(reg))
    return {"status": "ok"}

# RIGHT — lightweight raw query
@app.get("/health")
async def health():
    try:
        await db.execute_raw("SELECT 1")
        return {"status": "ok"}
    except Exception:
        return JSONResponse({"status": "error"}, status_code=503)
```

#### Ruby

```ruby
# WRONG
get "/health" do
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("ListUser", "check", { "limit" => 1 })
  # ...

# RIGHT
get "/health" do
  ActiveRecord::Base.connection.execute("SELECT 1")
  { status: "ok" }.to_json
rescue StandardError => e
  status 503
  { status: "error", detail: e.message }.to_json
end
```

**Enforced by**: deployment-specialist agent
**Violation**: BLOCK deployment

### 4. Verify Pool Math at Deployment

Before deploying, MUST verify this inequality holds:

```
DATAFLOW_MAX_CONNECTIONS x num_workers <= postgres_max_connections x 0.7
```

The 0.7 factor reserves 30% of connections for admin tasks, migrations, monitoring, and connection spikes.

**Example**:

- PostgreSQL `max_connections = 150` (t2.medium default)
- Puma workers = 4
- `DATAFLOW_MAX_CONNECTIONS = 25`
- Check: `25 x 4 = 100 <= 150 x 0.7 = 105` — PASS

**Counter-example** (the bug that created this rule):

- PostgreSQL `max_connections = 150`
- Gunicorn workers = 4
- `DATAFLOW_MAX_CONNECTIONS = 50` (or default)
- Check: `50 x 4 = 200 > 105` — FAIL. Pool exhaustion under load.

**Enforced by**: pool-safety skill during `/deploy`
**Violation**: BLOCK deployment

### 5. Connection Timeout Must Be Set

MUST set a connection acquisition timeout. Without it, requests queue indefinitely when the pool is exhausted, causing cascading timeouts.

#### Python

```python
# RIGHT — timeout after 5 seconds
df = kailash.DataFlow(
    os.environ["DATABASE_URL"],
    max_connections=int(os.environ.get("DATAFLOW_MAX_CONNECTIONS", "10")),
    connection_timeout=5  # seconds
)
```

#### Ruby

```ruby
# RIGHT — timeout after 5 seconds
config = Kailash::DataFlow::Config.new(ENV.fetch("DATABASE_URL"))
config.max_connections = ENV.fetch("DATAFLOW_MAX_CONNECTIONS", "10").to_i
config.connection_timeout = 5  # seconds
df = Kailash::DataFlow.new(config)
```

### 6. Workers Must Share Pool

All coroutines/threads within a single worker MUST share one pool. MUST NOT create a new DataFlow/pool instance per request or per route handler.

#### Python

```python
# WRONG — new pool per request
@app.post("/users")
async def create_user(data: UserCreate):
    df = kailash.DataFlow(os.environ["DATABASE_URL"])  # New pool!

# RIGHT — application-level singleton
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app):
    app.state.df = kailash.DataFlow(
        os.environ["DATABASE_URL"],
        max_connections=int(os.environ.get("DATAFLOW_MAX_CONNECTIONS", "10"))
    )
    yield
    await app.state.df.close()
```

#### Ruby

```ruby
# WRONG — new connection per request
get "/users" do
  config = Kailash::DataFlow::Config.new(ENV.fetch("DATABASE_URL"))
  df = Kailash::DataFlow.new(config)  # New pool!

# RIGHT — shared at application level
configure do
  set :df, Kailash::DataFlow.new(
    Kailash::DataFlow::Config.new(ENV.fetch("DATABASE_URL")).tap { |c|
      c.max_connections = ENV.fetch("DATAFLOW_MAX_CONNECTIONS", "10").to_i
    }
  )
end
```

## MUST NOT Rules

### 1. No Unbounded Connection Creation

MUST NOT create database connections in loops or recursive functions without pool limits.

### 2. No Pool Size From User Input

MUST NOT allow pool size to be set from user-controlled input (API parameters, form fields).

### 3. No Separate ConnectionManagers Per Store

MUST NOT create a new ConnectionManager/DataFlow instance for each store. All stores within a worker MUST share the same pool.

## Cross-References

- `rules/deployment.md` — Production deployment checklist
- `rules/patterns.md` — DataFlow framework patterns (Python + Ruby)
- `skills/project/pool-safety.md` — Deployment verification skill
