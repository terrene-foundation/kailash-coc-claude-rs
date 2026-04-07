# PACT Quick Start

## Basic Usage

```rust
use kailash_pact::engine::GovernanceEngine;
use kailash_pact::types::{OrgDefinition, DepartmentConfig, RoleConfig};
use kailash_pact::clearance::{ClassificationLevel, TrustPostureLevel, VettingStatus, RoleClearance};
use kailash_pact::knowledge::KnowledgeItem;
use std::collections::BTreeSet;

// 1. Define and compile organization
let org = OrgDefinition {
    org_id: "acme".to_string(),
    name: "Acme Corp".to_string(),
    departments: vec![DepartmentConfig {
        id: "eng".to_string(),
        name: "Engineering".to_string(),
        head_role_id: "cto".to_string(),
        teams: vec![],
        roles: vec![RoleConfig {
            id: "cto".to_string(),
            name: "CTO".to_string(),
            ..Default::default()
        }],
        departments: vec![],  // nested sub-departments (v3.6.1)
    }],
};

let engine = GovernanceEngine::new(org)?;

// 2. Grant clearance
engine.grant_clearance(RoleClearance {
    role_id: "cto".to_string(),
    max_clearance: ClassificationLevel::Secret,
    compartments: BTreeSet::new(),
    vetting_status: VettingStatus::Active,
    granted_by: Some("admin".to_string()),
    nda_signed: true,
})?;

// 3. Check knowledge access (5-step algorithm)
let item = KnowledgeItem { /* ... */ };
let decision = engine.check_access("cto", &item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);

// 4. Verify action (4-zone gradient)
let ctx = std::collections::BTreeMap::new();
let verdict = engine.verify_action("D1-R1", "read", &ctx)?;
```
