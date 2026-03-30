# Plan DAG

DAG-based task orchestration: validation, gradient classification, modification, and execution.

## Source Files

### Core (sync)

- `crates/kailash-kaizen/src/l3/core/plan/types.rs` -- `Plan`, `PlanNode`, `PlanEdge`, `EdgeType`, `PlanState`, `PlanNodeState`, `PlanNodeOutput`, `PlanEvent`, `PlanModification`, `PlanError`, `ValidationError`, `PlanStateTransitionError`
- `crates/kailash-kaizen/src/l3/core/plan/validator.rs` -- `PlanValidator`
- `crates/kailash-kaizen/src/l3/core/plan/gradient.rs` -- `GradientClassification`, `GradientAction`, `classify_node_result`, `classify_budget_usage`, `classify_resolution_timeout`
- `crates/kailash-kaizen/src/l3/core/plan/modification.rs` -- `validate_modification`, `apply_modification`, `apply_modifications`

### Runtime (async)

- `crates/kailash-kaizen/src/l3/runtime/plan/executor.rs` -- `PlanExecutor`, `PlanExecutionError`

## Plan Structure

A directed acyclic graph of `PlanNode`s connected by `PlanEdge`s:

- Each `PlanNode` maps to an `AgentSpec` to be spawned
- Each `PlanEdge` represents a dependency between nodes
- The plan has a bounding `ConstraintEnvelope` and `PlanGradient` configuration

### Key Fields

- `plan_id: Uuid` -- unique identifier
- `name: String` -- human-readable name
- `envelope: ConstraintEnvelope` -- bounds the entire plan
- `gradient: PlanGradient` -- gradient classification configuration
- `nodes: HashMap<PlanNodeId, PlanNode>` -- node map
- `edges: Vec<PlanEdge>` -- dependency edges
- `state: PlanState` -- lifecycle state

### PlanState Transitions

```
Draft -> Validated -> Executing -> Completed/Failed/Suspended/Cancelled
```

### EdgeType

- `DataDependency` -- successor uses predecessor's output
- `CompletionDependency` -- successor waits for predecessor to complete
- `CoStart` -- nodes start simultaneously (no data/completion dependency)

## PlanValidator

Stateless, deterministic validation. Checks ALL errors (not just the first):

| Invariant   | Check                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| INV-PLAN-01 | No cycles (topological sort)                                              |
| INV-PLAN-02 | Referential integrity (edges and input mappings reference existing nodes) |
| INV-PLAN-03 | At least one root node (no incoming Data/Completion edges)                |
| INV-PLAN-04 | At least one leaf node (no outgoing Data/Completion edges)                |
| INV-PLAN-05 | Non-empty (at least one node)                                             |

Also checks: no self-edges, input mapping consistency.

## Gradient Classification (Rules G1-G9)

Deterministic classification of node events. No LLM consultation.

| Rule | Trigger                                        | Zone                     | Action                |
| ---- | ---------------------------------------------- | ------------------------ | --------------------- |
| G1   | Required node success                          | AutoApproved             | Proceed               |
| G2   | Required retryable failure + retries remaining | AutoApproved             | Retry                 |
| G3   | Required retries exhausted                     | `after_retry_exhaustion` | Hold/Block            |
| G4   | Required non-retryable failure                 | Held                     | Hold                  |
| G5   | Optional node failure                          | `optional_node_failure`  | Skip if allowed       |
| G6   | Budget >= flag threshold                       | Flagged                  | --                    |
| G7   | Budget >= hold threshold                       | Held                     | --                    |
| G8   | Budget > 1.0                                   | Blocked                  | -- (non-configurable) |
| G9   | Resolution timeout on held node                | Blocked                  | --                    |

Functions: `classify_node_result()`, `classify_budget_usage()`, `classify_resolution_timeout()`.

## Plan Modification (7 Variants)

Each modification is validated against all invariants before application:

| Variant                                 | Purpose                                |
| --------------------------------------- | -------------------------------------- |
| `AddNode { node, edges }`               | Add a node with optional edges         |
| `RemoveNode { node_id }`                | Remove a pending/skipped node          |
| `ReplaceNode { old_node_id, new_node }` | Replace a pending node with a new spec |
| `AddEdge { edge }`                      | Add a dependency edge                  |
| `RemoveEdge { from, to }`               | Remove an edge                         |
| `UpdateSpec { node_id, new_spec }`      | Update a pending node's spec           |
| `SkipNode { node_id, reason }`          | Mark a node as skipped                 |

### Batch Atomicity (INV-PLAN-14)

`apply_modifications(plan, mods)` is all-or-nothing: if any modification in the batch would violate an invariant (considering preceding modifications), the entire batch is rejected and the plan is unchanged.

## PlanExecutor

Runtime execution of validated plans:

- `new(factory)` -- creates executor with an `AgentFactory`
- `subscribe()` -- subscribes to `PlanEvent` broadcast stream
- `execute(plan)` -- main loop: identify ready nodes -> spawn via factory -> wait -> classify via gradient -> update state -> repeat
- `suspend(plan)` / `resume(plan)` / `cancel(plan)` -- lifecycle operations
- `apply_hot_modification(plan, modification)` -- modify during execution (re-validates)

Emits `PlanEvent`s for every state transition (INV-PLAN-09).

The executor does NOT decide how to recover from failures -- it classifies failures into gradient zones deterministically. Recovery is the orchestration layer's responsibility.

## Key Invariants

| ID          | Description                               | Enforcement Location                  |
| ----------- | ----------------------------------------- | ------------------------------------- |
| INV-PLAN-01 | No cycles (DAG)                           | `PlanValidator::validate_structure()` |
| INV-PLAN-02 | Referential integrity                     | `PlanValidator::validate_structure()` |
| INV-PLAN-03 | At least one root node                    | `PlanValidator::validate_structure()` |
| INV-PLAN-04 | At least one leaf node                    | `PlanValidator::validate_structure()` |
| INV-PLAN-05 | Non-empty plan                            | `PlanValidator::validate_structure()` |
| INV-PLAN-09 | Events emitted for every state transition | `PlanExecutor::execute()`             |
| INV-PLAN-14 | Batch modification atomicity              | `apply_modifications()`               |
