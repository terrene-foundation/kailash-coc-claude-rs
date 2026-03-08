---
name: kaizen-memory
description: "Agent memory system for Kaizen. Use when asking about agent memory, SessionMemory, SharedMemory, PersistentMemory, memory backends, store, recall, remove, or persistent storage."
---

# Kaizen Memory: Agent Memory System

The memory system provides key-value storage for agents during execution and across multi-agent orchestrations.

## Memory Types

| Type               | Backing            | Use Case                         |
| ------------------ | ------------------ | -------------------------------- |
| `SessionMemory`    | In-memory dict     | Single-agent session storage     |
| `SharedMemory`     | In-memory dict     | Multi-agent concurrent access    |
| `PersistentMemory` | File (JSON/SQLite) | Cross-session persistent storage |

## Method Names

**IMPORTANT**: The correct method names are `store()`, `recall()`, `remove()`. NOT `set()`/`get()`/`delete()`.

| Method              | Description                                  |
| ------------------- | -------------------------------------------- |
| `store(key, value)` | Store a value under a key                    |
| `recall(key)`       | Retrieve a value (returns None if not found) |
| `remove(key)`       | Remove a key                                 |
| `keys()`            | List all keys                                |
| `clear()`           | Clear all data                               |

## SessionMemory

In-memory session-scoped storage. Data is lost when the process exits.

```python
from kailash.kaizen import SessionMemory

mem = SessionMemory()

# Store values
mem.store("user_name", "Alice")
mem.store("context", {"topic": "researching Rust"})

# Retrieve values
name = mem.recall("user_name")
# name == "Alice"

missing = mem.recall("nonexistent")
# missing is None

# List keys
keys = mem.keys()
# keys: ["user_name", "context"]

# Remove a key
mem.remove("context")

# Clear all
mem.clear()
```

## SharedMemory

Thread-safe shared memory for multi-agent coordination. Same API as `SessionMemory`.

```python
from kailash.kaizen import SharedMemory

shared = SharedMemory()

# Agent 1 writes research findings
shared.store("research", "key findings...")

# Agent 2 reads them
findings = shared.recall("research")
assert findings is not None
```

### Multi-Agent Pattern

```python
from kailash.kaizen import SharedMemory, BaseAgent

shared = SharedMemory()

class ResearchAgent(BaseAgent):
    name = "researcher"

    def execute(self, input_text: str) -> dict:
        findings = f"Research on: {input_text}"
        shared.store("research_findings", findings)
        return {"response": findings}


class WriterAgent(BaseAgent):
    name = "writer"

    def execute(self, input_text: str) -> dict:
        findings = shared.recall("research_findings") or "No findings"
        return {"response": f"Article based on: {findings}"}


researcher = ResearchAgent()
writer = WriterAgent()

researcher.run("AI safety")
result = writer.run("Write article")
```

## PersistentMemory

Cross-session persistent memory backed by file storage. Data survives process restarts. Every mutation is automatically flushed to disk.

```python
from kailash.kaizen import PersistentMemory

# JSON-backed (default)
mem = PersistentMemory("/tmp/agent-memory.json")

# SQLite-backed
mem = PersistentMemory("/tmp/agent-memory.db", format="sqlite")

# Same API as SessionMemory
mem.store("key", "value")
val = mem.recall("key")
mem.remove("key")
mem.clear()
```

## Memory with BaseAgent

```python
from kailash.kaizen import BaseAgent, SessionMemory

class MemoryAgent(BaseAgent):
    name = "memory-agent"

    def execute(self, input_text: str) -> dict:
        # Store context
        self.memory.store("last_input", input_text)

        # Recall previous context
        previous = self.memory.recall("last_input")

        return {"response": f"Current: {input_text}, Previous: {previous}"}


agent = MemoryAgent()
agent.set_memory(SessionMemory())

agent.run("First message")
result = agent.run("Second message")
# Memory retains "First message" from previous call
```

## Key Points

- **`store()`/`recall()`/`remove()`** -- correct method names (NOT set/get/delete)
- **`recall()` returns None** if key not found (does not raise)
- **`SessionMemory`** -- ephemeral, for single-agent sessions
- **`SharedMemory`** -- for multi-agent coordination, same process
- **`PersistentMemory`** -- survives restarts, auto-flushes to disk
- All memory types support arbitrary Python values (serialized internally)

<!-- Trigger Keywords: memory, SessionMemory, SharedMemory, PersistentMemory, agent storage, store, recall, remove, shared memory, multi-agent memory -->
