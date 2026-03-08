---
skill: kaizen-observability
description: "ObservabilityManager and MetricsCollector for monitoring agent performance. Use when asking about 'observability', 'agent metrics', 'agent monitoring', 'performance tracking', 'MetricsCollector', or 'ObservabilityManager'."
priority: MEDIUM
tags: [kaizen, observability, metrics, monitoring, performance, tracing]
---

# Kaizen Observability

Monitor and measure agent performance with ObservabilityManager and MetricsCollector.

## Quick Reference

- **ObservabilityManager**: Central hub for agent observability (metrics, traces, logs)
- **MetricsCollector**: Collect and query performance metrics from agent executions

## Import

```python
from kailash.kaizen import ObservabilityManager, MetricsCollector
```

## ObservabilityManager

The `ObservabilityManager` provides centralized observability for agent systems:

```python
from kailash.kaizen import ObservabilityManager

obs = ObservabilityManager()

# Record agent execution metrics
obs.record_execution(
    agent_name="my-agent",
    duration_ms=1250,
    success=True,
    metadata={"model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"), "tokens_used": 500},
)

# Record errors
obs.record_error(
    agent_name="my-agent",
    error_type="TimeoutError",
    error_message="LLM request timed out after 30s",
)

# Get agent statistics
stats = obs.get_stats("my-agent")
# stats: {"total_executions": 10, "success_rate": 0.9, "avg_duration_ms": 1100, ...}
```

## MetricsCollector

The `MetricsCollector` provides detailed metric collection and querying:

```python
from kailash.kaizen import MetricsCollector

metrics = MetricsCollector()

# Record a metric
metrics.record("agent.latency", 1.25, tags={"agent": "researcher", "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5")})
metrics.record("agent.tokens", 500, tags={"agent": "researcher", "direction": "input"})
metrics.record("agent.tokens", 150, tags={"agent": "researcher", "direction": "output"})
metrics.record("agent.cost", 0.05, tags={"agent": "researcher"})

# Query metrics
latency_data = metrics.query("agent.latency", tags={"agent": "researcher"})
# Returns collected metric data points

# Get aggregated summary
summary = metrics.summary("agent.latency")
# summary: {"count": 10, "mean": 1.15, "p50": 1.1, "p95": 2.3, "p99": 3.1}
```

## Integration with Agents

### BaseAgent with Observability

```python
import os
import time
from kailash.kaizen import BaseAgent, ObservabilityManager

obs = ObservabilityManager()

class ObservableAgent(BaseAgent):
    name = "observable-agent"

    def __init__(self):
        super().__init__(name=self.name, model=os.environ.get("LLM_MODEL"))

    def execute(self, input_text: str) -> dict:
        start = time.time()
        try:
            result = {"response": f"Processed: {input_text}"}
            duration_ms = (time.time() - start) * 1000
            obs.record_execution(
                agent_name=self.name,
                duration_ms=duration_ms,
                success=True,
            )
            return result
        except Exception as e:
            duration_ms = (time.time() - start) * 1000
            obs.record_execution(
                agent_name=self.name,
                duration_ms=duration_ms,
                success=False,
            )
            obs.record_error(
                agent_name=self.name,
                error_type=type(e).__name__,
                error_message=str(e),
            )
            raise
```

### Multi-Agent Monitoring

```python
import os
from kailash.kaizen import SupervisorAgent, WorkerAgent, ObservabilityManager, MetricsCollector

obs = ObservabilityManager()
metrics = MetricsCollector()

# Monitor supervisor and workers
supervisor = SupervisorAgent(
    name="monitored-supervisor",
    model=os.environ.get("LLM_MODEL"),
    workers=[
        WorkerAgent(name="worker-1", model=os.environ.get("LLM_MODEL"), description="Task 1"),
        WorkerAgent(name="worker-2", model=os.environ.get("LLM_MODEL"), description="Task 2"),
    ],
)

# Record metrics for each agent in the system
for agent_name in ["monitored-supervisor", "worker-1", "worker-2"]:
    stats = obs.get_stats(agent_name)
    if stats:
        metrics.record("system.agent.success_rate", stats.get("success_rate", 0), tags={"agent": agent_name})
```

## Integration with CostTracker

Combine observability with cost tracking:

```python
from kailash.kaizen import ObservabilityManager, MetricsCollector, CostTracker

obs = ObservabilityManager()
metrics = MetricsCollector()
cost = CostTracker()

# Record costs alongside performance
cost.record(0.05, os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"), 500, 150)  # cost, model, input_tokens, output_tokens

# Record to metrics collector
model_name = os.environ.get("DEFAULT_LLM_MODEL", "gpt-5")
metrics.record("agent.cost_usd", 0.05, tags={"model": model_name})
metrics.record("agent.input_tokens", 500, tags={"model": model_name})
metrics.record("agent.output_tokens", 150, tags={"model": model_name})

# Get cost summary
total = cost.total()
metrics.record("system.total_cost_usd", total)
```

## Integration with Nexus

```python
import os
from kailash.kaizen import ObservabilityManager, MetricsCollector
from kailash.nexus import NexusApp

obs = ObservabilityManager()
metrics = MetricsCollector()
app = NexusApp()

@app.handler(name="agent_stats", description="Get agent performance statistics")
async def agent_stats(agent_name: str) -> dict:
    stats = obs.get_stats(agent_name)
    return stats or {"error": f"No stats for agent: {agent_name}"}

@app.handler(name="system_metrics", description="Get system-wide metrics")
async def system_metrics() -> dict:
    latency = metrics.summary("agent.latency")
    cost = metrics.summary("agent.cost_usd")
    return {
        "latency": latency,
        "cost": cost,
    }

app.start()
```

## Best Practices

1. **Record all agent executions** -- Track both successes and failures
2. **Include metadata** -- Add model name, token counts, and other context
3. **Use tags for filtering** -- Tag metrics by agent, model, and environment
4. **Monitor costs** -- Combine with CostTracker for financial observability
5. **Set alerts on thresholds** -- Watch for error rate spikes and latency increases
6. **Use environment variables** -- Never hardcode model names in observability code

## Related Skills

- [kaizen-cost-tracking](kaizen-cost-tracking.md) - LLM cost tracking and budgets
- [kaizen-multi-agent](kaizen-multi-agent.md) - Multi-agent coordination
- [kaizen-hooks-lifecycle](kaizen-hooks-lifecycle.md) - Lifecycle hooks for instrumentation
- [kaizen-agent-patterns](kaizen-agent-patterns.md) - Agent building blocks

<!-- Trigger Keywords: observability, agent metrics, agent monitoring, performance tracking, MetricsCollector, ObservabilityManager, agent performance, agent tracing -->
