# Budget Allocation & Context Management

Budget allocation and context management modules provide deterministic budget division, threshold-based warnings, and intelligent context selection for child agent scopes.

## Budget Allocation

### Equal Split

`allocate_equal(child_ids, reserve_pct)` divides budget equally among children after reserving a percentage for the parent. Each child gets `(1.0 - reserve_pct) / N`.

### Weighted Split

`allocate_weighted(children, reserve_pct)` divides budget by specified weights. Weights are clamped to [0.01, 1.0], NaN values default to 0.01, and all weights are normalized to sum to 1.0.

### Budget Warnings

`evaluate_budget(dimension, usage_pct, config, node_id)` emits threshold-based warnings:

- Returns None if below threshold
- Returns Flagged, Held, or Exhausted if above configured thresholds
- NaN/Inf usage values are treated as Exhausted (fail-closed)

### Budget Reservation (on EnvelopeTracker)

The L3 EnvelopeTracker supports a reservation protocol for pre-allocating budget before expensive operations:

1. `reserve_budget(estimated_cost)` -- Pre-allocate budget, returns reservation ID
2. `commit_reservation(reservation_id, actual_cost)` -- Finalize with actual cost
3. `release_reservation(reservation_id)` -- Cancel reservation

## Context Injection

### Deterministic (no LLM)

`inject_deterministic(parent_keys, required_keys)` selects context keys from parent scope. Returns an error if any required key is missing from parent.

### Semantic (LLM evaluates relevance)

`inject_semantic(parent_keys, relevance_scores, threshold)` selects keys based on LLM-evaluated relevance scores. NaN/Inf threshold values fall back to including all keys (safe default).

### Fallback

`inject_fallback(parent_keys)` includes everything from the parent scope. Used as a safe fallback when semantic injection fails.

## Context Summarization

ContextSummarizer compresses large context values via LLM summarization. Non-summarizable keys (specified explicitly) are always preserved verbatim, ensuring critical data is never lost to summarization.
