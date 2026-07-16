---
description: "FFI handle lifecycle: check-then-use UAF, PyO3 finalization GIL re-entry SIGABRT, GC-on-tokio-worker callback abort; try_attach guard, dispatch-off-workers, stress fixtures, checklist."
---

# FFI Handle Lifecycle — Flag-Gated Close Is Not Deref-Safe

Cross-binding reference shape for every wrapper that owns a raw C handle (Go CGo,
Java JNA + Cleaner, .NET P/Invoke + finalizer, Ruby magnus TypedData, Node napi
external) and exposes `Close`/`free` ALONGSIDE methods that pass the handle into C.

## The failure class: check-then-use UAF

An `atomic.Bool` / flag "closed" check gates close-vs-close (at-most-once free) but
does NOT gate deref-vs-free. Between a method's pointer READ and its C CALL there is
a window a concurrent `Close()` (or the GC finalizer — the third racer) can free
into:

```go
// BROKEN — flag-gated only
func (s *Subscription) Cancel() error {
    if s.closed.Load() { return ErrClosed }   // check
    ptr := s.ptr                              // read
    // ← Close() can free+nil here; finalizer can fire here
    C.kailash_callback_cancel(ptr)            // use-after-free
}
```

Evidence: the Rust SDK journal 0174 — `TestSubscription_ConcurrentCancelAndClose`
crashed 8/8 under stress (SIGSEGV in `runFinalizers → cgocall`); the identical
class recurred one wave later on Go `AlignEngine` (journal 0178 R3 HIGH) and would
have shipped to v4.5.0 had the fresh-eyes round been skipped.

## The canonical fix: mutex-serialized window

ONE mutex per handle serializes the ENTIRE read-pointer → C-call → free window.
`Close` holds the mutex across the free. The flag stays as the finalizer fast-path.

```go
// CANONICAL (Go) — withHandle: mutex + closed-check + KeepAlive
func (s *Subscription) withHandle(f func(unsafe.Pointer) error) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    if s.closed.Load() || s.ptr == nil { return ErrClosed }
    err := f(s.ptr)
    runtime.KeepAlive(s)          // GC must not finalize mid-call
    return err
}
func (s *Subscription) Close() error {
    s.mu.Lock()
    defer s.mu.Unlock()
    if !s.closed.CompareAndSwap(false, true) { return nil }
    C.kailash_subscription_free(s.ptr)
    s.ptr = nil
    return nil
}
```

Per-runtime equivalents (the GC-backstop parity reference shape, journal 0175 G2):

| Runtime | Backstop                  | Serialization                                                       |
| ------- | ------------------------- | ------------------------------------------------------------------- |
| Go      | `runtime.SetFinalizer`    | `sync.Mutex` + CAS + `runtime.KeepAlive` inside the window          |
| Java    | `java.lang.ref.Cleaner`   | synchronized handle object; Cleaner action shares the lock          |
| .NET    | finalizer (`~T()`)        | `lock(_gate)` around P/Invoke + free; `GC.KeepAlive` after the call |
| Ruby    | magnus `free_immediately` | wrapped struct owns the `Arc`; magnus serializes via the GVL        |
| Python  | PyO3 `Drop`               | `Mutex<Option<Handle>>` inside the pyclass                          |
| Node    | napi instance lifetime    | `Arc` owned by the class instance; engine outlives Promises         |

## Second class (PyO3): GIL re-entry after `Py_FinalizeEx` is SIGABRT

A DISTINCT lifecycle bug from check-then-use, PyO3-specific. A `Drop` that
acquires the GIL to `Py_DECREF` a captured `Py<PyAny>` (an event callback, an
SSE iterator, a middleware handler) is fine on the main thread — but when the
wrapper is captured into a task on a **multi-threaded tokio runtime**, its
`Drop` can run on a tokio WORKER thread at process teardown. `Python::attach`
(pyo3 0.29) PANICS when `Py_IsInitialized() == 0` — the state after CPython's
`Py_FinalizeEx` — and under `[profile.release] panic = "abort"` that panic
**SIGABRTs the whole process** (exit -6), AFTER the Python code already ran to
completion. Symptom: an intermittent child-process abort at shutdown that
prints its result, then dies.

