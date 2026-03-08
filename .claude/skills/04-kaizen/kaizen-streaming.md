# Kaizen Streaming: Token-by-Token LLM Responses

The streaming module wraps agents to deliver LLM responses token-by-token via a callback interface.

## API

```python
from kailash import (
    StreamHandler, StreamingAgent, TokenCollector,
    ChannelStreamHandler, StreamEvent,
    Agent, AgentConfig, LlmClient,
)

# --- StreamHandler (subclassable) ---
class MyHandler(StreamHandler):
    def __init__(self):
        super().__init__()
        self.tokens = []

    def on_token(self, token):
        self.tokens.append(token)

    def on_end(self, full_text):
        print(f"Complete: {full_text}")

# --- TokenCollector ---
collector = TokenCollector()
# After streaming:
print(collector.full_text)    # property, not method
print(collector.token_count)  # property
collector.reset()

# --- ChannelStreamHandler ---
handler = ChannelStreamHandler()
# After streaming:
for event in handler.events:      # property, list of StreamEvent
    if event.is_token:
        print(event.text)
print(handler.event_count)        # property

# --- StreamEvent (factory methods) ---
event = StreamEvent.token("hello")
event = StreamEvent.start()
event = StreamEvent.end("full text")
event = StreamEvent.error("oops")
# Properties: is_token, is_start, is_end, is_error, text

# --- StreamingAgent ---
import os
config = AgentConfig(model=os.environ.get("LLM_MODEL", "gpt-4o"))
client = LlmClient.mock(responses=["Hello world!"])
agent = Agent(config, client)

collector = TokenCollector()
streaming = StreamingAgent(agent, handler=collector)
result = streaming.run("Hello")       # dict with response, iterations, etc.
print(collector.full_text)

# handler can be: TokenCollector, ChannelStreamHandler, MyHandler (subclass), or None
streaming = StreamingAgent(agent)      # No handler
streaming = StreamingAgent(agent, handler=MyHandler())

# Property
print(streaming.model)  # str
```

## StreamHandler Trait

Callback interface for processing streaming LLM tokens. All methods have default no-op implementations.

- `on_start()` -- called when the stream begins
- `on_token(token)` -- called for each token chunk
- `on_end(full_text)` -- called when the stream completes
- `on_error(error)` -- called if the stream fails

## StreamingAgent

Wraps an `Agent` and streams its LLM responses.

### Lifecycle

1. `on_start()` -- called after the first token arrives
2. `on_token(token)` -- called for each token chunk
3. `on_end(full_text)` -- called when the stream completes, with the full accumulated text
4. `on_error(error)` -- called if the stream fails (no `on_start`/`on_end` in this case)

If the response is empty (no tokens), `on_start()` and `on_end("")` are both called.

## TokenCollector

A StreamHandler that accumulates all tokens into a string. Thread-safe.

```python
collector = TokenCollector()
# Use as handler in StreamingAgent
# After streaming:
assert collector.full_text == "Hello world"
assert collector.token_count == 2
collector.reset()  # Reset for reuse
```

## ChannelStreamHandler

A StreamHandler that collects all events as StreamEvent objects.

```python
handler = ChannelStreamHandler()
# After streaming:
events = handler.events  # list of StreamEvent
assert len(events) == 4  # Start, Token, Token, End
assert events[0].is_start
assert events[1].is_token
handler.push_raw_error("connection lost")
```

## StreamEvent

Enum representing streaming lifecycle events.

```python
event = StreamEvent.token("hello")
assert event.is_token
assert event.text == "hello"

# Text for each variant:
# start  -> ""
# token  -> the token string
# end    -> full accumulated text
# error  -> error message
```

<!-- Trigger Keywords: streaming, StreamingAgent, StreamHandler, TokenCollector, ChannelStreamHandler, StreamEvent, token streaming, on_token, stream LLM -->
