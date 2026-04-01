---
name: enterprise-compliance
description: "Compliance report generation for EATP and CARE frameworks in kailash-enterprise. Use when asking 'compliance report', 'EATP compliance', 'CARE compliance', 'ComplianceReport', 'EatpReportGenerator', 'CareReportGenerator', 'compliance findings', 'compliance status', 'audit report', 'trust compliance', 'governance report', 'evidence integrity', or 'delegation compliance'."
---

# Enterprise Compliance Reports

Structured compliance report generation for EATP v0.8.0 and CARE governance frameworks using `kailash-enterprise::compliance`.

## Architecture Overview

The compliance subsystem has three layers:

| Module        | File                        | Purpose                                                                                |
| ------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| `report`      | `compliance/report.rs`      | Framework-agnostic types: `ComplianceReport`, `ComplianceSection`, `ComplianceFinding` |
| `eatp_report` | `compliance/eatp_report.rs` | `EatpReportGenerator` for EATP v0.8.0 assessment                                       |
| `care_report` | `compliance/care_report.rs` | `CareReportGenerator` for CARE framework assessment                                    |

All types are re-exported via `kailash_enterprise::compliance::*`.

## Core Report Types

### ComplianceReport

A complete compliance assessment with sections, findings, and an overall status.

```rust
use kailash_enterprise::compliance::{
    ComplianceReport, ComplianceSection, ComplianceFinding,
    ComplianceStatus, FindingSeverity,
};

let mut report = ComplianceReport::new(
    "Custom Compliance Assessment",
    "Internal Policy v2.0",
)
.with_section(
    ComplianceSection::new("Access Control", "Assessment of access control policies")
        .with_status(ComplianceStatus::Compliant)
)
.with_section(
    ComplianceSection::new("Data Protection", "Assessment of data protection measures")
        .with_status(ComplianceStatus::PartiallyCompliant)
        .with_finding(ComplianceFinding::new(
            "DP-001",
            FindingSeverity::High,
            "Encryption at rest not enabled",
            "Database volumes are not using encrypted storage",
        ).with_remediation("Enable AES-256 encryption on all database volumes"))
);

// Finalize computes overall_status, total_findings, and critical_findings
report.finalize();

assert_eq!(report.overall_status, ComplianceStatus::PartiallyCompliant);
assert_eq!(report.total_findings, 1);
assert_eq!(report.critical_findings, 0);
```

### ComplianceReport Fields

| Field               | Type                     | Description                               |
| ------------------- | ------------------------ | ----------------------------------------- |
| `title`             | `String`                 | Report title                              |
| `framework`         | `String`                 | Framework assessed (e.g., "EATP v0.8.0")  |
| `overall_status`    | `ComplianceStatus`       | Computed from sections after `finalize()` |
| `sections`          | `Vec<ComplianceSection>` | Report sections                           |
| `generated_at`      | `DateTime<Utc>`          | Auto-set to current UTC time              |
| `total_findings`    | `usize`                  | Computed by `finalize()`                  |
| `critical_findings` | `usize`                  | Computed by `finalize()`                  |

### ComplianceStatus

```rust
ComplianceStatus::Compliant           // all requirements met
ComplianceStatus::PartiallyCompliant  // some requirements met, minor findings
ComplianceStatus::NonCompliant        // significant requirements not met
ComplianceStatus::Indeterminate       // not enough data to determine
```

**`finalize()` logic**:

- Any section `NonCompliant` -> overall `NonCompliant`
- Any section `PartiallyCompliant` (but none `NonCompliant`) -> overall `PartiallyCompliant`
- All sections `Compliant` -> overall `Compliant`
- No sections at all -> overall `Indeterminate`

### ComplianceSection

A section within a report, containing findings and a status.

```rust
let mut section = ComplianceSection::new(
    "Evidence Integrity",
    "Verification of evidence record signing",
)
.with_finding(ComplianceFinding::new(
    "EI-001",
    FindingSeverity::Critical,
    "Unsigned records found",
    "5 evidence records lack Ed25519 signatures",
).with_remediation("Sign all records before ledger append"));

// compute_status() derives status from findings:
//   - Critical findings -> NonCompliant
//   - High findings (no critical) -> PartiallyCompliant
//   - Only Low/Medium/Info -> Compliant
//   - No findings -> Compliant
section.compute_status();
assert_eq!(section.status, ComplianceStatus::NonCompliant);
```

### FindingSeverity

