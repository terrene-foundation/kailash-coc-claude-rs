---
name: pact
description: "PACT governance framework patterns for D/T/R addressing, knowledge clearance, operating envelopes, 5-step access enforcement, 4-zone gradient verification, GovernanceEngine, PactGovernedAgent, and cross-language bindings. Use when working with crates/kailash-pact/ or pact binding modules."
---

# PACT Governance Framework Patterns

Principled Architecture for Constrained Trust (PACT) — organizational governance for AI agents. D/T/R addressing, knowledge clearance, operating envelopes, access enforcement, and verification gradient.

**Crate**: `crates/kailash-pact/` (proprietary, `publish = false`)
**Depends on**: `kailash-governance` + `eatp` (both proprietary, `publish = false`)
**Tests**: 1,396+ (governance 565 + eatp 58 + pact 58 + Python 109 + bridge enforcement 10)
**PyO3**: `from kailash import PactGovernanceEngine, PactAddress, PactDimensionName, PactVacancyDesignation, PactBridgeApprovalStatus`

## Quick Start

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

## 8 User Flows

| #   | Flow                | Entry Point                                     | Key Invariant                                      |
| --- | ------------------- | ----------------------------------------------- | -------------------------------------------------- |
| 1   | Compile org         | `GovernanceEngine::new(org_def)`                | Grammar: D/T must be followed by R                 |
| 2   | Access check        | `engine.check_access(role_id, item, posture)`   | 5-step fail-closed algorithm                       |
| 3   | Posture ceiling     | Implicit in step 2                              | `effective = min(clearance, posture_ceiling)`      |
| 4   | Action verification | `engine.verify_action(addr, action, ctx)`       | 4-zone gradient, worst-zone wins                   |
| 5   | NEVER_DELEGATED     | Implicit in flow 4                              | 7 actions always HELD                              |
| 6   | Bridge access       | Step 3e in flow 2                               | Bilateral vs unilateral directionality             |
| 7   | Bridge approval     | `engine.request_bridge()` / `approve_bridge()`  | LCA approver, Pending→Approved gate                |
| 8   | Frozen context      | `engine.get_context(addr, posture)`             | No `&mut self`, no Deserialize                     |
| 9   | Python integration  | `from kailash import PactGovernanceEngine`      | 25+ types, thread-safe                             |
| 10  | Role discovery      | `engine.list_roles()` / `get_node_by_role_id()` | All roles (not just heads), v3.4.1                 |
| 11  | Address resolution  | `engine.resolve_role_id("D1-R1")`               | Resolves D/T/R address OR config ID, v3.4.1        |
| 12  | Vacancy designation | `engine.set_vacancy_designation()`              | Acting occupant, 24h expiry, fail-closed           |
| 13  | Auto-suspension     | `RoleConfig::auto_suspend_on_vacancy`           | BFS cascade, opt-in per-role                       |
| 14  | LCA computation     | `Address::lowest_common_ancestor(a, b)`         | O(depth), grammar-validated                        |
| 15  | Dimension scoping   | `DelegationRecord::dimension_scope`             | BTreeSet<DimensionName>, subset tightening         |
| 16  | Nested departments  | `DepartmentConfig::departments` (v3.6.1)        | Recursive D-R-D-R, `compile_department()` recurses |

See `workspaces/kailash-pact-rs/03-user-flows/01-governance-flows.md` for detailed storyboards.

## D/T/R Address Grammar

```
D1-R1              # Department head
D1-R1-R2           # Dept-level role (reports to head)
D1-R1-T1-R1        # Team lead within department
D1-R1-T1-R1-R2     # Sub-role within team
D2-R1              # Second department head
D1-R1-D1-R1        # Nested sub-department head (v3.6.1)
D1-R1-D1-R1-D1-R1  # 3-level nested department head (v3.6.1)
D1-R1-D1-R1-T1-R1  # Team inside nested sub-department (v3.6.1)
```

- Every D or T segment MUST be immediately followed by R
- Nested departments follow D-R-D-R grammar: sub-dept attaches under parent head's address
- `DepartmentConfig.departments` field enables recursive nesting (v3.6.1)
- `Address::parse()` validates grammar at construction time
- `Address::ancestors()` returns all grammar-valid ancestor addresses (e.g., `D1-R1-T1-R1` yields `[D1-R1, D1-R1-T1-R1]`)
- `Address::lowest_common_ancestor(a, b)` returns the deepest grammar-valid common prefix, or `None` if disjoint
- `get_node_by_role_id()` resolves roles at any nesting depth (v3.6.1)
- MAX_SEGMENTS = 100 (DoS prevention)
- Case-insensitive parsing

