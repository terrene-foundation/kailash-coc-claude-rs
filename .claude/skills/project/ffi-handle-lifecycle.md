---
description: "FFI handle lifecycle: check-then-use UAF class, mutex-serialized close window per runtime (Go/Java/.NET/Ruby/Node), concurrent-close stress fixture, review checklist."
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

Origin: journals 0174 (Go Subscription/EventBus UAF, canonical fix), 0175 G2
(GC-backstop parity reference shape), 0178 R3 HIGH (Go AlignEngine recurrence).
