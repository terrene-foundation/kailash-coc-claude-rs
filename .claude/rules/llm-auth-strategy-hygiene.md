---
paths:
  - "crates/kailash-kaizen/**/*.rs"
  - "bindings/**/*.rs"
  - "bindings/**/*.py"
  - "bindings/**/*.rb"
  - "bindings/**/*.ts"
---

# LLM Auth Strategy Hygiene Rule

Custom `AuthStrategy` implementations — third-party code passed via `LlmDeployment::Custom` — MUST follow the contract defined in `specs/llm-deployments.md` § 6.7. Implementations that derive `Debug` on self, log credential bytes, or cache token strings in plain `HashMap` fields are a credential-exfiltration risk in production telemetry pipelines.

## MUST Rules

### 1. MUST NOT Derive `Debug` On an `AuthStrategy` Impl

Any struct that implements the `AuthStrategy` trait MUST NOT use `#[derive(Debug)]`. It MUST provide a manual `Debug` implementation that returns a redacted placeholder.

```rust
// DO — manual redacted Debug
use std::fmt;

pub struct MyBearerStrategy {
    token: zeroize::Zeroizing<String>,
}

impl fmt::Debug for MyBearerStrategy {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("MyBearerStrategy")
            .field("token", &"<redacted>")
            .finish()
    }
}

// DO NOT — derived Debug leaks the credential value
#[derive(Debug)]
pub struct MyBearerStrategy {
    token: String,  // leaked verbatim by Debug
}
```

**Why:** `#[derive(Debug)]` renders every field with its value; a token field prints the raw credential into any log line, span, or structured trace that formats the struct, including default Tokio task panics.

**BLOCKED rationalizations:**
- "The debug output only appears in development"
- "We control where the logs go"
- "The token field is marked `#[allow(dead_code)]`"

### 2. MUST NOT Log Credential Bytes Inside `apply()`

The `apply()` method that injects auth headers into outbound requests MUST NOT emit any `tracing::` or `log::` call that includes the token value, its prefix, or its length.

```rust
// DO — log without credential content
async fn apply(&self, req: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
    tracing::debug!(strategy = "bearer", "applying auth header");
    req.bearer_auth(self.token.as_str())
}

// DO NOT — log credential bytes
async fn apply(&self, req: reqwest::RequestBuilder) -> reqwest::RequestBuilder {
    tracing::info!(token = %self.token, "applying bearer token");  // BLOCKED
    req.bearer_auth(self.token.as_str())
}
```

**Why:** Structured log fields are shipped verbatim to every log aggregator, distributed trace backend, and third-party observability vendor. A single `tracing::info!(token = ...)` emits the credential to potentially dozens of external sinks.

**BLOCKED rationalizations:**
- "It's at DEBUG level, no one ships DEBUG to prod"
- "The log aggregator redacts secrets automatically"
- "tracing::info! is for tracing spans, not persistent logs"

### 3. Temporary Token Buffers MUST Use `zeroize::Zeroizing`

Any field that holds a credential string, byte slice, or token for use within `apply()` MUST be wrapped in `zeroize::Zeroizing<T>` so the contents are zeroed when the value drops.

```rust
// DO — zeroized token field
use zeroize::Zeroizing;

pub struct MyApiKeyStrategy {
    key: Zeroizing<String>,
}

impl MyApiKeyStrategy {
    pub fn new(key: String) -> Self {
        Self { key: Zeroizing::new(key) }
    }
}

// DO NOT — plain String, contents persist in heap after drop
pub struct MyApiKeyStrategy {
    key: String,  // heap bytes remain readable after drop
}
```

**Why:** Without `zeroize`, dropped credential strings leave plaintext bytes in heap memory that can be read by a subsequent allocator, a memory dump tool, or a coredump shipped to an incident service.

### 4. Cached Tokens MUST NOT Use `HashMap<String, String>`

If an `AuthStrategy` impl caches tokens between calls (e.g. for OAuth refresh), the cache MUST store values as `Zeroizing<String>`, not raw `String`. Using `HashMap<String, String>` for a token cache is BLOCKED.

```rust
// DO — cache with zeroized values
use std::collections::HashMap;
use zeroize::Zeroizing;

pub struct TokenCache {
    cache: HashMap<String, Zeroizing<String>>,
}

// DO NOT — raw strings in cache
pub struct TokenCache {
    cache: HashMap<String, String>,  // token values persist in heap after eviction
}
```

**Why:** Tokens evicted from a `HashMap<String, String>` leave their bytes in the allocator's free list. An attacker with memory read access (container escape, coredump) can recover evicted credentials.

### 5. `LlmDeployment::Custom` Construction MUST Emit WARN

Any constructor that wraps a custom `AuthStrategy` with `LlmDeployment::Custom` MUST emit a `tracing::warn!` at construction time so operators see the audit trail.

```rust
// DO — auditable construction
pub fn custom(strategy: Arc<dyn AuthStrategy>) -> Self {
    tracing::warn!(
        strategy_type = std::any::type_name::<dyn AuthStrategy>(),
        "LlmDeployment::Custom: using caller-supplied AuthStrategy; \
         ensure zeroize + redacted Debug per rules/llm-auth-strategy-hygiene.md"
    );
    // ... build deployment
}

// DO NOT — silent construction
pub fn custom(strategy: Arc<dyn AuthStrategy>) -> Self {
    // ... build deployment with no log
}
```

**Why:** `Custom` bypasses all SDK-enforced credential hygiene; the WARN creates an audit trail that shows up in any WARN-level log scan, making it impossible to ship custom strategies silently.

**BLOCKED rationalizations:**
- "The caller knows they're using Custom, they don't need a log"
- "The WARN clutters the startup output"
- "We'll remove it once the preset lands"

## MUST NOT

- Implement `Clone` on an `AuthStrategy` struct that contains credentials

**Why:** `Clone` duplicates credential bytes into a second allocation; the original and the clone must both be zeroized independently. Use `Arc<dyn AuthStrategy>` sharing instead of `Clone`.

- Store credentials in `thread_local!` statics without a drop guard

**Why:** Thread-local statics have no deterministic drop order; credentials stored in them may outlive the `AuthStrategy` lifetime, persisting across requests in thread-pool threads.

## Relationship to Other Rules

- `rules/security.md` § "No secrets in logs" — this rule is the `AuthStrategy`-specific enforcement of that broader principle.
- `rules/observability.md` § "Mask HTTP Auth Headers" — masks auth header values on log lines emitted BY the client; this rule prevents credential bytes from reaching loggers via `AuthStrategy` internals.
- `specs/llm-deployments.md` § 6.7 — normative source for the `AuthStrategy` contract.

Origin: kailash-rs#406 S9 (2026-04-18), derived from red-team findings in § 6 of `specs/llm-deployments.md` during the S4c review cycle.