```rust
// BROKEN — bare attach in a Drop reachable from a tokio worker at teardown
impl Drop for GilDropPyObject {
    fn drop(&mut self) {
        Python::attach(|_py| {}); // panics->SIGABRT once Py_IsInitialized()==0
    }
}
```

### Canonical fix: route Drop-time GIL acquisition through `Python::try_attach`

`Python::try_attach` returns `None` (instead of panicking) when the interpreter
is uninitialized, finalizing (3.13+), or mid-GC-traverse. Once the interpreter
is gone the object storage is already reclaimed by CPython, so skipping the
decref is the ONLY safe action (a decref would be use-after-free) and is a
benign handle leak at process exit. Centralize it in one guarded helper
(`crate::gil::attach_if_initialized`) and route EVERY GIL-acquiring teardown
site through it — the callback wrappers AND the shared runtime-drop helper.

```rust
// CANONICAL — finalization-safe guard, no unsafe, no bare attach in any Drop
pub(crate) fn attach_if_initialized<F, R>(f: F) -> Option<R>
where F: for<'py> FnOnce(Python<'py>) -> R { Python::try_attach(f) }
```

**Which Drops are exposed:** any `Drop` that (a) acquires the GIL AND (b) can
run on a non-main / tokio-worker thread — callback wrappers captured into
subscription/drain tasks, and any shared runtime-drop helper (`drop(Runtime)`
under `py.detach`) the pyclass Drops delegate to. A pyclass Drop that only ever
runs on a GIL-holding thread (Python GC / `__del__`) is lower-risk but MUST
still route through the guard per scanner-symmetry (`zero-tolerance.md` 1a).

**Reproduction is teardown-timing-specific.** The abort needs a worker still
alive after finalization. A bus whose `Drop` does a plain `drop(Runtime)` JOINS
all workers before returning (callback dropped while the interpreter is still
live) and does NOT reproduce; the exposed shape is a `shutdown_timeout`/force-
abort teardown that can leave a worker detached to drop the callback post-
finalization. Reproduce against REAL infra (a real broker), not an in-memory
substitute — the in-memory path joins workers and hides the race.

Origin: the Rust SDK PR #1606 (2026-07-03) — intermittent SIGABRT in the
Behavioral-Parity `test_nats_unsubscribe_then_shutdown`; A/B against a real NATS
JetStream broker (release wheels): pre-fix 5/400 `unsub-then-shutdown` child
runs SIGABRT'd (-6), fixed 0/800. Guard applied to `GilDropPyObject`,
`PythonHandler`, `PythonSseGenerator`, `MiddlewareFnPlugin`, and
`drop_runtime_arc_safely`.

## Third class (PyO3): a Python callback on a tokio worker + GC = process abort

A DISTINCT bug from both check-then-use AND the finalization-time re-entry
above — it fires during NORMAL operation, not teardown. When a binding runs a
Python callback (an event-bus subscriber, a handler) DIRECTLY on a tokio
**worker** thread via `Python::attach`, CPython's cyclic GC can trigger on that
worker mid-callback (any allocation crosses a gen threshold while the worker
holds the GIL). A finalizer running DURING that GC executes a Rust `Drop`
(`tp_dealloc`) on the worker; if that Drop panics — e.g. a runtime-owning
pyclass whose `Runtime::drop` runs in a tokio context — PyO3 converts the
panic-in-`extern "C"` into a **bare `std::process::abort()`** and the process
dies with NO message (no Rust `panicked at`, no CPython assertion — just SIGABRT
exit 134). State-dependent: needs an accumulated GC-tracked object graph, so it
reproduces in a full test suite but NOT in isolation.

```rust
// BROKEN — handler runs the Python callback ON the tokio worker
Arc::new(move |event| Box::pin(async move {
    Python::attach(|py| { /* build dict; call the Py callback */ });  // GC can fire here, on the worker
}))
```

### Canonical fix: dispatch Python callbacks OFF the tokio worker pool

Route every callback through a single dedicated NON-tokio thread: the
worker-side handler does ZERO Python work (it hands `(Arc<GilDropPyObject>,
event)` to an `mpsc` channel via `Arc::clone` — no `Python::attach`), and one
process-lifetime dispatcher thread invokes the callback under the GIL. CPython
GC then never runs on a tokio worker, so no `tp_dealloc` ever executes in a
tokio context. The dispatcher parks on channel `recv` (not a socket), so it
cannot wedge `Py_FinalizeEx`; spawn-failure → drop the event, never run it on a
worker (correctness over delivery, fail-closed).