## 5-Step Access Algorithm

```
Step 0: Preconditions (role exists, not vacant, same org)
Step 1: PUBLIC shortcut (classification == Public → ALLOW)
Step 2: Clearance gate
  ├─ effective_clearance = min(role_clearance, posture_ceiling(posture))
  ├─ effective_clearance >= item.classification? (else DENY)
  └─ role.compartments ⊇ item.compartments? (else DENY)
Step 3: Containment paths
  ├─ 3a: Same unit (team/department) → ALLOW
  ├─ 3b: Supervisor → subordinate (downward visibility) → ALLOW
  ├─ 3c: Team inherits department → ALLOW
  ├─ 3d: KSP grants cross-unit access → ALLOW (directional, expiry-checked)
  └─ 3e: Bridge grants cross-boundary access → ALLOW (bilateral/unilateral, expiry-checked)
Step 4: Default DENY
```

### Step 3 Containment Sub-paths

Step 3 tries five containment sub-paths in order. The first match grants access.

#### 3a: Same Unit

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

#### 3b: Downward Visibility

Role address is a prefix of the item owner address (supervisor sees subordinate knowledge).

```rust
// Role D1-R1 (Dept head) -> Item owned by D1-R1-T1-R1 (team member under D1)
// -> ALLOW: D1-R1 is prefix of D1-R1-T1-R1
let decision = engine.check_access("dept-head", &team_item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);
assert_eq!(decision.path.as_deref(), Some("3b: downward"));
```

Uses `Address::is_prefix_of()` for prefix matching.

#### 3c: T-inherits-D

Team members inherit read access to department-level knowledge. The role must have a T segment; the owner must NOT have a T segment; both share the same D-R prefix.

```rust
// Role D1-R1-T1-R1 (team member) -> Item owned by D1-R1 (dept level)
// -> ALLOW: team T1 is inside department D1
let decision = engine.check_access("team-analyst", &dept_item, TrustPostureLevel::Delegated)?;
assert!(decision.allowed);
assert_eq!(decision.path.as_deref(), Some("3c: t_inherits_d"));
```

#### 3d: KnowledgeSharePolicy (KSP)

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

#### 3e: PactBridge

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

## 4-Zone Gradient

| Zone         | `allowed()` | When                                     |
| ------------ | ----------- | ---------------------------------------- |
| AutoApproved | true        | Action within all limits                 |
| Flagged      | true        | Action >= 80% of a limit                 |
| Held         | false       | NEVER_DELEGATED action or unknown action |
| Blocked      | false       | Action exceeds hard limit                |

Worst zone across all 5 dimensions wins.

## 3-Layer Envelope Model

```
RoleEnvelope (standing, set by supervisor)
  └─ per-dimension: Financial, Operational, Temporal, DataAccess, Communication
TaskEnvelope (ephemeral, narrows only)
  └─ same 5 dimensions, cannot widen parent

EffectiveEnvelope = intersect(ancestor_chain) ∩ task_envelope
  └─ version_hash = SHA-256(all ancestor versions) for TOCTOU defense
```

**Key invariants**:

