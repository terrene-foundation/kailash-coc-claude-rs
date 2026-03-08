# Kaizen Checkpoint & Resume

Save and restore agent state using `AgentCheckpoint` and checkpoint storage backends.

## API

```python
import os
from kailash import AgentCheckpoint, InMemoryCheckpointStorage, FileCheckpointStorage

# Create a checkpoint
checkpoint = AgentCheckpoint("researcher", os.environ.get("LLM_MODEL", "gpt-4o"))

# Fields:
# - checkpoint_id: str         (UUID v4, auto-generated)
# - agent_name: str
# - model: str
# - memory_snapshot: dict|None (None by default)
# - tool_state: dict|None      (None by default)
# - created_at: str            (ISO 8601, auto-generated)
# - metadata: dict|None        (None by default)

# Populate fields
checkpoint.memory_snapshot = {"context": "market research"}
checkpoint.metadata = {"progress": 0.5, "step": "analysis"}
```

## InMemoryCheckpointStorage

Dict-backed storage for testing and development. Data is lost when the process exits.

```python
import os
storage = InMemoryCheckpointStorage()

# Save
checkpoint = AgentCheckpoint("assistant", os.environ.get("LLM_MODEL", "gpt-4o"))
checkpoint_id = storage.save(checkpoint)

# Load
restored = storage.load(checkpoint_id)
assert restored.agent_name == "assistant"

# List all checkpoints for an agent
all_checkpoints = storage.list("assistant")
assert len(all_checkpoints) == 1

# Delete
storage.delete(checkpoint_id)
```

## FileCheckpointStorage

JSON file-backed storage. Each checkpoint is stored as `{base_dir}/{checkpoint_id}.json`.

```python
import os
storage = FileCheckpointStorage("/tmp/agent-checkpoints")

# Save
checkpoint = AgentCheckpoint("researcher", os.environ.get("LLM_MODEL", "gpt-4o"))
checkpoint.metadata = {"task": "market research"}
checkpoint_id = storage.save(checkpoint)

# Load
restored = storage.load(checkpoint_id)

# List
checkpoints = storage.list("researcher")

# Delete
storage.delete(checkpoint_id)
```

## AgentInterrupt

Thread-safe interrupt mechanism for graceful agent shutdown.

```python
from kailash.kaizen import AgentInterrupt

interrupt = AgentInterrupt()

# Check state (is_interrupted is a property, no parens)
assert not interrupt.is_interrupted

# Fire the interrupt
interrupt.request_interrupt()
assert interrupt.is_interrupted

# Clear
interrupt.clear()
assert not interrupt.is_interrupted

# Graceful shutdown with timeout
interrupt.request_graceful_shutdown(timeout_secs=30.0)

# Chain interrupts
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
# After each agent task completion, save a checkpoint
async def save_agent_state(storage, agent_name, model, memory):
    checkpoint = AgentCheckpoint(agent_name, model)
    checkpoint.memory_snapshot = memory
    return storage.save(checkpoint)  # Returns checkpoint_id (UUID)

# Resume from most recent checkpoint
async def resume_agent(storage, agent_name):
    checkpoints = storage.list(agent_name)
    checkpoints.sort(key=lambda c: c.created_at, reverse=True)
    return checkpoints[0] if checkpoints else None
```

<!-- Trigger Keywords: checkpoint, agent resume, restore agent, save agent, agent state, CheckpointStorage, AgentCheckpoint, AgentInterrupt, graceful shutdown -->
