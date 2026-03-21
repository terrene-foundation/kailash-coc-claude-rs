---
name: pact
description: "PACT governance framework patterns for D/T/R addressing, knowledge clearance, operating envelopes, 5-step access enforcement, 4-zone gradient verification, GovernanceEngine, PactGovernedAgent, and cross-language usage. Use when working with PACT governance in Python or Ruby applications."
---

# PACT Governance Framework Patterns

Principled Architecture for Constrained Trust (PACT) -- organizational governance for AI agents. D/T/R addressing, knowledge clearance, operating envelopes, access enforcement, and verification gradient.

**Package**: `pip install kailash-enterprise` (Python) / `gem install kailash` (Ruby)
**Python import**: `from kailash.pact import GovernanceEngine`
**Ruby require**: `require "kailash"`
**Tests**: 448 across crate + integration (1 red team round, converged)

## Quick Start (Python)

```python
from kailash.pact import (
    GovernanceEngine, GovernanceVerdict, AccessDecision,
    Address, ClassificationLevel, RoleClearance, KnowledgeItem,
)

# 1. Define and compile organization (JSON string)
org_json = '''
{
  "org_id": "acme",
  "name": "Acme Corp",
  "departments": [{
    "id": "eng",
    "name": "Engineering",
    "head_role_id": "cto",
    "teams": [],
    "roles": [{"id": "cto", "name": "CTO"}]
  }]
}
'''
engine = GovernanceEngine(org_json)

# 2. Grant clearance
engine.grant_clearance("cto", "Secret", ["alpha"])

# 3. Check knowledge access (5-step algorithm)
decision = engine.check_access("cto", item, "Delegated")
assert decision.allowed

# 4. Verify action (4-zone gradient)
verdict = engine.verify_action("D1-R1", "read", {"cost_usd": 50.0})
print(f"Zone: {verdict.zone}, Allowed: {verdict.allowed}")
```

## Quick Start (Ruby)

```ruby
require "kailash"

# 1. Define and compile organization (JSON string)
org_json = '{"org_id":"acme","name":"Acme Corp","departments":[{"id":"eng","name":"Engineering","head_role_id":"cto","teams":[],"roles":[{"id":"cto","name":"CTO"}]}]}'
engine = Kailash::Pact::GovernanceEngine.new(org_json)

# 2. Grant clearance
engine.grant_clearance("cto", "Secret", ["alpha"])

# 3. Check knowledge access (5-step algorithm)
decision = engine.check_access("cto", item, "Delegated")
raise "Access denied" unless decision.allowed?

# 4. Verify action (4-zone gradient)
verdict = engine.verify_action("D1-R1", "read", { "cost_usd" => 50.0 })
puts "Zone: #{verdict.zone}, Allowed: #{verdict.allowed?}"
```

## 8 User Flows

| #   | Flow                | Entry Point                                        | Key Invariant                                 |
| --- | ------------------- | -------------------------------------------------- | --------------------------------------------- |
| 1   | Compile org         | `GovernanceEngine(org_json)`                       | Grammar: D/T must be followed by R            |
| 2   | Access check        | `engine.check_access(role_id, item, posture)`      | 5-step fail-closed algorithm                  |
| 3   | Posture ceiling     | Implicit in step 2                                 | `effective = min(clearance, posture_ceiling)` |
| 4   | Action verification | `engine.verify_action(addr, action, ctx)`          | 4-zone gradient, worst-zone wins              |
| 5   | NEVER_DELEGATED     | Implicit in flow 4                                 | 7 actions always HELD                         |
| 6   | Bridge access       | Step 3e in flow 2                                  | Bilateral vs unilateral directionality        |
| 7   | Frozen context      | `engine.get_context(addr, posture)`                | Read-only, no mutation, no deserialization    |
| 8   | Language binding     | `from kailash.pact import ...` / `require "kailash"` | 16 types, thread-safe                        |

## D/T/R Address Grammar

```
D1-R1              # Department head
D1-R1-T1-R1        # Team lead within department
D1-R1-T1-R1-R1     # Sub-role within team
D2-R1              # Second department head
```

- Every D or T segment MUST be immediately followed by R
- `Address.parse()` validates grammar at construction time
- MAX_SEGMENTS = 100 (DoS prevention)
- Case-insensitive parsing

### Python

```python
from kailash.pact import Address

addr = Address.parse("D1-R1-T1-R1")
print(f"Depth: {addr.depth()}")
print(f"String: {addr}")
```

### Ruby

```ruby
addr = Kailash::Pact::Address.parse("D1-R1-T1-R1")
puts "Depth: #{addr.depth}"
puts "String: #{addr}"
```

## 5-Step Access Algorithm

