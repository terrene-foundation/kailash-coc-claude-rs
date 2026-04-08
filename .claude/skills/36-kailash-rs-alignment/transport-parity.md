# Transport Parity — Intentional Python↔Rust Divergence

## Deliberate Differences

The Python and Rust SDKs intentionally diverge in transport architecture. This is not a bug — each SDK optimizes for its language's strengths.

| Abstraction           | Python SDK                            | Rust SDK                                        | Reason                                                                |
| --------------------- | ------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| **Transport count**   | 5 (HTTP, CLI, MCP, WebSocket, SSE)    | 4 (HTTP, CLI, MCP, WebSocket)                   | SSE is HTTP chunked-transfer in Rust — no separate abstraction needed |
| **BackgroundService** | `asyncio.create_task` + `janus.Queue` | `tokio::spawn` + `tokio::sync::mpsc`            | Language-native async primitives                                      |
| **EventBus**          | `janus.Queue` (cross-thread GIL-safe) | `DomainEventBus` (lock-free `tokio::broadcast`) | Python needs GIL safety; Rust has native concurrency                  |
| **Scheduler**         | `BackgroundService` timer task        | `tokio::time::interval` task                    | Same pattern, language-native implementation                          |

## Do NOT "Fix" These Divergences

Future contributors may see the mismatch and attempt to align them. This would degrade performance on both sides. Each implementation is correct for its runtime model.

## EventBus Semantics

### Python (`kailash.core.EventBus`)

- Uses `janus.Queue` for thread safety (MCP runs in separate thread)
- DataFlow EventBus is separate from Nexus EventBus
- Bridge: `app.integrate_dataflow()` connects them

### Rust (`kailash_core::DomainEventBus`)

- Lock-free `tokio::broadcast` channel
- All frameworks share one bus (no bridge needed — Rust has no GIL)
- Subscribers filter by `DomainEvent` type

## BackgroundService

### Python

```python
class BackgroundService:
    async def start(self):
        self._task = asyncio.create_task(self._run())
    async def _run(self):
        while not self._shutdown.is_set():
            await asyncio.sleep(self.interval)
            await self.tick()
```

### Rust

```rust
impl BackgroundService {
    pub fn spawn(self) -> JoinHandle<()> {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(self.period);
            loop {
                interval.tick().await;
                self.tick().await;
            }
        })
    }
}
```

## Shared Patterns (Must Stay Aligned)

These patterns MUST remain aligned across SDKs:

| Pattern              | Contract                                                                        |
| -------------------- | ------------------------------------------------------------------------------- |
| Handler registration | `@app.handler()` (Py) / `app.handler()` (Rs) — same decorator/builder semantics |
| Channel multiplexing | Same handler serves HTTP + CLI + MCP without code changes                       |
| Session management   | Unified session across channels, same session ID format                         |
| Middleware ordering  | Same order: auth → rate-limit → audit → handler                                 |
