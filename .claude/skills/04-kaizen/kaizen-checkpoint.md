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
checkpoint = AgentCheckpoint("researcher", step=0)

# Properties
print(checkpoint.agent_id)         # "researcher"
print(checkpoint.step)             # 0

# Mutable properties (None by default, NOT empty dicts)
checkpoint.memory_snapshot = {"context": "market research"}
checkpoint.tool_state = {"last_tool": "search"}
checkpoint.metadata = {"progress": 0.5, "step": "analysis"}

# Serialize to dict
data = checkpoint.to_dict()
```

**IMPORTANT**: `memory_snapshot`, `tool_state`, and `metadata` are `None` by default, not empty dicts.

## InMemoryCheckpointStorage

Dict-backed storage for testing and development. Data is lost when the process exits.

```python
from kailash import AgentCheckpoint, InMemoryCheckpointStorage

storage = InMemoryCheckpointStorage()

# Save a checkpoint
checkpoint = AgentCheckpoint("assistant", step=1)
checkpoint.memory_snapshot = {"key": "value"}
storage.save(checkpoint)

# Load by agent_id
restored = storage.load("assistant")
# Raises RuntimeError if not found (does NOT return None)

# List all checkpoint IDs
ids = storage.list_checkpoints()

# Delete
deleted = storage.delete("assistant")  # Returns bool
```

**IMPORTANT**: `storage.load()` raises `RuntimeError` when checkpoint not found. It does NOT return `None`.

## FileCheckpointStorage

JSON file-backed storage. Each checkpoint is stored as `{base_dir}/{checkpoint_id}.json`.

```python
from kailash import AgentCheckpoint, FileCheckpointStorage

storage = FileCheckpointStorage("/tmp/agent-checkpoints")

# Save
checkpoint = AgentCheckpoint("researcher", step=3)
checkpoint.metadata = {"task": "market research"}
storage.save(checkpoint)

# Load
restored = storage.load("researcher")

# List
checkpoints = storage.list("researcher")

# Delete
storage.delete("researcher")
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
def save_agent_state(agent_name, step, memory):
    checkpoint = AgentCheckpoint(agent_name, step=step)
    checkpoint.memory_snapshot = memory
    storage.save(checkpoint)


# Resume from most recent checkpoint
def resume_agent(agent_name):
    try:
        return storage.load(agent_name)
    except RuntimeError:
        return None  # No checkpoint found


# Interrupt-aware agent loop
def agent_loop(agent_name):
    step = 0
    while not interrupt.is_interrupted:
        # Do work...
        step += 1
        save_agent_state(agent_name, step, {"progress": step})

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

- **`AgentCheckpoint(agent_id, step=0)`** -- constructor takes agent_id and optional step
- **`storage.load()`** -- raises `RuntimeError` if not found (NOT None)
- **`memory_snapshot`/`tool_state`/`metadata`** -- are `None` by default, not empty dicts
- **`AgentInterrupt.is_interrupted`** -- is a property, not a method
- **Chaining**: Parent interrupt cascades to children

<!-- Trigger Keywords: checkpoint, agent resume, restore agent, save agent, agent state, CheckpointStorage, InMemoryCheckpointStorage, FileCheckpointStorage, AgentCheckpoint, AgentInterrupt, graceful shutdown, interrupt -->
