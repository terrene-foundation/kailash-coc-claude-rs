# Parameter Passing Comprehensive

Enterprise parameter passing patterns for Kailash SDK with security and governance.

## Core Patterns

### 1. Three Ways to Pass Parameters

**1. Static Parameters (Node Configuration)**

```python
builder.add_node("HTTPRequestNode", "api_call", {
    "url": "https://api.example.com",
    "method": "GET"
})
```

**2. Dynamic Parameters (Runtime)**

```python
rt.execute(builder.build(reg), inputs={
    "api_call": {"url": "https://different-api.com"}
})
```

**3. Connection-Based (Data Flow)**

```python
builder.connect("source", "output_key", "target", "input_key")
```

### 2. Parameter Scoping

**Node-specific parameters are unwrapped automatically:**

```python
# What you pass:
parameters = {
    "api_key": "global",     # Global param (all nodes)
    "node1": {"value": 10},  # Node-specific
    "node2": {"value": 20}   # Node-specific
}

# What node1 receives (unwrapped):
{
    "api_key": "global",  # Global param
    "value": 10           # Unwrapped from nested dict
}
# node1 does NOT receive node2's parameters (isolated)
```

**Scoping rules:**

- Parameters filtered by node ID
- Node-specific params unwrapped
- Global params (non-node-ID keys) included for all nodes
- Other nodes' params excluded (prevents leakage)

### 3. Parameter Priority

```
Connection-based > Runtime > Static
(Highest)                   (Lowest)
```

### 4. Complex Parameter Patterns

```python
builder.add_node("EmbeddedPythonNode", "complex", {
    "code": """
# Access parameters directly (automatically injected)
config = {
    'database': {
        'host': db_host,    # From parameter
        'port': db_port,    # From parameter
        'user': db_user     # From parameter
    }
}
result = {'config': config}
"""
})

# Provide via runtime
rt.execute(builder.build(reg), inputs={
    "complex": {
        "db_host": "localhost",
        "db_port": 5432,
        "db_user": "admin"
    }
})
```

### 5. Parameter Validation

```python
import kailash

# In the Rust-backed SDK, parameter validation is done in EmbeddedPythonNode logic.
builder = kailash.WorkflowBuilder()

builder.add_node("EmbeddedPythonNode", "validated_node", {
    "code": """
api_url = input_data.get("api_url", "")
timeout = input_data.get("timeout", 30)

# Validate business logic
if not api_url.startswith("https://"):
    raise ValueError("API URL must use HTTPS")

if timeout < 1 or timeout > 300:
    raise ValueError("Timeout must be between 1-300 seconds")

result = {"result": "validated"}
"""
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), inputs={
    "validated_node": {"api_url": "https://api.example.com", "timeout": 30}
})
```

### 6. Security Patterns

```python
# Parameter isolation prevents data leakage
parameters = {
    "tenant_a_processor": {"tenant_id": "tenant-a", "data": sensitive_a},
    "tenant_b_processor": {"tenant_id": "tenant-b", "data": sensitive_b}
}

# Each node only receives its own parameters
# No cross-tenant data leakage possible
```

### 7. Error Handling

**Validation failures now raise ValueError:**

```python
import kailash

try:
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
except ValueError as e:  # Changed from RuntimeExecutionError
    print(f"Configuration error: {e}")

try:
    builder.build(reg)
except ValueError as e:  # Parameter validation errors
    print(f"Missing parameters: {e}")
```

## When to Engage

- User asks about "enterprise parameters", "parameter governance", "parameter security"
- Complex parameter needs across multiple nodes
- Multi-tenant parameter isolation required
- Parameter validation patterns needed

## Integration with Other Skills

- Route to **param-passing-quick** for basic concepts
- Route to **workflow-quickstart** for workflow building
- Route to **gold-parameter-passing** for compliance patterns
