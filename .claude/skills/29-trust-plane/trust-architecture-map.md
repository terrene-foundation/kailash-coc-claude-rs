---
name: trust-architecture-map
description: Three-layer trust stack mapping across eatp, trust-plane, and kaizen/trust crates
---

# Trust Architecture Map

The trust stack spans three crates with overlapping but distinct responsibilities:

## Layer Map

| Concept          | eatp (proprietary)                     | trust-plane (proprietary)                        | kaizen/trust (proprietary)             |
| ---------------- | -------------------------------------- | ------------------------------------------------ | -------------------------------------- |
| Constraint model | `ConstraintDimensions` (8 fields)      | `ConstraintEnvelope` (5 dimension structs)       | Re-exports via `trust` feature         |
| Delegation       | `DelegationRecord` + `DelegationChain` | `DelegationManager` (file-backed, WAL)           | `DelegationChain` (in-memory)          |
| Enforcement      | None (SDK only)                        | `StrictEnforcer` + `ShadowEnforcer`              | `GovernedAgent` + `GovernedTaodRunner` |
| Verification     | `VerificationGradient` (4 levels)      | `Verdict` (4 levels, different names)            | Re-exports eatp's                      |
| Intersection     | None                                   | `intersect_constraints()` → `IntersectionResult` | None                                   |
| Posture          | `PostureSystem` (state machine)        | None                                             | Re-exports eatp's                      |

## Constraint Intersection (NEW — Tool Agent Support)

`trust_plane::intersection::intersect_constraints(&[ConstraintEnvelope]) -> IntersectionResult`

- Arbitrary-depth fold over constraint envelopes
- Per-dimension algebra: union for blocked, intersection for allowed, min for limits, OR for flags
- `allowed_hours` uses 24-bit bitset for true interval intersection (fixed from total-hours comparison)
- Returns `IntersectionResult { envelope, empty_dimensions, warnings }`
- Commutative: input order does not matter

## Key Invariants

1. **Monotonic tightening**: Each delegation level can only tighten constraints, never loosen
2. **`None` = unrestricted**: `allowed_actions: None` means everything is allowed
3. **`Some([])` = nothing allowed**: Empty allowlist is the zero element
4. **NaN and infinity rejected**: f64 limits must be finite
5. **InvocationTokens go in trust-plane**: NOT in eatp (keep crate responsibilities separate)
