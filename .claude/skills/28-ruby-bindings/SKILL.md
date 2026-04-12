---
name: ruby-bindings
description: "Magnus Ruby binding patterns for Kailash Rust SDK. Use when asking about 'Ruby binding', 'Magnus', 'rb-sys', 'gem kailash', 'Ruby wrapper', 'GVL release', or 'block-based lifecycle'."
---

# Ruby Bindings — Quick Reference

Magnus-based binding distributed as `kailash` gem. Uses block-based resource lifecycle with GVL release for concurrent execution.

## Key Facts

| Item              | Value                                    |
| ----------------- | ---------------------------------------- |
| **Gem name**      | `kailash`                                |
| **Require**       | `require 'kailash'`                      |
| **Rust crate**    | `bindings/kailash-ruby/`                 |
| **FFI framework** | Magnus 0.8 / rb-sys `>=0.9.113,<0.9.121` |
| **Library type**  | cdylib (.bundle on macOS, .so on Linux)  |

> **Known Issue (PR #349):** rb-sys must be pinned to `>=0.9.113,<0.9.121` in `bindings/kailash-ruby/Cargo.toml`. Versions 0.9.121+ introduced a breaking change. Both `[dependencies]` and `[build-dependencies]` entries carry this pin with the `stable-api` feature.

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

### audit_log (314 lines)

Wraps `kailash-core::audit_log`. Immutable, hash-chained audit log with chain verification.

| Ruby class                         | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `Kailash::AuditEventType`          | Event classification (standard types + `custom()`)          |
| `Kailash::AuditEntry`              | Single chain entry (id, event_type, actor, timestamp, hash) |
| `Kailash::AuditLog`                | Append-only log: `append()`, `entries()`, `verify_chain()`  |
| `Kailash::ChainVerificationResult` | Verification outcome with `valid?` and `errors`             |

Source: `bindings/kailash-ruby/ext/kailash/src/audit_log.rs`

### event_bus (154 lines)

Wraps `kailash-core::event_bus`. In-memory pub/sub for domain events.

| Ruby class                  | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `Kailash::DomainEvent`      | Structured event (id, event_type, topic, actor, payload) |
| `Kailash::InMemoryEventBus` | Publish/subscribe: `publish()`, `subscribe()`, `drain()` |

Source: `bindings/kailash-ruby/ext/kailash/src/event_bus.rs`

### telemetry (262 lines)

Wraps `kailash-core::telemetry`. OpenTelemetry configuration and atomic metrics counters.

| Ruby class                  | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `Kailash::ExporterType`     | Protocol selection: `otlp`, `jaeger`, `stdout`              |
| `Kailash::TracingConfig`    | OTLP config: endpoint, service name, sample ratio, exporter |
| `Kailash::TelemetryMetrics` | Atomic counters: `increment()`, `get()`, `reset()`, `all()` |

Source: `bindings/kailash-ruby/ext/kailash/src/telemetry.rs`

### convergence (platform-architecture-convergence)

Cross-cutting SPEC types under `Kailash::Convergence`. 7 types wrapping EATP posture, auth, provider capabilities, and audit primitives.

| Ruby class                                 | Rust source type                     | SPEC    |
| ------------------------------------------ | ------------------------------------ | ------- |
| `Kailash::Convergence::PostureLevel`       | `eatp::types::PostureLevel`          | SPEC-07 |
| `Kailash::Convergence::AgentPosture`       | `kailash_kaizen::AgentPosture`       | SPEC-07 |
| `Kailash::Convergence::EatpJwtClaims`      | `eatp::types::EatpJwtClaims`         | SPEC-06 |
| `Kailash::Convergence::ProviderCapability` | `kailash_kaizen::ProviderCapability` | SPEC-01 |
| `Kailash::Convergence::AuditOutcome`       | `kailash_enterprise::AuditOutcome`   | SPEC-08 |
| `Kailash::Convergence::AuditActor`         | `kailash_enterprise::AuditActor`     | SPEC-08 |
| `Kailash::Convergence::AuditResource`      | `kailash_enterprise::AuditResource`  | SPEC-08 |

Source: `bindings/kailash-ruby/ext/kailash/src/convergence.rs`

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

- **ruby-binding** agent — Magnus implementation specialist
- **ruby-pattern-expert** agent — Debugging Magnus errors
- **ruby-gold-standards** agent — Ruby binding compliance validation
