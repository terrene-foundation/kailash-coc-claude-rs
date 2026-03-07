---
name: nodes-monitoring-reference
description: "Monitoring nodes reference (metrics, alerts, deadlocks). Use when asking 'monitoring node', 'metrics', 'alerts', 'deadlock detection', or 'performance monitoring'."
---

# Monitoring Nodes Reference

Complete reference for monitoring and observability nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `LOW`
> Related Skills: [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (monitoring patterns)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available monitoring nodes: TransactionMetricsNode, TransactionMonitorNode,
#   DeadlockDetectorNode, RaceConditionDetectorNode, PerformanceAnomalyNode
```

## Transaction Metrics

### TransactionMetricsNode
```python
import kailash

builder = kailash.WorkflowBuilder()

builder.add_node("TransactionMetricsNode", "metrics", {
    "operation": "collect",
    "transaction_id": "txn_123",
    "metrics": {
        "duration_ms": 150,
        "status": "success"
    }
})
```

## Real-Time Monitoring

### TransactionMonitorNode
```python
builder.add_node("TransactionMonitorNode", "monitor", {
    "operation": "trace",
    "transaction_id": "txn_123",
    "alert_thresholds": {
        "duration_ms": 1000,
        "error_rate": 0.05
    }
})
```

## Issue Detection

### DeadlockDetectorNode
```python
builder.add_node("DeadlockDetectorNode", "deadlock_check", {
    "operation": "detect",
    "timeout_seconds": 30
})
```

### RaceConditionDetectorNode
```python
builder.add_node("RaceConditionDetectorNode", "race_check", {
    "operation": "analyze",
    "resource_id": "resource_123"
})
```

### PerformanceAnomalyNode
```python
builder.add_node("PerformanceAnomalyNode", "anomaly_check", {
    "operation": "detect",
    "metric": "response_time",
    "threshold": 1000
})
```

## Related Skills

- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)

<!-- Trigger Keywords: monitoring node, metrics, alerts, deadlock detection, performance monitoring, TransactionMetricsNode -->
