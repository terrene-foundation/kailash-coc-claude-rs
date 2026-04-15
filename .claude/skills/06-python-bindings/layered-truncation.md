---
name: layered-truncation
description: "Use two truncation boundaries — forensic-sized body (~4KB) for Rust logs, tightly truncated body (~512B) for Python exception traceback. Use when wrapping any Rust error type whose body field can carry arbitrary remote content."
priority: HIGH
tags: [pyo3, python-binding, error-handling, observability, traceback]
paths:
  - "bindings/kailash-python/**"
  - "bindings/kailash-ruby/**"
---

# Layered Truncation For PyO3 Error Bodies

When a Rust error type carries a body field (HTTP response body, file content, command output, deserialization input), that body can be arbitrarily large. The Rust layer wants the *full* body for forensic logging and incident analysis. The Python binding layer wants the body *short* because it ends up inside an exception message that gets formatted into a traceback that gets logged, alerted, and displayed in stack traces — and a 4KB body inside a Python `__str__` produces 400-line traceback output that drowns the actual error signal.

The right answer is **two truncation boundaries**:

1. **Forensic boundary** at the Rust layer (typically ~4KB) — keeps enough body to debug the actual remote response, lives in Rust logs only
2. **User-facing boundary** at the binding layer (typically ~512B) — fits inside an exception message without flooding tracebacks, lives in Python exception strings only

Both boundaries are constants. Both have a single helper. Both are character-boundary-safe (never truncates mid-codepoint).

## The Pattern

### Step 1: Two Constants, Two Helpers

The Rust crate declares its forensic constant and helper in the source file that produces the error. The PyO3 wrapper declares its tighter constant and a separate helper in the binding file. Do NOT share a single helper between layers — they have different audiences.

```rust
// crates/kailash-nexus/src/service_client.rs
const MAX_ERROR_BODY_BYTES: usize = 4096;

fn truncate_body(body: &str) -> String {
    if body.len() <= MAX_ERROR_BODY_BYTES {
        return body.to_owned();
    }
    let mut cut = MAX_ERROR_BODY_BYTES;
    while cut > 0 && !body.is_char_boundary(cut) {
        cut -= 1;
    }
    let truncated_bytes = body.len() - cut;
    format!("{}... [truncated {} bytes]", &body[..cut], truncated_bytes)
}
```

```rust
// bindings/kailash-python/src/nexus.rs
const PY_SERVICE_CLIENT_ERROR_BODY_BYTES: usize = 512;

fn truncate_py_error_body(body: &str) -> String {
    if body.len() <= PY_SERVICE_CLIENT_ERROR_BODY_BYTES {
        return body.to_owned();
    }
    let mut cut = PY_SERVICE_CLIENT_ERROR_BODY_BYTES;
    while cut > 0 && !body.is_char_boundary(cut) {
        cut -= 1;
    }
    let truncated_bytes = body.len() - cut;
    format!("{}... [truncated {} bytes]", &body[..cut], truncated_bytes)
}
```

### Step 2: Apply The Helper At The PyErr Conversion Site

The PyO3 → PyErr conversion function (see `typed-exception-hierarchy.md`) MUST call `truncate_py_error_body` on every body field before formatting it into the exception message. The Rust layer keeps the original body untouched in its logs.

```rust
fn service_client_err_to_pyerr(err: ServiceClientError) -> PyErr {
    match &err {
        E::HttpStatus { status, body } => {
            let body_short = truncate_py_error_body(body);   // 512-byte ceiling for Python
            ServiceClientHttpStatusError::new_err(format!(
                "http_status status={status} body={body_short}"
            ))
        },
        E::DeserializeResponse { status, body, error } => {
            let body_short = truncate_py_error_body(body);   // same ceiling
            ServiceClientDeserializeError::new_err(format!(
                "deserialize_response status={status} error={error} body={body_short}"
            ))
        },
        // other variants without body fields...
    }
}
```

The `body` field stored inside `ServiceClientError` itself remains the Rust-side `truncate_body` result (~4KB) — that's what gets logged via `tracing::warn!(?err)` for forensics. Only the *Python exception message* gets the tighter 512-byte version.

### Step 3: What Python Sees

Before the layered truncation pattern, a Python user catching a `ServiceClientHttpStatusError` from a server returning a 4KB error page would see:

```
ServiceClientHttpStatusError: http_status status=500 body=<!doctype html><html><head><title>...
[400 lines of HTML elided in this snippet for brevity]
...</html>
```

After:

```
ServiceClientHttpStatusError: http_status status=500 body=<!doctype html><html><head><title>Internal Server Error</title></head><body>... [truncated 3584 bytes]
```