- NULL dimension = unconstrained (no constraint from this level). This aligns PACT evaluator with EATP semantics where `None` means "no restriction on this dimension." Two-layer semantic: (1) EATP `EnvelopeEvaluator` treats `None` as unconstrained, (2) PACT `intersect_dimensions()` uses pass-through (if one side is `None`, the other side's constraint passes through; both `None` = unconstrained).
- Missing envelopes = BLOCKED (fail-closed): if no envelopes exist in the ancestor chain, `compute_effective_envelope` returns an error and the engine produces a BLOCKED verdict.
- Vacant roles = DENY (fail-closed): step 0 of the access algorithm denies access for vacant roles. Also blocks verify_action (v3.5.0+).
- Vacancy designation = acting occupant can operate on behalf of vacant role (24h default expiry)
- Suspended roles = BLOCKED: auto-suspension cascade from vacant parent (opt-in via `auto_suspend_on_vacancy`)
- Unknown actions = HELD (fail-safe): actions not in allowed AND not in denied produce HELD.
- Bridge approval: Pending/Rejected bridges do NOT grant access (v3.5.0+). Use request_bridge → approve_bridge flow.
- Child cannot widen parent (monotonic tightening)
- `FiniteF64` rejects NaN/Inf at construction

### Envelope Intersection Rules

Per-dimension intersection follows XACML deny-overrides via `intersect_dimensions()`:

| Dimension     | Intersection Rule                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Financial     | `min()` of `max_transaction_cents` and `max_cumulative_cents`; intersection of `allowed_currencies`             |
| Operational   | Intersection of `allowed_operations`; union of `denied_operations`; denied overrides allowed                    |
| Temporal      | More restrictive `operating_hours`; union of blackout periods                                                   |
| Data Access   | Intersection of `data_classifications` and `allowed_data_sources`; more restrictive PII handling                |
| Communication | Intersection of `allowed_channels` and `allowed_recipients`; union of `denied_channels` and `denied_recipients` |

NULL dimension = pass-through: if one ancestor has `None` for a dimension, the other side's constraint passes through. Both `None` = unconstrained (`None` result). This aligns PACT with EATP semantics (NULL=unconstrained). The evaluator (`verify_action`) also treats `None` dimensions as unconstrained (AutoApproved). Fail-closed is enforced at the envelope computation level: if NO envelopes exist at all (empty chain), `compute_effective_envelope` returns an error.

```rust
// Three-level ancestor chain: intersection narrows at each level
let snapshot = engine.compute_envelope("D1-R1-T1-R1", None)?;
// Financial: min of all ancestors
// Operational: only ops in ALL ancestors' allowed lists
// version_hash: SHA-256(all ancestor version numbers) for TOCTOU defense
```

### Default Envelopes by Posture

Recommended envelope defaults per trust posture level (not yet a library function -- use as a reference when setting role envelopes):

| Posture           | max_transaction | Allowed Operations                 | Communication |
| ----------------- | --------------- | ---------------------------------- | ------------- |
| PseudoAgent       | $0              | `read`                             | Internal only |
| Supervised        | $100            | `read`, `write`                    | Internal only |
| SharedPlanning    | $1,000          | `read`, `write`, `plan`, `propose` | External OK   |
| ContinuousInsight | $10,000         | + `execute`, `deploy`              | External OK   |
| Delegated         | $100,000        | + `approve`, `delegate`            | External OK   |

These align with the posture ceiling mapping in `clearance::posture_ceiling()`:

| Posture           | Classification Ceiling |
| ----------------- | ---------------------- |
| PseudoAgent       | Public                 |
| Supervised        | Restricted             |
| SharedPlanning    | Confidential           |
| ContinuousInsight | Secret                 |
| Delegated         | TopSecret              |

## GovernanceEngine API

### Decision API

- `verify_action(role_address, action, context)` → `GovernanceVerdict`
- `check_access(role_id, knowledge_item, posture)` → `AccessDecision`
- `compute_envelope(role_address, task_id)` → `EffectiveEnvelopeSnapshot`

### Query API

- `get_context(role_address, posture)` → `GovernanceContext` (frozen, read-only)
- `get_node(address)` → `Option<OrgNode>`
- `get_vacancy_status()` → `VacancyStatus`

### Mutation API

- `grant_clearance(clearance)` / `revoke_clearance(role_id)`
- `create_bridge(bridge)` / `remove_bridge(bridge_id)`
- `request_bridge(bridge)` → Pending status; `approve_bridge(bridge_id, approver)` / `reject_bridge(bridge_id, approver)` → LCA-based approver
- `create_ksp(ksp)` / `remove_ksp(ksp_id)`
- `set_role_envelope(envelope)` / `set_task_envelope(envelope)` / `delete_task_envelope(task_id)`
- `set_vacancy_designation(role_address, acting_occupant, duration_hours)` → 24h default expiry
- `clear_vacancy_designation(role_address)`

### DelegationBuilder (v3.5.0)

Builder pattern for constructing `DelegationRecord` with dimension scoping:

```rust
use kailash_governance::delegation::{DelegationBuilder, DimensionName};

let record = DelegationBuilder::new("principal-id", "agent-id")
    .scope("task:analysis")
    .dimension(DimensionName::Financial)
    .dimension(DimensionName::DataAccess)
    .ttl_secs(3600)
    .build()?;

// dimension_scope: BTreeSet<DimensionName> -- subset tightening invariant
// Empty set = all 5 dimensions (backward compatible)
```

`DimensionName` enum: `Financial`, `Operational`, `Temporal`, `DataAccess`, `Communication` (closed set, matches EATP spec).

## PactGovernedAgent

Default-deny tool execution wrapper:

```rust
use kailash_pact::agent::PactGovernedAgent;

let mut agent = PactGovernedAgent::new(engine, "D1-R1-T1-R1", "Supervised")?;

// Register allowed tools with estimated costs
agent.register_tool("read_file", Some(0.0), None)?;
agent.register_tool("deploy", Some(500.0), Some("production"))?;

// Execute — verify-before-act, fail-closed
let result = agent.execute_tool("read_file", || Ok(()))?;
// Unregistered tools → PactError::Governance (default-deny)
```

## Kaizen Integration

PACT governance and kailash-kaizen's trust module are independent but complementary layers. PACT provides organizational governance (who can do what within the org structure), while kaizen's trust module provides cryptographic trust (EATP chains, delegation, verification gradient).

**Relationship**:

- **PACT** (`kailash-pact`): Organizational governance -- D/T/R addresses, knowledge clearance, operating envelopes, 5-step access, 4-zone gradient. No dependency on kaizen.
- **Kaizen trust** (`kailash-kaizen::trust`): Cryptographic trust -- Ed25519 keys, CareChain, delegation chains, circuit breakers, shadow enforcers, lifecycle hooks. Depends on `eatp` crate.
- **Shared type**: Both use `eatp::constraints::ConstraintEnvelope` / `Dimensions` for the 5-dimensional constraint model. PACT wraps these in its `RoleEnvelope`/`TaskEnvelope` layers.

**Bridging pattern** (application code):

```rust
use kailash_pact::engine::GovernanceEngine;
use kailash_pact::agent::PactGovernedAgent;
use kailash_kaizen::trust::agent::GovernedAgent;

// 1. PACT layer: organizational governance
let pact_engine = GovernanceEngine::new(org_def)?;
let mut pact_agent = PactGovernedAgent::new(pact_engine, "D1-R1-T1-R1", posture)?;
pact_agent.register_tool("analyze", Some(5.0), None)?;

// 2. Kaizen layer: cryptographic trust (wraps a BaseAgent)
let governed = GovernedAgent::new(base_agent, trust_config).await?;

// 3. Compose: PACT verifies org constraints, then kaizen executes with trust
let pact_result = pact_agent.execute_tool("analyze", || {
    // Inside: kaizen's governed TAOD loop handles evidence + delegation
    governed.run_governed(task).await
})?;
```

**Key distinction**: `PactGovernedAgent` enforces envelope limits and access policies at the organizational level. `GovernedAgent` (kaizen) enforces cryptographic trust, evidence recording, and delegation chain validity at the protocol level. In production, both layers wrap the same underlying agent execution.

**EATP type convergence**: PACT's `envelopes.rs` imports `eatp::constraints::{ConstraintEnvelope, Dimensions, FinancialConstraints, ...}` directly. The `intersect_dimensions()` function in PACT applies pass-through semantics (NULL=unconstrained, aligned with EATP) on top of the shared EATP types, ensuring the same constraint vocabulary and NULL semantics are used across both layers.

## Store Backends

| Backend                    | Feature  | Use Case                                      |
| -------------------------- | -------- | --------------------------------------------- |
| `MemoryEnvelopeStore` etc. | default  | In-process, bounded (10K FIFO), tests         |
| `SqlitePactStore`          | `sqlite` | Persistent, auto-migration, file or in-memory |

## Python Binding

```python
from kailash._kailash import PactGovernanceEngine, PactKnowledgeItem, PactAddress

engine = PactGovernanceEngine('{"org_id":"test","name":"Test","departments":[...]}')
engine.grant_clearance("D1-R1", "Secret", ["alpha"])  # v3.4.1: accepts D/T/R addresses
verdict = engine.verify_action("D1-R1", "read", {"cost_usd": 50.0})
print(f"Allowed: {verdict.allowed}, Zone: {verdict.zone}")

# v3.4.1 APIs
roles = engine.list_roles()           # All roles, not just heads
node = engine.get_node_by_role_id("cto")  # Lookup by config ID
role_id = engine.resolve_role_id("D1-R1")  # Address → config role ID
```

Build: `maturin develop --release` (PACT always included, no feature flag needed)
Test: `python -m venv /tmp/env && pip install target/wheels/kailash_enterprise-*.whl pytest && pytest tests/test_pact.py -v`

**IMPORTANT**: PACT types are in `kailash._kailash`, NOT re-exported in `kailash.__init__`. Always import from `kailash._kailash`.

21 types: PactGovernanceEngine, PactGovernanceContext, PactGovernanceVerdict, PactAccessDecision, PactAddress, PactCompiledOrg, PactOrgNode, PactRoleSummary (v3.4.1), PactVacancyStatus, PactClassificationLevel, PactRoleClearance, PactRoleEnvelope, PactTaskEnvelope, PactEffectiveEnvelopeSnapshot, PactBridge, PactKnowledgeItem, PactKnowledgeSharePolicy, RbacMatrix (kailash-enterprise), PactDimensionName (v3.5.0), PactVacancyDesignation (v3.5.0), PactBridgeApprovalStatus (v3.5.0).

### Address Serde Format (for JSON APIs)

`Address` serializes as structured segments, NOT plain strings. This matters for `set_role_envelope`, `create_bridge`, `create_ksp`:

```python
# DO: structured segments
{"role_address": {"segments": [{"node_type": "Department", "sequence": 1}, {"node_type": "Role", "sequence": 1}]}}
# DO NOT: plain string
{"role_address": "D1-R1"}  # ValueError: expected struct Address
```

See `tests/test_pact.py` helpers `_address_json()`, `_role_envelope_json()`, `_task_envelope_json()` for complete JSON construction patterns.

## MCP Bridge (`mcp` feature, KZ-091)

PACT governance enforcement on MCP tool invocations. Behind `mcp` feature flag.

```rust
use kailash_pact::mcp::{PactMcpBridge, AgentContext, McpVerdict};
use kailash_pact::clearance::ClassificationLevel;

let mut bridge = PactMcpBridge::new();

// Register tool policies (default-deny: unregistered tools are BLOCKED)
bridge.register_tool_policy("file_read", ClassificationLevel::Public, Some(0.01));
bridge.register_tool_policy("database_query", ClassificationLevel::Confidential, Some(1.0));

// Evaluate a tool call
let ctx = AgentContext::new(ClassificationLevel::Confidential, 5.0); // clearance, daily spending USD
let verdict = bridge.evaluate_tool_call("file_read", &serde_json::json!({"path": "/etc"}), &ctx);
assert!(verdict.is_allowed());
```

**Evaluation algorithm** (6 steps, fail-closed):

1. Never-delegated check (7 actions always HELD)
2. Registration check → unregistered = BLOCKED
3. Clearance check → tool requires higher = BLOCKED
4. Financial: transaction amount → exceeds limit = HELD, ≥80% = FLAGGED
5. Financial: daily spending → projected exceeds = HELD, ≥80% = FLAGGED
6. Default → AUTO_APPROVED

**NaN/Inf protection**: All financial values validated with `is_finite()`. Non-finite = BLOCKED.

**McpVerdict API**: `is_allowed()` (true for AutoApproved/Flagged), `severity()` (0-3), `tool_name()`, `reason()` (None for AutoApproved).

**Types**: `PactMcpBridge` (tool policy registry), `McpVerdict` (4-zone verdict), `ToolPolicy` (clearance + optional financial limit), `AgentContext::new(clearance, daily_spending_usd)`.

**Thread safety**: `PactMcpBridge` is `Send + Sync`. Wrap in `Arc<RwLock<_>>` for concurrent mutable registration.

**47 tests** covering all verdict paths, NaN bypass prevention, serde roundtrips.

## Security Invariants

- GovernanceContext: Serialize only (NO Deserialize — anti-forgery)
- FiniteF64: Rejects NaN/Inf at construction
- `evaluate_financial`: checks `is_finite()` for transaction_amount AND daily_total
- NEVER_DELEGATED_ACTIONS: 7 actions always HELD regardless of envelope
- Default-deny: unregistered tools blocked, step 4 denies, missing envelopes block
- Bounded stores: MAX_STORE_SIZE = 10,000 with FIFO eviction
- Address: MAX_SEGMENTS = 100 (DoS prevention)
- MCP bridge: default-deny, clearance-gated, financial-limited, NaN-protected
