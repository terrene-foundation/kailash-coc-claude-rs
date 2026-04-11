---
name: hydration-streaming
description: "Tool hydration for progressive tool disclosure and CallerEvent streaming for incremental agent output. Use when asking about ToolHydrator, search_tools, hydrate_registry, CallerEvent, CallerEventStream, run_stream, chat_stream, progressive tool disclosure, or agent event streaming."
---

# Tool Hydration and Caller Event Streaming

Two features in `kaizen-agents` for scaling agent tool sets and delivering real-time execution events to callers.

## Tool Hydration (#92)

When agents have 100+ tools, sending all schemas to the LLM wastes context tokens. The `ToolHydrator` controls which tool schemas are sent, reducing from O(all) to O(active + hydrated).

### Architecture

```
ToolRegistry (all 600 tools, for execution via .get())
       |
       v
DefaultToolHydrator (TF-IDF index over names + descriptions)
  ├── always_active: {read_file, search_tools}     -> always sent
  ├── hydrated: {migrate_db, create_table}          -> found via search
  └── deferred: {595 other tools}                   -> available, not sent
       |
       v
get_active_tools() -> Vec<ToolDef>  (only ~20 instead of 600)
```

Tool **execution** always goes through `ToolRegistry::get()` -- the hydrator only controls what the LLM **sees**.

### Setup

```rust
use std::collections::HashSet;
use kaizen_agents::hydration::{hydrate_registry, ToolHydratorConfig};
use kailash_kaizen::agent::tools::ToolRegistry;

let mut registry = ToolRegistry::new();
// ... register all tools ...

let config = ToolHydratorConfig {
    always_active: HashSet::from(["read_file".into(), "execute_code".into()]),
    max_hydrated: 50,         // FIFO eviction when exceeded
    auto_include_search_tool: true, // registers search_tools meta-tool
};

let hydrator = hydrate_registry(&mut registry, config);

// Wire into agent
let agent = Agent::new(agent_config, llm)?
    .with_tools(registry)
    .with_hydrator(hydrator);
```

### Key Types

| Type                          | Location              | Purpose                                                      |
| ----------------------------- | --------------------- | ------------------------------------------------------------ |
| `ToolHydrator` trait          | `hydration/mod.rs`    | `get_active_tools()`, `search()`, `hydrate()`, `dehydrate()` |
| `DefaultToolHydrator`         | `hydration/search.rs` | TF-IDF-based implementation with DashSet + Mutex             |
| `ToolHydratorConfig`          | `hydration/mod.rs`    | `always_active`, `max_hydrated`, `auto_include_search_tool`  |
| `ToolSearchResult`            | `hydration/mod.rs`    | `name`, `description`, `relevance: f64`                      |
| `resolve_tools_for_request()` | `hydration/mod.rs`    | Shared helper used by Agent, TaodRunner, ToolCallingAgent    |

### search_tools Meta-Tool

Auto-registered when `auto_include_search_tool: true`. The LLM calls it to discover tools:

```
Round 1: LLM sees [read_file, execute_code, search_tools] (3 tools)
  LLM calls: search_tools(query="database migration", limit=5)
  -> Returns: [{name: "migrate_db", description: "...", relevance: 0.85}, ...]
  -> Auto-hydrates results into active set

Round 2: LLM sees [read_file, execute_code, search_tools, migrate_db, ...] (8 tools)
  LLM calls: migrate_db(...)
```

### Gotchas

1. **Snapshot timing**: `hydrate_registry()` snapshots all tools at call time. Register ALL tools BEFORE calling it.
2. **max_hydrated >= 1**: Enforced automatically (`.max(1)`). Zero would break the search_tools contract.
3. **Limit capped at 100**: The meta-tool clamps positive limits to 100. Negative/zero defaults to 10.
4. **Interior mutability**: `ToolsStore` behind `Mutex` allows `append_tool()` after Arc wrapping.
5. **search_tools visibility**: `mark_always_active("search_tools")` + `append_tool()` ensure it appears in `get_active_tools()`.

### Integration Points

All three agent types support hydrators:

- `Agent::with_hydrator(Arc<dyn ToolHydrator>)`
- `TaodRunner::with_hydrator(Arc<dyn ToolHydrator>)`
- `ToolCallingAgent::with_hydrator(Arc<dyn ToolHydrator>)`

When no hydrator is set (`None`), behavior is unchanged: all tools sent to LLM.

---

## Caller Event Streaming (#91)

Callers previously received complete `AgentResult`/`TaodResult`. Now they can consume events incrementally via `Stream<Item = CallerEvent>`.

### CallerEvent Enum

