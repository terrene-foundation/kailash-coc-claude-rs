# Streaming Responses

Real-time output streaming via `StreamingAgent` and `StreamHandler`.

## API

```python
from kailash.kaizen import StreamingAgent, StreamHandler

# Define a handler for streamed tokens
class MyHandler(StreamHandler):
    def on_token(self, token: str):
        print(token, end="", flush=True)

    def on_complete(self, result: dict):
        print("\nDone!")

# Create and run a streaming agent
agent = StreamingAgent(name="streamer", model=os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"))
handler = MyHandler()
agent.stream(input_data="Tell me a story", handler=handler)
```

## StreamingAgent

`StreamingAgent` extends `BaseAgent` with streaming support. Override `execute()` for custom logic, or use `stream()` for token-by-token output.

| Method                        | Description                                                 |
| ----------------------------- | ----------------------------------------------------------- |
| `stream(input_data, handler)` | Stream response tokens to the handler                       |
| `execute(input_data)`         | Standard non-streaming execution (inherited from BaseAgent) |
| `run(input_data)`             | Convenience method (inherited from BaseAgent, P17-002)      |

## StreamHandler

Subclass `StreamHandler` and override callback methods:

| Method                | Description                    |
| --------------------- | ------------------------------ |
| `on_token(token)`     | Called for each streamed token |
| `on_complete(result)` | Called when streaming finishes |

## References

- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
