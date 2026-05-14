---
name: gsf-cap
description: "GSF CAP features (Rust v3.3) — audit chain, domain event bus, enterprise middleware, data classification, field validation, query telemetry across kailash-core/nexus/dataflow."
---

# GSF CAP Features

Eight governance, security, and framework capabilities implemented across four crates in the v3.3 workspace.

## Feature Index

| #   | Feature               | Crate              | Key Types                                                                                   | Source File                                         |
| --- | --------------------- | ------------------ | ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | Audit Chain           | `kailash-core`     | `AuditLog`, `AuditEntry`, `ChainVerificationResult`                                         | `crates/kailash-core/src/audit_log.rs`              |
| 2   | Domain Event Bus      | `kailash-core`     | `DomainEventBus`, `InMemoryEventBus`, `DomainEvent`                                         | `crates/kailash-core/src/event_bus.rs`              |
| 3   | Event Routing Bridge  | `kailash-core`     | `EventBridge`                                                                               | `crates/kailash-core/src/event_routing.rs`          |
| 4   | Enterprise Middleware | `kailash-nexus`    | `NexusEngine`, `EnterpriseMiddlewareConfig`, Tower layers (CSRF/Audit/Metrics/ErrorHandler) | `crates/kailash-nexus/src/engine.rs`, `middleware/` |
| 5   | Data Classification   | `kailash-dataflow` | `DataClassification`, `MaskingStrategy`, `DataRetentionEnforcer`                            | `crates/kailash-dataflow/src/classification.rs`     |
| 6   | Field Validation      | `kailash-dataflow` | `FieldValidator`, `ValidationLayer`, `ValidationRule`                                       | `crates/kailash-dataflow/src/validation.rs`         |
| 7   | Query Telemetry       | `kailash-dataflow` | `QueryEngine`, `QueryStats`, `PoolMonitor`                                                  | `crates/kailash-dataflow/src/query_engine.rs`       |
| 8   | Lazy DataFlow         | `kailash-dataflow` | `LazyDataFlow`, `TracingConfig`                                                             | `crates/kailash-dataflow/src/connection.rs`         |

## Skill Files

| File                                                 | Content                                          |
| ---------------------------------------------------- | ------------------------------------------------ |
| [audit-chain.md](audit-chain.md)                     | Hash-chained audit log, verification, retention  |
| [event-bus.md](event-bus.md)                         | Domain event bus, routing bridge, subscriptions  |
| [enterprise-middleware.md](enterprise-middleware.md) | Nexus enterprise middleware, K8s probes, routers |
| [data-classification.md](data-classification.md)     | Field classification, masking, retention         |
| [validation-patterns.md](validation-patterns.md)     | Field validators, validation layer, CRUD hooks   |
| [query-telemetry.md](query-telemetry.md)             | Query stats, slow query detection, pool monitor  |

## Cross-References

| Feature               | Related Skills                                            |
| --------------------- | --------------------------------------------------------- |
| Audit Chain           | `01-core/enterprise-infrastructure.md` (execution stores) |
| Event Bus             | `01-core/core-events-visualization.md` (ExecutionEvent)   |
| Enterprise Middleware | `03-nexus/` (handler pattern, middleware presets)         |
| Data Classification   | `02-dataflow/` (model definition, field types)            |
| Field Validation      | `02-dataflow/` (model nodes, CRUD generation)             |
| Query Telemetry       | `02-dataflow/` (connection management, pool lifecycle)    |

## Crate Dependency Context

```
kailash-core (audit_log, event_bus, domain_event, event_routing, telemetry)
  <- kailash-nexus (enterprise middleware, K8s probes, include_router)
  <- kailash-dataflow (classification, validation, query_engine, pool_monitor, LazyDataFlow)
```
