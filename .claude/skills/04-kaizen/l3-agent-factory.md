# Agent Factory

Agent lifecycle management: blueprints, spawning, state machines, cascade termination.

## Source Files

### Core (sync)

- `crates/kailash-kaizen/src/l3/core/factory/spec.rs` -- `AgentSpec`
- `crates/kailash-kaizen/src/l3/core/factory/instance.rs` -- `AgentInstance`
- `crates/kailash-kaizen/src/l3/core/factory/address.rs` -- D/T/R address computation (`root_address`, `child_address`, `is_descendant`, `are_siblings`, `parent_address`, `address_depth`)
- `crates/kailash-kaizen/src/l3/core/state_machine.rs` -- `AgentState`, `WaitReason`, `TerminationReason`, `StateTransitionError`

### Runtime (async)

- `crates/kailash-kaizen/src/l3/runtime/factory/spawn.rs` -- `AgentFactory`, `FactoryError`, `SpawnResult`
- `crates/kailash-kaizen/src/l3/runtime/factory/registry.rs` -- `AgentInstanceRegistry`, `RegistryError`
- `crates/kailash-kaizen/src/l3/runtime/factory/builder.rs` -- `AgentBuilder` trait, `DefaultAgentBuilder`
- `crates/kailash-kaizen/src/l3/runtime/agent.rs` -- `L3GovernedAgent`

## AgentSpec

Blueprint for creating agent instances. Value type, can be cloned and reused.

Key fields:

- `spec_id: String` -- unique identifier
- `name: String` -- human-readable name
- `envelope: ConstraintEnvelope` -- constraint envelope (must satisfy monotonic tightening)
- `tool_ids: Vec<String>` -- tools this agent may use (must be subset of parent's)
- `max_children: Option<usize>` -- maximum direct children
- `max_depth: Option<usize>` -- maximum delegation depth below
- `max_lifetime: Option<Duration>` -- wall-clock timeout
- `required_context_keys: Vec<String>` -- keys parent must provide
- `produced_context_keys: Vec<String>` -- keys this agent will produce (informational)

Builder pattern: `AgentSpec::new(id, name, envelope).with_tools(...).with_max_children(...)`.

## AgentInstance

Running agent with lifecycle tracking. Each instance has a unique `instance_id`.

Key fields:

- `instance_id: Uuid` -- globally unique
- `spec_id: String` -- which spec created this instance
- `state: AgentState` -- current lifecycle state (via `state()` accessor)
- `parent_instance_id: Option<Uuid>` -- lineage tracking
- `active_envelope: ConstraintEnvelope` -- may be tightened at runtime
- `budget_tracker: Option<Arc<EnvelopeTracker>>` -- runtime budget tracker
- `effective_max_depth: Option<usize>` -- computed at spawn: `min(parent.depth - 1, spec.max_depth)`

State transitions via `transition_to(new_state)` -- validates transition legality.

## AgentState Machine

```
Pending -> Running, Terminated
Running -> Waiting, Completed, Failed, Terminated
Waiting -> Running, Terminated
Completed, Failed, Terminated -> (terminal -- no further transitions)
```

### WaitReason Variants

- `ChildAgent` -- waiting for child to complete
- `HumanApproval` -- waiting for human input
- `ExternalResource` -- waiting for external system
- `DelegationResponse { message_id }` -- waiting for response to a delegation message
- `HumanApprovalHold { hold_id }` -- waiting for human approval of held action
- `ResourceAvailability` -- waiting for resource to free up

### TerminationReason Variants

- `Cancelled` -- by parent or operator
- `Timeout` -- max_lifetime exceeded
- `ConstraintViolation` -- envelope constraint violated
- `ParentTerminated` -- cascade from parent
- `EnvelopeViolation { dimension, detail }` -- specific dimension violation
- `BudgetExhausted { dimension }` -- budget fully consumed
- `ExplicitTermination { by }` -- requested by another agent

## AgentFactory::spawn (8 Preconditions)

Checked in order:

1. Parent exists and is Running or Waiting
2. Child envelope <= parent envelope (monotonic tightening)
3. Parent has sufficient budget
4. Parent hasn't exceeded max_children
5. Delegation depth within max_depth
6. Child tool_ids subset of parent's tools
7. Required context keys present in parent's scope
8. Budget debited from parent's EnvelopeTracker

If any precondition fails, the spawn is rejected and NO side effects occur.

## Cascade Termination

`factory.terminate(id, reason)`:

1. Collects all descendants (deepest first via DFS)
2. Terminates each descendant with `TerminationReason::ParentTerminated`
3. Reclaims budget at each level
4. Closes channels for terminated instances
5. Finally terminates the target instance

## D/T/R Address Computation

Deterministic positional addressing for PACT:

```
Root agent:        D1-R1
  Child 1:         D1-R1-T1-R1
    Grandchild:    D1-R1-T1-R1-T1-R1
  Child 2:         D1-R1-T2-R1
```

Functions: `root_address(prefix)`, `child_address(parent, ordinal)`, `is_descendant(desc, anc)`, `are_siblings(a, b)`, `parent_address(addr)`, `address_depth(addr)`.

Prefix containment: X is a descendant of Y iff X's address starts with Y's address followed by `-`.

## AgentBuilder Trait

The SDK/LLM boundary. The factory validates governance; the builder constructs the agent.

```rust
pub trait AgentBuilder: Send + Sync {
    fn build(&self, spec: &AgentSpec) -> Result<Arc<dyn BaseAgent>, AgentError>;
}
```

`DefaultAgentBuilder` creates stub agents for testing (no LLM calls).

## L3GovernedAgent

Runtime wrapper: `BaseAgent` + `L3EnforcementPipeline` + instance ID + optional `ContextScope`.

- `run_governed(input)` -- checks pipeline, then executes inner agent if allowed
- `pipeline()` -- access the enforcement pipeline
- `context()` -- access the optional context scope
- Non-bypassable: no `disable()` or `skip()` method

## Key Invariants

| ID   | Description                            | Enforcement Location                   |
| ---- | -------------------------------------- | -------------------------------------- |
| I-01 | Monotonic envelope tightening at spawn | `AgentFactory::spawn()` precondition 2 |
| I-03 | Globally unique instance IDs           | `AgentInstanceRegistry::register()`    |
| I-07 | Sufficient budget at spawn             | `AgentFactory::spawn()` precondition 3 |
