---
name: dataflow-monitoring
description: "DataFlow monitoring and metrics. Use when asking 'dataflow monitoring', 'dataflow metrics', or 'dataflow performance'."
---

# DataFlow Monitoring

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`

## Enable Monitoring

DataFlow does NOT have `configure()` or `get_metrics()` methods. Monitoring is achieved through workflow-level patterns and DX tools.

```python
import kailash
from kailash.dataflow import LoggingConfig, SchemaCache

df = kailash.DataFlow("postgresql://localhost/app")

# Enable query logging via LoggingConfig
logging = LoggingConfig(log_queries=True, log_slow_threshold_ms=100)

# Schema cache for introspection performance
cache = SchemaCache(ttl_secs=300)
tables = cache.get_tables(df)
columns = cache.get_columns(df, "users")
```

## Query Performance Monitoring

```python
import kailash

builder = kailash.WorkflowBuilder()

# Monitor slow queries
builder.add_node("ListUser", "get_users", {
    "filters": {"status": "active"},
    "track_performance": True  # Enable timing
})

# ConditionalNode: NO config params. Inputs: condition, if_value, else_value. Output: result.
builder.add_node("ConditionalNode", "check_slow", {})

builder.add_node("SQLQueryNode", "log_slow_query", {
    "query": "INSERT INTO slow_queries (operation, duration_ms) VALUES (?, ?)",
    "parameters": ["ListUser", "{{get_users.execution_time_ms}}"]
})
```

<!-- Trigger Keywords: dataflow monitoring, dataflow metrics, dataflow performance, query performance -->
