---
name: l3-autonomy
description: "L3 agent autonomy primitives (Rust) — envelope tracking, context scoping, messaging, agent factory, plan DAG, enforcement pipeline. For governed multi-agent systems."
---

# 31-l3-autonomy: L3 Agent Autonomy Primitives

Feature flags: `l3-core` (sync types, WASM-compatible), `l3` (full runtime, requires tokio)
Module root: `crates/kailash-kaizen/src/l3/`

## Architecture

Two layers, mirroring the core/runtime split:

- **`l3::l3_core`** (`l3-core` feature) -- sync types, validation, state machines. No tokio. WASM-compatible.
- **`l3::runtime`** (`l3` feature, implies `l3-core`) -- async execution, channels, spawning. Requires tokio.

## Quick Reference

| Primitive | Core Type                                                | Runtime Type                                            | Purpose                         | Skill                                        |
| --------- | -------------------------------------------------------- | ------------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| Envelope  | `EnvelopeTracker`, `EnvelopeSplitter`, `EnvelopeVerdict` | `L3EnforcementPipeline`                                 | Budget monitoring + enforcement | [envelope-tracking.md](envelope-tracking.md) |
| Context   | `ContextScope`, `ScopeProjection`, `DataClassification`  | --                                                      | Hierarchical data isolation     | [scoped-context.md](scoped-context.md)       |
| Messaging | `MessageEnvelope`, `L3MessagePayload`, `Priority`        | `MessageRouter`, `MessageChannel`, `DeadLetterStore`    | Inter-agent communication       | [messaging.md](messaging.md)                 |
| Factory   | `AgentSpec`, `AgentInstance`, `AgentState`               | `AgentFactory`, `AgentInstanceRegistry`, `AgentBuilder` | Agent lifecycle management      | [agent-factory.md](agent-factory.md)         |
| Plan      | `Plan`, `PlanNode`, `PlanEdge`, `PlanModification`       | `PlanExecutor`                                          | DAG-based task orchestration    | [plan-dag.md](plan-dag.md)                   |
| Pipeline  | --                                                       | `L3EnforcementPipeline`, `L3Verdict`, `L3GovernedAgent` | Unified enforcement entry point | [envelope-tracking.md](envelope-tracking.md) |

## Cross-Cutting

- [type-convergence.md](type-convergence.md) -- GradientZone, DataClassification, ConstraintEnvelope reuse decisions
- [invariant-index.md](invariant-index.md) -- All 52 behavioral invariants cross-referenced by primitive

## Key Source Directories

```
crates/kailash-kaizen/src/l3/
  mod.rs                          # Feature-gated l3_core + runtime
  core/
    mod.rs                        # context, envelope, factory, messaging, plan, state_machine, types
    types.rs                      # L3Verdict, PlanGradient (shared types)
    state_machine.rs              # AgentState, WaitReason, TerminationReason
    context/                      # ContextScope, ScopeProjection, DataClassification, ContextValue
    envelope/                     # EnvelopeTracker, EnvelopeSplitter, EnvelopeVerdict
    factory/                      # AgentSpec, AgentInstance, D/T/R address computation
    messaging/                    # MessageEnvelope, L3MessagePayload, Priority, error types
    plan/                         # Plan, PlanNode, PlanEdge, PlanValidator, gradient, modification
  runtime/
    mod.rs                        # agent, factory, messaging, pipeline, plan
    agent.rs                      # L3GovernedAgent
    pipeline.rs                   # L3EnforcementPipeline, L3Verdict, L3VerdictSource
    factory/                      # AgentFactory, AgentInstanceRegistry, AgentBuilder
    messaging/                    # MessageRouter, MessageChannel, DeadLetterStore
    plan/                         # PlanExecutor
```

## Dependencies

L3 depends on types from three other crates:

| Crate          | Types Used                                                 | Notes                                               |
| -------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| `kailash-pact` | `GradientZone`, `ClassificationLevel`                      | Reused for gradient zones and classification levels |
| `trust-plane`  | `ConstraintEnvelope`, `StrictEnforcer`                     | Reused for 5-dim envelopes and enforcement          |
| `eatp`         | `DataClassification`, `HoldQueue`, `AgentId`, `Capability` | Reused for data classification and human holds      |
