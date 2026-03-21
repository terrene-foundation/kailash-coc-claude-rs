# DataFlow Pool Prevention

Connection pool exhaustion prevention for `kailash-dataflow`. Seven features that eliminate pool exhaustion as a failure mode.

Source: `crates/kailash-dataflow/src/connection.rs`, `pool_monitor.rs`, `leak_detector.rs`, `query_cache.rs`

---

## PoolSize Enum

Controls how the connection pool size is determined.

```rust
use kailash_dataflow::connection::{DataFlowConfig, PoolSize};

// Auto (default) — safe static defaults per dialect:
//   PostgreSQL/MySQL: 10   SQLite: 5
// Startup validation warns if this exceeds 70% of server max_connections.
let config = DataFlowConfig::new("postgres://..."); // pool_size = Auto

// Fixed — exact number of connections
let config = DataFlowConfig::new("postgres://...")
    .with_pool_size(PoolSize::Fixed(10));

// PerWorker — communicates intent for multi-process deployments
let config = DataFlowConfig::new("postgres://...")
    .with_pool_size(PoolSize::PerWorker(5));
```

**PgBouncer caveat**: `Auto` queries `SHOW max_connections` which returns the downstream PG limit, not the pooler limit. Use `Fixed(n)` behind PgBouncer.

**Binding equivalents**:

- Python: `DataFlowConfig("postgres://...", pool_size="auto")` or `pool_size=5` or `pool_size=PoolSize.fixed(5)`
- Ruby: `config.pool_size = Kailash::DataFlow::PoolSize.fixed(5)`
- Node.js: `config.poolSize = PoolSize.fixed(5)`

---

## Startup Validation

Runs automatically at `DataFlow::from_config()`. For PostgreSQL/MySQL:

1. Queries `SHOW max_connections` (PG) or `SHOW VARIABLES LIKE 'max_connections'` (MySQL)
2. Computes `total_demand = pool_size * detect_worker_count()`
3. Compares against `safe_limit = server_max * 0.7`
4. Logs ERROR if over-provisioned (with actionable guidance), INFO if safe
5. Does NOT block startup (some deployments intentionally over-provision with PgBouncer)

Worker count detected from env vars: `WEB_CONCURRENCY` > `UVICORN_WORKERS` > `WORKERS` > fallback 1.

Skipped for SQLite (no server-side limit).

---

## Pool Monitor

Background tokio task sampling pool state every 5 seconds.

```rust
let config = DataFlowConfig::new("postgres://...")
    .with_pool_monitor(true);  // default: true (disabled in test mode)
let df = DataFlow::from_config(config).await?;

// Read latest metrics (non-blocking)
if let Some(m) = df.pool_metrics() {
    println!("active={}, idle={}, max={}, util={:.1}%",
        m.active, m.idle, m.max_connections, m.utilization_pct);
}
```

**Thresholds**: WARN at >= 80% utilization, ERROR at >= 95%.

**Shutdown ordering**: Monitor is stopped BEFORE pool is closed (prevents reading from closed pool).

**Clone behavior**: `clone_shared()` clones do NOT own the monitor — only the original DataFlow does.

---

## Leak Detection

Tracks connection checkout/checkin lifecycle with RAII guards.

```rust
let config = DataFlowConfig::new("postgres://...")
    .with_leak_detection_threshold(30);  // seconds; 0 = disabled
let df = DataFlow::from_config(config).await?;
```

**How it works**: DataFlow-generated CRUD nodes wrap query execution in a `CheckoutGuard` that auto-checkins on Drop (including panics). A background task scans every 30 seconds for connections held longer than the threshold and logs WARN with the checkout location.

**`CheckoutGuard`**: Implements `Drop` for automatic checkin. Is `Send` — safe across `.await` points.

---

## Query Cache

Opt-in DashMap-based LRU cache for `Read{Model}` results.

```rust
let config = DataFlowConfig::new("postgres://...")
    .with_query_cache(60, 10_000);  // TTL seconds, max entries
let df = DataFlow::from_config(config).await?;

// Access cache directly
if let Some(cache) = df.query_cache() {
    cache.put("User", "42", value);
    let hit = cache.get("User", "42");  // Some(value) if not expired
    cache.invalidate("User", "42");     // remove specific
    cache.invalidate_model("User");     // remove all User entries
}
```

**Behavior**:

