---
name: header-validation-at-construction
description: "Validate HTTP header names and values at construction time, not at first request. Builder methods accepting headers MUST return Result so a CRLF-injected token fails in the constructor, not on the first .get() call. Use for any HTTP client that accepts caller-supplied header content."
priority: HIGH
tags: [http-client, security, header-injection, crlf, ssrf-adjacent, eager-validation]
paths:
  - "bindings/kailash-python/**"
  - "crates/kailash-nexus/**"
  - "**/http_client*"
  - "**/service_client*"
---

# Header Validation At Construction

When an HTTP client builder accepts caller-supplied header names and values — including the bearer token convenience method — the validation of those headers MUST run at *construction time*, not at first request time. Late validation is a security bug class: a CRLF-injected value that gets stored in a builder and only fails on the first `.get()` call has already been written into a `HeaderMap`, exists in memory, and may have leaked into logs or other code paths before it surfaces.

The pattern: every header-accepting builder method returns `Result<Self, ServiceClientError>` (in Rust) or raises a typed exception in `__init__` (in Python bindings). The validation runs through the same `try_with_header` helper that the typed `with_bearer_token` convenience routes through, so there is exactly one validation site for every header that ever enters the builder.

## Scope — Why "At Construction" Matters

**Header injection (CRLF) attack:** an attacker who controls *part of* a header value can inject `\r\n` followed by additional header lines, request smuggling payloads, or fake response splitting. The classic case is an authenticated endpoint that does `bearer_token = format!("Bearer {}", user_supplied_token)` and accepts a token containing `\r\nX-Admin: 1`. If the validator runs at first request, the bad value sits in the builder until then; if the validator runs at construction, the builder fails immediately and the attacker's payload never reaches the request layer.

**Why "convenience methods route through the validator":** a common bug is exposing a strict `try_with_header` AND a "convenient" `with_bearer_token(token: &str) -> Self` that bypasses the validator. The convenience method becomes the actual call site for 99% of bearer-token uses, and the strict validator never runs. The fix is the v3.16.1 hotfix below: every convenience method is itself fallible and routes through the strict validator.

This pattern is scoped to **header-specific validation** in HTTP/PyO3 contexts. Do NOT generalize to "all constructor-time validation" until a second data point (URL validation, credential validation, etc.) confirms the same builder-returning-Result shape works cross-concern.

## The Pattern

### Step 1: Builder Returns `Result<Self, _>` On Header-Accepting Methods

```rust
// crates/kailash-nexus/src/service_client.rs

#[derive(Debug, thiserror::Error)]
pub enum ServiceClientError {
    // ...
    #[error("invalid header: {0}")]
    InvalidHeader(String),
    // ...
}

impl ServiceClient {
    /// Add a custom header, validated at construction time.
    pub fn try_with_header(
        self,
        key: impl AsRef<str>,
        value: impl AsRef<str>,
    ) -> Result<Self, ServiceClientError> {
        let k = key.as_ref();
        let v = value.as_ref();

        // Validate name
        let header_name = reqwest::header::HeaderName::try_from(k)
            .map_err(|e| ServiceClientError::InvalidHeader(
                format!("invalid header name: {e}")
            ))?;

        // Validate value (rejects \r, \n, NUL, non-ASCII)
        let header_value = reqwest::header::HeaderValue::try_from(v)
            .map_err(|e| ServiceClientError::InvalidHeader(
                format!("invalid header value: {e}")
            ))?;

        let mut s = self;
        s.headers.insert(header_name, header_value);
        Ok(s)
    }

    /// Convenience for Authorization: Bearer <token>.
    /// Routes through try_with_header so CRLF in the token fails here, not at request time.
    pub fn with_bearer_token(self, token: &str) -> Result<Self, ServiceClientError> {
        self.try_with_header("Authorization", format!("Bearer {token}"))
    }
}
```

Two things matter:

1. **The validator is `reqwest::header::HeaderValue::try_from`** (or `http::HeaderValue::try_from`) on the `&str` path. It rejects `\r`, `\n`, `\0`, and other non-printable control characters — exactly the bytes used in CRLF injection. (`HeaderValue::from_bytes` accepts RFC 7230 `obs-text` 0x80–0xFF and is intentionally NOT used here; the `&str` path is stricter.) Do NOT roll your own validator.
2. **`with_bearer_token` is itself fallible and delegates to `try_with_header`.** The convenience method does NOT bypass validation. This is the v3.16.1 hotfix that turned a fake-security claim into a real one.

