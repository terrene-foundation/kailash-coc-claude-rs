# Audit Chain

Immutable, SHA-256 hash-chained audit log with verification, retention policies, and compliance reporting.

## Key Types

| Type                      | Source                                 | Purpose                                       |
| ------------------------- | -------------------------------------- | --------------------------------------------- |
| `AuditLog`                | `crates/kailash-core/src/audit_log.rs` | Append-only hash-chained log                  |
| `AuditEntry`              | same                                   | Single entry with prev_hash linkage           |
| `AuditEventType`          | same                                   | 11 built-in + `Custom(String)` variant        |
| `ChainVerificationResult` | same                                   | Result of `verify_chain()` / `verify_range()` |
| `RetentionPolicy`         | same                                   | Per-event-type max-age rule                   |
| `LegalHold`               | same                                   | Sequence range exempt from retention          |
| `ComplianceReport`        | same                                   | Time-bounded summary with actor/event stats   |

## Usage Pattern

```rust
use kailash_core::audit_log::{AuditLog, AuditEventType};
use std::collections::BTreeMap;

let mut log = AuditLog::new();

// Append an entry (hash chain maintained automatically)
log.append(
    AuditEventType::WorkflowStarted,
    "user-1".to_string(),       // actor
    "start_workflow".to_string(), // action
    "wf-001".to_string(),       // resource
    "success".to_string(),      // outcome
    BTreeMap::new(),            // metadata
);

// Verify the entire chain
let result = log.verify_chain();
assert!(result.valid);
assert_eq!(result.entries_checked, 1);

// Verify a range (e.g., entries 0..5)
let range_result = log.verify_range(0, 5);
```

## Hash Computation

Each entry's hash covers ALL fields:

```
"{seq}:{prev_hash}:{timestamp_rfc3339}:{event_type}:{actor}:{action}:{resource}:{outcome}:{metadata_canonical}"
```

- Metadata is serialized as sorted `key=value` pairs joined by `;` (BTreeMap guarantees order).
- The genesis entry (sequence 0) has an empty string for `prev_hash`.

## AuditEventType Variants

```rust
WorkflowStarted | WorkflowCompleted | WorkflowFailed
NodeStarted | NodeCompleted | NodeFailed
AccessGranted | AccessDenied
ConfigChanged | ResourceCreated | ResourceDeleted
Custom(String)
```

## Retention Policies

```rust
use kailash_core::audit_log::{RetentionPolicy, RetentionAction, LegalHold};

let policy = RetentionPolicy {
    event_type: AuditEventType::NodeCompleted,
    max_age: std::time::Duration::from_secs(90 * 24 * 3600), // 90 days
    action: RetentionAction::Archive,
};

// Apply retention (respects legal holds)
let archived = log.apply_retention(&[policy]);

// Legal hold protects a sequence range
let hold = LegalHold {
    hold_id: "case-2026".to_string(),
    reason: "Pending litigation".to_string(),
    created_at: chrono::Utc::now(),
    sequence_range: (0, 100),
};
log.add_legal_hold(hold);
```

## Compliance Reports

```rust
use chrono::{Utc, Duration};

let report = log.generate_report(
    Utc::now() - Duration::days(30), // period_start
    Utc::now(),                       // period_end
);

// Report includes:
// - total_entries: count within period
// - chain_valid: full chain verification result
// - event_summary: BTreeMap<String, u64> per event type
// - actor_summary: BTreeMap<String, u64> per actor
// - violation_count: AccessDenied entries in period
// - legal_holds_active: count of active holds

let json = report.to_json(); // Pretty-printed JSON
```

## Gotchas

1. **Hash covers outcome + metadata**: Unlike some audit log designs where the hash only covers structural fields, this implementation includes `outcome` and `metadata` in the hash input. Changing any field after append breaks the chain.

2. **Append-only by design**: There are no `clear()`, `delete()`, or `update()` methods. The log is immutable. If you need concurrent access, wrap in `Arc<Mutex<AuditLog>>`.

3. **Legal holds are absolute**: Entries under a legal hold are never removed by `apply_retention()`, regardless of age. You must explicitly remove the hold first.

4. **Thread safety**: `AuditLog` is `Send` but NOT `Sync`. Use `Arc<parking_lot::Mutex<AuditLog>>` for shared access.

## Cross-References

- `01-core/enterprise-infrastructure.md` -- execution stores (separate from audit chain)
- `crates/kailash-enterprise/src/audit/` -- enterprise audit hooks (uses structured tracing, different from hash chain)
- `crates/kailash-nodes/src/admin/audit_log.rs` -- AuditLogNode wrapper for workflow integration
