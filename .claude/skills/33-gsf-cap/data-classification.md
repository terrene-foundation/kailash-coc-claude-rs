# Data Classification

Field-level data classification, masking strategies, retention policies, and compliance tagging for DataFlow models.

## Key Types

| Type                       | Source                                          | Purpose                                                                  |
| -------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `DataFlowEngine`           | `crates/kailash-dataflow/src/engine.rs`         | **Unified engine** wrapping DataFlow + validation + classification       |
| `DataClassification`       | `crates/kailash-dataflow/src/classification.rs` | 6-level sensitivity enum (Public..HighlyConfidential)                    |
| `MaskingStrategy`          | same                                            | 5 strategies (None, Hash, Redact, LastFour, Encrypt)                     |
| `RetentionPolicy`          | same                                            | Indefinite, Days, Years, UntilConsentRevoked                             |
| `ComplianceTag`            | same                                            | GDPR, CCPA, HIPAA, SOC2                                                  |
| `DataClassificationPolicy` | same                                            | Policy engine for masking thresholds                                     |
| `DataRetentionEnforcer`    | same                                            | Evaluates retention deadlines against field age                          |
| `mask_row()`               | same                                            | Row-level masking — **auto-called by ReadNode/ListNode** when policy set |

## DataFlowEngine (Recommended Entry Point)

`DataFlowEngine` bundles DataFlow + ValidationLayer + DataClassificationPolicy + QueryEngine:

```rust
use kailash_dataflow::engine::DataFlowEngine;

let engine = DataFlowEngine::builder("sqlite::memory:")
    .validation(validation_layer)
    .classification_policy(policy)
    .slow_query_threshold(Duration::from_secs(1))
    .build()
    .await?;

// Registers all 11 nodes with validation (writes) + masking (reads)
engine.register_model(&mut registry, model);
```

When classification is set, `ReadNode` and `ListNode` automatically call `mask_row()` after fetching data. When `None`, reads return unmasked (backward compatible).

## DataClassification Levels

```rust
use kailash_dataflow::classification::DataClassification;

// Ordered by sensitivity_level():
DataClassification::Public           // 0
DataClassification::Internal         // 1
DataClassification::Sensitive        // 2
DataClassification::PII              // 3
DataClassification::GDPR             // 4
DataClassification::HighlyConfidential // 5
```

## Annotating Model Fields

```rust
use kailash_dataflow::classification::*;
use kailash_dataflow::model::{ModelDefinition, FieldType};

let model = ModelDefinition::new("Customer", "customers")
    .field("id", FieldType::Integer, |f| f.primary_key())
    .field("name", FieldType::Text, |f| f.required())
    .field("email", FieldType::Text, |f| {
        f.required()
         .classification(DataClassification::PII)
         .masking(MaskingStrategy::Redact)
         .compliance(ComplianceTag::GDPR)
         .compliance(ComplianceTag::CCPA)
    })
    .field("ssn", FieldType::Text, |f| {
        f.required()
         .classification(DataClassification::HighlyConfidential)
         .masking(MaskingStrategy::LastFour)
         .retention(RetentionPolicy::Years(7))
    })
    .auto_timestamps();
```

## MaskingStrategy Application

| Strategy   | Input                 | Output                |
| ---------- | --------------------- | --------------------- |
| `None`     | `"alice@example.com"` | `"alice@example.com"` |
| `Hash`     | `"alice@example.com"` | SHA-256 hex digest    |
| `Redact`   | `"alice@example.com"` | `"[REDACTED]"`        |
| `LastFour` | `"123-45-6789"`       | `"*********6789"`     |
| `Encrypt`  | `"alice@example.com"` | `"[ENCRYPTED]"`       |

## DataClassificationPolicy

```rust
use kailash_dataflow::classification::*;

let policy = DataClassificationPolicy {
    mask_threshold: DataClassification::PII,  // mask fields at PII (3) and above
    audit_access: true,                        // log access to classified fields
};

// Check if a field requires masking
assert!(!policy.sensitivity_requires_masking(DataClassification::Internal)); // 1 < 3
assert!(policy.sensitivity_requires_masking(DataClassification::PII));       // 3 >= 3
assert!(policy.sensitivity_requires_masking(DataClassification::HighlyConfidential)); // 5 >= 3

// Check if a field can be exported
assert!(policy.can_export(&public_field));   // unclassified or below threshold
assert!(!policy.can_export(&pii_field));     // at or above threshold

// Apply masking to a single field
let masked = policy.apply_masking(&field_def, &value);
```

## mask_row() Utility

Applies masking to an entire row based on field classifications:

```rust
use kailash_dataflow::classification::{mask_row, DataClassificationPolicy, DataClassification};

let policy = DataClassificationPolicy {
    mask_threshold: DataClassification::PII,
    audit_access: false,
};

let masked = mask_row(model.fields(), &row, &policy);
// - Fields below threshold: passed through unchanged
// - Fields at/above threshold: masked per their MaskingStrategy
// - Unknown fields (not in model): passed through unchanged
```

## RetentionPolicy

```rust
use kailash_dataflow::classification::RetentionPolicy;

RetentionPolicy::Indefinite          // max_days() -> None
RetentionPolicy::Days(90)            // max_days() -> Some(90)
RetentionPolicy::Years(7)            // max_days() -> Some(2555)
RetentionPolicy::UntilConsentRevoked // max_days() -> None
```

`Years(n)` computes `n * 365` with `saturating_mul()` to avoid overflow.

## DataRetentionEnforcer

Evaluates which fields in a model have exceeded their retention deadline:

```rust
use kailash_dataflow::classification::DataRetentionEnforcer;

let enforcer = DataRetentionEnforcer::new();
let expired_fields = enforcer.check_retention(&model, &row, reference_time);
// Returns: Vec of field names whose retention period has elapsed
```

## Gotchas

1. **LastFour uses `chars().count()` for UTF-8 safety**: The masking strategy correctly counts Unicode characters, not bytes. A 4-character CJK string will NOT be truncated incorrectly.

2. **No classification = no masking**: Fields without a `classification()` annotation are always passed through unmodified by `mask_row()` and `apply_masking()`, regardless of the policy threshold.

3. **Hash strategy uses SHA-256**: The `Hash` masking strategy computes a full SHA-256 digest of the raw string value and returns the hex-encoded result. This is a one-way transformation.

4. **Encrypt is a placeholder**: `MaskingStrategy::Encrypt` returns the literal `"[ENCRYPTED]"`. Real encryption is an enterprise feature and requires key management.

5. **ComplianceTag is informational**: Tags like `GDPR` and `HIPAA` annotate fields for compliance reporting and auditing but do not enforce any behavior on their own. Enforcement is done through the policy engine and retention enforcer.

## Cross-References

- `02-dataflow/` -- `ModelDefinition`, `FieldDef`, `FieldType`
- `validation-patterns.md` -- field-level validation (orthogonal to classification)
- `audit-chain.md` -- audit log for tracking access to classified data
