---
name: kaizen-checkpoint
description: "Checkpoint, resume, and interrupt for Kaizen agents. Use when asking about 'checkpoint', 'agent resume', 'agent state', 'save agent', 'restore agent', 'CheckpointStorage', 'AgentInterrupt', 'graceful shutdown', or 'interrupt callback'."
---

# Kaizen Checkpoint/Resume & Interrupt

Persist and restore agent state with `AgentCheckpoint` and storage backends. Interrupt running agents gracefully with `AgentInterrupt`. This supplements the [kaizen-checkpoint-resume](kaizen-checkpoint-resume.md) skill with additional patterns and interrupt details.

## AgentCheckpoint

A serializable snapshot of an agent's state at a point in time.

```python
from kailash import AgentCheckpoint

# Create a checkpoint (auto-generates ID)
checkpoint = AgentCheckpoint("researcher", "model-name")

# Properties
print(checkpoint.checkpoint_id)    # Auto-generated UUID
print(checkpoint.agent_name)       # "researcher"
print(checkpoint.model)            # "model-name"
print(checkpoint.created_at)       # ISO 8601 timestamp

# Mutable properties (None by default, NOT empty dicts)
checkpoint.memory_snapshot = {"context": "market research"}
checkpoint.tool_state = {"last_tool": "search"}
checkpoint.metadata = {"progress": 0.5, "step": "analysis"}

# Serialize to JSON string
data = checkpoint.to_json()
```

**IMPORTANT**: `memory_snapshot`, `tool_state`, and `metadata` are `None` by default, not empty dicts.

## InMemoryCheckpointStorage

Dict-backed storage for testing and development. Data is lost when the process exits.

```python
import os
from kailash import AgentCheckpoint, InMemoryCheckpointStorage

storage = InMemoryCheckpointStorage()

# Save a checkpoint (returns UUID)
checkpoint = AgentCheckpoint("assistant", os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"))
checkpoint.memory_snapshot = {"key": "value"}
checkpoint_id = storage.save(checkpoint)

# Load by checkpoint_id (UUID from save())
restored = storage.load(checkpoint_id)
# Raises RuntimeError if not found (does NOT return None)

# List all checkpoints for an agent
checkpoints = storage.list("assistant")

# Delete by checkpoint_id (UUID)
storage.delete(checkpoint_id)
```

**IMPORTANT**: `storage.load()` raises `RuntimeError` when checkpoint not found. It does NOT return `None`.

## FileCheckpointStorage

JSON file-backed storage. Each checkpoint is stored as `{base_dir}/{checkpoint_id}.json`.

```python
import os
from kailash import AgentCheckpoint, FileCheckpointStorage

storage = FileCheckpointStorage("/tmp/agent-checkpoints")

# Save (returns UUID)
checkpoint = AgentCheckpoint("researcher", os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"))
checkpoint.metadata = {"task": "market research"}
checkpoint_id = storage.save(checkpoint)

# Load by checkpoint_id (UUID from save())
restored = storage.load(checkpoint_id)

# List all checkpoints for an agent
checkpoints = storage.list("researcher")

# Delete by checkpoint_id (UUID)
storage.delete(checkpoint_id)
```

## AgentInterrupt

Thread-safe interrupt mechanism for graceful agent shutdown, with callbacks and chaining.

```python
from kailash import AgentInterrupt

interrupt = AgentInterrupt()

# Check state
assert not interrupt.is_interrupted

# Fire the interrupt
interrupt.request_interrupt()
assert interrupt.is_interrupted

# Clear the interrupt (resets flag)
interrupt.clear()
assert not interrupt.is_interrupted

# Graceful shutdown -- fires the interrupt after timeout
interrupt.request_graceful_shutdown(timeout_secs=30.0)

# Chain interrupts -- when parent fires, child also fires
parent = AgentInterrupt()
child = AgentInterrupt()
parent.chain(child)
parent.request_interrupt()
assert child.is_interrupted
```

### Key Behaviors

- **Fire-once**: Once interrupted, subsequent `request_interrupt()` calls are no-ops
- **Chaining**: `parent.chain(child)` -- when parent fires, child fires too
- **Graceful shutdown**: `request_graceful_shutdown(timeout_secs)` spawns a thread that waits then fires
- **`is_interrupted`**: Property (not method) -- returns `bool`

## Integration Pattern

```python
import os
from kailash import AgentCheckpoint, InMemoryCheckpointStorage, AgentInterrupt

# Setup
storage = InMemoryCheckpointStorage()
interrupt = AgentInterrupt()

# Save agent state after each task completion
def save_agent_state(agent_name, model, memory):
    checkpoint = AgentCheckpoint(agent_name, model)
    checkpoint.memory_snapshot = memory
    return storage.save(checkpoint)  # Returns checkpoint_id (UUID)


# Resume from most recent checkpoint for an agent
def resume_agent(agent_name):
    checkpoints = storage.list(agent_name)
    if checkpoints:
        checkpoints.sort(key=lambda c: c.created_at, reverse=True)
        return checkpoints[0]
    return None


# Interrupt-aware agent loop
def agent_loop(agent_name, model):
    step = 0
    while not interrupt.is_interrupted:
        # Do work...
        step += 1
        save_agent_state(agent_name, model, {"progress": step})

    print(f"Agent interrupted at step {step}")
```

## Comparison with kaizen-checkpoint-resume

This skill (`kaizen-checkpoint.md`) and `kaizen-checkpoint-resume.md` cover overlapping topics:

| Topic                        | This skill     | kaizen-checkpoint-resume |
| ---------------------------- | -------------- | ------------------------ |
| AgentCheckpoint              | Yes            | Yes                      |
| InMemoryCheckpointStorage    | Yes            | Yes                      |
| FileCheckpointStorage        | Yes            | Yes                      |
| AgentInterrupt               | Yes (detailed) | Yes (basic)              |
| Known issues (None defaults) | Yes            | No                       |
| Integration patterns         | Yes            | Yes                      |

## Key Points

- **`AgentCheckpoint(agent_name, model)`** -- constructor takes two positional strings: agent_name and model
- **`storage.save(checkpoint)`** -- returns checkpoint_id (UUID)
- **`storage.load(checkpoint_id)`** -- takes UUID from save(), raises `RuntimeError` if not found (NOT None)
- **`storage.list(agent_name)`** -- lists checkpoints for an agent
- **`storage.delete(checkpoint_id)`** -- takes UUID from save()
- **`memory_snapshot`/`tool_state`/`metadata`** -- are `None` by default, not empty dicts
- **`AgentInterrupt.is_interrupted`** -- is a property, not a method
- **Chaining**: Parent interrupt cascades to children

<!-- Trigger Keywords: checkpoint, agent resume, restore agent, save agent, agent state, CheckpointStorage, InMemoryCheckpointStorage, FileCheckpointStorage, AgentCheckpoint, AgentInterrupt, graceful shutdown, interrupt -->
