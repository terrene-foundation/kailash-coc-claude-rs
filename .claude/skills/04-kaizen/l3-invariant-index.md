# Invariant Index

All behavioral invariants organized by primitive. Each invariant is enforced at a specific code location and validated by tests.

## Context Invariants

| ID    | Description                                                    | Enforcement Location           | Test Location                     |
| ----- | -------------------------------------------------------------- | ------------------------------ | --------------------------------- |
| INV-1 | Child read projection subset of parent                         | `ContextScope::create_child()` | `l3/core/context/scope.rs::tests` |
| INV-2 | Read projection checked before returning values                | `ContextScope::get()`          | `l3/core/context/scope.rs::tests` |
| INV-4 | Classification clearance gate (second filter after projection) | `ContextScope::get()`          | `l3/core/context/scope.rs::tests` |
| INV-7 | Parent chain traversal for missing keys                        | `ContextScope::get()`          | `l3/core/context/scope.rs::tests` |

## Envelope Invariants

| ID    | Description                                 | Enforcement Location                    | Test Location                         |
| ----- | ------------------------------------------- | --------------------------------------- | ------------------------------------- |
| INV-5 | Flag threshold < hold threshold             | `PlanGradient::validate()`              | `l3/core/envelope/tracker.rs::tests`  |
| INV-6 | Child envelope provably tighter than parent | `EnvelopeSplitter::validate_split()`    | `l3/core/envelope/splitter.rs::tests` |
| INV-9 | Atomic cost recording (parking_lot::RwLock) | `EnvelopeTracker::record_consumption()` | `l3/core/envelope/tracker.rs::tests`  |

## Pipeline Invariants

| ID    | Description                                         | Enforcement Location                                   | Test Location                   |
| ----- | --------------------------------------------------- | ------------------------------------------------------ | ------------------------------- |
| INV-3 | Non-bypassable enforcement (no disable/bypass/skip) | `L3EnforcementPipeline` design (no such methods exist) | `l3/runtime/pipeline.rs::tests` |

## Factory Invariants

| ID   | Description                            | Enforcement Location                      | Test Location                           |
| ---- | -------------------------------------- | ----------------------------------------- | --------------------------------------- |
| I-01 | Monotonic envelope tightening at spawn | `AgentFactory::spawn()` precondition 2    | `l3/runtime/factory/spawn.rs::tests`    |
| I-03 | Globally unique instance IDs           | `AgentInstanceRegistry::register()`       | `l3/runtime/factory/registry.rs::tests` |
| I-07 | Sufficient budget at spawn             | `AgentFactory::spawn()` precondition 3    | `l3/runtime/factory/spawn.rs::tests`    |
| I-09 | Effective max depth computed at spawn  | `AgentFactory::spawn()` depth calculation | `l3/runtime/factory/spawn.rs::tests`    |

## Plan Invariants

| ID          | Description                                    | Enforcement Location                                   | Test Location                         |
| ----------- | ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| INV-PLAN-01 | No cycles (DAG)                                | `PlanValidator::validate_structure()` topological sort | `l3/core/plan/validator.rs::tests`    |
| INV-PLAN-02 | Referential integrity (edges + input mappings) | `PlanValidator::validate_structure()` edge checks      | `l3/core/plan/validator.rs::tests`    |
| INV-PLAN-03 | At least one root node                         | `PlanValidator::validate_structure()`                  | `l3/core/plan/validator.rs::tests`    |
| INV-PLAN-04 | At least one leaf node                         | `PlanValidator::validate_structure()`                  | `l3/core/plan/validator.rs::tests`    |
| INV-PLAN-05 | Non-empty plan                                 | `PlanValidator::validate_structure()`                  | `l3/core/plan/validator.rs::tests`    |
| INV-PLAN-09 | Events emitted for every state transition      | `PlanExecutor::execute()`                              | `l3/runtime/plan/executor.rs::tests`  |
| INV-PLAN-14 | Batch modification atomicity                   | `apply_modifications()`                                | `l3/core/plan/modification.rs::tests` |

## State Machine Invariants

| ID   | Description                                    | Enforcement Location                | Test Location                     |
| ---- | ---------------------------------------------- | ----------------------------------- | --------------------------------- |
| SM-1 | Terminal states allow no transitions           | `AgentState::validate_transition()` | `l3/core/state_machine.rs::tests` |
| SM-2 | Pending -> Running or Terminated only          | `AgentState::validate_transition()` | `l3/core/state_machine.rs::tests` |
| SM-3 | Running -> Waiting/Completed/Failed/Terminated | `AgentState::validate_transition()` | `l3/core/state_machine.rs::tests` |
| SM-4 | Waiting -> Running or Terminated only          | `AgentState::validate_transition()` | `l3/core/state_machine.rs::tests` |

## Messaging Invariants

| ID    | Description                                                    | Enforcement Location            | Test Location                                |
| ----- | -------------------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| MSG-1 | TTL expired messages go to dead letters                        | `MessageRouter::route()` step 1 | `l3/runtime/messaging/router.rs::tests`      |
| MSG-2 | Terminal recipients reject messages                            | `MessageRouter::route()` step 4 | `l3/runtime/messaging/router.rs::tests`      |
| MSG-3 | Directionality rules enforced per payload type                 | `MessageRouter::route()` step 6 | `l3/runtime/messaging/router.rs::tests`      |
| MSG-4 | Priority ordering in channels (Critical > High > Normal > Low) | `MessageChannel::recv()`        | `l3/runtime/messaging/channel.rs::tests`     |
| MSG-5 | Dead letter store bounded (FIFO eviction at capacity)          | `DeadLetterStore::record()`     | `l3/runtime/messaging/dead_letter.rs::tests` |

## Budget Invariants

| ID    | Description                                          | Enforcement Location                    | Test Location                        |
| ----- | ---------------------------------------------------- | --------------------------------------- | ------------------------------------ |
| BUD-1 | Budget monotonically decreasing (except reclamation) | `EnvelopeTracker::record_consumption()` | `l3/core/envelope/tracker.rs::tests` |
| BUD-2 | f64 validated as finite at API boundary              | All `EnvelopeTracker` public methods    | `l3/core/envelope/tracker.rs::tests` |
| BUD-3 | Internal arithmetic uses u64 microdollars            | `EnvelopeTracker` internal state        | `l3/core/envelope/tracker.rs::tests` |
| BUD-4 | Reclamation only from completed children             | `EnvelopeTracker::reclaim()`            | `l3/core/envelope/tracker.rs::tests` |
