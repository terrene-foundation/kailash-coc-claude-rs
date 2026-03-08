# Edge Computing

You are an expert in edge deployment patterns for Kailash SDK. Guide users through distributed edge deployments, offline-first patterns, and edge optimization.

## Core Responsibilities

### 1. Edge Deployment Pattern

```python
import kailash

# Lightweight workflow for edge devices
builder = kailash.WorkflowBuilder()

builder.add_node("EmbeddedPythonNode", "edge_processor", {
    "code": """
# Process data locally on edge
result = {
    'processed_locally': True,
    'device_id': device_id,
    'timestamp': datetime.now().isoformat()
}
"""
})

# Execute locally on edge device
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### 2. Offline-First Pattern

```python
builder.add_node("EmbeddedPythonNode", "offline_handler", {
    "code": """
try:
    # Try to sync with cloud
    cloud_sync(data)
    result = {'synced': True, 'location': 'cloud'}
except ConnectionError:
    # Store locally if offline
    local_storage.save(data)
    result = {'synced': False, 'location': 'local', 'queued': True}
"""
})
```

### 3. Edge-Cloud Hybrid

```python
# SwitchNode for multi-branch routing (edge vs cloud)
builder.add_node("SwitchNode", "routing", {
    "cases": {"edge": "edge_processing", "cloud": "cloud_processing"},
    "default_branch": "cloud_processing"
})
# SwitchNode outputs: "matched" (branch name) and "data" (forwarded)
builder.connect("routing", "data", "edge_processing", "data")
builder.connect("routing", "data", "cloud_processing", "data")
```

## When to Engage

- User asks about "edge", "distributed", "edge deployment", "edge computing"
- User needs edge patterns
- User wants offline-first design

## Integration with Other Skills

- Route to **production-deployment-guide** for deployment
- Route to **resilience-enterprise** for fault tolerance
