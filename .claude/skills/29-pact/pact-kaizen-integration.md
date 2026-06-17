# PACT + Kaizen Integration

PACT governance and kailash-kaizen's trust module are independent but complementary layers. PACT provides organizational governance (who can do what within the org structure), while kaizen's trust module provides cryptographic trust (EATP chains, delegation, verification gradient).

## Relationship

- **PACT** (`kailash-pact`): Organizational governance -- D/T/R addresses, knowledge clearance, operating envelopes, 5-step access, 4-zone gradient. No dependency on kaizen.
- **Kaizen trust** (`kailash-kaizen::trust`): Cryptographic trust -- Ed25519 keys, CareChain, delegation chains, circuit breakers, shadow enforcers, lifecycle hooks. Depends on `eatp` crate.
- **Shared type**: Both use `eatp::constraints::ConstraintEnvelope` / `Dimensions` for the 5-dimensional constraint model. PACT wraps these in its `RoleEnvelope`/`TaskEnvelope` layers.

## Bridging Pattern (Application Code)

```rust
use kailash_pact::engine::GovernanceEngine;
use kailash_pact::agent::PactGovernedAgent;
use kailash_kaizen::trust::agent::GovernedAgent;

// 1. PACT layer: organizational governance
let pact_engine = GovernanceEngine::new(org_def)?;
let mut pact_agent = PactGovernedAgent::new(pact_engine, "D1-R1-T1-R1", posture)?;
pact_agent.register_tool("analyze", Some(5.0), None)?;

// 2. Kaizen layer: cryptographic trust (wraps a BaseAgent)
let governed = GovernedAgent::new(base_agent, trust_config).await?;

// 3. Compose: PACT verifies org constraints, then kaizen executes with trust
let pact_result = pact_agent.execute_tool("analyze", || {
    // Inside: kaizen's governed TAOD loop handles evidence + delegation
    governed.run_governed(task).await
})?;
```

## Key Distinction

`PactGovernedAgent` enforces envelope limits and access policies at the organizational level. `GovernedAgent` (kaizen) enforces cryptographic trust, evidence recording, and delegation chain validity at the protocol level. In production, both layers wrap the same underlying agent execution.

## EATP Type Convergence

PACT's `envelopes.rs` imports `eatp::constraints::{ConstraintEnvelope, Dimensions, FinancialConstraints, ...}` directly. The `intersect_dimensions()` function in PACT applies pass-through semantics (NULL=unconstrained, aligned with EATP) on top of the shared EATP types, ensuring the same constraint vocabulary and NULL semantics are used across both layers.
