---
name: kaizen-observability
description: "Observability stack for Kaizen agents. Use when asking about ObservabilityManager, MetricsCollector, TracingManager, LogAggregator, SpanContext, agent metrics, distributed tracing, or log aggregation."
---

# Kaizen Observability: Metrics, Tracing, and Logging

The observability module provides three subsystems coordinated by a central manager:

1. **`MetricsCollector`** -- Latency, token counts, errors, and tool calls per agent
2. **`TracingManager`** -- Hierarchical spans with parent-child relationships
3. **`LogAggregator`** -- Structured log entries with ring buffer storage
4. **`SpanContext`** -- Trace/span ID propagation for distributed tracing
5. **`ObservabilityManager`** -- Coordinator that owns all three subsystems

All types are thread-safe and suitable for concurrent use.

## SpanContext

```python
from kailash import SpanContext

# Create a root span (new trace_id, no parent)
root = SpanContext.root("agent-run")
print(root.trace_id)           # str (UUID)
print(root.span_id)            # str (UUID)
print(root.parent_span_id)     # None for root
print(root.name)               # "agent-run"

# Create a child span (inherits trace_id)
child = root.child("llm-call")
assert child.trace_id == root.trace_id
assert child.parent_span_id == root.span_id
```

## MetricsCollector

Thread-safe metrics collection. Records latency, token counts, errors, and tool calls per agent.

```python
from kailash import MetricsCollector

mc = MetricsCollector()

# Record metrics
mc.record_latency("agent-1", 250)           # duration_ms
mc.record_tokens("agent-1", 500, 200)       # input_tokens, output_tokens
mc.record_error("agent-1", "timeout")
mc.record_tool_call("agent-1", "search", 100)  # tool_name, duration_ms

# Get snapshot
snapshot = mc.get_metrics()
# {"agent-1": {"total_calls": 1, "avg_latency_ms": 250.0, ...}}

# Reset
mc.reset()
```

### AgentMetrics Fields

- `total_calls` -- Number of latency records
- `total_latency_ms` -- Sum of all latency durations in ms
- `avg_latency_ms` -- Average latency
- `total_input_tokens` / `total_output_tokens`
- `error_count`
- `tool_calls`

## TracingManager

Creates and manages hierarchical spans.

```python
import os
from kailash import TracingManager

tm = TracingManager()

# Start spans
root = tm.start_span("agent-run")               # no parent
child = tm.start_span("llm-call", parent=root)

# Add attributes
tm.add_span_attribute(child, "model", os.environ.get("LLM_MODEL", "gpt-4o"))
tm.add_span_attribute(child, "tokens", "700")

# End spans
tm.end_span(child)
tm.end_span(root)

# Retrieve trace
trace = tm.get_trace(root.trace_id)
# {"trace_id": "...", "spans": [{"span_id": "...", ...}]}
```

## LogAggregator

Structured log collection with ring buffer storage and filtering.

```python
from kailash import LogAggregator

la = LogAggregator(max_entries=1000)

# Log entries
la.log("info", "agent-1", "Processing started")
la.log("error", "agent-1", "Failed", metadata={"code": "500"})
la.log("debug", "agent-1", "Details", span_context=root)

# Query logs with filters
logs = la.get_logs()                      # all logs
logs = la.get_logs(level="error")         # filter by level
logs = la.get_logs(agent_name="agent-1")  # filter by agent
# Each log: {"timestamp", "level", "agent_name", "message", "metadata", "span_context"}
```

### LogLevel

Supported levels: `"debug"`, `"info"`, `"warn"`, `"error"`

## ObservabilityManager

Coordinator that owns a MetricsCollector, TracingManager, and LogAggregator (capacity: 10,000).

```python
from kailash import ObservabilityManager

mgr = ObservabilityManager()

# Access subsystems
mgr.metrics.record_latency("agent-1", 250)
ctx = mgr.tracing.start_span("operation")
mgr.logging.log("info", "agent-1", "Started")
mgr.tracing.end_span(ctx)

# Export
json_str = mgr.export_metrics_json()              # str
json_str = mgr.export_trace_json(ctx.trace_id)     # str, raises ValueError if not found

# Subsystem properties
mc = mgr.metrics     # MetricsCollector
tm = mgr.tracing     # TracingManager
la = mgr.logging     # LogAggregator
```

<!-- Trigger Keywords: observability, ObservabilityManager, MetricsCollector, TracingManager, LogAggregator, SpanContext, agent metrics, distributed tracing, log aggregation -->
