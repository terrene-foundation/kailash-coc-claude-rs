# Resource Sharing Patterns

Share resources (database connections, caches, state) across workflow nodes using standard Python patterns.

## Core Pattern: Module-Level Resources

The Kailash SDK does not have a `ResourceRegistry` class. Instead, use standard Python patterns for resource sharing:

```python
import kailash

# Module-level shared resources
db_connection = None
cache_client = None

def init_resources():
    global db_connection, cache_client
    import sqlite3
    db_connection = sqlite3.connect("app.db")
    cache_client = {}  # or redis.Redis()

# Use in workflow via EmbeddedPythonNode
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "use_resource", {
    "code": """
# EmbeddedPythonNode has its own Python interpreter
# Pass resources via workflow inputs instead
result = {'processed': True, 'data': input_data}
""",
    "output_vars": ["result"]
})
```

## Pattern: Pass Resources via Inputs

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# Fetch data in one node, pass to another via connections
builder.add_node("SQLQueryNode", "db_query", {
    "connection_string": "sqlite:///app.db",
    "query": "SELECT * FROM users"
})

builder.add_node("EmbeddedPythonNode", "process", {
    "code": "result = {'count': len(rows)}",
    "output_vars": ["result"]
})

builder.connect("db_query", "rows", "process", "rows")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Pattern: Custom Node with Shared State

```python
import kailash
import threading

class SharedCache:
    def __init__(self):
        self.data = {}
        self.lock = threading.Lock()

    def __call__(self, inputs):
        with self.lock:
            key = inputs.get("key", "default")
            if "value" in inputs:
                self.data[key] = inputs["value"]
            return {"cached": self.data.get(key)}

cache = SharedCache()
reg = kailash.NodeRegistry()
reg.register_callback("CacheNode", cache, ["key", "value"], ["cached"])
```

## When to Engage

- User asks about "shared resources", "resource sharing", "connection pooling"
- User needs to share state between nodes
- User wants database connections reused across workflows

## Integration with Other Skills

- Route to **production-deployment-guide** for deployment
- Route to **sdk-fundamentals** for basic concepts
