# PACT 5-Step Access Algorithm

## Algorithm

```
Step 0: Preconditions (role exists, not vacant, same org)
Step 1: PUBLIC shortcut (classification == Public -> ALLOW)
Step 2: Clearance gate
  |-- effective_clearance = min(role_clearance, posture_ceiling(posture))
  |-- effective_clearance >= item.classification? (else DENY)
  +-- role.compartments >= item.compartments? (else DENY)
Step 3: Containment paths
  |-- 3a: Same unit (team/department) -> ALLOW
  |-- 3b: Supervisor -> subordinate (downward visibility) -> ALLOW
  |-- 3c: Team inherits department -> ALLOW
  |-- 3d: KSP grants cross-unit access -> ALLOW (directional, expiry-checked)
  +-- 3e: Bridge grants cross-boundary access -> ALLOW (bilateral/unilateral, expiry-checked)
Step 4: Default DENY
```

## Step 3 Containment Sub-paths

Step 3 tries five containment sub-paths in order. The first match grants access.

### 3a: Same Unit

Role and item owner share the same organizational unit (nearest D or T ancestor).

```rust
// Role D1-R1-T1-R1 (in Team T1 under Dept D1)
// Item owned by D1-R1-T1 (Team T1)
// -> ALLOW: both in unit T1
let decision = engine.check_access("team-member", &item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);
assert_eq!(decision.path.as_deref(), Some("3a: same_unit"));
```

Internally uses `Address::containment_unit()` to extract the nearest D/T prefix.

### 3b: Downward Visibility

Role address is a prefix of the item owner address (supervisor sees subordinate knowledge).

```rust
// Role D1-R1 (Dept head) -> Item owned by D1-R1-T1-R1 (team member under D1)
// -> ALLOW: D1-R1 is prefix of D1-R1-T1-R1
let decision = engine.check_access("dept-head", &team_item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);
assert_eq!(decision.path.as_deref(), Some("3b: downward"));
```

Uses `Address::is_prefix_of()` for prefix matching.

### 3c: T-inherits-D

Team members inherit read access to department-level knowledge. The role must have a T segment; the owner must NOT have a T segment; both share the same D-R prefix.

```rust
// Role D1-R1-T1-R1 (team member) -> Item owned by D1-R1 (dept level)
// -> ALLOW: team T1 is inside department D1
let decision = engine.check_access("team-analyst", &dept_item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);
assert_eq!(decision.path.as_deref(), Some("3c: t_inherits_d"));
```

### 3d: KnowledgeSharePolicy (KSP)

Cross-unit knowledge sharing. KSPs are directional: source shares WITH target.

```rust
use kailash_pact::knowledge::KnowledgeSharePolicy;

let ksp = KnowledgeSharePolicy {
    id: "ksp-eng-to-legal".to_string(),
    source_unit_address: Address::parse("D1-R1")?,    // Engineering shares
    target_unit_address: Address::parse("D2-R1")?,    // Legal receives
    max_classification: ClassificationLevel::Confidential,
    is_active: true,
    expires_at: None,
    created_by: "ceo".to_string(),
};
engine.create_ksp(ksp)?;

// Legal team member can now access Engineering's CONFIDENTIAL data
let decision = engine.check_access("legal-analyst", &eng_item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);
assert_eq!(decision.path.as_deref(), Some("3d: ksp"));
```

KSP checks: active, not expired, `source` matches item owner, `target` contains requesting role, item classification <= `max_classification`.

### 3e: PactBridge

Role-level cross-boundary access. Bridges connect specific roles (not units).

```rust
use kailash_pact::bridges::PactBridge;

let bridge = PactBridge {
    id: "bridge-eng-sales".to_string(),
    role_a_address: Address::parse("D1-R1")?,  // Engineering lead
    role_b_address: Address::parse("D2-R1")?,  // Sales lead
    max_classification: ClassificationLevel::Secret,
    bilateral: true,   // Both can access each other
    // bilateral: false -> only role_a can access role_b's data
    is_active: true,
    expires_at: None,
    created_by: "ceo".to_string(),
};
engine.create_bridge(bridge)?;

let decision = engine.check_access("eng-lead", &sales_item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);
assert_eq!(decision.path.as_deref(), Some("3e: bridge"));
```

Bridges do NOT cascade to subordinates. A bridge to a dept head does NOT grant access to that head's team members.
