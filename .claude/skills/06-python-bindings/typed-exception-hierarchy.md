---
name: typed-exception-hierarchy
description: "Split a Rust error enum into a typed PyO3 exception hierarchy so Python callers can `except` discrete failure modes without parsing exception messages. Use when wrapping any Rust error enum that has more than 2 distinct failure modes for a Python binding."
priority: HIGH
tags: [pyo3, python-binding, error-handling, exceptions, rust-binding]
paths:
  - "bindings/kailash-python/**"
  - "bindings/kailash-ruby/**"
---

# Typed Exception Hierarchy For PyO3 Wrappers

When a Rust function returns `Result<T, MyError>` and `MyError` is an enum with multiple variants, the naive PyO3 wrapper raises a single Python exception type for every variant — forcing Python callers to either catch everything with one `except` and lose information, or `str(e)`-match exception messages and bind their code to the *exact wording* of error messages. Both are wrong.

The correct pattern is a **typed exception hierarchy**: one base class per Rust error enum, plus one PyO3 subclass per error variant. The conversion function dispatches each Rust variant to its corresponding Python subclass. Python callers then `except SubclassName` for the specific failure mode they care about, and `except BaseClass` for "anything from this subsystem".

This is the canonical pattern for wrapping any Rust error enum with ≥3 variants in a Python binding. Below 3 variants, a flat exception type is acceptable; at or above 3, the typed hierarchy is mandatory.

## When To Use

| Variants in the Rust enum | Use this pattern? |
| --- | --- |
| 1 (single failure mode) | No — a single exception type is fine |
| 2 (e.g., `Timeout` / `Other`) | Optional — only if the two are semantically distinct enough that callers want to handle them differently |
| 3+ (typed errors with distinct call-site reactions) | **Yes — mandatory** |

## The Pattern

### Step 1: Define The Base Class And One Subclass Per Variant

In the PyO3 module, use the `pyo3::create_exception!` macro to declare a base class and one subclass per Rust enum variant. The base inherits from `PyException`; the subclasses inherit from the base.

```rust
use pyo3::create_exception;
use pyo3::exceptions::PyException;

// Base — catches everything from this subsystem
create_exception!(
    kailash,                          // module name (must match #[pymodule])
    ServiceClientError,               // class name visible in Python
    PyException,                      // base
    "Base class for all ServiceClient failures."
);

// One subclass per Rust enum variant
create_exception!(kailash, ServiceClientHttpError,           ServiceClientError,
    "Network or transport failure (SSRF blocked, timeout, connection error, invalid URL).");
create_exception!(kailash, ServiceClientHttpStatusError,     ServiceClientError,
    "HTTP response with non-2xx status code.");
create_exception!(kailash, ServiceClientSerializeError,      ServiceClientError,
    "Failed to JSON-encode the request body.");
create_exception!(kailash, ServiceClientDeserializeError,    ServiceClientError,
    "Failed to JSON-decode the response body.");
create_exception!(kailash, ServiceClientInvalidPathError,    ServiceClientError,
    "Base URL and path could not be joined.");
create_exception!(kailash, ServiceClientInvalidHeaderError,  ServiceClientError,
    "Header name or value rejected by the validator.");
```

### Step 2: Register All Classes In The Module

Every subclass MUST be registered in the `#[pymodule]` function alongside the base. Missing a registration makes the class invisible to Python and breaks `isinstance()` checks.

```rust
#[pymodule]
fn kailash(py: Python, m: &PyModule) -> PyResult<()> {
    m.add("ServiceClientError",                py.get_type::<ServiceClientError>())?;
    m.add("ServiceClientHttpError",            py.get_type::<ServiceClientHttpError>())?;
    m.add("ServiceClientHttpStatusError",      py.get_type::<ServiceClientHttpStatusError>())?;
    m.add("ServiceClientSerializeError",       py.get_type::<ServiceClientSerializeError>())?;
    m.add("ServiceClientDeserializeError",     py.get_type::<ServiceClientDeserializeError>())?;
    m.add("ServiceClientInvalidPathError",     py.get_type::<ServiceClientInvalidPathError>())?;
    m.add("ServiceClientInvalidHeaderError",   py.get_type::<ServiceClientInvalidHeaderError>())?;
    Ok(())
}
```

### Step 3: Dispatched Conversion Function

