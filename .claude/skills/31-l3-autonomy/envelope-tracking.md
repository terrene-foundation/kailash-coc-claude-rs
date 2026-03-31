# Envelope Tracking

Budget arithmetic, gradient zones, reclamation, and the unified enforcement pipeline.

## Source Files

- `crates/kailash-kaizen/src/l3/core/envelope/tracker.rs` -- `EnvelopeTracker`, `PlanGradient`, `CostEntry`, `BudgetRemaining`, `DimensionUsage`, `ReclaimResult`, `L3EnforcementContext`, `TrackerError`
- `crates/kailash-kaizen/src/l3/core/envelope/splitter.rs` -- `EnvelopeSplitter`, `AllocationRequest`, `SplitError`
- `crates/kailash-kaizen/src/l3/core/envelope/verdict.rs` -- `EnvelopeVerdict`
- `crates/kailash-kaizen/src/l3/runtime/pipeline.rs` -- `L3EnforcementPipeline`, `L3Verdict`, `L3VerdictSource`, `L3LayerResult`

## Budget Arithmetic

- **Internal representation**: `u64` microdollars (1 USD = 1,000,000 microdollars). Avoids floating-point comparison issues.
- **API boundary**: `f64` dollars with `is_finite()` validation at every entry point (AD-3).
- **Monotonically decreasing** except on reclamation from completed children.
- **Conversion**: `f64 -> u64` happens at the API boundary; all internal arithmetic is integer.

### Key Operations

| Operation             | Method                                      | Returns                               |
| --------------------- | ------------------------------------------- | ------------------------------------- |
| Record cost           | `record_consumption(CostEntry)`             | `EnvelopeVerdict`                     |
| Allocate to child     | `allocate_to_child(child_id, microdollars)` | `Result<(), TrackerError>`            |
| Reclaim from child    | `reclaim(child_id, consumed)`               | `Result<ReclaimResult, TrackerError>` |
| Check remaining       | `remaining()`                               | `BudgetRemaining`                     |
| Check usage fractions | `usage()`                                   | `DimensionUsage`                      |

## Gradient Zones

Controlled by `PlanGradient` configuration:

| Zone         | Trigger                  | Default Threshold      |
| ------------ | ------------------------ | ---------------------- |
| AutoApproved | usage < flag             | < 0.80                 |
| Flagged      | usage >= flag AND < hold | >= 0.80                |
| Held         | usage >= hold AND < 1.0  | >= 0.95                |
| Blocked      | usage >= 1.0             | 1.0 (non-configurable) |

Per-dimension overrides via `dimension_thresholds: HashMap<String, DimensionGradient>`.

### PlanGradient Fields

- `retry_budget: u64` -- retries before holding on retryable failure
- `after_retry_exhaustion: GradientZone` -- must be Held or Blocked
- `resolution_timeout: Duration` -- how long to wait for held resolution
- `optional_node_failure: GradientZone` -- must not be Blocked
- `budget_flag_threshold: f64` -- global Flagged threshold
- `budget_hold_threshold: f64` -- global Held threshold
- `dimension_thresholds: HashMap<String, DimensionGradient>` -- per-dimension overrides

## EnvelopeVerdict

Rich verdict produced by the tracker after evaluating a cost entry:

- `Approved { zone, dimension_usage }` -- action may proceed (AutoApproved or Flagged)
- `Held { dimension, current_usage, threshold, hold_id }` -- suspended pending human review
- `Blocked { dimension, detail, requested, available }` -- rejected (budget exceeded)

`is_allowed()` returns `true` only for `Approved`.

## EnvelopeSplitter

Pure (stateless) functions for splitting envelopes across child agents:

- `split(parent, requests, reserve_pct)` -- produces child `ConstraintEnvelope` instances
- `validate_split(parent, requests, reserve_pct)` -- dry run, returns only validation errors
- Validates: ratio sums + reserve <= 1.0, no NaN/Inf, bounded parent dimensions
- Each child is provably tighter than parent (INV-6)

## L3EnforcementPipeline

Unified entry point for L3 enforcement. Composes 4 layers in order:

1. **EATP capability check** (optional, via GovernedTaodRunner)
2. **Envelope budget check** (via EnvelopeTracker)
3. **Constraint check** (via StrictEnforcer from trust-plane)
4. **Hold resolution** (via HoldQueue from eatp)

Returns `L3Verdict`:

- `zone: GradientZone` -- worst-case across all layers
- `source: L3VerdictSource` -- which layer triggered (Eatp/Envelope/Enforcer/AllPassed)
- `per_layer_results: Vec<L3LayerResult>` -- per-layer details for audit
- `is_allowed()` -- delegates to `zone.is_allowed()`

**Non-bypassable** (INV-3): no `disable()`, `bypass()`, `skip()`, or `cfg(test)` conditional path.

## Key Invariants

| ID    | Description                                 | Enforcement Location                                     |
| ----- | ------------------------------------------- | -------------------------------------------------------- |
| INV-5 | Flag threshold < hold threshold             | `PlanGradient::validate()`                               |
| INV-6 | Child envelope provably tighter than parent | `EnvelopeSplitter::validate_split()`                     |
| INV-9 | Atomic cost recording (parking_lot::RwLock) | `EnvelopeTracker::record_consumption()`                  |
| INV-3 | Non-bypassable pipeline                     | `L3EnforcementPipeline` (no disable/skip/bypass methods) |
