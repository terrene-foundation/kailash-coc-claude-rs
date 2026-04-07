# Compliance Reports, Competency, and Governance Bridge

## Governance Bridge (Enterprise Integration)

```rust
// Requires: features = ["governance"]
use kailash_kaizen::governance::GovernanceContext;

let ctx = GovernanceContext::new(posture_system, rbac_evaluator, audit_logger);

// Combined trust + RBAC check
let allowed = ctx.check_permission("user:read", &posture, &user);

// Audit trust operations
ctx.audit_trust_operation("posture_transition", &details).await?;
```

## Compliance Reports

```rust
use kailash_enterprise::compliance::{EatpReportGenerator, CareReportGenerator, ComplianceReport};

let eatp_report = EatpReportGenerator::generate(
    evidence_count, chain_length, has_genesis, has_delegation,
);

let care_report = CareReportGenerator::generate(
    has_competency_eval, has_human_intervention, has_posture_system, has_verification,
);
```

## Human Competencies

```rust
use kailash_enterprise::competency::{CompetencyEvaluator, HumanCompetency};

let evaluator = CompetencyEvaluator::with_defaults();

if evaluator.requires_human("approve financial report") {
    let reqs = evaluator.evaluate("approve financial report");
    // Returns CompetencyRequirements (e.g., EthicalJudgment level 3)
}
```