- `Read{Model}` with `cache: true` param checks cache before DB. On miss, queries DB and caches.
- `Create/Update/Delete/Upsert` invalidate cache for the affected model+ID.
- `List{Model}` never cached (unbounded results).
- `max_entries` is a soft limit — DashMap len is approximate under concurrency. Lazy eviction on `put()`.
- Disabled by default (`enable_query_cache: false`).

---

## Lightweight Pool

Isolated 2-connection pool for health checks and diagnostics.

```rust
let config = DataFlowConfig::new("postgres://...")
    .with_lightweight_pool(true);  // default: true for PG/MySQL, false for SQLite
let df = DataFlow::from_config(config).await?;

// Runs on the 2-connection pool — never competes with app queries
let rows = df.execute_lightweight("SELECT 1").await?;
```

**Key properties**:

- 2 connections max, 1 min — tiny footprint
- Same database URL and dialect-specific after_connect hooks as main pool
- Falls back to main pool (with debug log) if lightweight pool is not enabled
- Startup validation accounts for +2 connections in its math
- **Security**: `sql` parameter is NOT parameterized. Only pass trusted SQL.

---

## Shared Pool Registry

Share a single pool across multiple DataFlow instances.

```rust
use kailash_dataflow::connection::{DataFlow, DataFlowConfig};

// Register a pool (creates it from config, registers in global singleton)
DataFlow::register_shared_pool("main", config).await?;

// Create non-owning DataFlow instances from the shared pool
let df1 = DataFlow::from_pool_key("main")?;  // owns_pool = false
let df2 = DataFlow::from_pool_key("main")?;  // owns_pool = false

// Non-owning close does NOT close the pool
df1.close().await;  // pool stays alive

// Shared instances have no monitor or leak detector (owned by registry)
assert!(df1.pool_metrics().is_none());

// Config extraction blocked for shared instances (runtime-only)
assert!(df1.config_url().is_err());  // SharedPoolSerializationBlocked
```

**Registry**: Global singleton via `OnceLock`, capacity-limited (default 64 pools). TOCTOU-safe capacity check under write lock.

**`from_existing_pool(pool, dialect)`**: Alternative constructor accepting a raw `AnyPool` directly (non-owning).

---

## DataFlowConfig Fields

| Field                           | Type          | Default  | Description                         |
| ------------------------------- | ------------- | -------- | ----------------------------------- |
| `pool_size`                     | `PoolSize`    | `Auto`   | Pool sizing strategy                |
| `max_connections`               | `u32`         | `10`     | **Deprecated** — use `pool_size`    |
| `min_connections`               | `u32`         | `1`      | Minimum idle connections            |
| `connect_timeout_secs`          | `u64`         | `30`     | Connection acquire timeout          |
| `idle_timeout_secs`             | `Option<u64>` | `None`   | Idle connection timeout             |
| `max_lifetime_secs`             | `Option<u64>` | `1800`   | Max connection lifetime             |
| `enable_pool_monitor`           | `bool`        | `true`   | Background pool sampling            |
| `leak_detection_threshold_secs` | `u64`         | `30`     | Leak warning threshold (0=disabled) |
| `enable_query_cache`            | `bool`        | `false`  | Query result caching                |
| `query_cache_ttl_secs`          | `u64`         | `60`     | Cache entry TTL                     |
| `query_cache_max_entries`       | `usize`       | `10,000` | Cache capacity (soft limit)         |
| `enable_lightweight_pool`       | `bool`        | `true`   | Health check pool                   |
| `auto_migrate`                  | `bool`        | `false`  | Auto CREATE TABLE                   |
| `test_mode`                     | `bool`        | `false`  | Test configuration flag             |

**`DataFlowConfig::test()`** disables monitor, leak detection, lightweight pool, and query cache. Sets pool_size=Fixed(1) for SQLite memory.

---

## Common Mistakes

1. **Setting `max_connections` directly** — deprecated, use `with_pool_size(PoolSize::Fixed(n))`
2. **Not closing owned DataFlow** — register with `ResourceRegistry` or call `close()` manually
3. **Using `Auto` behind PgBouncer** — SHOW max_connections returns PG limit, not pooler limit
4. **Expecting `pool_metrics()` on shared instances** — shared DataFlow has no monitor
5. **Using `execute_lightweight` for application queries** — it's for health checks only (2 connections)
6. **Forgetting `cache: true` param** — query cache is opt-in per query, not global