### Step 2: Builder Chain Uses `?` (Or Equivalent) At Every Step

```rust
let client = ServiceClient::new("https://api.example.com")
    .try_with_header("X-Request-Id", request_id)?            // fails here if bad
    .with_bearer_token(&token)?                              // also fails here, not at first request
    .with_allowed_hosts(vec!["api.example.com".into()]);     // non-fallible; no `?`

let user = client.get::<User>("/users/42").await?;
```

In Python (where `__init__` cannot return `Result`), the same validation runs at construction and raises a typed exception:

```python
import kailash

# Header validation runs in __init__
try:
    client = kailash.ServiceClient(
        base_url="https://api.example.com",
        allowed_hosts=["api.example.com"],
        bearer_token=user_token,                              # validated here
        headers={
            "X-Request-Id": request_id,                       # validated here
            "X-Tenant": tenant_id,                            # validated here
        },
    )
except kailash.ServiceClientInvalidHeaderError as e:
    # Caller passed something unsanitized — the bad header NEVER reaches the request layer
    log.error("rejected client construction", error=str(e))
    raise

# By the time we reach .get(), every header has already passed the validator.
user = client.get("/users/42")
```

### Step 3: CRLF Injection Is Now Caught At Construction

```python
# This raises ServiceClientInvalidHeaderError immediately, BEFORE any request is sent.
# The bad value never enters the HeaderMap.
try:
    bad = kailash.ServiceClient(
        base_url="https://api.example.com",
        allowed_hosts=["api.example.com"],
        bearer_token="good-token\r\nX-Admin: 1",              # CRLF injection attempt
    )
except kailash.ServiceClientInvalidHeaderError as e:
    print(f"Caught at construction: {e}")
    # Caught at construction: invalid_header: invalid header value: failed to parse header value
```

Same for header values containing null bytes, header names with whitespace, header values with non-ASCII bytes, etc. — every case is caught by `HeaderValue::try_from` / `HeaderName::try_from` before the builder returns.

## DO / DO NOT

```rust
// DO — fallible builder, single validator, convenience methods delegate
pub fn try_with_header(self, k: impl AsRef<str>, v: impl AsRef<str>)
    -> Result<Self, ServiceClientError> { /* validates both, returns Result */ }

pub fn with_bearer_token(self, token: &str) -> Result<Self, ServiceClientError> {
    self.try_with_header("Authorization", format!("Bearer {token}"))
}

// DO NOT — infallible builder, validation deferred to request time
pub fn with_header(self, k: &str, v: &str) -> Self {
    let mut s = self;
    s.headers.insert(
        HeaderName::from_static(k),                           // panics on bad input
        HeaderValue::from_str(v).unwrap(),                    // BLOCKED — unwrap on user input
    );
    s
}

// DO NOT — convenience method bypasses the validator
pub fn with_bearer_token(self, token: &str) -> Self {
    let value = format!("Bearer {token}");                    // CRLF survives here
    let mut s = self;
    s.headers.insert(AUTHORIZATION, HeaderValue::from_str(&value).unwrap_or_default());
    s   // BLOCKED — bad token silently became empty header, or panicked
}
```

## MUST Rules

### 1. Every Header-Accepting Builder Method Returns `Result`

Any builder method, constructor parameter, or setter that takes a header name or header value MUST return `Result<Self, _>` (Rust) or raise at `__init__` time (Python). Infallible setters that take caller-supplied header content are BLOCKED.

```rust
// DO
pub fn try_with_header(self, k: impl AsRef<str>, v: impl AsRef<str>) -> Result<Self, _>

// DO NOT
pub fn with_header(self, k: &str, v: &str) -> Self
```

**Why:** Late validation moves the failure from a synchronous, deterministic, attacker-visible point (construction) to an asynchronous, request-time point where the bad value has already been stored, possibly logged, possibly leaked through other code paths.

