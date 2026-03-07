---
name: monitoring-alerting
description: "Monitoring and alerting patterns for workflows. Use when asking 'monitoring', 'alerts', 'workflow monitoring', 'alerting patterns', or 'observability'."
---

# Monitoring Alerting

Monitoring Alerting for production-ready workflows.

> **Skill Metadata**
> Category: `production`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Monitoring Alerting
- **Category**: production
- **Priority**: HIGH
- **Trigger Keywords**: monitoring, alerts, workflow monitoring, alerting patterns, observability

## Core Pattern

```python

# Monitoring Alerting implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Real-time Metrics Collection**: TransactionMetricsNode for latency, throughput, error rates, resource usage
- **Health Check Monitoring**: Periodic health checks with HealthCheckNode for database, API, service availability
- **Alert Triggers**: Configure thresholds for error rates, latency SLAs, resource limits with webhook notifications
- **Performance Tracking**: Track workflow execution times, node-level performance, bottleneck identification
- **Audit Logging**: Full execution trail with inputs/outputs, errors, state changes for compliance and debugging

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For patterns**: See [`workflow-patterns-library`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:
- **pattern-expert**: Complex patterns, multi-node workflows
- **sdk-navigator**: Error resolution, parameter issues
- **testing-specialist**: Comprehensive testing strategies

## Quick Tips

- 💡 **Tip 1**: Follow best practices from documentation
- 💡 **Tip 2**: Test patterns incrementally
- 💡 **Tip 3**: Reference examples for complex cases

## Keywords for Auto-Trigger

<!-- Trigger Keywords: monitoring, alerts, workflow monitoring, alerting patterns, observability -->
