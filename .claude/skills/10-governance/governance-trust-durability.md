# Trust-Integrated Durability

Feature-gated behind `durability-trust` (requires `durability` + `eatp`).

## EATP-Signed Checkpoints (TrustedCheckpointStore)

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

// Load: transparently verifies signature -- rejects tampered checkpoints
let cp = trusted.load(&id).await?;  // Err if signature invalid

// SQLite-backed signature store (feature: durability-sqlite)
// Survives process restarts -- signatures are not lost
#[cfg(all(feature = "durability-trust", feature = "durability-sqlite"))]
let sig_store = SqliteSignatureStore::open("signatures.db")?;
```

**SignatureStore trait**: Persists checkpoint signatures separately. `InMemorySignatureStore` (DashMap, lost on restart) and `SqliteSignatureStore` (persistent, feature-gated).

## Governed Resume (GovernedResumePolicy)

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

## Constraint-Aware Retries (ConstraintAwareRetryPolicy)

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

## Shadow-Mode Durability

Combines shadow checkpoint store with trust signing for safe migration of checkpoint backends:

```rust
use kailash_core::shadow_checkpoint::ShadowCheckpointStore;

// Test a new SQLite-backed trusted store against the existing InMemory store
let shadow = ShadowCheckpointStore::new(production_trusted, candidate_trusted);
// Divergence tracking shows whether the candidate behaves identically
// shadow.divergence_rate() -> 0.0 means safe to promote
```
