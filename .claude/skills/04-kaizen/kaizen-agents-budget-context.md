# Budget Allocation and Context Management

Source: `crates/kaizen-agents/src/{envelope_allocator,budget_warnings,context_injector,context_summarizer}.rs`

## Envelope Allocator

Source: `crates/kaizen-agents/src/envelope_allocator.rs`

Pure functions (no state, no locks, no async) for dividing a parent's budget across children. Output feeds directly into `EnvelopeSplitter::split()` from the L3 SDK.

### allocate_equal

Divides budget equally across N children with a parent reserve:

```rust,ignore
use kaizen_agents::envelope_allocator::{allocate_equal, ChildAllocation};

let child_ids = vec!["agent-a".into(), "agent-b".into(), "agent-c".into()];
let allocations = allocate_equal(&child_ids, 0.10)?;
// Each gets (1.0 - 0.10) / 3 = 0.30 for both financial_ratio and temporal_ratio
```

### allocate_weighted

Divides budget proportional to complexity weights:

```rust,ignore
use kaizen_agents::envelope_allocator::allocate_weighted;

let children = vec![
    ("analyst".into(), 0.5),    // Higher complexity -> larger share
    ("fetcher".into(), 0.3),
    ("formatter".into(), 0.2),
];
let allocations = allocate_weighted(&children, 0.10)?;
// analyst: 0.5/1.0 * 0.90 = 0.45
// fetcher: 0.3/1.0 * 0.90 = 0.27
// formatter: 0.2/1.0 * 0.90 = 0.18
```

Weight clamping: `[0.01, 1.0]`. NaN/non-finite weights map to `0.01`.

### ChildAllocation

```rust,ignore
pub struct ChildAllocation {
    pub child_id: String,
    pub financial_ratio: f64,  // 0.0 to 1.0
    pub temporal_ratio: f64,   // 0.0 to 1.0
}
```

### BudgetPolicy

```rust,ignore
pub struct BudgetPolicy {
    pub default_reserve_pct: f64,          // Default: 0.05 (5%)
    pub min_child_budget_dollars: f64,     // Default: 0.01
    pub complexity_weight_enabled: bool,   // Default: true
}
```

### Validation

- `reserve_pct` must be finite and in `[0.0, 0.5]`
- At least one child required
- `validate_allocation_sum()` checks `sum(financial_ratio) + reserve <= 1.0 + EPSILON`

### Connecting to EnvelopeSplitter

```rust,ignore
use kailash_kaizen::l3::l3_core::envelope::splitter::{AllocationRequest, EnvelopeSplitter};

let allocations = allocate_weighted(&children, policy.default_reserve_pct)?;
for alloc in &allocations {
    let request = AllocationRequest {
        child_id: alloc.child_id.clone(),
        financial_ratio: alloc.financial_ratio,
        temporal_ratio: alloc.temporal_ratio,
        // ... other fields
    };
    let child_tracker = splitter.split(&parent_tracker, &request)?;
}
```

## Budget Warnings

Source: `crates/kaizen-agents/src/budget_warnings.rs`

Pure functions that emit structured warnings when budget consumption crosses thresholds. Integrates with `PlanGradient` thresholds but decoupled from it.

### evaluate_budget

```rust,ignore
use kaizen_agents::budget_warnings::{evaluate_budget, BudgetWarningConfig};

let config = BudgetWarningConfig::default(); // flag=0.80, hold=0.95
let warning = evaluate_budget("financial", 0.85, &config, Some("node_1"));
// -> Some(BudgetWarning { zone: Flagged, ... })
```

Zone priority (highest wins):
- `usage >= 1.0` -> `Exhausted`
- `usage >= hold_threshold` -> `Held`
- `usage >= flag_threshold` -> `Flagged`
- otherwise -> `None`

NaN/Inf usage is fail-closed to `Exhausted`.

### evaluate_all_dimensions

```rust,ignore
use kaizen_agents::budget_warnings::evaluate_all_dimensions;

let dimensions = vec![
    ("financial", 0.50),   // below flag -> no warning
    ("temporal", 0.85),    // above flag -> Flagged
    ("operational", 1.0),  // exhausted -> Exhausted
];
let warnings = evaluate_all_dimensions(&dimensions, &config, Some("node_x"));
// -> 2 warnings (temporal + operational)
```

### BudgetWarning

```rust,ignore
pub struct BudgetWarning {
    pub dimension: String,
    pub usage_pct: f64,
    pub threshold: f64,
    pub zone: BudgetWarningZone,    // Flagged | Held | Exhausted
    pub message: String,
    pub node_id: Option<String>,
}
```

`BudgetWarningZone` serializes as SCREAMING_SNAKE_CASE: `"FLAGGED"`, `"HELD"`, `"EXHAUSTED"`.

### Syncing with PlanGradient

```rust,ignore
let config = BudgetWarningConfig::from_gradient_thresholds(
    gradient.budget_flag_threshold,  // e.g., 0.80
    gradient.budget_hold_threshold,  // e.g., 0.95
);
```

## Context Injector

Source: `crates/kaizen-agents/src/context_injector.rs`

Pure functions for selecting which parent context keys are visible to a child agent. Three injection methods:

### inject_deterministic (no LLM)

Filters by child's `required_context_keys`. Errors if any required key is missing.

