---
skill: nexus-troubleshooting
description: Common issues, debugging strategies, and solutions for Nexus platform
priority: HIGH
tags: [nexus, troubleshooting, debugging, errors, solutions]
---

# Nexus Troubleshooting

Common issues and solutions for Nexus platform.

## Common Issues

### 1. Port Already in Use

**Error**: `Address already in use`

**Solution**:

```python
# Use custom ports
from kailash.nexus import NexusApp, NexusConfig
app = NexusApp(config=NexusConfig(port=8001))
```

**Check port usage**:

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### 2. Workflow Not Found

**Error**: `Workflow 'my-workflow' not registered`

**Solution**:

```python
# Ensure .build() is called, then wrap with Runtime
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "test", {"code": "result = {'ok': True}", "output_vars": ["result"]})
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("my-workflow", lambda **inputs: rt.execute(workflow, inputs))

# Check registered handlers
print(app.get_registered_handlers())
```

### 3. Auto-Discovery Blocking (with DataFlow)

**Error**: Nexus hangs during initialization

**Solution**:

```python
# Disable auto_discovery when using DataFlow
app = NexusApp()  # Register workflows manually

# auto_migrate=True (default) works in Docker
db = kailash.DataFlow("postgresql://...")
```

### 4. Import Errors

**Error**: `ModuleNotFoundError: No module named 'nexus'`

**Solution**:

```bash
# Install Kailash (Nexus included)
pip install kailash-enterprise

# Verify installation
python -c "import kailash; print('OK')"
```

### 5. Authentication Errors

**Error**: `Unauthorized` or `401`

**Solution**:

```python
# Configure authentication
app = NexusApp()  # Auth configured via NexusAuthPlugin

# For API requests, include auth header
curl -X POST http://localhost:3000/workflows/test/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"inputs": {}}'
```

### 6. Parameter Validation Errors

**Error**: `Invalid parameter type`

**Solution**:

```python
# Check parameter types match node requirements
# Use proper JSON types in API calls

# Correct
{"inputs": {"limit": 10}}  # Integer

# Wrong
{"inputs": {"limit": "10"}}  # String instead of integer
```

### 7. Workflow State Across Executions

**Problem**: Need to track state across multiple workflow executions

**Solution**: Nexus workflows are stateless by default. Use DataFlow for persistent state or pass state via `inputs`:

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()

# Option 1: Pass state via inputs between executions
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

builder = kailash.WorkflowBuilder()
builder.add_node("SomeNode", "step1", {"previous_run_id": "run-123"})
result = rt.execute(builder.build(reg), inputs={"state": "from_previous"})

# Option 2: Track lifecycle events via EventBus
bus = app._nexus.event_bus()
bus.subscribe(lambda e: print(f"Event: {e}"))
```

### 8. Slow Startup

**Problem**: Nexus takes 10-30 seconds to start

**Solution**:

```python
# With DataFlow, use optimized settings
app = NexusApp()  # Register workflows manually
db = kailash.DataFlow(
    "postgresql://...",
    auto_migrate=True,  # Default: Works in Docker
)

# Should now start in <2 seconds
```

### 9. API Inputs Not Reaching Node

**Problem**: Node doesn't receive API parameters

**Solution**:

```python
# Use try/except pattern in EmbeddedPythonNode
builder.add_node("EmbeddedPythonNode", "process", {
    "code": """
try:
    param = my_param  # From API inputs
except NameError:
    param = None  # Not provided

result = {'param': param}
""",
    "output_vars": ["result"]
})

# API request
curl -X POST http://localhost:3000/workflows/process/execute \
  -d '{"inputs": {"my_param": "value"}}'
```

### 10. Connection Errors Between Nodes

**Problem**: Data not flowing between nodes

**Solution**:

```python
# Use explicit connections with correct paths
builder.connect(
    "node1", "result.data",  # Full path to output
    "node2", "input"         # Input parameter name
)

