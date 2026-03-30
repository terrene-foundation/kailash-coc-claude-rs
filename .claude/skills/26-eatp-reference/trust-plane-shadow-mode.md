# Trust-Plane Shadow Mode

## Overview

Shadow mode enables safe constraint rollout by running two `StrictEnforcer` instances in parallel — one with the current production constraints, one with a candidate configuration. Only the production verdict is returned to the caller; the candidate verdict is recorded purely for observability.

## Architecture

```
Action arrives
    │
    ├──► Production Enforcer ──► Returns verdict to caller
    │
    └──► Candidate Enforcer ──► Records verdict (observability only)
                                    │
                                    ▼
                              ShadowRecord (bounded VecDeque)
                                    │
                                    ▼
                              ShadowReport (divergence stats + recommendation)
```

## Configuration

```rust
use trust_plane::shadow::ShadowConfig;

let config = ShadowConfig {
    max_records: 10_000,              // Bounded FIFO (VecDeque)
    persist_records: true,            // Write to disk for post-hoc analysis
    min_samples_for_recommend: 100,   // Suppress recommendations until enough data
    promote_threshold: 0.05,          // < 5% divergence → Promote
    revert_threshold: 0.20,           // > 20% divergence → Revert
};
```

### Default Values

| Parameter                   | Default | Purpose                                            |
| --------------------------- | ------- | -------------------------------------------------- |
| `max_records`               | 10,000  | Bounded memory — old records evicted via VecDeque  |
| `persist_records`           | true    | Enable disk persistence for post-hoc analysis      |
| `min_samples_for_recommend` | 100     | Minimum evaluations before non-Keep recommendation |
| `promote_threshold`         | 0.05    | Divergence rate below which → Promote              |
| `revert_threshold`          | 0.20    | Divergence rate above which → Revert               |

## Enabling Shadow Mode

```rust
// Via TrustProject
project.enable_shadow(candidate_envelope, shadow_config)?;

// The production enforcer continues as before
// The candidate enforcer runs in shadow (no user impact)
```

## Shadow Check

**Critical**: Always use `project.shadow_check()` instead of `enforcer.check()` when shadow mode might be active. This routes through the shadow enforcer so candidate verdicts are recorded.

```rust
// CORRECT: shadow-aware check
let verdict = project.shadow_check("deploy-v2", &context)?;

// WRONG: bypasses shadow observation
let verdict = project.enforcer.check("deploy-v2", &context)?;
```

This is especially critical in the MCP server — `handle_trust_check()` MUST use `project.shadow_check()`.

## Shadow Records

Each shadow evaluation produces a `ShadowRecord`:

```rust
pub struct ShadowRecord {
    pub timestamp: DateTime<Utc>,
    pub action: String,
    pub production_verdict: Verdict,
    pub candidate_verdict: Verdict,
    pub divergent: bool,  // auto-computed: production != candidate
}
```

Records are stored in a `VecDeque` with `max_records` capacity. When full, oldest records are evicted.

### Lifetime Counters

In addition to the bounded record buffer, `ShadowEnforcer` maintains atomic lifetime counters:

- `lifetime_evaluations: AtomicUsize` — total evaluations ever (never resets)
- `lifetime_divergences: AtomicUsize` — total divergences ever (never resets)

These persist across buffer rotations, giving accurate long-term statistics.

## Shadow Report

```rust
let report = project.shadow_report()?;

pub struct ShadowReport {
    pub total_evaluated: usize,           // From records (window)
    pub divergent_count: usize,           // From records (window)
    pub divergence_rate: f64,             // 0.0 to 1.0
    pub false_positive_increase: f64,     // Candidate MORE permissive than production
    pub false_negative_decrease: f64,     // Candidate MORE restrictive than production
    pub recommendation: ShadowRecommendation,
    pub recommendation_note: Option<String>,  // Populated when min_samples suppresses
    pub lifetime_evaluations: usize,      // From atomic counters (all-time)
    pub lifetime_divergences: usize,      // From atomic counters (all-time)
    pub lifetime_divergence_rate: f64,    // All-time divergence rate
}
```

### Recommendation Logic

```rust
pub enum ShadowRecommendation {
    Promote,  // Safe to adopt candidate config
    Keep,     // Continue observing
    Revert,   // Candidate config is too divergent
}
```

**Decision flow** (`ShadowReport::from_rate()`):

1. If `total_evaluated < min_samples_for_recommend` → **Keep** (not enough data)
   - `recommendation_note` set to explain suppression if raw recommendation differs
2. If `divergence_rate < promote_threshold` → **Promote**
3. If `divergence_rate <= revert_threshold` → **Keep**
4. If `divergence_rate > revert_threshold` → **Revert**

### Threshold Boundary Behavior (Verified by Tests)

| Rate | Promote Threshold (0.05) | Revert Threshold (0.20) | Result                        |
| ---- | ------------------------ | ----------------------- | ----------------------------- |
| 0.04 | Below                    | —                       | **Promote**                   |
| 0.05 | At exactly               | —                       | **Keep** (uses `<`, not `<=`) |
| 0.10 | Above                    | Below                   | **Keep**                      |
| 0.20 | —                        | At exactly              | **Keep** (uses `<=`)          |
| 0.21 | —                        | Above                   | **Revert** (uses `>`)         |

### Recommendation Note

When `min_samples_for_recommend` suppresses a recommendation (e.g., raw calculation says Promote but only 50 samples recorded), the `recommendation_note` field explains:

```
"Raw recommendation is Promote (divergence_rate=0.02) but suppressed: only 50 evaluations recorded (minimum: 100)"
```

When samples are sufficient, `recommendation_note` is `None`.

## Promotion and Reversion

```rust
// Promote candidate to production
project.shadow_promote()?;
// Candidate config becomes the new production config
// Shadow mode is disabled

// Revert (discard candidate)
project.disable_shadow()?;
// Production config unchanged, shadow records preserved for analysis
```

## ShadowSummary (Kaizen Integration)

When multiple trust-plane instances exist (e.g., in multi-agent orchestration), `ShadowSummary` merges recommendations:

```rust
use kailash_kaizen::trust::agent::ShadowSummary;
```

**Conservative merge precedence**: **Revert > Keep > Promote**

- If any component says Revert → overall Revert
- If any says Keep → overall Keep
- Only if ALL say Promote → overall Promote

## Per-Action Divergence Details

The CLI `shadow details` command shows per-action divergence breakdown:

```bash
attest shadow details
# Text table: action name, count, divergence count, divergence rate
# JSON mode: structured array with per-action stats
```

**Security**: Action names are sanitized before terminal output via `sanitize_for_terminal()` — strips ASCII control characters (0x00-0x1F, 0x7F) to prevent terminal injection via malicious action names.

## Node.js Pagination

For long-running shadow sessions with many records:

```typescript
// Get most recent N records (avoids returning all 10,000)
const recent = project.shadow_records_limited(100);
```

## Key Gotchas

1. `ShadowEnforcer` uses `parking_lot::RwLock` for records — write-heavy workloads may contend
2. Lifetime counters are `AtomicUsize` — separate from bounded record buffer
3. `from_rate()` uses strict `<` for promote and `>` for revert (not `<=`/`>=`)
4. `recommendation_note` is `serde(skip_serializing_if = "Option::is_none")` — absent in JSON when not suppressed
5. `with_config()` factory method also enforces min_samples — use for threshold testing