Ordered from lowest to highest:

```rust
FindingSeverity::Info       // informational only
FindingSeverity::Low        // minor improvement recommended
FindingSeverity::Medium     // should be addressed
FindingSeverity::High       // must be addressed promptly
FindingSeverity::Critical   // immediate action required
```

Severity implements `PartialOrd` and `Ord`, so `Info < Low < Medium < High < Critical`.

### ComplianceFinding

```rust
let finding = ComplianceFinding::new(
    "EATP-001",                              // finding_id
    FindingSeverity::Critical,               // severity
    "Unsigned evidence records detected",    // title
    "5 of 100 records lack valid signatures" // description
)
.with_remediation("Ensure all evidence records are signed before appending to ledger");

assert_eq!(finding.finding_id, "EATP-001");
assert!(finding.remediation.is_some());
```

## EATP Report Generator

The `EatpReportGenerator` produces EATP v0.8.0 compliance assessments. It checks four areas:

| Section                    | Finding ID | Severity | Triggered When              |
| -------------------------- | ---------- | -------- | --------------------------- |
| Evidence Integrity         | EATP-001   | Critical | `unsigned_records > 0`      |
| Resource Limit Enforcement | EATP-002   | High     | `resource_breaches > 0`     |
| Delegation Chain Integrity | EATP-003   | Critical | `delegation_violations > 0` |
| Verification Gradient      | EATP-004   | Medium   | `unresolved_holds > 0`      |

### Generating an EATP Report

```rust
use kailash_enterprise::compliance::{EatpReportGenerator, ComplianceStatus};

// Fully compliant system
let report = EatpReportGenerator::new()
    .with_evidence_count(500)
    .generate();

assert_eq!(report.framework, "EATP v0.8.0");
assert_eq!(report.overall_status, ComplianceStatus::Compliant);
assert_eq!(report.sections.len(), 4);
assert_eq!(report.total_findings, 0);
```

### Report With Findings

```rust
use kailash_enterprise::compliance::{EatpReportGenerator, ComplianceStatus};

// System with issues
let report = EatpReportGenerator::new()
    .with_evidence_count(500)
    .with_unsigned_records(3)        // -> EATP-001 (Critical) -> NonCompliant
    .with_resource_breaches(2)       // -> EATP-002 (High)     -> PartiallyCompliant
    .with_delegation_violations(1)   // -> EATP-003 (Critical) -> NonCompliant
    .with_unresolved_holds(5)        // -> EATP-004 (Medium)   -> Compliant (medium only)
    .generate();

assert_eq!(report.overall_status, ComplianceStatus::NonCompliant);
assert_eq!(report.total_findings, 4);
assert_eq!(report.critical_findings, 2); // EATP-001 + EATP-003

// Access individual findings
for section in &report.sections {
    for finding in &section.findings {
        println!("[{}] {} - {}", finding.finding_id, finding.severity, finding.title);
        if let Some(ref rem) = finding.remediation {
            println!("  Remediation: {}", rem);
        }
    }
}
```

### EatpReportGenerator Builder Methods

| Method                              | Input                  | Description                        |
| ----------------------------------- | ---------------------- | ---------------------------------- |
| `with_evidence_count(usize)`        | Total evidence records | Total records analyzed             |
| `with_unsigned_records(usize)`      | Unsigned count         | Records lacking Ed25519 signatures |
| `with_resource_breaches(usize)`     | Breach count           | Resource limit violations          |
| `with_delegation_violations(usize)` | Violation count        | Constraint tightening failures     |
| `with_unresolved_holds(usize)`      | Hold count             | Pending approval queue items       |

## CARE Report Generator

The `CareReportGenerator` produces CARE governance framework assessments. It checks four areas:

| Section                      | Finding ID | Severity | Triggered When                           |
| ---------------------------- | ---------- | -------- | ---------------------------------------- |
| Human-on-the-Loop Governance | CARE-001   | High     | `human_intervention_configured == false` |
| Trust Chain Integrity        | CARE-002   | Critical | `care_chain_maintained == false`         |
| Trust Chain Integrity        | CARE-003   | Critical | `chain_integrity_failures > 0`           |
| Competency Assessment        | CARE-004   | Medium   | `competency_evaluation_enabled == false` |
| Competency Assessment        | CARE-005   | High     | `competency_bypasses > 0`                |
| Posture System               | CARE-006   | High     | `posture_system_configured == false`     |

### Generating a CARE Report

