# Async Bridging Patterns for Kailash Bindings

## Three Strategies

### 1. Module-Level OnceLock Runtime (RECOMMENDED for infra types)

Used by: Python infra, Ruby infra, C ABI infra

```rust
static INFRA_RT: OnceLock<tokio::runtime::Runtime> = OnceLock::new();
fn infra_runtime() -> &'static tokio::runtime::Runtime {
    INFRA_RT.get_or_init(|| {
        tokio::runtime::Builder::new_multi_thread()
            .worker_threads(2)
            .enable_all()
            .build()
            .expect("infra runtime")
    })
}
```

**When to use**: Background service types (SagaStore, TaskQueue) that may be called from within an existing tokio context (e.g., Nexus handler callback).

**Why:** Prevents "Cannot start a runtime from within a runtime" panic. The dedicated runtime is separate from any application runtime.

### 2. Per-Instance Runtime (existing PyRuntime pattern)

Used by: PyRuntime, RbRuntime

The Runtime wrapper creates its own tokio Runtime on construction:

```rust
struct PyRuntime {
    inner: Arc<Runtime>,
    rt: Arc<TokioRuntime>,
}
```

**When to use**: User-facing objects with clear ownership and lifecycle.

### 3. Native Async (napi-rs)

Used by: Node.js binding

napi-rs provides a tokio runtime via the `tokio_rt` feature. `async fn` methods automatically return JavaScript Promises.

**When to use**: Node.js bindings only.

## Anti-Pattern: Per-Call Runtime

The C ABI previously created a new `tokio::runtime::Runtime` on each function call. This is wasteful (creates/destroys threads per call) and should never be used. Use strategy 1 instead.

## GIL/GVL Release

- **Python**: Always use `py.allow_threads(|| rt.block_on(future))` to release the GIL
- **Ruby**: Blocking calls automatically release the GVL in Magnus
- **Node.js**: Native async, no GIL
- **C ABI**: No GIL, but caller must manage their own threading

## Shutdown

The `OnceLock` runtime is never explicitly shut down -- it lives for the process lifetime. This is acceptable because:

1. It has only 2 worker threads (minimal overhead)
2. It only processes I/O-bound operations (store/queue calls)
3. Process exit cleans up all threads

## WorkerProcess Binding Decision (EIB-070)

**Decision**: `WorkerProcess` is NOT directly exposed to any binding. It is only accessible via `ConfiguredInfra.start_worker()`.

**Reasoning**:

1. `WorkerProcess::new()` takes `Arc<SqlxTaskQueue>` -- a concrete PostgreSQL-backed type, not a trait object
2. Users cannot construct a WorkerProcess without a PostgreSQL-backed queue
3. `ConfiguredInfra.start_worker()` handles all construction internally, including queue selection and shutdown token wiring
4. The original brief's example (`worker = WorkerProcess(...)`) is superseded by `infra.start_worker()`

**Implication**: No `PyWorkerProcess`, `RbWorkerProcess`, `JsWorkerProcess`, or C ABI `kailash_worker_*` functions are needed. The worker lifecycle is fully managed by the `ConfiguredInfra` type in each binding.