Write ONE conversion function from the Rust error enum to a `PyErr`. It MUST exhaustively match every variant (no wildcard `_ =>`) so adding a new variant to the Rust enum is a compile error until the conversion function is updated.

```rust
fn service_client_err_to_pyerr(err: kailash_nexus::service_client::ServiceClientError) -> PyErr {
    use kailash_nexus::service_client::ServiceClientError as E;
    match &err {
        E::Http(inner) =>
            ServiceClientHttpError::new_err(format!("http: {inner}")),

        E::SerializeRequest(s) =>
            ServiceClientSerializeError::new_err(format!("serialize_request: {s}")),

        E::DeserializeResponse { status, body, error } => {
            let body_short = truncate_py_error_body(body);   // see layered-truncation skill
            ServiceClientDeserializeError::new_err(format!(
                "deserialize_response status={status} error={error} body={body_short}"
            ))
        },

        E::HttpStatus { status, body } => {
            let body_short = truncate_py_error_body(body);
            ServiceClientHttpStatusError::new_err(format!(
                "http_status status={status} body={body_short}"
            ))
        },

        E::InvalidPath(s) =>
            ServiceClientInvalidPathError::new_err(format!("invalid_path: {s}")),

        E::InvalidHeader(s) =>
            ServiceClientInvalidHeaderError::new_err(format!("invalid_header: {s}")),
    }
}
```

### Step 4: Use The Conversion At Every Boundary

Every PyO3 method that calls into the Rust crate MUST route the `Result` through `service_client_err_to_pyerr` (or its equivalent), never wrap with a generic `PyValueError::new_err(format!("{e}"))`.

```rust
#[pymethods]
impl PyServiceClient {
    fn get(&self, path: &str) -> PyResult<PyObject> {
        let result = self.tokio_rt.block_on(async {
            self.inner.get_raw(path).await
        });
        match result {
            Ok(resp) => Python::with_gil(|py| http_response_to_dict(py, &resp)),
            Err(e) => Err(service_client_err_to_pyerr(e)),    // typed dispatch
        }
    }
}
```

### Step 5: Python Caller-Side Discrimination

Python callers can now `except` specific subclasses, or fall back to the base class for anything the subsystem raises:

```python
import kailash

client = kailash.ServiceClient("https://api.example.com", allowed_hosts=["api.example.com"])

try:
    user = client.post("/users", {"name": "Alice"})
except kailash.ServiceClientHttpStatusError as e:
    # 4xx/5xx response
    log.warn("backend rejected request", error=str(e))
    return None
except kailash.ServiceClientDeserializeError as e:
    # response body was not valid JSON
    log.error("backend returned malformed json", error=str(e))
    raise
except kailash.ServiceClientInvalidHeaderError as e:
    # caller bug — bad header passed at construction time
    raise
except kailash.ServiceClientError as e:
    # any other failure from the ServiceClient subsystem
    log.error("service client failure", error=str(e))
    raise
```

## DO / DO NOT

```python
# DO — catch the specific subclass for the failure mode you can recover from
try:
    user = client.get("/users/42")
except kailash.ServiceClientHttpStatusError:
    return None  # treat 404 as "no user"
except kailash.ServiceClientError:
    raise        # everything else is fatal

# DO NOT — string-match the exception message
try:
    user = client.get("/users/42")
except kailash.ServiceClientError as e:
    if "404" in str(e):           # BLOCKED — fragile, breaks on message rewording
        return None
    if "deserialize" in str(e):    # BLOCKED — couples Python code to Rust message format
        raise
```

## MUST Rules

### 1. Exhaustive Match In The Conversion Function

The Rust → Python error conversion MUST exhaustively match every variant of the Rust enum. Wildcard `_ => generic_error(...)` is BLOCKED.

```rust
// DO — exhaustive
match &err {
    E::Http(_) => ...,
    E::HttpStatus { .. } => ...,
    E::SerializeRequest(_) => ...,
    E::DeserializeResponse { .. } => ...,
    E::InvalidPath(_) => ...,
    E::InvalidHeader(_) => ...,
}

// DO NOT — wildcard catch-all
match &err {
    E::Http(_) => ServiceClientHttpError::new_err(...),
    _ => ServiceClientError::new_err(format!("{err}")),   // BLOCKED
}
```

