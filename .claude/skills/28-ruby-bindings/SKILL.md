---
name: ruby-bindings
description: "Magnus Ruby binding patterns for Kailash Rust SDK. Use when asking about 'Ruby binding', 'Magnus', 'rb-sys', 'gem kailash', 'Ruby wrapper', 'GVL release', or 'block-based lifecycle'."
---

# Ruby Bindings -- Quick Reference

Magnus-based binding distributed as `kailash` gem. Uses block-based resource lifecycle with GVL release for concurrent execution.

## Key Facts

| Item              | Value                                   |
| ----------------- | --------------------------------------- |
| **Gem name**      | `kailash`                               |
| **Require**       | `require 'kailash'`                     |
| **FFI framework** | Magnus 0.8 / rb-sys 0.9                 |
| **Library type**  | cdylib (.bundle on macOS, .so on Linux) |

## Block-Based Lifecycle

Ruby binding uses block-based resource management (no manual close):

```ruby
require 'kailash'

Kailash::Registry.open do |reg|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("NoOpNode", "n1", {})
  wf = builder.build(reg)

  Kailash::Runtime.open(reg) do |rt|
    result = rt.execute(wf, {})
    puts result.results
  end
end
```

## GVL Strategy

- Workflow executor runs **without** the GVL (`without_gvl`)
- Callback nodes reacquire the GVL (`with_gvl`) to call Ruby blocks
- This allows concurrent workflow execution alongside Ruby threads

## Registered Modules

| Module                      | Key Classes                                               |
| --------------------------- | --------------------------------------------------------- |
| `Kailash::Registry`         | Node registry with `open` block                           |
| `Kailash::WorkflowBuilder`  | DAG builder                                               |
| `Kailash::Runtime`          | Execution engine with `open` block                        |
| `Kailash::Value`            | Value mapping (Rust <-> Ruby)                             |
| `Kailash::AuditLog`         | Hash-chained audit log, `AuditEntry`, `AuditEventType`    |
| `Kailash::InMemoryEventBus` | Pub/sub domain event bus, `DomainEvent`                   |
| `Kailash::TracingConfig`    | OpenTelemetry tracing, `ExporterType`, `TelemetryMetrics` |

## v3.9.0 Binding Modules

### audit_log

Wraps `kailash-core::audit_log`. Immutable, hash-chained audit log with chain verification.

| Ruby class                         | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `Kailash::AuditEventType`          | Event classification (standard types + `custom()`)          |
| `Kailash::AuditEntry`              | Single chain entry (id, event_type, actor, timestamp, hash) |
| `Kailash::AuditLog`                | Append-only log: `append()`, `entries()`, `verify_chain()`  |
| `Kailash::ChainVerificationResult` | Verification outcome with `valid?` and `errors`             |

### event_bus

Wraps `kailash-core::event_bus`. In-memory pub/sub for domain events.

| Ruby class                  | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `Kailash::DomainEvent`      | Structured event (id, event_type, topic, actor, payload) |
| `Kailash::InMemoryEventBus` | Publish/subscribe: `publish()`, `subscribe()`, `drain()` |

### telemetry

Wraps `kailash-core::telemetry`. OpenTelemetry configuration and atomic metrics counters.

| Ruby class                  | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `Kailash::ExporterType`     | Protocol selection: `otlp`, `jaeger`, `stdout`              |
| `Kailash::TracingConfig`    | OTLP config: endpoint, service name, sample ratio, exporter |
| `Kailash::TelemetryMetrics` | Atomic counters: `increment()`, `get()`, `reset()`, `all()` |

## Skill Files

| File                         | Content                |
| ---------------------------- | ---------------------- |
| `ruby-quickstart.md`         | Getting started guide  |
| `ruby-cheatsheet.md`         | Common patterns        |
| `ruby-common-mistakes.md`    | Pitfalls and fixes     |
| `ruby-custom-nodes.md`       | Callback node patterns |
| `ruby-framework-bindings.md` | Framework Ruby API     |
| `ruby-gold-standards.md`     | Binding quality rules  |
| `ruby-available-nodes.md`    | Node list for Ruby     |

## Related

- **align-specialist** agent -- Inference serving patterns
- **testing-specialist** agent -- Ruby binding test strategies
- **gold-standards-validator** agent -- Naming and licensing compliance
