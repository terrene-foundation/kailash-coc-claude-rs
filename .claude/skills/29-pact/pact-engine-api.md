# PACT GovernanceEngine API Reference

## Decision API

- `verify_action(role_address, action, context)` -> `GovernanceVerdict`
- `check_access(role_id, knowledge_item, posture)` -> `AccessDecision`
- `compute_envelope(role_address, task_id)` -> `EffectiveEnvelopeSnapshot`

## Query API

- `get_context(role_address, posture)` -> `GovernanceContext` (frozen, read-only)
- `get_node(address)` -> `Option<OrgNode>`
- `get_vacancy_status()` -> `VacancyStatus`

## Mutation API

- `grant_clearance(clearance)` / `revoke_clearance(role_id)`
- `create_bridge(bridge)` / `remove_bridge(bridge_id)`
- `request_bridge(bridge)` -> Pending status; `approve_bridge(bridge_id, approver)` / `reject_bridge(bridge_id, approver)` -> LCA-based approver
- `create_ksp(ksp)` / `remove_ksp(ksp_id)`
- `set_role_envelope(envelope)` / `set_task_envelope(envelope)` / `delete_task_envelope(task_id)`
- `set_vacancy_designation(role_address, acting_occupant, duration_hours)` -> 24h default expiry
- `clear_vacancy_designation(role_address)`

## DelegationBuilder (v3.5.0)

Builder pattern for constructing `DelegationRecord` with dimension scoping:

```rust
use kailash_governance::delegation::{DelegationBuilder, DimensionName};

let record = DelegationBuilder::new("principal-id", "agent-id")
    .scope("task:analysis")
    .dimension(DimensionName::Financial)
    .dimension(DimensionName::DataAccess)
    .ttl_secs(3600)
    .build()?;

// dimension_scope: BTreeSet<DimensionName> -- subset tightening invariant
// Empty set = all 5 dimensions (backward compatible)
```

`DimensionName` enum: `Financial`, `Operational`, `Temporal`, `DataAccess`, `Communication` (closed set, matches EATP spec).

## PactGovernedAgent

Default-deny tool execution wrapper:

```rust
use kailash_pact::agent::PactGovernedAgent;

let mut agent = PactGovernedAgent::new(engine, "D1-R1-T1-R1", "Supervised")?;

// Register allowed tools with estimated costs
agent.register_tool("read_file", Some(0.0), None)?;
agent.register_tool("deploy", Some(500.0), Some("production"))?;

// Execute -- verify-before-act, fail-closed
let result = agent.execute_tool("read_file", || Ok(()))?;
// Unregistered tools -> PactError::Governance (default-deny)
```
