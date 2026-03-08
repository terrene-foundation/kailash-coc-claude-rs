# Kaizen Checkpoint & Resume

Save and restore agent state using `AgentCheckpoint` and checkpoint storage backends.

## API

```python
from kailash.kaizen import AgentCheckpoint
from kailash.kaizen import InMemoryCheckpointStorage, FileCheckpointStorage
```

## AgentCheckpoint

```python
cp = AgentCheckpoint("my_agent", os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"))
```

| Property          | Type         | Description                                         |
| ----------------- | ------------ | --------------------------------------------------- |
| `checkpoint_id`   | str          | Auto-generated UUID                                 |
| `agent_name`      | str          | Agent name                                          |
| `model`           | str          | Model name                                          |
| `created_at`      | str          | ISO timestamp                                       |
| `memory_snapshot` | dict or None | Snapshot of agent memory (None on fresh checkpoint) |
| `metadata`        | dict         | Additional metadata (empty dict by default)         |
| `tool_state`      | dict or None | Tool state snapshot (None on fresh checkpoint)      |

| Method      | Returns | Description       |
| ----------- | ------- | ----------------- |
| `to_json()` | str     | Serialize to JSON |

## Storage Backends

### InMemoryCheckpointStorage

```python
store = InMemoryCheckpointStorage()

# Save checkpoint
cp = AgentCheckpoint("my_agent", os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"))
store.save(cp)

# Load by checkpoint_id
loaded = store.load(cp.checkpoint_id)

# List all checkpoints for an agent
checkpoints = store.list("my_agent")  # returns list

# Delete
store.delete(cp.checkpoint_id)

# IMPORTANT: load() after delete raises RuntimeError, NOT returns None
try:
    store.load(cp.checkpoint_id)
except RuntimeError:
    print("Checkpoint not found (expected)")
```

### FileCheckpointStorage

```python
store = FileCheckpointStorage("/path/to/checkpoints")

# Same API as InMemoryCheckpointStorage
store.save(cp)
loaded = store.load(cp.checkpoint_id)
checkpoints = store.list("my_agent")
store.delete(cp.checkpoint_id)
```

## Storage Methods

| Method                  | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `save(checkpoint)`      | Save checkpoint                                |
| `load(checkpoint_id)`   | Load by ID; raises `RuntimeError` if not found |
| `list(agent_name)`      | List all checkpoints for agent                 |
| `delete(checkpoint_id)` | Delete checkpoint                              |

## Limitations

- No `StateManager` wrapper (use storage directly)
- No compression or retention policies
- No checkpoint hooks integration (manual save/load)
