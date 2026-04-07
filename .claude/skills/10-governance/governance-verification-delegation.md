# Verification Gradient and Delegation Chains

## Verification Gradient

4-level evaluation based on resource utilization:

```rust
use eatp::verification::{VerificationConfig, VerificationEvaluator, ResourceUsageSnapshot, VerificationResult};

let config = VerificationConfig::default(); // flag: 80%, hold: 95%
let evaluator = VerificationEvaluator::new(config);

let usage = ResourceUsageSnapshot {
    llm_calls_used: 45,
    tool_calls_used: 10,
    tokens_used: 90_000,
    execution_secs: 120,
};

match evaluator.evaluate(&capability, trust_level, &usage, &limits) {
    VerificationResult::AutoApproved { capability, reason } => { /* proceed */ }
    VerificationResult::Flagged { capability, utilization, .. } => { /* proceed + review */ }
    VerificationResult::Held { capability, hold_id, .. } => { /* queue for human */ }
    VerificationResult::Blocked { capability, reason } => { /* reject */ }
}
```

## Delegation Chain

Multi-level delegation with constraint tightening (child subset of parent):

```rust
use eatp::{delegation::{DelegationChain, DelegationScope}, keys::TrustKeyPair, types::{AgentId, Capability, ConstraintDimensions, TrustLevel}};
use std::sync::Arc;

let keypair = Arc::new(TrustKeyPair::generate());
let mut chain = DelegationChain::new(Arc::clone(&keypair));

let delegator = AgentId::new("manager")?;
let delegate = AgentId::new("worker")?;

chain.delegate(
    delegator, delegate,
    vec![Capability::LlmCall, Capability::ToolCall],
    ConstraintDimensions::for_level(TrustLevel::Supervised),
    ResourceLimits::for_level(TrustLevel::Supervised),
    DelegationScope::new("finance")
        .with_operation("read")
        .with_operation("analyze")
        .with_max_financial_cents(10_000),
    Some(expiry),
    None, // no parent delegation
    Some(&keypair), // signing key
)?;

// Cascade revocation
chain.revoke(delegation_id)?;

// Verify chain integrity
chain.verify_chain()?;
```

## Human Intervention (PseudoAgent)

The ONLY entry point for human authority:

```rust
use eatp::{human::{PseudoAgent, HumanOrigin, HoldQueue}, keys::TrustKeyPair, types::Capability};
use std::sync::Arc;

let origin = HumanOrigin::new("admin@acme.com", "security-officer")
    .with_attestation("badge-123");
let keypair = Arc::new(TrustKeyPair::generate());
let pseudo = PseudoAgent::new(origin, keypair);

// Approve held action
let approval = pseudo.approve_hold(hold_id, Some("Reviewed".into()))?;

// Override blocked action (requires Capability + justification + optional expiry)
let override_record = pseudo.override_block(Capability::CodeExecution, "Emergency", None)?;
```

## Multi-Sig Delegation

M-of-N threshold signing for delegation records (in `eatp` crate):

```rust
use eatp::multi_sig::{MultiSigPolicy, MultiSigBundle};

let policy = MultiSigPolicy::new(2, vec![pk1, pk2, pk3])?; // 2-of-3
let mut bundle = MultiSigBundle::new(payload);
bundle.add_signature(&keypair1, payload)?;
bundle.add_signature(&keypair2, payload)?;
let result = policy.validate(&bundle, payload)?;
assert!(result.threshold_met);
```
