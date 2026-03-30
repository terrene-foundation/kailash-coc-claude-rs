# Query Telemetry

Query performance tracking, slow query detection, connection pool monitoring, deferred connections, and tracing configuration.

## Key Types

| Type                | Source                                        | Purpose                                       |
| ------------------- | --------------------------------------------- | --------------------------------------------- |
| `QueryEngine`       | `crates/kailash-dataflow/src/query_engine.rs` | DashMap-backed query stats tracker            |
| `QueryStats`        | same                                          | Per-query execution statistics                |
| `PoolMetrics`       | `crates/kailash-dataflow/src/pool_monitor.rs` | Point-in-time pool snapshot                   |
| `PoolMonitorHandle` | same                                          | Background monitor with watch channel         |
| `HealthStatus`      | same                                          | Healthy / Degraded / Unhealthy enum           |
| `LazyDataFlow`      | `crates/kailash-dataflow/src/connection.rs`   | Deferred connection pool initialization       |
| `TracingConfig`     | `crates/kailash-core/src/telemetry.rs`        | OTel tracing configuration (always available) |

## QueryEngine

Thread-safe query performance tracker using DashMap:

```rust
use kailash_dataflow::query_engine::QueryEngine;
use std::time::Duration;

let engine = QueryEngine::new(Duration::from_millis(100)); // slow query threshold

// Record query executions
engine.record_query("SELECT * FROM users WHERE id = ?", Duration::from_millis(50));
engine.record_query("SELECT * FROM users WHERE id = ?", Duration::from_millis(60));
engine.record_query("SELECT * FROM orders WHERE total > ?", Duration::from_millis(150));

// Get slow queries (avg duration > threshold)
let slow = engine.slow_queries();
// Returns: Vec<(String, QueryStats)> -- query string + stats

// Get all stats
let all_stats = engine.stats();
// Returns: Vec<(String, QueryStats)> for every tracked query

// QueryStats fields:
// - execution_count: u64
// - total_duration: Duration
// - avg_duration: Duration
// - last_executed: DateTime<Utc>
```

The `slow_queries()` method returns all queries whose `avg_duration` exceeds the threshold configured at construction time.

## Pool Monitoring

### Point-in-Time Snapshot

```rust
use kailash_dataflow::pool_monitor::PoolMetrics;

let metrics = PoolMetrics::from_pool(&pool);
println!("active: {}", metrics.active);
println!("idle: {}", metrics.idle);
println!("max: {}", metrics.max_connections);
println!("utilization: {:.1}%", metrics.utilization_pct);
```

`utilization_pct` is clamped to 100.0 to handle transient overshoot during pool churn.

### Background Monitor

```rust
use kailash_dataflow::pool_monitor::PoolMonitorHandle;
use std::time::Duration;

let mut handle = PoolMonitorHandle::spawn(pool, Duration::from_secs(5));

// Get latest metrics (from watch channel, non-blocking)
let latest = handle.metrics();

// Shutdown the background task
handle.shutdown().await;
```

The background monitor emits structured tracing output:

- **WARN** at >= 80% utilization
- **ERROR** at >= 95% utilization

### HealthStatus

```rust
use kailash_dataflow::pool_monitor::HealthStatus;

match status {
    HealthStatus::Healthy => { /* all good */ },
    HealthStatus::Degraded(msg) => { /* high utilization or slow response */ },
    HealthStatus::Unhealthy(msg) => { /* unreachable or errors */ },
}
```

The same enum exists in both `kailash_dataflow::pool_monitor` and `kailash_nexus::health` -- they are separate types with identical shapes.

## LazyDataFlow

Deferred connection pool initialization. The pool is created on first use, not at construction:

```rust
use kailash_dataflow::connection::LazyDataFlow;

// No connection is made here -- just stores the URL
let lazy = LazyDataFlow::new("sqlite::memory:");
assert!(!lazy.is_initialized());

// Pool is created on first call to get()
let df = lazy.get().await?;
df.execute_raw("SELECT 1").await?;
assert!(lazy.is_initialized());

// Subsequent calls return the same instance
let df2 = lazy.get().await?;
assert!(std::ptr::eq(df, df2)); // same pointer

// Check without initializing
if let Some(df) = lazy.get_if_initialized() {
    // pool was already created
}

// Safe to close even if never initialized
lazy.close().await;
```

From config:

```rust
use kailash_dataflow::connection::{LazyDataFlow, DataFlowConfig};

let config = DataFlowConfig::new("postgres://localhost/mydb");
let lazy = LazyDataFlow::from_config(config);
```

**Important**: After `close()`, the `OnceCell` retains the closed instance. Subsequent `get()` calls will NOT re-create the pool. Create a new `LazyDataFlow` if you need a fresh connection.

## TracingConfig

Configuration types are always available (no feature gate). Runtime functions require the `telemetry` feature:

```rust
use kailash_core::telemetry::{TracingConfig, ExporterType};

let config = TracingConfig {
    service_name: "my-service".into(),
    endpoint: "http://otel-collector:4317".into(),
    exporter_type: ExporterType::Otlp,  // or Jaeger, Zipkin
    enable_metrics: true,
    sampling_ratio: 0.5,  // 50% sampling
};

// Defaults:
// service_name: "kailash"
// endpoint: "http://localhost:4317"
// exporter_type: ExporterType::Otlp
// enable_metrics: false
// sampling_ratio: 1.0 (sample everything)
```

Runtime initialization (behind `telemetry` feature):

- `init_telemetry(config)` -> `TelemetryGuard`
- `workflow_span(run_id)` -> tracing span for workflow execution
- `node_span(node_id, type_name)` -> tracing span for node execution
- `TelemetryMetrics` -> counter/histogram recording

## Gotchas

1. **QueryEngine keys by exact query string**: If your query has different parameter values inlined (not bound), each variation is tracked separately. Use parameterized queries (`?` / `$1` placeholders) for accurate aggregation.

2. **PoolMetrics uses sampled values**: `size()` and `num_idle()` are read at different instants. Transient inconsistencies are possible, which is why `utilization_pct` is clamped to 100.0.

3. **TracingConfig vs runtime**: Config types (`TracingConfig`, `ExporterType`) are always compiled. The actual OTel integration (`init_telemetry`, `TelemetryGuard`, spans, metrics) requires the `telemetry` feature flag. This avoids pulling in OTel dependencies for users who do not need tracing.

4. **LazyDataFlow Debug redacts URL**: The `Debug` impl shows `"[REDACTED]"` for the database URL to prevent credential leakage in logs.

5. **PoolMonitor uses watch channel**: The background task publishes metrics via `tokio::sync::watch`. The `metrics()` method returns the latest snapshot without blocking. There is no history -- only the most recent reading is available.

## Cross-References

- `02-dataflow/` -- `DataFlow` connection management, `DataFlowConfig`
- `01-core/enterprise-infrastructure.md` -- progressive infrastructure scaling
- `enterprise-middleware.md` -- Nexus health probes (uses similar `HealthStatus`)
