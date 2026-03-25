# Enterprise Middleware

Nexus enterprise middleware composition, custom router mounting, K8s health probes, and OpenAPI generation.

## Key Types

| Type                              | Source                                              | Purpose                                  |
| --------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `EnterpriseMiddlewareConfig`      | `crates/kailash-nexus/src/middleware/enterprise.rs` | Aggregate of all enterprise middleware   |
| `AuthConfig`                      | same                                                | JWT authentication config                |
| `CsrfConfig`                      | same                                                | CSRF protection config                   |
| `AuditMiddlewareConfig`           | same                                                | Request audit logging config             |
| `MetricsConfig`                   | same                                                | Prometheus-compatible metrics endpoint   |
| `EnterpriseSecurityHeadersConfig` | same                                                | Configurable security response headers   |
| `ErrorHandlerConfig`              | same                                                | Structured error response formatting     |
| `Nexus`                           | `crates/kailash-nexus/src/nexus.rs`                 | Main entry point with `include_router()` |
| `K8sProbeConfig`                  | `crates/kailash-nexus/src/health/k8s.rs`            | K8s liveness/readiness/startup config    |
| `K8sProbeState`                   | same                                                | Atomic state for probe endpoints         |
| `Preset`                          | `crates/kailash-nexus/src/middleware/presets.rs`    | One-line middleware preset selection     |

## include_router() Pattern

Mount custom axum routers with prefix and tags:

```
use kailash_nexus::Nexus;
use axum::Router;

let mut nexus = Nexus::new();

// Register handlers as usual
nexus.handler("ping", handler);

// Mount custom routers at a prefix
let admin = Router::new()
    .route("/status", axum::routing::get(|| async { "admin ok" }));
nexus.include_router(admin, "/admin", &["admin", "monitoring"]);

// Chainable
let metrics = Router::new()
    .route("/prometheus", axum::routing::get(|| async { "metrics" }));
nexus
    .include_router(admin, "/admin", &["admin"])
    .include_router(metrics, "/metrics", &["observability"]);

// Build the final router (includes all handlers + custom routers)
let router = nexus.router()?;
```

Custom routers are nested under their prefix: a router mounted at `/admin` with route `/status` is reachable at `/admin/status`.

## Enterprise Middleware Composition

```
use kailash_nexus::middleware::enterprise::EnterpriseMiddlewareConfig;

// Development: auth disabled, stack traces enabled
let dev_config = EnterpriseMiddlewareConfig::development();

// Production: all protections enabled
let prod_config = EnterpriseMiddlewareConfig::production();

// Custom
let config = EnterpriseMiddlewareConfig {
    auth: AuthConfig { required: true, ..AuthConfig::default() },
    csrf: CsrfConfig { enabled: true, allowed_origins: vec!["https://app.example.com".into()] },
    audit: AuditMiddlewareConfig::writes_only(),
    metrics: MetricsConfig::enabled_at("/metrics"),
    security_headers: EnterpriseSecurityHeadersConfig::strict(),
    error_handler: ErrorHandlerConfig::production(),
};
```

### development() vs production()

| Config Area      | `development()`           | `production()`                      |
| ---------------- | ------------------------- | ----------------------------------- |
| Auth             | `required: false`         | `required: true` (JWT, HS256)       |
| CSRF             | Disabled                  | Enabled (empty origins = deny all)  |
| Audit            | Disabled                  | Writes-only (POST/PUT/DELETE/PATCH) |
| Metrics          | Enabled at `/metrics`     | Enabled at `/metrics`               |
| Security Headers | Permissive                | Strict (HSTS, CSP, frame deny)      |
| Error Handler    | Request ID + stack traces | Request ID only (no stack traces)   |

## Middleware Presets (MiddlewareConfig)

Standard middleware presets (separate from enterprise config):

```
use kailash_nexus::middleware::{Preset, MiddlewareConfig};

let config = MiddlewareConfig::from_preset(Preset::Enterprise);
```

| Preset        | CORS       | Rate Limit | Logging | Body Limit | Security Headers |
| ------------- | ---------- | ---------- | ------- | ---------- | ---------------- |
| `None`        | --         | --         | --      | --         | --               |
| `Lightweight` | Permissive | --         | Yes     | --         | --               |
| `Standard`    | Strict     | Yes        | Yes     | Yes        | --               |
| `SaaS`        | Strict     | Yes        | Yes     | Yes        | Standard         |
| `Enterprise`  | Strict     | Stricter   | Yes     | Stricter   | Strict           |

## K8s Health Probes

```
use kailash_nexus::health::k8s::{K8sProbeConfig, K8sProbeState, build_k8s_probe_router};

let config = K8sProbeConfig::default();
// Defaults: /healthz, /readyz, /startupz

let state = K8sProbeState::new();
let probe_router = build_k8s_probe_router(&config, state.clone());

// Control probe state (atomic operations)
state.set_ready(true);   // readiness probe passes
state.set_started(true); // startup probe passes
// Liveness always returns 200 while the process is alive
```

| Probe     | Default Path | Returns 200 When          |
| --------- | ------------ | ------------------------- |
| Liveness  | `/healthz`   | Process is alive (always) |
| Readiness | `/readyz`    | `state.set_ready(true)`   |
| Startup   | `/startupz`  | `state.set_started(true)` |

`K8sProbeState` uses `AtomicBool` for lock-free state updates.

## ErrorHandlerConfig

```
use kailash_nexus::middleware::enterprise::ErrorHandlerConfig;

// Production: includes request ID, no stack traces
let config = ErrorHandlerConfig::production();

// Development: includes request ID + stack traces
let config = ErrorHandlerConfig::development();

// Format an error response
let body = config.format_error("not_found", "Resource not found", Some("req-123"), None);
// Returns JSON: {"error": "not_found", "message": "Resource not found", "request_id": "req-123"}
```

## Gotchas

1. **CSRF with empty origins**: When CSRF is enabled and `allowed_origins` is empty, ALL state-changing requests are DENIED (fail-closed). You MUST specify at least one origin.

2. **JWT secret minimum length**: JWT secrets must be at least 32 characters for HS256/HS512. This is enforced at middleware initialization.

3. **include_router is additive**: Custom routers are merged into the final axum router. There is no removal API.

4. **Preset vs EnterpriseMiddlewareConfig**: `Preset` configures the standard middleware stack (CORS, rate limit, body limit, security headers). `EnterpriseMiddlewareConfig` is an orthogonal set of enterprise-specific middleware (auth, CSRF, audit, metrics, error handler). Both can be used together.

## Cross-References

- `03-nexus/` -- handler registration pattern, NexusConfig
- `crates/kailash-nexus/src/middleware/stack.rs` -- `MiddlewareConfig` and `build_middleware_router()`
- `crates/kailash-nexus/src/middleware/security_headers.rs` -- `SecurityHeadersConfig` details
