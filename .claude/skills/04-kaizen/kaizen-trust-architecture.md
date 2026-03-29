# Trust Architecture Map

The trust stack spans three layers. This map shows where each trust concept lives and which API to use.

## Three-Layer Trust Stack

| Concept          | Layer 1: EATP (Protocol)               | Layer 2: Trust-Plane (Environment)                | Layer 3: Kaizen Trust (Agent Runtime)  |
| ---------------- | -------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| Constraint model | `ConstraintDimensions` (8 fields)      | `ConstraintEnvelope` (5 dimension structs)        | Re-exports via trust feature           |
| Delegation       | `DelegationRecord` + `DelegationChain` | `DelegationManager` (file-backed, WAL)            | `DelegationChain` (in-memory)          |
| Enforcement      | None (protocol spec only)              | `StrictEnforcer` + `ShadowEnforcer`               | `GovernedAgent` + `GovernedTaodRunner` |
| Verification     | `VerificationGradient` (4 levels)      | `Verdict` (4 levels, different names)             | Re-exports EATP verification           |
| Intersection     | None                                   | `intersect_constraints()` -> `IntersectionResult` | None                                   |
| Posture          | `PostureSystem` (state machine)        | None                                              | Re-exports EATP posture system         |

## When to Use Each Layer

### EATP (Protocol Layer)

Use for trust chain management, delegation, and verification without enforcement. EATP is the specification layer -- it defines what trust looks like but does not enforce it at runtime.

```python
from kailash.kaizen import TrustLevel, TrustPosture, VerificationResult
```

### Trust-Plane (Environment Layer)

Use for file-backed trust projects with constraint enforcement, shadow mode testing, and delegation management.

```python
from kailash.trust_plane import (
    TrustProject,
    ConstraintEnvelope,
    intersect_constraints,
    IntersectionResult,
    ShadowEnforcer,
    ShadowConfig,
)

# Create a trust project
project = TrustProject.create("/tmp/my-project", "My Project", "alice")

# Check an action against constraints
verdict = project.check_action("deploy", {"target": "production"})
print(verdict.level)  # "auto_approved", "flagged", "held", or "blocked"
```

### Kaizen Trust (Agent Runtime Layer)

Use for trust-enforced AI agents. This layer wraps agents with constraint checking, verification, and governance.

```python
from kailash.kaizen import (
    GovernedAgent,
    BaseAgent,
    TrustLevel,
    VerificationResult,
)
```

## Constraint Intersection (Python)

When multiple delegation chains contribute constraints, use `intersect_constraints` to compute the effective constraint envelope.

```python
from kailash.trust_plane import (
    ConstraintEnvelope,
    intersect_constraints,
)

# Two envelopes from different delegations
envelope_a = ConstraintEnvelope()
# ... configure envelope_a ...

envelope_b = ConstraintEnvelope()
# ... configure envelope_b ...

# Intersect: result is the tightest combination
result = intersect_constraints([envelope_a, envelope_b])

print(result.envelope)           # The intersected ConstraintEnvelope
print(result.empty_dimensions)   # List of dimensions that became empty (fully restricted)
print(result.warnings)           # List of warning strings
```

### Intersection Algebra

- **Allowed actions/resources**: Intersection (only actions allowed by ALL envelopes)
- **Blocked actions/resources**: Union (anything blocked by ANY envelope)
- **Financial/temporal limits**: Minimum (tightest limit wins)
- **Flags (reasoning_required, etc.)**: OR (if any envelope requires it, it is required)
- **Allowed hours**: 24-bit bitset intersection (only hours allowed by ALL envelopes)

### Key Invariants

1. **Monotonic tightening** -- Each delegation level can only tighten constraints, never loosen.
2. **`None` = unrestricted** -- `allowed_actions: None` means everything is allowed.
3. **`Some([])` = nothing allowed** -- An empty allowlist is the zero element.
4. **Commutative** -- Input order does not affect the result.

## Shadow Mode

Shadow mode runs a candidate constraint configuration alongside the active one without affecting real decisions. Use it to validate constraint changes before promoting them.

```python
from kailash.trust_plane import ShadowEnforcer, ShadowConfig, ConstraintEnvelope

active_envelope = ConstraintEnvelope()
candidate_envelope = ConstraintEnvelope()

config = ShadowConfig(
    active=active_envelope,
    candidate=candidate_envelope,
    max_records=1000,
)

shadow = ShadowEnforcer(config)

# Evaluate an action -- returns the ACTIVE verdict but records both
verdict = shadow.evaluate("deploy", {"target": "staging"})

# Get divergence report
report = shadow.report()
print(report.total_evaluations)
print(report.divergence_count)
print(report.divergence_rate)  # 0.0 to 1.0
```

## Verdict Levels

Trust-Plane uses `Verdict` with four levels:

| Level           | Meaning                                          |
| --------------- | ------------------------------------------------ |
| `auto_approved` | Action is within all constraints                 |
| `flagged`       | Action is within constraints but noteworthy      |
| `held`          | Action requires human approval before proceeding |
| `blocked`       | Action violates constraints and cannot proceed   |

## Five Constraint Dimensions

| Dimension     | Controls                                           |
| ------------- | -------------------------------------------------- |
| Financial     | Spending limits, transaction caps                  |
| Operational   | Allowed/blocked actions, resource access           |
| Temporal      | Time windows, allowed hours, expiry dates          |
| Data Access   | Data classification levels, allowed data types     |
| Communication | Allowed channels, recipients, content restrictions |

## References

- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Related**: [kaizen-cost-tracking](kaizen-cost-tracking.md) for LLM cost tracking
- **Related**: [kaizen-budget-tracking](kaizen-budget-tracking.md) for budget enforcement