**Why:** A wildcard hides the moment a new variant is added to the Rust enum. The new variant gets dispatched to the generic base class, Python callers cannot discriminate it, and the typed-discrimination guarantee silently degrades. Exhaustive matching turns the new variant into a compile error that forces the binding author to add a new subclass.

### 2. Subclass Per Variant, Not Subclass Per Severity

The hierarchy MUST follow the *Rust enum's variant structure*, not a hand-designed severity taxonomy. One subclass per variant, named after the variant.

```rust
// DO — variant-shaped hierarchy
ServiceClientHttpError          // for E::Http
ServiceClientHttpStatusError    // for E::HttpStatus
ServiceClientSerializeError     // for E::SerializeRequest
ServiceClientDeserializeError   // for E::DeserializeResponse

// DO NOT — severity-shaped hierarchy
ServiceClientFatalError         // for "everything bad"
ServiceClientWarningError       // for "everything we can retry"
```

**Why:** Severity classifications are caller-specific (one caller's fatal is another's warning). Variant-shaped hierarchies preserve the structural information from the Rust enum and let each caller make its own severity decision.

### 3. Conversion Function Lives Next To The Class Definitions

The `*_err_to_pyerr()` function MUST live in the same file as the `create_exception!` declarations. Splitting them across files makes it possible to add a Rust enum variant + a new Python class without updating the dispatcher.

**Why:** Co-location is the structural defense against drift. Cross-file split + grep is not.

## Security Caution: Exception Messages May Contain Secrets

Exception messages produced by this hierarchy may include URL fragments (from `InvalidPath` / `InvalidUrl` variants) and upstream response body content (from `HttpStatus` / `Deserialize` variants, even after layered truncation). Both can carry secrets that the upstream service or the caller embedded in the inputs:

- A malformed URL like `https://user:tokenABC@host/` would surface `tokenABC` in `ServiceClientInvalidPathError.__str__`.
- An upstream service returning `{"error": "session XYZ123 expired"}` would surface `XYZ123` in `ServiceClientHttpStatusError.__str__`.

```python
# DO — redact before logging at INFO or above
try:
    user = client.get("/users/42")
except kailash.ServiceClientError as e:
    logger.info("api call failed", error=mask_credentials(str(e)))
    raise

# DO NOT — log raw exception messages at INFO/WARN
try:
    user = client.get("/users/42")
except kailash.ServiceClientError as e:
    logger.info("api call failed", error=str(e))   # may leak tokens, response-body secrets
    raise
```

**Why:** Log aggregators (Datadog, Splunk, CloudWatch) are accessible to a broader audience than the production database. A `ServiceClientHttpStatusError` body containing a session token, even after 512-byte truncation, will reach every log reader. Treat exception messages as untrusted upstream content. See `rules/security.md` § "No secrets in logs".

**BLOCKED rationalizations:**

- "The truncation already keeps the body small, secrets won't leak"
- "We trust the upstream service not to put secrets in error bodies"
- "logger.info is for debugging, it's fine"
- "We can scrub the logs after the fact"

## MUST NOT

- Wrap a multi-variant Rust enum with `PyValueError::new_err(format!("{e}"))`

**Why:** Loses every distinction the Rust enum encoded; forces callers to string-match.

- Re-define the same exception class in multiple PyO3 modules

**Why:** `isinstance()` checks fail across module boundaries because the two classes have different identities.

- Skip registering a subclass in the `#[pymodule]` block

**Why:** Unregistered classes are invisible to Python `isinstance()` and `from kailash import X` fails with `ImportError`.

## Related Skills

- `skills/06-python-bindings/layered-truncation.md` — pairs with this skill: when an error variant carries a body field, route it through `truncate_py_error_body` so the Python exception message stays under ~512 bytes
- `skills/18-security-patterns/header-validation-at-construction.md` — pairs with this skill: the `InvalidHeader` variant in the example above is what makes constructor-time header validation surfaceable to Python callers
- `skills/06-python-bindings/SKILL.md` — overview of Python binding patterns

Origin: BP-041 (kailash-rs ServiceClient Python binding hardening, 2026-04-14, commits `d3a14a73` + `18bb703b`). The pre-fix `PyServiceClient` raised a single `ServiceClientError` for 6 distinct failure modes, forcing Python callers to parse exception messages. The fix introduced a base class plus 6 typed subclasses with dispatched conversion. The pattern is reusable for every PyO3 wrapper of a Rust error enum with ≥3 variants.
