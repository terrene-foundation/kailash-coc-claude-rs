---
name: governance
description: Load governance patterns for trust-enforced agents, verification gradient, delegation chains, human intervention, and compliance reports. Use when building governed agents, configuring trust postures, or generating compliance reports.
---

# Governance Patterns

Quick reference for EATP/CARE/COC/PACT governance patterns in the Kailash Rust SDK.
Covers trust enforcement, verification gradient, delegation chains, multi-sig, circuit breaker, shadow enforcer, lifecycle hooks, human intervention, compliance reports, and PACT organizational governance.

**See also**: `skills/34-pact/SKILL.md` for PACT-specific patterns (D/T/R addressing, knowledge clearance, operating envelopes, 5-step access, 4-zone gradient, GovernanceEngine, PactGovernedAgent).

## Feature Flags

```toml
# Trust module only (CARE chain, EATP, posture, verification, delegation, human)
kailash-kaizen = { workspace = true, features = ["trust"] }

# Trust + Enterprise bridge (GovernanceContext, audit bridges)
kailash-kaizen = { workspace = true, features = ["governance"] }
```

## Governed Agent (Most Common Pattern)

Wrap any BaseAgent with trust enforcement:

```rust
use kailash_kaizen::trust::agent::GovernedAgent;
use eatp::types::{TrustLevel, AgentId};
use std::sync::Arc;

let inner = Arc::new(my_agent);
let agent_id = AgentId::new("my-agent-001")?;
let governed = GovernedAgent::new(inner, agent_id, TrustLevel::Supervised);

// Governed execution — checks capabilities before running
let (result, gov_result) = governed.run_governed("analyze data").await?;
assert!(gov_result.allowed);

// WARNING: Direct BaseAgent::run() bypasses ALL trust checks — NEVER use in production.
// Only acceptable in #[cfg(test)] contexts for testing the underlying agent.
let result = governed.run("analyze data").await?;
```

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

Multi-level delegation with constraint tightening (child ⊆ parent):

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

## GovernedTaodRunner

Full governance pipeline:

```rust
use eatp::governed::{GovernedTaodRunner, GovernedTaodConfig};

let runner = GovernedTaodRunner::new(config, posture_system, eatp_tracker, delegation_chain);

// Pipeline: capability check → verification → evidence → resource tracking
let result = runner.evaluate_action(&Capability::LlmCall, ActionType::LlmCall, details).await?;

if result.allowed {
    // Execute the action
}
```

### Reasoning-Aware Evaluation (RT-038)

`evaluate_action_with_reasoning()` extends the pipeline with reasoning trace propagation:

```rust
use eatp::types::{ReasoningTrace, ResourceConsumption};
use eatp::verification::VerifyOptions;

let reasoning = ReasoningTrace::builder("call LLM", "User request requires language model")
    .confidence(0.9)
    .build()?;

// Pipeline: capability check → verification (with reasoning level) → evidence + reasoning → resource tracking
let result = runner.evaluate_action_with_reasoning(
    &Capability::LlmCall, ActionType::LlmCall, details,
    ResourceConsumption::default(), Some(reasoning), &VerifyOptions::default(),
).await?;

// Result includes the reasoning trace
assert!(result.reasoning_trace.is_some());
```

When `GovernedTaodConfig::require_reasoning` is `true`, the runner rejects actions that lack a reasoning trace. The reasoning is propagated to `record_action_with_reasoning()` on the tracker, populating `reasoning_trace`, `reasoning_trace_hash`, and `reasoning_signature` on the evidence record.

`PendingHold::reasoning_trace` carries the reasoning context into the hold queue, so human reviewers see WHY the action was proposed when approving or rejecting held actions.

The verification log includes reasoning verification status when `VerifyOptions::reasoning_level` is set above `Quick`.

## Governance Bridge (Enterprise Integration)

```rust
// Requires: features = ["governance"]
use kailash_kaizen::governance::GovernanceContext;

let ctx = GovernanceContext::new(posture_system, rbac_evaluator, audit_logger);

// Combined trust + RBAC check
let allowed = ctx.check_permission("user:read", &posture, &user);

// Audit trust operations
ctx.audit_trust_operation("posture_transition", &details).await?;
```

## Compliance Reports

```rust
use kailash_enterprise::compliance::{EatpReportGenerator, CareReportGenerator, ComplianceReport};

let eatp_report = EatpReportGenerator::generate(
    evidence_count, chain_length, has_genesis, has_delegation,
);

let care_report = CareReportGenerator::generate(
    has_competency_eval, has_human_intervention, has_posture_system, has_verification,
);
```