```rust
pub enum CallerEvent {
    TextDelta(String),                                    // Incremental text chunk
    ToolCallStart { name, id, arguments },                // Tool execution started
    ToolCallDelta { index, name, id, arguments_delta },   // Streaming argument fragment
    ToolCallDone { name, id, result, is_error },          // Tool execution completed
    IterationStart { iteration: u32 },                    // TAOD loop iteration
    Done(TaodResult),                                     // Terminal: success
    BudgetExhausted { budget_usd, consumed_usd },         // Terminal: cost limit hit
    Error(AgentError),                                    // Terminal: failure
}
pub type CallerEventStream = Pin<Box<dyn Stream<Item = CallerEvent> + Send>>;
```

Streams always terminate with `Done`, `BudgetExhausted`, or `Error`. Concatenating all `TextDelta` payloads reconstructs the full response. Concatenating all `ToolCallDelta` payloads for a given `index` reconstructs the full tool-call arguments JSON.

### Three Streaming Entry Points

| Method                         | On          | Ownership | Tool Loop | Per-Token                    |
| ------------------------------ | ----------- | --------- | --------- | ---------------------------- |
| `StreamingAgent::run_stream()` | `&self`     | Borrows   | No        | Yes (real SSE)               |
| `Agent::chat_stream()`         | `&mut self` | Borrows   | No        | Yes (real SSE)               |
| `TaodRunner::run_stream()`     | `self`      | Consumes  | Yes       | No (full text per iteration) |

### StreamingAgent::run_stream()

Single-shot, real per-token streaming. Best for UI display.

```rust
use futures_util::StreamExt;
use kaizen_agents::streaming::{StreamingAgent, CallerEvent};

let streaming = StreamingAgent::new(agent, handler);
let mut stream = streaming.run_stream("Explain quantum computing");

while let Some(event) = stream.next().await {
    match event {
        CallerEvent::TextDelta(text) => print!("{text}"),
        CallerEvent::Done(result) => println!("\nDone in {:?}", result.elapsed),
        CallerEvent::Error(err) => eprintln!("Error: {err}"),
        _ => {}
    }
}
```

### Agent::chat_stream()

Stateful conversation streaming. Records user turn; caller must record assistant turn.

```rust
let mut stream = agent.chat_stream("What's the weather?");
let mut full_text = String::new();

while let Some(event) = stream.next().await {
    if let CallerEvent::TextDelta(text) = &event {
        full_text.push_str(text);
    }
}

// IMPORTANT: caller must record the assistant turn
agent.push_assistant_turn(&full_text);
```

### TaodRunner::run_stream()

Full TAOD loop with tool lifecycle events. Consumes the runner.

```rust
let runner = TaodRunner::new(llm, tools, memory, config);
let mut stream = runner.run_stream("Find and summarize the latest reports");

while let Some(event) = stream.next().await {
    match event {
        CallerEvent::IterationStart { iteration } => println!("--- Iteration {iteration} ---"),
        CallerEvent::TextDelta(text) => print!("{text}"),
        CallerEvent::ToolCallStart { name, .. } => println!("[calling {name}...]"),
        CallerEvent::ToolCallDone { name, is_error, .. } => {
            println!("[{name} {}]", if is_error { "FAILED" } else { "done" });
        }
        CallerEvent::Done(result) => {
            println!("\nCompleted in {} iterations", result.iterations);
        }
        CallerEvent::Error(err) => eprintln!("Error: {err}"),
    }
}
```

### Implementation Details

- **Channel**: `tokio::sync::mpsc::channel(256)` bounded, backpressure via send().await
- **Receiver drop**: Spawned task checks `tx.send().is_err()` and exits cleanly
- **Handler bridge**: `StreamingAgent::run_stream()` forwards to `StreamHandler` callbacks too
- **TaodRunner Think phase**: Uses `llm.complete()` (non-streaming) because tool call data needs structured response. Text yielded as single TextDelta per iteration.
- **chat_stream() footgun**: User turn recorded before spawn, assistant turn NOT recorded. Caller MUST call `push_assistant_turn()` after stream completes.

### Gotchas

1. **TaodRunner::run_stream(self)** consumes `self` (single-use by design). `run(&mut self)` borrows.
2. **No Clone on CallerEvent** — `AgentError` doesn't implement Clone.
3. **Terminal event contract** — streams always end with `Done` or `Error` (unless the spawned task panics, in which case the stream ends with `None`).
4. **Backward compatibility** — `StreamHandler` callbacks still work alongside `CallerEvent` in `StreamingAgent::run_stream()`.

## Wire Types for Transport

