# Connection Pool Safety Verification

Pre-deployment skill that verifies database connection pool configuration is safe for production. Invoke during `/deploy` or manually before any deployment. Covers Python and Ruby applications using `kailash-enterprise`.

## When to Run

- During `/deploy` phase — automatically as part of the deployment checklist
- Before scaling workers up or down
- After changing database instance size
- When diagnosing connection timeout errors in production

## Step 1: Check DATAFLOW_MAX_CONNECTIONS

Search for `DATAFLOW_MAX_CONNECTIONS` in the project's `.env`, `.env.production`, `docker-compose.yml`, and deployment manifests.

```bash
# Check all env files and deployment configs
grep -r "DATAFLOW_MAX_CONNECTIONS" .env* docker-compose*.yml deploy/ k8s/ config/ 2>/dev/null

# Check if it's used in Python code
grep -rn "DATAFLOW_MAX_CONNECTIONS" src/ app/ lib/ --include="*.py" 2>/dev/null

# Check if it's used in Ruby code
grep -rn "DATAFLOW_MAX_CONNECTIONS" src/ app/ lib/ --include="*.rb" 2>/dev/null
```

**If not found**: BLOCK deployment. Add to `.env`:

```
DATAFLOW_MAX_CONNECTIONS=10
```

**If found**: Record the value for pool math verification in Step 3.

## Step 2: Scan for Per-Request DB Queries in Middleware

Search for DataFlow workflow execution inside middleware, decorators, or request hooks.

### Python

```bash
# Find middleware files
find . -name "middleware*.py" -o -name "*middleware*.py" | head -20

# Search for DB queries in middleware
grep -rn "execute\|Runtime\|DataFlow\|ReadUser\|ReadSession\|WorkflowBuilder\|add_node.*Read" \
  $(find . -name "middleware*.py" -o -name "*middleware*.py" 2>/dev/null) 2>/dev/null
```

### Ruby

```bash
# Find middleware files
find . -name "*middleware*.rb" | head -20

# Search for DB queries in middleware
grep -rn "Kailash::Runtime\|Kailash::DataFlow\|WorkflowBuilder\|add_node.*Read" \
  $(find . -name "*middleware*.rb" 2>/dev/null) 2>/dev/null
```

**If found**: BLOCK deployment. Report each file and line number. The fix is to replace DB queries with:
- JWT claim extraction (preferred for auth)
- In-memory TTL cache (`cachetools.TTLCache` in Python, `lru_cache` gem in Ruby)
- Redis cache for distributed deployments

## Step 3: Verify Pool Math

Collect these values and verify the inequality:

1. **`DATAFLOW_MAX_CONNECTIONS`** — from Step 1
2. **`num_workers`** — from server config, Dockerfile, or deployment manifest

```bash
# Check Gunicorn/uvicorn config (Python)
grep -rn "workers\|WEB_CONCURRENCY" gunicorn*.py Procfile docker-compose*.yml 2>/dev/null

# Check Puma config (Ruby)
grep -rn "workers\|WEB_CONCURRENCY" config/puma.rb Procfile 2>/dev/null
```

3. **`postgres_max_connections`** — from RDS/CloudSQL config or PostgreSQL settings

**Verify**: `DATAFLOW_MAX_CONNECTIONS x num_workers <= postgres_max_connections x 0.7`

| Variable                    | Value    | Source                  |
| --------------------------- | -------- | ----------------------- |
| `DATAFLOW_MAX_CONNECTIONS`  | ___      | `.env` / deploy config  |
| `num_workers`               | ___      | Server config           |
| `postgres_max_connections`  | ___      | RDS/CloudSQL/pg config  |
| **Pool total**              | ___ x ___ = ___ |                   |
| **Safe limit (70%)**        | ___ x 0.7 = ___ |                   |
| **Result**                  | PASS/FAIL |                         |

**If FAIL**: Reduce `DATAFLOW_MAX_CONNECTIONS` or reduce workers or increase `postgres_max_connections`.

## Step 4: Check Health Endpoint

```bash
# Find health check endpoints (Python)
grep -rn "health\|healthz\|readyz\|liveness" src/ app/ --include="*.py" 2>/dev/null

# Find health check endpoints (Ruby)
grep -rn "health\|healthz\|readyz\|liveness" app/ lib/ config/ --include="*.rb" 2>/dev/null

# Check if health endpoints use DataFlow workflows
grep -A 10 "health" $(grep -rl "health\|healthz" src/ app/ lib/ --include="*.py" --include="*.rb" 2>/dev/null) 2>/dev/null | \
  grep -i "workflow\|dataflow\|execute\|add_node\|Runtime"
```

**If health endpoints use DataFlow workflows**: WARN. Replace with `SELECT 1` raw query.

## Step 5: Check for Pool-Per-Request Anti-Pattern

```bash
# Find DataFlow/pool instantiation inside route handlers (Python)
grep -rn "DataFlow(\|create_pool" src/ app/ --include="*.py" 2>/dev/null

# Find DataFlow/pool instantiation inside route handlers (Ruby)
grep -rn "DataFlow.new\|ConnectionPool.new" app/ lib/ --include="*.rb" 2>/dev/null
```

**If pool is instantiated inside route handlers or non-singleton functions**: BLOCK. Move to application startup/lifespan.

## Output Format

Report findings as a checklist:

```
## Pool Safety Report

- [x] DATAFLOW_MAX_CONNECTIONS is set: 25
- [x] Pool math verified: 25 x 4 = 100 <= 105 (150 x 0.7) — PASS
- [x] No per-request DB queries in middleware
- [x] Health check uses lightweight query
- [x] DataFlow pool is application-level singleton
- [ ] ISSUE: middleware/auth.py:42 — ReadUser workflow in AuthMiddleware

Status: PASS / BLOCKED (fix issues above)
```
