---
name: analysis-patterns
description: "Deep analysis patterns including failure point analysis, 5-Why root cause investigation, complexity assessment, and risk prioritization. Use for 'failure analysis', 'root cause', 'complexity assessment', or 'risk prioritization'."
---

# Analysis Patterns

> **Skill Metadata**
> Category: `analysis`
> Priority: `HIGH`
> Use Cases: Feature planning, debugging, risk assessment

## Failure Point Analysis Framework

```
### Technical Risk Assessment
- **Parameter Validation**: Missing required inputs, wrong Value types
- **Integration Points**: Service communication failures, timeout issues
- **Resource Constraints**: Memory usage, CPU limits, connection pools
- **Concurrency Issues**: Race conditions, deadlocks, state conflicts
- **External Dependencies**: Network failures, service unavailability
- **Unsafe Code**: FFI boundaries, raw pointers in kailash-capi

### Rust-Specific Risks
- **Ownership/Lifetime**: Borrow checker violations, lifetime mismatches
- **Async Issues**: tokio runtime panics, future cancellation, Send/Sync bounds
- **Type Safety**: Value enum mismatches, serialization failures
- **Feature Flags**: Missing feature gates, conflicting features

### Business Logic Risks
- **Edge Cases**: Empty data, invalid inputs, boundary conditions
- **Scale Issues**: Performance degradation with large datasets
- **User Experience**: Confusing error messages, long wait times
- **Data Integrity**: Corruption, inconsistency, validation bypass
```

## Root Cause Investigation (5-Why Framework)

| Level     | Question Focus    | Example                                                       |
| --------- | ----------------- | ------------------------------------------------------------- |
| **Why 1** | Immediate symptom | "Why did workflow fail?" -> Missing parameters                |
| **Why 2** | Direct cause      | "Why missing?" -> No validation at build time                 |
| **Why 3** | System cause      | "Why no validation?" -> `builder.build()` not checking params |
| **Why 4** | Process cause     | "Why not checking?" -> ParamDef not marked required           |
| **Why 5** | Root cause        | "Why not required?" -> Node trait contract incomplete         |

**Key Insight**: Address root cause (fix Node trait contract) not symptom (add parameters at call site).

## Complexity Assessment Matrix

### Scoring Dimensions

| Dimension          | Low (1-2)       | Medium (3-4)       | High (5+)                   |
| ------------------ | --------------- | ------------------ | --------------------------- |
| **Technical**      |
| New components     | Single node     | Multiple nodes     | New crate/subsystem         |
| Integration points | 1-2 crates      | 3-4 crates         | 5+ crates                   |
| Data dependencies  | Single source   | Multiple sources   | Distributed data            |
| **Rust-Specific**  |
| Unsafe code        | None            | Isolated FFI       | Cross-boundary unsafe       |
| Async complexity   | Single await    | Concurrent futures | Complex orchestration       |
| Trait design       | Existing traits | New trait impl     | Cross-crate trait hierarchy |
| **Operational**    |
| Environments       | Dev only        | Dev + Prod         | Multi-region                |
| Monitoring         | Basic logs      | Metrics + alerts   | Full observability          |
| Security           | Internal only   | External access    | Zero-trust required         |

### Scoring Guide

- **5-10 points**: Simple implementation, single developer
- **11-20 points**: Moderate complexity, team coordination needed
- **21+ points**: Enterprise architecture, multiple teams

## Risk Prioritization Framework

| Risk Level      | Probability | Impact | Action               |
| --------------- | ----------- | ------ | -------------------- |
| **Critical**    | High        | High   | Mitigate immediately |
| **Major**       | High        | Low    | Quick fixes          |
| **Significant** | Low         | High   | Contingency plan     |
| **Minor**       | Low         | Low    | Monitor only         |

### Risk Response Strategies

1. **Avoid**: Change approach to eliminate risk
2. **Mitigate**: Reduce probability or impact
3. **Transfer**: Use external service/insurance
4. **Accept**: Document and monitor

## Common Failure Patterns

### Parameter-Related Failures

| Failure Condition              | Root Cause               | Prevention                                |
| ------------------------------ | ------------------------ | ----------------------------------------- |
| Empty config `ValueMap::new()` | No defaults provided     | Always provide minimal config             |
| Wrong Value variant            | Type mismatch            | Use `ParamDef` with type constraints      |
| Missing connections            | Workflow design issue    | Validate with `builder.build(&registry)?` |
| Runtime params missing         | User input not validated | Validate before execution                 |

### Build-Time Failures

| Failure Point                     | Likelihood | Mitigation                           |
| --------------------------------- | ---------- | ------------------------------------ |
| `builder.build(&registry)?` fails | Medium     | Check node type names match registry |
| Missing node in registry          | Medium     | Verify `register_*_nodes()` called   |
| Connection target not found       | High       | Verify node IDs match exactly        |
| Cyclic dependency detected        | Low        | Review workflow DAG structure        |

### Integration Failure Patterns

| Failure Point              | Likelihood | Mitigation                          |
| -------------------------- | ---------- | ----------------------------------- |
| Network connectivity       | High       | Retry with backoff (RetryNode)      |
| Authentication             | Medium     | Token refresh logic                 |
| Timeout issues             | High       | Configure timeouts in RuntimeConfig |
| Connection pool exhaustion | Medium     | Tune sqlx pool settings             |

### Async-Specific Failures

| Failure Point               | Likelihood | Mitigation                                      |
| --------------------------- | ---------- | ----------------------------------------------- |
| Tokio runtime not available | Medium     | Use `execute_sync()` or ensure `#[tokio::main]` |
| Future not Send             | High       | Check trait bounds, avoid non-Send types        |
| Task cancellation           | Medium     | Use graceful shutdown, cleanup resources        |
| Deadlock on `.await`        | Low        | Avoid blocking in async context                 |

## Analysis Output Template

```markdown
## Executive Summary

**Feature**: [Feature name and scope]

**Complexity Score**: [X]/40 ([LOW/MEDIUM/HIGH])

- Technical: [X]/16
- Rust-Specific: [X]/12
- Operational: [X]/12

**Risk Assessment**:

- Critical risks: [N]
- Major risks: [N]
- Overall risk level: [LOW/MEDIUM/HIGH]

**Recommendation**: [Specific approach with framework/crate choice]

## Detailed Findings

### Failure Points (prioritized by risk)

1. [High risk] [Description] - Mitigation: [approach]
2. [Medium risk] [Description] - Mitigation: [approach]

### Existing Solutions to Reuse

- [Crate/module] - [How it applies]

### Implementation Phases

- **Phase 1**: Mitigate critical risks
- **Phase 2**: Deliver core functionality
- **Phase 3**: Optimize and enhance

### Success Criteria

- [Functional]: [Measurable outcome]
- [Performance]: [Response times, throughput -- reference docs/performance/]
- [Reliability]: [Error rates, recovery time]
```

<!-- Trigger Keywords: failure analysis, root cause, 5-why, complexity assessment, risk prioritization, risk matrix, failure patterns, deep analysis -->