```
Step 0: Preconditions (role exists, not vacant, same org)
Step 1: PUBLIC shortcut (classification == Public -> ALLOW)
Step 2: Clearance gate
  |-- effective_clearance = min(role_clearance, posture_ceiling(posture))
  |-- effective_clearance >= item.classification? (else DENY)
  \-- role.compartments >= item.compartments? (else DENY)
Step 3: Containment paths
  |-- 3a: Same unit (team/department) -> ALLOW
  |-- 3b: Supervisor -> subordinate (downward visibility) -> ALLOW
  |-- 3c: Team inherits department -> ALLOW
  |-- 3d: KSP grants cross-unit access -> ALLOW (directional, expiry-checked)
  \-- 3e: Bridge grants cross-boundary access -> ALLOW (bilateral/unilateral, expiry-checked)
Step 4: Default DENY
```

## 4-Zone Gradient

| Zone         | `allowed` | When                                     |
| ------------ | --------- | ---------------------------------------- |
| AutoApproved | true      | Action within all limits                 |
| Flagged      | true      | Action >= 80% of a limit                 |
| Held         | false     | NEVER_DELEGATED action or unknown action |
| Blocked      | false     | Action exceeds limit or NULL dimension   |

Worst zone across all 5 dimensions wins.

## 3-Layer Envelope Model

```
RoleEnvelope (standing, set by supervisor)
  \-- per-dimension: Financial, Operational, Temporal, DataAccess, Communication
TaskEnvelope (ephemeral, narrows only)
  \-- same 5 dimensions, cannot widen parent

EffectiveEnvelope = intersect(ancestor_chain) intersect task_envelope
  \-- version_hash = SHA-256(all ancestor versions) for TOCTOU defense
```

**Key invariants**:

- NULL dimension = BLOCKED (PACT semantic, diverges from EATP's NULL=unconstrained)
- Child cannot widen parent (monotonic tightening)
- FiniteF64 rejects NaN/Inf at construction

## GovernanceEngine API

### Decision API

- `verify_action(role_address, action, context)` -- returns GovernanceVerdict
- `check_access(role_id, knowledge_item, posture)` -- returns AccessDecision
- `compute_envelope(role_address, task_id)` -- returns EffectiveEnvelopeSnapshot

### Query API

- `get_context(role_address, posture)` -- returns GovernanceContext (frozen, read-only)
- `get_node(address)` -- returns OrgNode or None
- `get_vacancy_status()` -- returns VacancyStatus

### Mutation API

- `grant_clearance(clearance)` / `revoke_clearance(role_id)`
- `create_bridge(bridge)` / `remove_bridge(bridge_id)`
- `create_ksp(ksp)` / `remove_ksp(ksp_id)`
- `set_role_envelope(envelope)` / `set_task_envelope(envelope)` / `delete_task_envelope(task_id)`

## Python Binding (16 Types)

```python
from kailash.pact import (
    GovernanceEngine,       # Thread-safe engine facade
    GovernanceContext,       # Frozen, read-only context
    GovernanceVerdict,       # 4-zone verification result
    AccessDecision,          # 5-step access result
    Address,                 # Validated D/T/R address
    CompiledOrg,             # Immutable compiled organization
    OrgNode,                 # Node in organization tree
    VacancyStatus,           # Role vacancy summary
    ClassificationLevel,     # 5-level classification
    RoleClearance,           # Role clearance assignment
    RoleEnvelope,            # Standing envelope
    TaskEnvelope,            # Ephemeral task envelope
    EffectiveEnvelopeSnapshot,  # Computed effective envelope
    Bridge,                  # Cross-boundary bridge
    KnowledgeItem,           # Classified knowledge item
    KnowledgeSharePolicy,    # Cross-unit sharing policy
)
```

## Ruby Binding

```ruby
require "kailash"

# All types under Kailash::Pact namespace
Kailash::Pact::GovernanceEngine
Kailash::Pact::GovernanceContext
Kailash::Pact::GovernanceVerdict
Kailash::Pact::AccessDecision
Kailash::Pact::Address
Kailash::Pact::CompiledOrg
Kailash::Pact::OrgNode
Kailash::Pact::VacancyStatus
Kailash::Pact::ClassificationLevel
Kailash::Pact::RoleClearance
Kailash::Pact::RoleEnvelope
Kailash::Pact::TaskEnvelope
Kailash::Pact::EffectiveEnvelopeSnapshot
Kailash::Pact::Bridge
Kailash::Pact::KnowledgeItem
Kailash::Pact::KnowledgeSharePolicy
```

## Security Invariants

- GovernanceContext: Read-only (no mutation, no deserialization -- anti-forgery)
- FiniteF64: Rejects NaN/Inf at construction (NaN bypass prevention)
- `evaluate_financial`: checks `is_finite()` for transaction_amount AND daily_total
- NEVER_DELEGATED_ACTIONS: 7 actions always HELD regardless of envelope
- Default-deny: unregistered tools blocked, step 4 denies, NULL dimension blocks
- Bounded stores: MAX_STORE_SIZE = 10,000 with FIFO eviction
- Address: MAX_SEGMENTS = 100 (DoS prevention)