```rust,ignore
use kaizen_agents::context_injector::{inject_deterministic, InjectionResult};

let parent_keys = vec!["db_url".into(), "api_key".into(), "tenant_id".into()];
let required = vec!["db_url".into(), "tenant_id".into()];

let result = inject_deterministic(&parent_keys, &required)?;
// result.selected_keys: ["db_url", "tenant_id"]
// result.excluded_keys: ["api_key"]
// result.method: InjectionMethod::Deterministic
```

Selected keys preserve the order of `required_keys`, not `parent_keys`.

### inject_semantic (pre-computed LLM scores)

Applies relevance scores (computed upstream) with a threshold:

```rust,ignore
use kaizen_agents::context_injector::inject_semantic;

let mut scores = HashMap::new();
scores.insert("db_url".into(), 0.9);
scores.insert("api_key".into(), 0.2);
scores.insert("tenant_id".into(), 0.8);

let result = inject_semantic(&parent_keys, &scores, 0.5);
// result.selected_keys: ["db_url", "tenant_id"]
// result.method: InjectionMethod::Semantic
```

- Keys not in `scores` default to 0.0 (excluded unless threshold is 0.0)
- NaN/Inf/negative threshold falls back to `inject_fallback`

### inject_fallback

Passes all parent keys through. Safe but not least-privilege:

```rust,ignore
let result = inject_fallback(&parent_keys);
// result.selected_keys: all parent keys
// result.method: InjectionMethod::Fallback
```

### InjectionResult

```rust,ignore
pub struct InjectionResult {
    pub selected_keys: Vec<String>,
    pub excluded_keys: Vec<String>,
    pub method: InjectionMethod,  // Deterministic | Semantic | Fallback
}
```

### Connecting to ScopeProjection

```rust,ignore
use kaizen_agents::context_injector::keys_to_allow_patterns;

let patterns = keys_to_allow_patterns(&result.selected_keys);
// Pass to ScopeProjection::new(patterns) for child scope creation
```

## Context Summarizer

Source: `crates/kaizen-agents/src/context_summarizer.rs`

LLM-powered compression of large context values. Values under `max_value_chars` are preserved; larger values are sent to the LLM for summarization.

```rust,ignore
use kaizen_agents::context_summarizer::{ContextSummarizer, SummarizerConfig};

let summarizer = ContextSummarizer::new(llm, SummarizerConfig::default());

let mut context = HashMap::new();
context.insert("short".into(), json!("small value"));
context.insert("long".into(), json!("x".repeat(5000)));

let result = summarizer.summarize(&context, &["short".into()]).await?;
// result.preserved_keys: ["short"] (non-summarizable + small)
// result.summarized_keys: ["long"] (compressed by LLM)
// result.context: HashMap with all keys, large values replaced by summaries
```

### SummarizerConfig

```rust,ignore
pub struct SummarizerConfig {
    pub max_total_chars: usize,  // Default: 10,000
    pub max_value_chars: usize,  // Default: 2,000 (per-value threshold)
}
```

### non_summarizable_keys

Keys listed in this parameter are always preserved verbatim regardless of size. No LLM call is made for them. Use for keys that must not be altered (e.g., credentials, configuration, schema definitions).

### SummarizedContext

```rust,ignore
pub struct SummarizedContext {
    pub preserved_keys: Vec<String>,
    pub summarized_keys: Vec<String>,
    pub dropped_keys: Vec<String>,
    pub context: HashMap<String, serde_json::Value>,
}
```

## Common Patterns

### Budget reservation protocol

```rust,ignore
// 1. Compute allocations
let policy = BudgetPolicy::default();
let allocations = if policy.complexity_weight_enabled {
    let weighted: Vec<(String, f64)> = subtasks.iter()
        .map(|s| (s.description.clone(), s.complexity))
        .collect();
    allocate_weighted(&weighted, policy.default_reserve_pct)?
} else {
    let ids: Vec<String> = subtasks.iter().map(|s| s.description.clone()).collect();
    allocate_equal(&ids, policy.default_reserve_pct)?
};

// 2. Validate
validate_allocation_sum(&allocations, policy.default_reserve_pct)?;

// 3. Reserve on EnvelopeTracker
for alloc in &allocations {
    tracker.reserve_child(
        &alloc.child_id,
        alloc.financial_ratio,
        alloc.temporal_ratio,
    )?;
}
```

### Context injection in the design pipeline

```rust,ignore
// After decomposition: each subtask has required_context_keys
for subtask in &subtasks {
    if !subtask.required_context_keys.is_empty() {
        // Deterministic path: fast, no LLM
        let injection = inject_deterministic(
            &parent_visible_keys,
            &subtask.required_context_keys,
        )?;
        // Use injection.selected_keys to build child's ScopeProjection
    } else {
        // Semantic path: LLM-computed relevance (or fallback)
        let injection = inject_semantic(&parent_visible_keys, &scores, 0.5);
    }
}
```

## Cross-References

- EnvelopeTracker and EnvelopeSplitter: [31-l3-autonomy/envelope-tracking.md](../31-l3-autonomy/envelope-tracking.md)
- ContextScope and ScopeProjection: [31-l3-autonomy/scoped-context.md](../31-l3-autonomy/scoped-context.md)
- PlanGradient thresholds: [orchestration-pipeline.md](orchestration-pipeline.md)