## Human Competencies

```rust
use kailash_enterprise::competency::{CompetencyEvaluator, HumanCompetency};

let evaluator = CompetencyEvaluator::with_defaults();

if evaluator.requires_human("approve financial report") {
    let reqs = evaluator.evaluate("approve financial report");
    // Returns CompetencyRequirements (e.g., EthicalJudgment level 3)
}
```

## Circuit Breaker (Failure Isolation)

Per-agent failure isolation using all-atomic FSM (no locks, DashMap-compatible):

```rust
use kailash_kaizen::trust::circuit_breaker::{CircuitBreakerConfig, CircuitBreakerRegistry};
use std::sync::Arc;

let config = CircuitBreakerConfig {
    failure_threshold: 5,
    success_threshold: 2,
    open_duration: Duration::from_secs(30),
    half_open_max_calls: 1,
};
let registry = Arc::new(CircuitBreakerRegistry::new(config));

// Attach to GovernedAgent
let governed = GovernedAgent::new(inner, agent_id, TrustLevel::Supervised)
    .with_circuit_breaker(Arc::clone(&registry));

// Manual usage
let breaker = registry.get_or_create(&agent_id);
match breaker.can_execute() {
    Ok(()) => { /* proceed */ breaker.record_success(); },
    Err(tripped) => { /* wait, retry_after available */ },
}
```

## Shadow Enforcer (Safe Config Rollout)

Dual-config evaluation with divergence tracking:

```rust
use kailash_kaizen::trust::shadow::ShadowEnforcer;

let enforcer = Arc::new(ShadowEnforcer::new(
    production_config.clone(), // lenient
    shadow_config.clone(),     // strict (candidate)
    10_000,                    // max records for bounded memory
));

// Attach to GovernedAgent
let governed = GovernedAgent::new(inner, agent_id, TrustLevel::Supervised)
    .with_shadow_enforcer(Arc::clone(&enforcer));

// Check divergence report
let report = enforcer.report().await;
match report.recommendation {
    ShadowRecommendation::Promote => enforcer.promote().await,
    ShadowRecommendation::Revert => { /* revert shadow config */ },
    ShadowRecommendation::Keep => { /* continue observing */ },
}
```

## Lifecycle Hooks (Trust Event Dispatch)

Narrow trust event hooks with timeout + panic safety:

```rust
use kailash_kaizen::trust::hooks::{TrustEventHook, TrustEvent, HookDecision, TrustEventDispatcher};

struct AuditHook;
#[async_trait]
impl TrustEventHook for AuditHook {
    async fn on_event(&self, event: &TrustEvent) -> HookDecision {
        log::info!("Trust event: {:?}", event);
        HookDecision::Allow
    }
}

let mut dispatcher = TrustEventDispatcher::new();
dispatcher.register(Arc::new(AuditHook));

// Attach to GovernedAgent
let governed = GovernedAgent::new(inner, agent_id, TrustLevel::Supervised)
    .with_event_dispatcher(Arc::new(dispatcher));
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

## Trust-Integrated Durability

Feature-gated behind `durability-trust` (requires `durability` + `eatp`).

### EATP-Signed Checkpoints (TrustedCheckpointStore)

Wraps any `CheckpointStore` with Ed25519 signing for tamper-evident checkpoint logs:

```rust
use kailash_core::trust_durability::{
    TrustedCheckpointStore, InMemorySignatureStore, CheckpointSignature,
};
use kailash_core::durability::InMemoryCheckpointStore;
use eatp::keys::TrustKeyPair;
use std::sync::Arc;

let keypair = Arc::new(TrustKeyPair::generate());
let inner_store = InMemoryCheckpointStore::new();
let sig_store = InMemorySignatureStore::new();
let trusted = TrustedCheckpointStore::new(inner_store, sig_store, keypair);

// Save: transparently signs every checkpoint with Ed25519
let id = trusted.save(&checkpoint).await?;

// Load: transparently verifies signature — rejects tampered checkpoints
let cp = trusted.load(&id).await?;  // Err if signature invalid

// SQLite-backed signature store (feature: durability-sqlite)
// Survives process restarts — signatures are not lost
#[cfg(all(feature = "durability-trust", feature = "durability-sqlite"))]
let sig_store = SqliteSignatureStore::open("signatures.db")?;
```

**SignatureStore trait**: Persists checkpoint signatures separately. `InMemorySignatureStore` (DashMap, lost on restart) and `SqliteSignatureStore` (persistent, feature-gated).

### Governed Resume (GovernedResumePolicy)

Controls who can resume a workflow and under what constraints:

```rust
use kailash_core::trust_durability::{GovernedResumePolicy, ResumeAuthorization, ResumeConstraintSnapshot};