```rust
use kailash_enterprise::compliance::{CareReportGenerator, ComplianceStatus};

// Fully compliant system
let report = CareReportGenerator::new()
    .with_human_intervention(true)
    .with_care_chain(true)
    .with_competency_evaluation(true)
    .with_posture_system(true)
    .generate();

assert_eq!(report.framework, "CARE Framework");
assert_eq!(report.overall_status, ComplianceStatus::Compliant);
assert_eq!(report.total_findings, 0);
```

### Report With Findings

```rust
use kailash_enterprise::compliance::{CareReportGenerator, ComplianceStatus};

// Default (unconfigured) system -- multiple findings
let report = CareReportGenerator::new().generate();
assert!(report.total_findings > 0); // CARE-001, CARE-002, CARE-004, CARE-006

// System with chain integrity issues
let report = CareReportGenerator::new()
    .with_human_intervention(true)
    .with_care_chain(true)
    .with_chain_integrity_failures(3)   // -> CARE-003 (Critical)
    .with_competency_evaluation(true)
    .with_competency_bypasses(2)        // -> CARE-005 (High)
    .with_posture_system(true)
    .generate();

assert_eq!(report.overall_status, ComplianceStatus::NonCompliant);
assert_eq!(report.critical_findings, 1); // CARE-003
```

### CareReportGenerator Builder Methods

| Method                                 | Input         | Description                      |
| -------------------------------------- | ------------- | -------------------------------- |
| `with_human_intervention(bool)`        | Configured?   | PseudoAgent/HoldQueue configured |
| `with_care_chain(bool)`                | Maintained?   | Active CARE chain exists         |
| `with_chain_integrity_failures(usize)` | Failure count | Chain verification failures      |
| `with_competency_evaluation(bool)`     | Enabled?      | CompetencyEvaluator active       |
| `with_competency_bypasses(usize)`      | Bypass count  | Actions that skipped evaluation  |
| `with_posture_system(bool)`            | Configured?   | PostureSystem with transitions   |

## Serialization and Export

All compliance types implement `Serialize` and `Deserialize` for JSON export:

```rust
use kailash_enterprise::compliance::{EatpReportGenerator, ComplianceReport};

let report = EatpReportGenerator::new()
    .with_evidence_count(100)
    .with_unsigned_records(2)
    .generate();

// Serialize to JSON
let json = serde_json::to_string_pretty(&report)?;

// Deserialize from JSON
let parsed: ComplianceReport = serde_json::from_str(&json)?;
assert_eq!(parsed.framework, "EATP v0.8.0");
assert_eq!(parsed.sections.len(), 4);
```

## Compliance Status Decision Table

### Section-Level (`compute_status()`)

| Findings Present | Highest Severity  | Section Status       |
| ---------------- | ----------------- | -------------------- |
| None             | N/A               | `Compliant`          |
| Yes              | `Critical`        | `NonCompliant`       |
| Yes              | `High`            | `PartiallyCompliant` |
| Yes              | `Medium` or below | `Compliant`          |

### Report-Level (`finalize()`)

| Section Statuses                              | Overall Status       |
| --------------------------------------------- | -------------------- |
| All `Compliant`                               | `Compliant`          |
| Any `PartiallyCompliant`, none `NonCompliant` | `PartiallyCompliant` |
| Any `NonCompliant`                            | `NonCompliant`       |
| No sections                                   | `Indeterminate`      |

## Thread Safety

All compliance types are `Send + Sync`:

- `ComplianceReport`, `ComplianceSection`, `ComplianceFinding` -- cloneable, serializable
- `ComplianceStatus`, `FindingSeverity` -- `Copy`, `Eq`, `Hash`
- `EatpReportGenerator`, `CareReportGenerator` -- cloneable, stateless after configuration

## Source Files

- `crates/kailash-enterprise/src/compliance/report.rs`
- `crates/kailash-enterprise/src/compliance/eatp_report.rs`
- `crates/kailash-enterprise/src/compliance/care_report.rs`
- `crates/kailash-enterprise/src/compliance/mod.rs`

<!-- Trigger Keywords: compliance report, EATP compliance, CARE compliance, ComplianceReport, EatpReportGenerator, CareReportGenerator, compliance findings, compliance status, audit report, trust compliance, governance report, evidence integrity, delegation compliance, ComplianceSection, ComplianceFinding, FindingSeverity, compliance assessment, EATP v0.8.0, CARE Framework -->
