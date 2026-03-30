# Type Convergence

Architecture decisions for type reuse across L3, kailash-pact, trust-plane, and eatp.

## GradientZone (from kailash-pact)

**Decision**: Reuse `kailash_pact::verdict::GradientZone` rather than defining a new L3-specific enum.

4 zones with derived ordering:

- `AutoApproved` (severity 0) -- `is_allowed() = true`
- `Flagged` (severity 1) -- `is_allowed() = true`
- `Held` (severity 2) -- `is_allowed() = false`
- `Blocked` (severity 3) -- `is_allowed() = false`

**Rationale**: PACT and L3 share identical gradient semantics. A single type eliminates conversion overhead and ensures consistent `is_allowed()` behavior.

**Source**: `crates/kailash-pact/src/verdict.rs`

## EnvelopeVerdict (L3-specific)

L3 wraps `GradientZone` with per-variant associated data:

- `Approved { zone, dimension_usage }` -- action may proceed
- `Held { dimension, current_usage, threshold, hold_id }` -- suspended
- `Blocked { dimension, detail, requested, available }` -- rejected

**Rationale**: The raw `GradientZone` loses context about WHICH dimension triggered the verdict and HOW MUCH budget remains. `EnvelopeVerdict` carries this for audit and hold-queue integration.

`impl From<EnvelopeVerdict> for GradientZone` provides the reverse mapping.

## L3Verdict (pipeline output)

Aggregates the worst-case zone across all enforcement layers:

- `zone: GradientZone` -- worst-case
- `source: L3VerdictSource` -- which layer triggered (Eatp/Envelope/Enforcer/AllPassed)
- `per_layer_results: Vec<L3LayerResult>` -- per-layer details

**Rationale**: The pipeline runs 3 layers; callers need one answer but auditors need per-layer detail.

## ConstraintEnvelope (from trust-plane)

**Decision**: Reuse `trust_plane::envelope::ConstraintEnvelope` for the 5-dimensional constraint model.

5 dimensions: Financial, Operational, Temporal, DataAccess, Communication.

**Rationale**: trust-plane already defines the canonical 5-dimensional envelope with `is_tighter_than()` validation. Duplicating it would create drift.

**Source**: `crates/trust-plane/src/envelope.rs`

## DataClassification (from eatp)

**Decision**: Reuse `eatp::constraints::data_access::DataClassification` for context scope clearance levels.

5 levels: Public < Internal < Confidential < Restricted < TopSecret.

**Rationale**: EATP defines the canonical classification hierarchy. L3 scoped context uses it as the clearance model.

**Bidirectional mapping** to PACT `ClassificationLevel` via `eatp_to_pact()` / `pact_to_eatp()` free functions (not `From` impls due to orphan rule).

**Source**: `crates/eatp/src/constraints/data_access.rs`

## HoldQueue (from eatp)

**Decision**: Reuse `eatp::human::HoldQueue` for human-in-the-loop holds.

**Rationale**: EATP's `HoldQueue` is the standard mechanism for human approval workflows. The L3 pipeline uses it for Held verdicts. Using trust-plane's hold queue would create a competing mechanism.

**Source**: `crates/eatp/src/human.rs`

## Financial Representation

| Layer                    | Type  | Unit                             |
| ------------------------ | ----- | -------------------------------- |
| API boundary             | `f64` | Dollars                          |
| EnvelopeTracker internal | `u64` | Microdollars (1 USD = 1,000,000) |
| ConstraintEnvelope       | `f64` | Dollars (trust-plane native)     |

**Conversion**: `f64` -> `u64` at the tracker API boundary with `is_finite()` validation. All internal arithmetic uses integer microdollars to avoid floating-point comparison issues (NaN, precision loss).

## Feature Flag Naming

| Flag      | Includes                               | Dependencies                                                    |
| --------- | -------------------------------------- | --------------------------------------------------------------- |
| `l3-core` | Sync types, validation, state machines | `kailash-pact`, `globset`, `eatp`, `parking_lot`, `trust-plane` |
| `l3`      | Full runtime (implies `l3-core`)       | `l3-core` + `trust-plane`                                       |

**Rationale**: The `l3-core` flag enables WASM compilation (no tokio). The `l3` flag adds the async runtime layer.
