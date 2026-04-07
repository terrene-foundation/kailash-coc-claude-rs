---
name: governance
description: Load governance patterns for trust-enforced agents, verification gradient, delegation chains, human intervention, and compliance reports. Use when building governed agents, configuring trust postures, or generating compliance reports.
---

# Governance Patterns

Quick reference for EATP/CARE/COC/PACT governance patterns in the Kailash Rust SDK.
Covers trust enforcement, verification gradient, delegation chains, multi-sig, circuit breaker, shadow enforcer, lifecycle hooks, human intervention, compliance reports, and PACT organizational governance.

**See also**: `skills/29-pact/SKILL.md` for PACT-specific patterns (D/T/R addressing, knowledge clearance, operating envelopes, 5-step access, 4-zone gradient, GovernanceEngine, PactGovernedAgent).

## Reference Documentation

### Core Governance

- **[governance-governed-agent](governance-governed-agent.md)** -- GovernedAgent wrapper, GovernedTaodRunner pipeline, reasoning-aware evaluation (RT-038)
- **[governance-verification-delegation](governance-verification-delegation.md)** -- 4-level verification gradient, delegation chains, human intervention (PseudoAgent), multi-sig (M-of-N)
- **[governance-circuit-breaker-shadow](governance-circuit-breaker-shadow.md)** -- Circuit breaker FSM (all-atomic), shadow enforcer (dual-config rollout), lifecycle hooks (trust event dispatch)

### Enterprise and Durability

- **[governance-compliance-competency](governance-compliance-competency.md)** -- Governance bridge, EATP/CARE compliance reports, human competency evaluation
- **[governance-trust-durability](governance-trust-durability.md)** -- EATP-signed checkpoints, governed resume policy, constraint-aware retries, shadow-mode durability

## Key Files

### Trust-Plane (`crates/trust-plane/` -- file-backed trust environment)

For trust-plane-specific patterns (constraint enforcement, shadow mode, CLI, MCP, bindings), see **[29-trust-plane](../29-trust-plane/SKILL.md)**.

### EATP Implementation (`crates/eatp/` -- proprietary, `publish = false`)

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
