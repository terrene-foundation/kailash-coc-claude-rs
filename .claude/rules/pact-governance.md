# PACT Governance Rules

## Scope

These rules apply to ALL code in `crates/kailash-pact/**` and `bindings/*/src/pact*`.

## MUST Rules

### 1. Frozen GovernanceContext

Agents receive `GovernanceContext` (Serialize only), NEVER `GovernanceEngine`. The context MUST NOT derive `Deserialize` (prevents forgery of elevated privileges).

### 2. Monotonic Tightening

Child envelopes MUST be equal to or more restrictive than parent envelopes in ALL 5 dimensions. `validate_tightening_dims()` enforces this at the type level.

### 3. D/T/R Grammar

Every Department (D) or Team (T) segment MUST be immediately followed by exactly one Role (R) segment. Grammar is validated at `Address::parse()` construction time.

### 4. Fail-Closed Decisions

All `verify_action()` and `check_access()` error paths MUST return BLOCKED/DENY. If envelope computation fails, return `GradientZone::Blocked`. If any precondition fails, return deny.

### 5. Default-Deny Tool Registration

Tools MUST be explicitly registered with `PactGovernedAgent::register_tool()`. Unregistered tools produce `PactError::Governance` (default-deny).

### 6. NaN/Inf Validation on ALL Financial Context Values

`evaluate_financial()` MUST check `is_finite()` for BOTH `transaction_amount`/`cost` AND `daily_total` context values. NaN bypasses all comparison operators (`NaN < x` is always false).

### 7. Compilation Safety Limits

`MAX_DEPTH = 50`, `MAX_CHILDREN = 500`, `MAX_NODES = 100,000`. `Address::MAX_SEGMENTS = 100`.

### 8. Thread Safety

`GovernanceEngine` uses `Arc<parking_lot::RwLock<EngineInner>>`. All store traits require `Send + Sync`.

## MUST NOT Rules

### 1. No Deserialize on GovernanceContext

MUST NOT add `Deserialize` derive to `GovernanceContext`. This is the anti-self-modification defense.

### 2. No Engine Exposure to Agents

MUST NOT make `PactGovernedAgent.engine` field public. Agents cannot access or modify governance state.

### 3. No Envelope Widening

MUST NOT bypass monotonic tightening validation. Task envelopes cannot widen role envelopes.

### 4. No Silent Error Swallowing

MUST NOT use `unwrap_or_default()` or `let _ =` for governance decision errors. All errors must propagate as `PactError`.

### 5. No Raw f64 in Financial Comparisons

MUST NOT compare raw `f64` context values against limits without first checking `is_finite()`. Use `FiniteF64` where possible.