let policy = GovernedResumePolicy::new(
    delegation_chain.clone(),
    constraint_envelope.clone(),
);

// Verify authority: checks that the resuming agent has valid EATP delegation
let auth: ResumeAuthorization = policy.authorize_resume(
    &agent_id, &checkpoint,
)?;

// Constraint tightening on resume: resumed execution operates under constraints
// that are the intersection (tighter) of the original and current constraints.
// Monotonic tightening invariant preserved across pause/resume cycles.
```

### Constraint-Aware Retries (ConstraintAwareRetryPolicy)

Checks financial and temporal constraints before allowing a retry:

```rust
use kailash_core::trust_durability::ConstraintAwareRetryPolicy;

let retry_policy = ConstraintAwareRetryPolicy::new(constraint_envelope.clone());

// Before retrying a failed workflow:
match retry_policy.can_retry(&dlq_entry, &current_usage) {
    Ok(()) => { /* proceed with retry */ }
    Err(denial) => {
        // RetryDenialReason: FinancialLimitExceeded, TemporalWindowClosed,
        // MaxRetriesExceeded, AgentRevoked
    }
}
```

### Shadow-Mode Durability

Combines shadow checkpoint store with trust signing for safe migration of checkpoint backends:

```rust
use kailash_core::shadow_checkpoint::ShadowCheckpointStore;

// Test a new SQLite-backed trusted store against the existing InMemory store
let shadow = ShadowCheckpointStore::new(production_trusted, candidate_trusted);
// Divergence tracking shows whether the candidate behaves identically
// shadow.divergence_rate() → 0.0 means safe to promote
```

## Key Files

### Trust-Plane (`crates/trust-plane/` — file-backed trust environment)

For trust-plane-specific patterns (constraint enforcement, shadow mode, CLI, MCP, bindings), see **[29-trust-plane](../29-trust-plane/SKILL.md)**.

### EATP Implementation (`crates/eatp/` — proprietary, `publish = false`)

| File                              | Contents                                |
| --------------------------------- | --------------------------------------- |
| `crates/eatp/src/keys.rs`         | Ed25519 TrustKeyPair (ZeroizeOnDrop)    |
| `crates/eatp/src/chain.rs`        | CareChain (genesis, trust blocks)       |
| `crates/eatp/src/delegation.rs`   | DelegationChain, constraint tightening  |
| `crates/eatp/src/verification.rs` | VerificationGradient (4 levels)         |
| `crates/eatp/src/governed.rs`     | GovernedTaodRunner                      |
| `crates/eatp/src/human.rs`        | PseudoAgent, HoldQueue                  |
| `crates/eatp/src/multi_sig.rs`    | MultiSigPolicy, MultiSigBundle (M-of-N) |
| `crates/eatp/src/constraints/`    | 5-dimensional constraints + 6 templates |
| `crates/eatp/src/store/`          | MemoryStore, FilesystemStore, SqlxStore |
| `crates/eatp/src/cli/`            | 16 CLI commands + multi-sig subgroup    |
| `crates/eatp/src/mcp/`            | MCP server (6 tools, 4 resources)       |

### Kaizen Trust Module (kaizen-owned, behind `trust` feature)

| File                                                 | Contents                                        |
| ---------------------------------------------------- | ----------------------------------------------- |
| `crates/kailash-kaizen/src/trust/agent.rs`           | GovernedAgent (CB + shadow + hooks integration) |
| `crates/kailash-kaizen/src/trust/circuit_breaker.rs` | CircuitBreaker FSM (all-atomic), Registry       |
| `crates/kailash-kaizen/src/trust/shadow.rs`          | ShadowEnforcer (dual-config, bounded VecDeque)  |
| `crates/kailash-kaizen/src/trust/hooks.rs`           | TrustEventHook, TrustEventDispatcher            |
| `crates/kailash-kaizen/src/trust/*.rs`               | Re-exports from `eatp` crate                    |
| `crates/kailash-kaizen/src/governance/context.rs`    | GovernanceContext                               |

### Enterprise Modules

| File                                              | Contents                               |
| ------------------------------------------------- | -------------------------------------- |
| `crates/kailash-enterprise/src/competency/mod.rs` | HumanCompetency, CompetencyEvaluator   |
| `crates/kailash-enterprise/src/compliance/`       | ComplianceReport, EATP/CARE generators |
| `bindings/kailash-python/src/kaizen/trust.rs`     | 19 PyO3 types                          |