```rust
// CANONICAL — worker does no Python; dedicated thread owns the GIL work
if let Some(tx) = callback_dispatcher() {          // OnceLock<Sender>, spawned once
    let _ = tx.send(CallbackJob { callback: Arc::clone(&guarded), event });
}
Box::pin(async {})
```

**Diagnostic technique (how the class was pinned):** a bare abort resists
`RUST_BACKTRACE`. Install `std::panic::set_hook` at `#[pymodule]` init — if it
FIRES before the abort, it's a Rust panic (name the culprit from the
backtrace); if it stays SILENT, it's a C-level abort (CPython GC / a
PyO3-direct-abort), which redirects the fix away from the panic classes. Then
attribute pre-existing-vs-introduced by rebuilding with the suspect file
reverted to `main` and A/B-running the same repro. Verify the fix empirically:
the abort was 100% reproducible in the full suite → 0/8 after.

**Which dispatch sites are exposed:** any binding that runs a Python callback
on a tokio worker (`InMemoryEventBus` / NATS event dispatch, and — same class,
tracked follow-up — Nexus HTTP handlers). A callback bridged to a dedicated
thread (the `PyCallerEventStream` mpsc pattern) is already safe.

Origin: the Rust SDK #1610 / PR #1609 (2026-07-03, v4.24.2) — a `/redteam` fix
for the Second class above surfaced this deeper pre-existing abort; A/B against
`main` proved it independent of the teardown Drop. Fixed by rerouting
`make_python_event_handler` (shared by in-memory + NATS) through a dedicated
dispatcher thread.

## Structural gate: the concurrent-close stress test

The UAF is silent under unit tests — it crashes only when a concurrent closer (or
the finalizer under GC pressure) interleaves. Every handle wrapper MUST ship a
stress test racing method calls against `Close()` (and forcing GC where the runtime
allows). See `rules/testing.md` § "FFI Handle Wrappers Ship A Concurrent-Close
Stress Test" for the MUST clause this file backs.

```go
func TestSubscription_ConcurrentCancelAndClose(t *testing.T) {
    for i := 0; i < 100; i++ {
        s := newSubscription(t)
        var wg sync.WaitGroup
        for j := 0; j < 8; j++ {
            wg.Add(1)
            go func() { defer wg.Done(); _ = s.Cancel() }()
        }
        go s.Close()
        runtime.GC()                 // provoke the finalizer racer
        wg.Wait()
    }
}
```

## Review checklist (binding shards + redteam rounds)

1. Every method passing the raw handle into C routes through the `withHandle`
   equivalent (no bare `s.ptr` reads outside the mutex).
2. `Close` holds the SAME mutex across the free; flag CAS prevents double-free.
3. `KeepAlive`/`GC.KeepAlive` (where the runtime collects reachable-but-unused
   receivers) sits INSIDE the serialized window, after the C call.
4. The finalizer/Cleaner action takes the same path as `Close` (never a second,
   unserialized free).
5. The concurrent-close stress test exists and runs in CI (see
   `rules/testing.md` § "Every Test-Only / Canary Export Greps To A CI Invocation").
6. (PyO3) NO bare `Python::attach`/`with_gil` in any `impl Drop` — every
   GIL-acquiring teardown site (callback wrappers AND the shared runtime-drop
   helper) routes through the `Python::try_attach` guard. `grep -n
"Python::attach\|with_gil"` every file, classify each hit as active-method
   (fine) vs Drop/teardown-path (MUST be guarded).
7. (PyO3) NO Python callback runs on a tokio WORKER thread — event/handler
   dispatch that calls `Python::attach` inside a `tokio::spawn`ed task routes
   through a dedicated non-tokio dispatcher thread instead (Third class). Grep
   the handler-builder fns for `Python::attach`; a hit inside a spawned-task
   closure (vs a hand-off `tx.send`) is a finding.

Origin: journals 0174 (Go Subscription/EventBus UAF, canonical fix), 0175 G2
(GC-backstop parity reference shape), 0178 R3 HIGH (Go AlignEngine recurrence).
