# Enterprise Infrastructure Binding Patterns

Reference for cross-language binding patterns established during the enterprise-infra feature implementation (v2.7.0+).

## 1. Enum-with-Data Flattening

Rust enums with associated data cannot be directly represented in most FFI targets. The pattern is to flatten them into a `kind` string plus optional properties.

**Rust source**:

```rust
pub enum IdempotencyKeyStrategy {
    None,
    ExecutionScoped,
    InputScoped,
    FromInput { field_name: String },
}
```

**Python binding**:

```rust
#[pyclass]
struct PyIdempotencyKeyStrategy {
    #[pyo3(get)] kind: String,        // "none" | "execution_scoped" | "input_scoped" | "from_input"
    #[pyo3(get)] field_name: Option<String>,  // Only populated for FromInput
}

#[pymethods]
impl PyIdempotencyKeyStrategy {
    #[staticmethod]
    fn from_input(field_name: &str) -> Self { ... }  // Factory method for variant with data
}
```

**C ABI**: JSON string exchange -- `kailash_idempotency_strategy_create("{\"kind\":\"from_input\",\"field_name\":\"request_id\"}")`

**WASM**: `#[wasm_bindgen]` with `JsValue` conversion via `serde-wasm-bindgen`

## 2. Error Mapping

Each binding translates Rust `thiserror` errors to language-native exceptions/errors:

| Binding | Error Type                                               | Pattern                                   |
| ------- | -------------------------------------------------------- | ----------------------------------------- |
| Python  | `PyErr::new::<pyo3::exceptions::PyRuntimeError, _>(msg)` | All saga/queue errors map to RuntimeError |
| Ruby    | `magnus::Error::new(exception_class, msg)`               | Uses `magnus::exception::runtime_error()` |
| Node.js | `napi::Error::from_reason(msg)`                          | napi auto-converts to JS Error            |
| WASM    | `JsValue::from_str(&err.to_string())`                    | String errors via wasm-bindgen            |
| C ABI   | Return code + `kailash_last_error()`                     | Thread-local error string                 |

## 3. Feature Flag Propagation Chain

The `enterprise-infra` feature must propagate through the dependency chain:

```
workspace Cargo.toml (feature definition)
  -> bindings/kailash-python/Cargo.toml: enterprise-infra = ["kailash-nodes/enterprise-infra"]
  -> crates/kailash-nodes/Cargo.toml: enterprise-infra = ["kailash-core/enterprise-infra"]
  -> crates/kailash-core/Cargo.toml: enterprise-infra = []  (leaf, enables the module)
```

Each binding crate re-exports the feature:

- `#[cfg(feature = "enterprise-infra")]` guards all enterprise infra modules
- The workspace `Cargo.toml` default features include `enterprise-infra` for full builds

## 4. Dedicated Tokio Runtime (OnceLock Pattern)

See `.claude/skills/06-python-bindings/async-bridging.md` for full details.

Summary: Infra types (SagaStore, TaskQueue) use a module-level `OnceLock<tokio::runtime::Runtime>` with 2 worker threads. This avoids "Cannot start a runtime from within a runtime" panics when these types are used inside Nexus handlers or other async contexts.

## 5. CancellationToken as ShutdownToken

Rust's `tokio_util::sync::CancellationToken` is wrapped as a simpler `ShutdownToken` in each binding:

```rust
// Python
#[pyclass]
struct PyShutdownToken {
    inner: CancellationToken,
}
#[pymethods]
impl PyShutdownToken {
    #[new]
    fn new() -> Self { Self { inner: CancellationToken::new() } }
    fn shutdown(&self) { self.inner.cancel(); }
    fn is_shutdown(&self) -> bool { self.inner.is_cancelled() }
}
```

The token is passed into `ConfiguredInfra` or `WorkerProcess` to enable graceful shutdown from the host language.

## 6. JSON String Exchange (C ABI / WASM)

For C ABI and WASM where rich types are not available:

- **Input**: JSON string -> `serde_json::from_str` -> Rust type
- **Output**: Rust type -> `serde_json::to_string` -> JSON string (caller frees via `kailash_string_free`)
- **Enums**: Serialized as `{"kind": "variant_name", ...additional_fields}`
- **Lists**: Serialized as JSON arrays

C ABI functions return `*mut c_char` for string results, `i32` for status codes.

## 7. Factory Methods for Enum Types

Since most FFI targets cannot express Rust enum constructors, use `#[staticmethod]` / class-level factory methods:

```python
# Python usage
strategy = IdempotencyKeyStrategy.none()
strategy = IdempotencyKeyStrategy.execution_scoped()
strategy = IdempotencyKeyStrategy.from_input("request_id")
level = InfraLevel.in_memory()
level = InfraLevel.multi_worker()
```

Each factory method is a `#[staticmethod]` that constructs the wrapper with the correct `kind` and optional fields.

## 8. WorkerProcess Decision (EIB-070)

`WorkerProcess` is NOT directly exposed to any binding. Users access worker functionality only through `ConfiguredInfra.start_worker()`. See the async-bridging skill for full rationale.

## Binding Type Counts (v2.7.0)

| Binding             | Enterprise Infra Types    | Async Strategy   | Tests |
| ------------------- | ------------------------- | ---------------- | ----- |
| Python (PyO3)       | 15 types + 2 functions    | OnceLock runtime | 102   |
| Ruby (Magnus)       | 15 classes + 2 module fns | OnceLock runtime | 1,120 |
| Node.js (napi-rs)   | 14 types                  | Native Promise   | 56    |
| WASM (wasm-bindgen) | 9 data-only types         | N/A (no async)   | 118   |
| C ABI               | 18 extern "C" fns         | OnceLock runtime | 147   |

Note: Python `configure_from_env` and `configure_from_env_full` are module-level functions, not classes. Ruby exposes them as `Kailash.configure_from_env` and `Kailash.configure_from_env_full` module functions. Node.js and WASM do not expose `ShutdownToken` or `ConfiguredInfra` (by design -- worker lifecycle is managed differently in those environments).
