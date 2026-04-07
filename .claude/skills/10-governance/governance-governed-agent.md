# Governed Agent Pattern

Wrap any BaseAgent with trust enforcement.

## Feature Flags

```toml
# Trust module only (CARE chain, EATP, posture, verification, delegation, human)
kailash-kaizen = { workspace = true, features = ["trust"] }

# Trust + Enterprise bridge (GovernanceContext, audit bridges)
kailash-kaizen = { workspace = true, features = ["governance"] }
```

## GovernedAgent

```rust
use kailash_kaizen::trust::agent::GovernedAgent;
use eatp::types::{TrustLevel, AgentId};
use std::sync::Arc;

let inner = Arc::new(my_agent);
let agent_id = AgentId::new("my-agent-001")?;
let governed = GovernedAgent::new(inner, agent_id, TrustLevel::Supervised);

// Governed execution -- checks capabilities before running
let (result, gov_result) = governed.run_governed("analyze data").await?;
assert!(gov_result.allowed);

// WARNING: Direct BaseAgent::run() bypasses ALL trust checks -- NEVER use in production.
// Only acceptable in #[cfg(test)] contexts for testing the underlying agent.
let result = governed.run("analyze data").await?;
```

## GovernedTaodRunner

Full governance pipeline:

```rust
use eatp::governed::{GovernedTaodRunner, GovernedTaodConfig};

let runner = GovernedTaodRunner::new(config, posture_system, eatp_tracker, delegation_chain);

// Pipeline: capability check -> verification -> evidence -> resource tracking
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

// Pipeline: capability check -> verification (with reasoning level) -> evidence + reasoning -> resource tracking
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
