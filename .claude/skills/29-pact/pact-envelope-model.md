# PACT 3-Layer Envelope Model

## Structure

```
RoleEnvelope (standing, set by supervisor)
  +-- per-dimension: Financial, Operational, Temporal, DataAccess, Communication
TaskEnvelope (ephemeral, narrows only)
  +-- same 5 dimensions, cannot widen parent

EffectiveEnvelope = intersect(ancestor_chain) intersection task_envelope
  +-- version_hash = SHA-256(all ancestor versions) for TOCTOU defense
```

## Key Invariants

- NULL dimension = unconstrained (no constraint from this level). This aligns PACT evaluator with EATP semantics where `None` means "no restriction on this dimension." Two-layer semantic: (1) EATP `EnvelopeEvaluator` treats `None` as unconstrained, (2) PACT `intersect_dimensions()` uses pass-through (if one side is `None`, the other side's constraint passes through; both `None` = unconstrained).
- Missing envelopes = BLOCKED (fail-closed): if no envelopes exist in the ancestor chain, `compute_effective_envelope` returns an error and the engine produces a BLOCKED verdict.
- Vacant roles = DENY (fail-closed): step 0 of the access algorithm denies access for vacant roles. Also blocks verify_action (v3.5.0+).
- Vacancy designation = acting occupant can operate on behalf of vacant role (24h default expiry)
- Suspended roles = BLOCKED: auto-suspension cascade from vacant parent (opt-in via `auto_suspend_on_vacancy`)
- Unknown actions = HELD (fail-safe): actions not in allowed AND not in denied produce HELD.
- Bridge approval: Pending/Rejected bridges do NOT grant access (v3.5.0+). Use request_bridge -> approve_bridge flow.
- Child cannot widen parent (monotonic tightening)
- `FiniteF64` rejects NaN/Inf at construction

## Envelope Intersection Rules

Per-dimension intersection follows XACML deny-overrides via `intersect_dimensions()`:

| Dimension     | Intersection Rule                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Financial     | `min()` of `max_transaction_cents` and `max_cumulative_cents`; intersection of `allowed_currencies`             |
| Operational   | Intersection of `allowed_operations`; union of `denied_operations`; denied overrides allowed                    |
| Temporal      | More restrictive `operating_hours`; union of blackout periods                                                   |
| Data Access   | Intersection of `data_classifications` and `allowed_data_sources`; more restrictive PII handling                |
| Communication | Intersection of `allowed_channels` and `allowed_recipients`; union of `denied_channels` and `denied_recipients` |

NULL dimension = pass-through: if one ancestor has `None` for a dimension, the other side's constraint passes through. Both `None` = unconstrained (`None` result). This aligns PACT with EATP semantics (NULL=unconstrained). The evaluator (`verify_action`) also treats `None` dimensions as unconstrained (AutoApproved). Fail-closed is enforced at the envelope computation level: if NO envelopes exist at all (empty chain), `compute_effective_envelope` returns an error.

```rust
// Three-level ancestor chain: intersection narrows at each level
let snapshot = engine.compute_envelope("D1-R1-T1-R1", None)?;
// Financial: min of all ancestors
// Operational: only ops in ALL ancestors' allowed lists
// version_hash: SHA-256(all ancestor version numbers) for TOCTOU defense
```

## Default Envelopes by Posture

Recommended envelope defaults per trust posture level (not yet a library function -- use as a reference when setting role envelopes):

| Posture           | max_transaction | Allowed Operations                 | Communication |
| ----------------- | --------------- | ---------------------------------- | ------------- |
| PseudoAgent       | $0              | `read`                             | Internal only |
| Supervised        | $100            | `read`, `write`                    | Internal only |
| SharedPlanning    | $1,000          | `read`, `write`, `plan`, `propose` | External OK   |
| ContinuousInsight | $10,000         | + `execute`, `deploy`              | External OK   |
| Delegated         | $100,000        | + `approve`, `delegate`            | External OK   |

These align with the posture ceiling mapping in `clearance::posture_ceiling()`:

| Posture           | Classification Ceiling |
| ----------------- | ---------------------- |
| PseudoAgent       | Public                 |
| Supervised        | Restricted             |
| SharedPlanning    | Confidential           |
| ContinuousInsight | Secret                 |
| Delegated         | TopSecret              |
