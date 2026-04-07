# PACT Python Binding

## Usage

```python
from kailash._kailash import PactGovernanceEngine, PactKnowledgeItem, PactAddress

engine = PactGovernanceEngine('{"org_id":"test","name":"Test","departments":[...]}')
engine.grant_clearance("D1-R1", "Secret", ["alpha"])  # v3.4.1: accepts D/T/R addresses
verdict = engine.verify_action("D1-R1", "read", {"cost_usd": 50.0})
print(f"Allowed: {verdict.allowed}, Zone: {verdict.zone}")

# v3.4.1 APIs
roles = engine.list_roles()           # All roles, not just heads
node = engine.get_node_by_role_id("cto")  # Lookup by config ID
role_id = engine.resolve_role_id("D1-R1")  # Address -> config role ID
```

Build: `maturin develop --release` (PACT always included, no feature flag needed)
Test: `python -m venv /tmp/env && pip install target/wheels/kailash_enterprise-*.whl pytest && pytest tests/test_pact.py -v`

**IMPORTANT**: PACT types are in `kailash._kailash`, NOT re-exported in `kailash.__init__`. Always import from `kailash._kailash`.

## Exposed Types (21)

PactGovernanceEngine, PactGovernanceContext, PactGovernanceVerdict, PactAccessDecision, PactAddress, PactCompiledOrg, PactOrgNode, PactRoleSummary (v3.4.1), PactVacancyStatus, PactClassificationLevel, PactRoleClearance, PactRoleEnvelope, PactTaskEnvelope, PactEffectiveEnvelopeSnapshot, PactBridge, PactKnowledgeItem, PactKnowledgeSharePolicy, RbacMatrix (kailash-enterprise), PactDimensionName (v3.5.0), PactVacancyDesignation (v3.5.0), PactBridgeApprovalStatus (v3.5.0).

## Address Serde Format (for JSON APIs)

`Address` serializes as structured segments, NOT plain strings. This matters for `set_role_envelope`, `create_bridge`, `create_ksp`:

```python
# DO: structured segments
{"role_address": {"segments": [{"node_type": "Department", "sequence": 1}, {"node_type": "Role", "sequence": 1}]}}
# DO NOT: plain string
{"role_address": "D1-R1"}  # ValueError: expected struct Address
```

See `tests/test_pact.py` helpers `_address_json()`, `_role_envelope_json()`, `_task_envelope_json()` for complete JSON construction patterns.
