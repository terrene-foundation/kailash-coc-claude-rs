# Circuit Breaker, Shadow Enforcer, and Lifecycle Hooks

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