# Check node outputs match connection source
# Check node inputs match connection target
```

## Debugging Strategies

### 1. Enable Debug Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Or in Nexus
app = NexusApp()  # Logging configured separately
```

### 2. Add Debug Nodes

```python
# Insert debug node to inspect data
builder.add_node("EmbeddedPythonNode", "debug", {
    "code": """
import json
print(f"Debug data: {json.dumps(data, indent=2)}")
result = data  # Pass through
""",
    "output_vars": ["result"]
})
```

### 3. Check Health Status

```bash
# Check overall health
curl http://localhost:3000/health

# Check detailed status
curl http://localhost:3000/health/detailed
```

### 4. Verify Workflow Registration

```python
# List registered handlers
print("Registered handlers:", app.get_registered_handlers())
```

### 5. Test Individual Nodes

```python
# Test node in isolation
import kailash

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)

# Create simple workflow with problem node
test_builder = kailash.WorkflowBuilder()
test_builder.add_node("ProblemNode", "test", {"param": "value"})

# Execute and check result
result = rt.execute(test_builder.build(reg))
print(f"Result: {result}")
```

### 6. Check API Request Format

```bash
# Use -v for verbose output
curl -v -X POST http://localhost:3000/workflows/test/execute \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"param": "value"}}'

# Check request is sent correctly
# Check response headers and body
```

### 7. Monitor Logs

```bash
# Tail logs in real-time
tail -f nexus.log

# Search for errors
grep ERROR nexus.log

# Search for specific workflow
grep "my-workflow" nexus.log
```

## Common Error Messages

### "Workflow 'X' not registered"

- Forgot to call `.build()`
- Wrong workflow name
- Registration failed (check logs)

### "Invalid parameter type"

- API request has wrong type
- Node expects different type
- Check API schema

### "Session expired"

- Session timeout reached
- Session manually ended
- Session never created

### "Port already in use"

- Another Nexus instance running
- Different service using port
- Change port in config

### "Auto-discovery blocking"

- NexusApp has no `auto_discovery` parameter
- Register workflows manually with `app.register()`

## Performance Issues

### Slow API Responses

NexusApp does not have `app.get_workflow_metrics()`. Monitor performance via
external tools (Prometheus, reverse proxy logs) or add timing in your handlers:

```python
import time

@app.handler("timed_workflow", description="Workflow with timing")
async def timed_workflow(data: str) -> dict:
    start = time.time()
    # ... workflow execution ...
    elapsed = time.time() - start
    return {"result": data, "execution_time_s": elapsed}
```

### High Memory Usage

```python
# Use EventBus to monitor resource usage
bus = app._nexus.event_bus()
bus.subscribe(lambda e: log_memory_usage(e) if e.get("type") == "workflow_completed" else None)

# Ensure workflows clean up resources
app = NexusApp()
```

### High CPU Usage

NexusApp does not have `app.get_metrics()` or `app.api.*` attributes. Monitor
CPU and concurrency via system-level tools or your reverse proxy.

## Getting Help

### 1. Enable Verbose Logging

```python
app = NexusApp()  # Logging configured separately
```

### 2. Check GitHub Issues

Search for similar issues in the repository.

### 3. Create Minimal Reproduction

```python
# Minimal example to reproduce issue
import kailash

reg = kailash.NodeRegistry()

from kailash.nexus import NexusApp
app = NexusApp()

builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "test", {
    "code": "result = {'test': True}",
    "output_vars": ["result"]
})

workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("test", lambda **inputs: rt.execute(workflow, inputs))
app.start()
```

## Key Takeaways

- Most issues have simple solutions
- Enable debug logging early
- Check health endpoints regularly
- Use minimal examples to isolate issues
- Verify configuration settings
- Monitor logs and metrics

## Related Skills

- [nexus-quickstart](#) - Basic setup
- [nexus-api-input-mapping](#) - Fix parameter issues
- [nexus-dataflow-integration](#) - Fix integration issues
- [nexus-health-monitoring](#) - Monitor for issues
