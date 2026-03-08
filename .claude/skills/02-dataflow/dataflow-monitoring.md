---
name: dataflow-monitoring
description: "DataFlow monitoring and metrics. Use when asking 'dataflow monitoring', 'dataflow metrics', or 'dataflow performance'."
---

# DataFlow Monitoring

> **Skill Metadata**
> Category: `dataflow`
> Priority: `MEDIUM`

## Enable Monitoring

```python
import kailash

df = kailash.DataFlow("postgresql://localhost/app")

# Enable query logging
df.configure(
    echo_sql=True,  # Log all SQL queries
    track_metrics=True  # Track operation metrics
)

# Access metrics
metrics = df.get_metrics()
print(f"Total queries: {metrics['query_count']}")
print(f"Avg query time: {metrics['avg_query_ms']}ms")
print(f"Failed operations: {metrics['error_count']}")
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
