---
name: governance
description: Load governance patterns for trust-enforced agents, verification gradient, delegation chains, human intervention, and compliance reports. Use when building governed agents, configuring trust postures, or generating compliance reports.
---

# Governance Patterns

Quick reference for EATP/CARE/COC/PACT governance patterns in the Kailash SDK.
Covers trust enforcement, verification gradient, delegation chains, multi-sig, circuit breaker, shadow enforcer, lifecycle hooks, human intervention, compliance reports, and PACT organizational governance.

**See also**: `skills/30-pact/SKILL.md` for PACT-specific patterns (D/T/R addressing, knowledge clearance, operating envelopes, 5-step access, 4-zone gradient, GovernanceEngine, PactGovernedAgent).

## Governed Agent (Most Common Pattern)

Wrap any BaseAgent with trust enforcement.

### Python

```python
from kailash.kaizen import BaseAgent
from kailash.kaizen.agents import GovernedAgent

# Create a governed agent with trust enforcement
agent = GovernedAgent(
    inner_agent=my_agent,
    agent_id="my-agent-001",
    trust_level="Supervised",
)

# Governed execution -- checks capabilities before running
result, gov_result = agent.run_governed("analyze data")
assert gov_result.allowed

# WARNING: Direct BaseAgent.run() bypasses ALL trust checks -- NEVER use in production.
```

### Ruby

```ruby
require "kailash"

# Create a governed agent with trust enforcement
agent = Kailash::Kaizen::GovernedAgent.new(
  inner_agent: my_agent,
  agent_id: "my-agent-001",
  trust_level: "Supervised"
)

# Governed execution -- checks capabilities before running
result, gov_result = agent.run_governed("analyze data")
raise "Not allowed" unless gov_result.allowed?
```

## Verification Gradient

4-level evaluation based on resource utilization:

| Level        | `allowed` | When                                           |
| ------------ | --------- | ---------------------------------------------- |
| AutoApproved | true      | Action within all limits                       |
| Flagged      | true      | Action >= 80% of a limit (proceed + review)    |
| Held         | false     | Exceeds verification threshold (queue for human) |
| Blocked      | false     | Exceeds resource limits (reject)               |

### Python

```python
from kailash.kaizen import VerificationConfig, VerificationEvaluator

config = VerificationConfig()  # flag: 80%, hold: 95%
evaluator = VerificationEvaluator(config)

result = evaluator.evaluate(capability, trust_level, usage, limits)
if result.allowed:
    # proceed
    pass
elif result.zone == "Held":
    # queue for human review
    pass
```

## Delegation Chain

Multi-level delegation with constraint tightening (child is a subset of parent):

### Python

```python
from kailash.kaizen import DelegationChain, DelegationScope

chain = DelegationChain(keypair)

chain.delegate(
    delegator="manager",
    delegate="worker",
    capabilities=["LlmCall", "ToolCall"],
    scope=DelegationScope("finance")
        .with_operation("read")
        .with_operation("analyze")
        .with_max_financial_cents(10_000),
    expiry=expiry_time,
)

# Cascade revocation
chain.revoke(delegation_id)

# Verify chain integrity
chain.verify_chain()
```

## Circuit Breaker (Failure Isolation)

Per-agent failure isolation:

### Python

```python
from kailash.kaizen import CircuitBreakerConfig, CircuitBreakerRegistry

config = CircuitBreakerConfig(
    failure_threshold=5,
    success_threshold=2,
    open_duration_secs=30,
    half_open_max_calls=1,
)
registry = CircuitBreakerRegistry(config)

# Attach to GovernedAgent
governed = GovernedAgent(
    inner_agent=my_agent,
    agent_id="my-agent-001",
    trust_level="Supervised",
    circuit_breaker_registry=registry,
)
```

## Shadow Enforcer (Safe Config Rollout)

Dual-config evaluation with divergence tracking:

### Python

```python
from kailash.kaizen import ShadowEnforcer

enforcer = ShadowEnforcer(
    production_config=production_config,
    shadow_config=shadow_config,
    max_records=10_000,
)

# Attach to GovernedAgent
governed = GovernedAgent(
    inner_agent=my_agent,
    agent_id="my-agent-001",
    trust_level="Supervised",
    shadow_enforcer=enforcer,
)

# Check divergence report
report = enforcer.report()
print(f"Recommendation: {report.recommendation}")
# Promote / Revert / Keep
```

## Human Intervention (PseudoAgent)

The ONLY entry point for human authority:

### Python

```python
from kailash.kaizen import PseudoAgent, HumanOrigin

origin = HumanOrigin("admin@acme.com", "security-officer")
pseudo = PseudoAgent(origin, keypair)

# Approve held action
approval = pseudo.approve_hold(hold_id, reason="Reviewed")

# Override blocked action
override_record = pseudo.override_block("CodeExecution", "Emergency")
```

## Compliance Reports

### Python

```python
from kailash.enterprise import EatpReportGenerator, CareReportGenerator

eatp_report = EatpReportGenerator.generate(
    evidence_count=100,
    chain_length=5,
    has_genesis=True,
    has_delegation=True,
)

care_report = CareReportGenerator.generate(
    has_competency_eval=True,
    has_human_intervention=True,
    has_posture_system=True,
    has_verification=True,
)
```

## Human Competencies

### Python

```python
from kailash.enterprise import CompetencyEvaluator

evaluator = CompetencyEvaluator.with_defaults()

if evaluator.requires_human("approve financial report"):
    reqs = evaluator.evaluate("approve financial report")
    # Returns competency requirements (e.g., EthicalJudgment level 3)
```

## Key Concepts

### Trust-Plane

For trust-plane-specific patterns (constraint enforcement, shadow mode, CLI, MCP), see the trust-plane-specialist agent.

### PACT Organizational Governance

For PACT-specific patterns (D/T/R addressing, knowledge clearance, operating envelopes, 5-step access, 4-zone gradient), see `skills/30-pact/SKILL.md`.

### EATP Protocol

For EATP trust protocol details (CareChain, delegation, verification, multi-sig), see `skills/26-eatp-reference/`.

### CARE Framework

For CARE governance philosophy, see `skills/27-care-reference/`.
