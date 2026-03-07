---
name: production-patterns
description: "Production workflow patterns and best practices. Use when asking 'production patterns', 'production workflows', 'production best practices', 'deployment patterns', or 'production guide'."
---

# Production Patterns

Production Patterns for production-ready workflows.

> **Skill Metadata**
> Category: `quick-reference`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Production Patterns
- **Category**: quick-reference
- **Priority**: HIGH
- **Trigger Keywords**: production patterns, production workflows, production best practices

## Core Pattern

```python

# Production Patterns implementation
builder = kailash.WorkflowBuilder()

# See source documentation for specific node types and parameters

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Enterprise Deployment Patterns**: Production-ready workflows with health checks, circuit breakers, retry logic, monitoring
- **High Availability Design**: Multi-instance deployments, load balancing, failover strategies, state persistence
- **Performance Optimization**: Connection pooling, caching strategies, batch operations, async execution patterns
- **Security Implementation**: Authentication, authorization, secrets management, input validation, audit logging
- **Operational Excellence**: Structured logging, metrics collection, alerting, error tracking, performance monitoring

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

- 💡 **Use kailash.Runtime for Docker**: WorkflowAPI defaults to kailash.Runtime - 10-100x faster, no thread hanging issues
- 💡 **Implement Health Checks**: Add HealthCheckNode with database/API connectivity checks for load balancer monitoring
- 💡 **Enable Circuit Breakers**: Protect external dependencies with circuit breaker pattern to prevent cascade failures
- 💡 **Configure Retry Policies**: Set max_retries, exponential_backoff, jitter for transient failures
- 💡 **Monitor with Metrics**: Use TransactionMetricsNode to track latency, throughput, error rates in production

## Keywords for Auto-Trigger

<!-- Trigger Keywords: production patterns, production workflows, production best practices -->