`CallerEvent` cannot derive `Serialize` (because `AgentError` doesn't impl it). For SSE/WebSocket/gRPC transport, use the serializable mirror types:

```rust
use kaizen_agents::streaming::caller_event::{CallerEventWire, TaodResultWire};

// Convert CallerEvent → CallerEventWire for JSON transport
let wire = CallerEventWire::from(&event);
let json = serde_json::to_string(&wire)?;

// Parse JSON → CallerEventWire
let wire: CallerEventWire = serde_json::from_str(&json)?;
```

| Wire Type         | Mirrors       | JSON tag                    | Key fields                                                 |
| ----------------- | ------------- | --------------------------- | ---------------------------------------------------------- |
| `CallerEventWire` | `CallerEvent` | `{"type": "text_delta", …}` | 6 variants, tagged via `#[serde(tag = "type")]`            |
| `TaodResultWire`  | `TaodResult`  | embedded in `Done` variant  | `final_response`, `iterations`, `tool_calls`, `elapsed_ms` |

### Language Bindings

All 7 bindings expose CallerEventWire and TaodResultWire as data types with `to_json`/`from_json` methods:

- **Python**: `CallerEventWire.text_delta("hi")`, `.to_dict()`, `.from_dict(d)`, `.to_json()`
- **Ruby**: `Kailash::Kaizen::CallerEventWire.text_delta("hi")`, `.to_json`, `.from_json(s)`
- **Node.js**: `new CallerEventWire()`, `.toJson()`, `CallerEventWire.fromJson(s)`
- **WASM**: `WasmCallerEventWire`, `.toJson()`, `WasmCallerEventWire.fromJson(s)`
- **C ABI**: `kailash_caller_event_wire_text_delta()` → JSON string
- **Go/Java**: Pure data structs matching the wire JSON format

## Python Binding: TaodRunner (v3.5.0+)

The Python binding wraps the Rust `TaodRunner` with signal-safe streaming and async support.

### Types

| Python Type              | Rust Backing          | Purpose                                               |
| ------------------------ | --------------------- | ----------------------------------------------------- |
| `TaodConfig`             | `PyTaodConfig`        | Immutable configuration (model, max_iterations, etc.) |
| `TaodRunner`             | `PyTaodRunner`        | Wraps Agent, provides `run()` and `run_stream()`      |
| `CallerEventStream`      | `PyCallerEventStream` | Blocking iterator (`__iter__`/`__next__`)             |
| `AsyncCallerEventStream` | Pure Python           | `async for` wrapper via `run_in_executor`             |
| `CallerEventWire`        | `PyCallerEventWire`   | Serializable event (used by both Rust and Python)     |

### Import

```python
from kailash.kaizen.streaming import TaodConfig, TaodRunner
from kailash.kaizen.streaming import CallerEventStream, AsyncCallerEventStream
from kailash.kaizen.streaming import CallerEventWire, TaodResultWire
```

### Key Patterns

- `TaodConfig(model=..., max_iterations=10, timeout_secs=120, system_prompt=...)` -- all fields read-only after construction
- `TaodRunner(agent, config).run("prompt")` -- blocking, returns dict
- `TaodRunner(agent, config).run_stream("prompt")` -- returns `CallerEventStream`
- `CallerEventStream.__next__()` uses `recv_timeout(100ms)` + `PyErr::CheckSignals` for Ctrl-C safety
- `CallerEventStream.close()` drops the channel, stops background TAOD task
- `AsyncCallerEventStream(sync_stream)` -- `async for` via `loop.run_in_executor`
- `api_key` fields redacted in `repr()`/`__str__()` -- security hardening

See `.claude/skills/04-kaizen/kaizen-streaming.md` for full Python usage examples.

## Source Files

```
crates/kaizen-agents/src/
  hydration/
    mod.rs              # ToolHydrator trait, config, hydrate_registry(), resolve_tools_for_request()
    search.rs           # DefaultToolHydrator, TF-IDF index, ToolsStore
    meta_tool.rs        # search_tools meta-tool
  streaming/
    caller_event.rs     # CallerEvent enum, CallerEventStream type, CallerEventWire, TaodResultWire
    agent.rs            # StreamingAgent::run_stream()
  agent_engine/
    concrete.rs         # Agent::chat_stream(), push_assistant_turn(), with_hydrator()
    taod.rs             # TaodRunner::run_stream(), with_hydrator()
  agents/
    tool_calling.rs     # ToolCallingAgent::with_hydrator()
bindings/kailash-python/src/kaizen/
  streaming.rs          # PyTaodConfig, PyTaodRunner, PyCallerEventStream (PyO3)
bindings/kailash-python/python/kailash/kaizen/
  streaming.py          # AsyncCallerEventStream (pure Python async wrapper)
```

<!-- Trigger Keywords: tool hydration, ToolHydrator, DefaultToolHydrator, hydrate_registry, search_tools, CallerEvent, CallerEventStream, run_stream, chat_stream, push_assistant_turn, progressive disclosure, tool search, TF-IDF, agent streaming, event stream -->
