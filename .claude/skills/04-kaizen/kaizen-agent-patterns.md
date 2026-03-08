# Agent Patterns

Kaizen provides agent building blocks via `kailash.kaizen`. The Python binding exposes Rust-backed types for tools, memory, checkpoints, and a `BaseAgent` class for custom agents.

## What Works from Python

| Component                  | Status                                                                                                  | Import                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `BaseAgent`                | Subclassable; override `execute()`. Has `run()`, `extract_str()`, `extract_dict()`, `write_to_memory()` | `from kailash.kaizen import BaseAgent`                        |
| `ToolRegistry` + `ToolDef` | Fully functional                                                                                        | `from kailash.kaizen import ToolRegistry, ToolDef, ToolParam` |
| `LlmClient`                | Functional (bridges to Rust)                                                                            | `from kailash.kaizen import LlmClient`                        |
| `SessionMemory`            | Rust methods: `store()`, `recall()`, `remove()`                                                         | `from kailash.kaizen import SessionMemory`                    |
| `SharedMemory`             | Rust methods: `store()`, `recall()`, `remove()`                                                         | `from kailash.kaizen import SharedMemory`                     |
| `AgentCheckpoint`          | Constructor: `(agent_name, model)`                                                                      | `from kailash.kaizen import AgentCheckpoint`                  |
| `CostTracker`              | Standalone tracking (not integrated with BaseAgent)                                                     | `from kailash.kaizen import CostTracker`                      |

> **Note**: `BaseAgent.execute()` raises `NotImplementedError` by default — override it in your subclass. Convenience methods `run()`, `extract_str()`, `extract_dict()`, and `write_to_memory()` are available on `BaseAgent` (added in P17-002).

> **Known Issue (Blocker B3)**: `OrchestrationRuntime.run()` is a stub — returns static config instead of executing agents. Multi-agent orchestration is non-functional.

> **Known Issue (C5)**: `.pyi` stubs declare `set()`/`get()`/`delete()` on SessionMemory/SharedMemory, but Rust implements `store()`/`recall()`/`remove()`. Use the Rust method names.

## Custom Agent Pattern

```python
import os
from kailash.kaizen import BaseAgent

class MyAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="my-agent", model=os.environ.get("LLM_MODEL"))

    def execute(self, input_text: str) -> dict:
        # Override execute() with your own logic
        return {"response": f"Processed: {input_text}"}

# Convenience methods available on BaseAgent (P17-002):
# agent.run(input_text)        — calls execute() and returns result
# agent.extract_str(result)    — extract string from result dict
# agent.extract_dict(result)   — extract dict from result dict
# agent.write_to_memory(k, v)  — write to agent memory
```

## Tool Registration

```python
from kailash.kaizen import ToolRegistry, ToolDef, ToolParam

def search_impl(args):
    return {"results": f"Results for: {args['query']}"}

tools = ToolRegistry()
tools.register(ToolDef(
    name="search",
    description="Search the web",
    handler=search_impl,
    params=[ToolParam(name="query", required=True)]
))
```

## Memory (Correct Method Names)

```python
from kailash.kaizen import SessionMemory, SharedMemory

# Session-scoped memory
session = SessionMemory()
session.store("key", "value")      # NOT set()
val = session.recall("key")        # NOT get()
session.remove("key")              # NOT delete()

# Shared across agents
shared = SharedMemory()
shared.store("shared_key", {"data": 123})
val = shared.recall("shared_key")
```

## Reasoning Patterns (Conceptual)

These patterns are implementable using `BaseAgent` + custom `execute()`:

| Pattern              | Description                    | Implementation                             |
| -------------------- | ------------------------------ | ------------------------------------------ |
| **Chain-of-Thought** | Step-by-step reasoning         | Custom `execute()` with structured prompts |
| **ReAct**            | Reason + Act interleaving      | Custom `execute()` with tool calls         |
| **RAG**              | Retrieval-augmented generation | Custom `execute()` + vector search         |

> **Note**: Pipeline factory methods (`Pipeline.sequential()`, `Pipeline.router()`, etc.) referenced in older docs do NOT exist in the Python binding. Multi-agent coordination requires custom Python orchestration until Blocker B3 is resolved.

## References

- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Binding audit**: See blocker B3 in binding audit for current status