Same forensic data is still in the Rust logs (visible to operators); the Python user's traceback is now ~5 lines instead of ~410.

## DO / DO NOT

```rust
// DO — two layered helpers, one constant per layer
const PY_SERVICE_CLIENT_ERROR_BODY_BYTES: usize = 512;

fn truncate_py_error_body(body: &str) -> String { ... }

// In the conversion function:
let body_short = truncate_py_error_body(body);
SomeError::new_err(format!("... body={body_short}"))

// DO NOT — share the Rust forensic helper at the binding layer
let body_short = truncate_body(body);             // BLOCKED — 4KB body in Python traceback
SomeError::new_err(format!("... body={body_short}"))

// DO NOT — no truncation, format raw body
SomeError::new_err(format!("... body={body}"))    // BLOCKED — unbounded traceback
```

## MUST Rules

### 1. Truncation Helpers Are Character-Boundary-Safe

Every truncation helper MUST walk back from the byte limit to the nearest UTF-8 character boundary before slicing. Truncating mid-codepoint produces invalid UTF-8 and panics on `String::from_utf8` later in the pipeline.

```rust
// DO — walk back to char boundary
let mut cut = LIMIT;
while cut > 0 && !body.is_char_boundary(cut) {
    cut -= 1;
}
let truncated = &body[..cut];

// DO NOT — naive slice
let truncated = &body[..LIMIT];   // panics on multi-byte char at LIMIT
```

**Why:** `&str[..n]` panics if `n` is not a character boundary. A response body containing a multi-byte UTF-8 character at the limit will crash the conversion function; the binding then panics across the FFI boundary which produces an uncatchable Python error.

### 2. Always Report The Number Of Bytes Truncated

The truncation helper MUST append `... [truncated N bytes]` (or equivalent) so the Python user knows how much was discarded. Silent truncation hides the size of the original body.

```rust
// DO — explicit truncation marker
format!("{}... [truncated {} bytes]", &body[..cut], body.len() - cut)

// DO NOT — silent truncation
format!("{}", &body[..cut])
```

**Why:** Without the marker, a user looking at a 510-byte body cannot tell whether the response was ~510 bytes or 5MB. The marker is the only signal that distinguishes "small body" from "huge body, mostly hidden".

### 3. Layer-Specific Constants, Not A Single Shared Constant

The Rust forensic limit and the Python user-facing limit MUST be separate constants. Sharing a single `MAX_ERROR_BODY_BYTES` across layers couples the two contracts and forces one to compromise for the other.

**Why:** Forensic logs need enough body to reconstruct the remote response (~4KB minimum for an HTML error page). Python tracebacks need to fit inside alerting payloads and stack-trace dumps (~512 bytes maximum). The two constraints are incompatible; trying to satisfy both with one number satisfies neither.

## MUST NOT

- Truncate the body INSIDE the Rust error variant before storing it

**Why:** That would lose the forensic data permanently. The Rust error must keep the larger body; only the *PyErr message* gets the tighter version.

- Use `.chars().take(N).collect()` instead of byte-based truncation

**Why:** Slow (O(N) walk) and produces a string of N *characters* rather than N *bytes*, making the actual byte limit unpredictable for log-aggregator field-size limits.

- Skip the truncation helper for "small bodies that probably fit"

**Why:** "Probably fits" is exactly the assumption that breaks the first time a server returns a 50KB JSON error response. The helper is cheap and unconditional.

## Related Skills

- `skills/06-python-bindings/typed-exception-hierarchy.md` — the conversion function that calls `truncate_py_error_body` is documented in that skill; this skill covers the truncation half of the pattern
- `skills/18-security-patterns/header-validation-at-construction.md` — the `InvalidHeader` variant returns a short error string that does NOT need truncation, so the helper is not called for that variant
- `rules/observability.md` — broader logging rules; layered truncation is the binding-layer corollary of "structured log fields, not f-string interpolation"

Origin: BP-043 (kailash-rs ServiceClient Python binding, 2026-04-14, commits `d3a14a73` + `18bb703b`). Pre-fix, the PyO3 wrapper formatted the full 4KB Rust-side body into the Python exception message, producing 400-line tracebacks that drowned the real error signal. The fix introduced `PY_SERVICE_CLIENT_ERROR_BODY_BYTES = 512` plus `truncate_py_error_body` called at the PyErr conversion site, while the Rust crate kept its 4KB `MAX_ERROR_BODY_BYTES` for forensic logging. Generalises to any PyO3 wrapper of a Rust error type with body fields.
