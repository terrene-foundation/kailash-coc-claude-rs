# Streaming Responses

Real-time output streaming via CallerEvent (Rust) and TaodRunner (Python binding).

## Python Binding: TaodRunner Streaming (v3.5.0+)

### Setup

```python
from kailash.kaizen.streaming import TaodConfig, TaodRunner, CallerEventStream
from kailash.kaizen.streaming import AsyncCallerEventStream  # async for

# 1. Configure
config = TaodConfig(
    model="gpt-4",                         # required (read from env in practice)
    max_iterations=10,                      # default: 10
    timeout_secs=120,                       # default: 120
    system_prompt="You are a helpful assistant.",  # optional
)

# 2. Create runner (wraps an Agent instance)
runner = TaodRunner(agent, config)

# 3a. Blocking execution (returns final result dict)
result = runner.run("What is 2+2?")

# 3b. Streaming execution (returns CallerEventStream iterator)
for event in runner.run_stream("Explain quantum computing"):
    if event.event_type == "text_delta":
        print(event.text, end="")
    elif event.event_type == "tool_call_start":
        print(f"\n[calling {event.tool_name}...]")
    elif event.event_type == "tool_call_done":
        print(f"[{event.tool_name} done]")
    elif event.event_type == "iteration_start":
        print(f"--- Iteration {event.iteration} ---")
    elif event.event_type == "done":
        print(f"\nCompleted in {event.iterations} iterations")
    elif event.event_type == "error":
        print(f"Error: {event.error}")
```

### Async Streaming

```python
import asyncio
from kailash.kaizen.streaming import AsyncCallerEventStream

async def main():
    stream = runner.run_stream("Summarize the report")
    async for event in AsyncCallerEventStream(stream):
        if event.event_type == "text_delta":
            print(event.text, end="", flush=True)

    # Or use as context manager for cleanup:
    async with AsyncCallerEventStream(runner.run_stream("task")) as stream:
        async for event in stream:
            print(event.text if event.event_type == "text_delta" else "", end="")
```

### CallerEventWire Event Types

| `event_type`      | Key Fields                                   | Terminal? |
| ----------------- | -------------------------------------------- | --------- |
| `text_delta`      | `text`                                       | No        |
| `tool_call_start` | `tool_name`, `tool_id`, `arguments`          | No        |
| `tool_call_done`  | `tool_name`, `tool_id`, `result`, `is_error` | No        |
| `iteration_start` | `iteration` (u32)                            | No        |
| `done`            | `iterations`, `final_response`, `elapsed_ms` | Yes       |
| `error`           | `error` (string)                             | Yes       |

Streams always terminate with `done` or `error`. Concatenating all `text_delta.text` values reconstructs the full response.

### Signal Safety

`CallerEventStream.__next__()` uses `recv_timeout(100ms)` + Python signal checks to remain interruptible by Ctrl-C. Without this, a blocking `recv()` would swallow SIGINT.

### close() and Cleanup

```python
stream = runner.run_stream("task")
# Explicit close (drops the channel, stops the background TAOD task):
stream.close()

# Or rely on context manager:
with runner.run_stream("task") as stream:
    for event in stream:
        ...
# close() called automatically on exit
```

### Gotchas

1. `TaodRunner.run_stream()` returns a `CallerEventStream` -- a blocking Python iterator. Use `AsyncCallerEventStream` wrapper for asyncio.
2. `TaodConfig` fields are read-only after construction. Create a new config to change parameters.
3. `api_key` fields are redacted in `repr()` and `__str__()` -- only first 4 + last 4 chars shown.
4. The runner holds an `Arc<Runtime>` shared with the background TAOD task -- the runtime stays alive until both the runner and the task complete.

## Rust Streaming

Three entry points for Rust callers:

| Method                         | On          | Tool Loop | Per-Token |
| ------------------------------ | ----------- | --------- | --------- |
| `StreamingAgent::run_stream()` | `&self`     | No        | Yes (SSE) |
| `Agent::chat_stream()`         | `&mut self` | No        | Yes (SSE) |
| `TaodRunner::run_stream()`     | `self`      | Yes       | No        |

See `.claude/skills/04-kaizen/kaizen-agents-hydration-streaming.md` for full Rust API docs.

## References

- **Python tests**: `bindings/kailash-python/tests/test_taod_streaming.py`
- **Rust source**: `crates/kaizen-agents/src/streaming/`, `crates/kaizen-agents/src/agent_engine/taod.rs`
- **Examples**: `examples/1-single-agent/streaming-chat/`