### 2. Convenience Methods Route Through The Strict Validator

Every "convenient" header-setting method (`with_bearer_token`, `with_basic_auth`, `with_user_agent`, `with_correlation_id`) MUST call `try_with_header` internally. Direct `HeaderMap::insert(...)` from a convenience method is BLOCKED.

```rust
// DO — convenience methods are fallible and delegate
pub fn with_bearer_token(self, token: &str) -> Result<Self, ServiceClientError> {
    self.try_with_header("Authorization", format!("Bearer {token}"))
}

// DO NOT — convenience method side-channels the validator
pub fn with_bearer_token(self, token: &str) -> Self {
    self.headers.insert(AUTHORIZATION, HeaderValue::from_str(&format!("Bearer {token}")).unwrap());
    self
}
```

**BLOCKED rationalizations:**

- "Bearer tokens are usually JWTs without CRLF, so validation is overkill"
- "We trust the caller to sanitize"
- "The convenience method exists *because* it's quick — adding `?` defeats the purpose"
- "We'll add validation in v2"

**Why:** The convenience method becomes the dominant call site (≥95% of bearer-token uses); the strict path becomes the exception. Routing the convenience method through the strict path is the only way to ensure validation actually runs in production.

### 3. Use The Crate's Own Header Validators, Never Hand-Rolled Regexes

The `reqwest::header::HeaderName::try_from` and `reqwest::header::HeaderValue::try_from` validators (or `http::*` equivalents) MUST be the validators used. Hand-rolled regex or character-class checks are BLOCKED.

```rust
// DO — use the library validators
let name = reqwest::header::HeaderName::try_from(k)?;
let value = reqwest::header::HeaderValue::try_from(v)?;

// DO NOT — hand-rolled validation
if v.contains('\r') || v.contains('\n') {                     // BLOCKED — incomplete
    return Err(...);
}
let value = HeaderValue::from_str(v).unwrap();
```

**Why:** The library validators implement the full RFC 7230 token / VCHAR / OWS rules and are kept in sync with HTTP spec updates. Hand-rolled checks miss edge cases (NUL bytes, DEL, non-ASCII Latin-1, obs-text) and silently re-introduce the vulnerability the validation was supposed to prevent.

## MUST NOT

- Store unvalidated header bytes in any builder field, even temporarily

**Why:** Once the bytes are in memory, any code path that touches the builder can leak them into logs, tracing spans, or downstream HTTP requests before the late validator runs.

- Use `HeaderValue::from_str(...).unwrap()` or `HeaderValue::from_static(...)` on user-controlled input

**Why:** `unwrap()` panics across the FFI boundary; `from_static` requires a `'static` lifetime which user input never has. Both are silent vectors back to the unsafe path.

- Defer header validation to "the next request" or "when the connection is established"

**Why:** That moves the failure from synchronous construction (caller can handle it) to asynchronous request time (caller's `try/except` is around the wrong code), making the error harder to attribute and easier to swallow.

## Related Skills

- `skills/06-python-bindings/typed-exception-hierarchy.md` — the `ServiceClientInvalidHeaderError` subclass surfaced by this validator is part of the typed exception hierarchy
- `skills/18-security-patterns/network-security-rs.md` — broader Rust network-hardening patterns (DNS rebinding, allowlists, TLS verification)
- `skills/18-security-patterns/fail-closed-defaults-rs.md` — the construction-time validation pattern is a specific case of "fail closed at the earliest possible moment"

Origin: BP-042 (kailash-rs ServiceClient header validation, 2026-04-14, commits `d3a14a73` + `18bb703b` + v3.16.1 hotfix). The v3.16.0 cut initially documented `with_bearer_token` as "routed through `try_with_header`", but the Rust implementation still called the infallible `with_header` — a fake-security claim. The v3.16.1 hotfix made `with_bearer_token` return `Result<Self, ServiceClientError>` and delegate to `try_with_header`. The skill codifies the actual shipped pattern: every header-accepting method is fallible, and every convenience method routes through the strict validator. Tier set to variant-rs because the Rust signature (`Result<Self, _>` builder chain with double-`?`) is idiomatic Rust; the Python and Ruby bindings inherit the validation by calling through `__init__`.
