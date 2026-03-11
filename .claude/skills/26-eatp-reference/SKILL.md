---
name: eatp-reference
description: Load EATP Framework technical reference. Use when explaining EATP concepts, trust lineage, attestation, verification gradient, trust postures, or comparing to other identity standards.
---

# EATP Framework Reference

This skill provides the technical reference for the Enterprise Agent Trust Protocol (EATP) - the trust verification protocol for enterprise AI agents.

## Authoritative Sources

### PRIMARY: This Skill Document
This file is the in-repo EATP reference. The concepts below are drawn from the EATP specification and the standalone EATP SDK (Apache 2.0, Terrene Foundation).

### REFERENCE: Kailash SDK Implementation
EATP trust features are available in the Kailash Python binding:
```bash
pip install kailash-enterprise
```
```python
from kailash.kaizen import BaseAgent, HookManager
# Trust types (verification gradient, delegation chains, etc.) are
# available through the Kaizen trust module in kailash-enterprise.
```

## What is EATP?

EATP is an open standard for establishing and verifying trust in enterprise AI agent systems. It separates trust establishment (human judgment, once) from trust verification (machine speed, continuously). Every action traces back to human decisions through verifiable cryptographic chains.

EATP operationalizes the CARE framework's governance philosophy as a concrete, implementable protocol.

## The Core Insight

The problem conflates two distinct moments:
- **Trust establishment**: Should this agent be permitted to act within these boundaries? (Human judgment)
- **Trust verification**: Does this action fall within those boundaries? (Machine verification, milliseconds)

Traditional governance performs both together. EATP separates them.

## The Five EATP Elements (Trust Lineage Chain)

### 1. Genesis Record
The organizational root of trust. A human executive cryptographically commits: "I accept accountability for this AI governance framework." No AI creates its own genesis record.

### 2. Delegation Record
Authority transfer with constraint tightening. **Delegations can only reduce authority, never expand it.** A manager with $50K authority can delegate $10K to an agent, not $75K. Mirrors how healthy organizations work.

### 3. Constraint Envelope
Multi-dimensional operating boundaries across five dimensions:

| Dimension | Examples |
|---|---|
| **Financial** | Transaction limits, spending caps, cumulative budgets |
| **Operational** | Permitted/blocked actions |
| **Temporal** | Operating hours, blackout periods, time-bounded auth |
| **Data Access** | Read/write permissions, PII handling, data classification |
| **Communication** | Permitted channels, approved recipients, tone guidelines |

### 4. Capability Attestation
Signed declaration of authorized capabilities. Prevents capability drift (agents gradually performing unauthorized tasks). Makes authorized scope explicit and verifiable.

### 5. Audit Anchor
Tamper-evident execution record. Each anchor hashes the previous; modifying any record invalidates the chain forward. Production should use Merkle trees or external checkpointing.

## Verification Gradient

Verification is not binary:

| Result | Meaning | Action |
|---|---|---|
| **Auto-approved** | Within all constraints | Execute and log |
| **Flagged** | Near constraint boundary | Execute and highlight for review |
| **Held** | Soft limit exceeded | Queue for human approval |
| **Blocked** | Hard limit violated | Reject with explanation |

Focuses human attention where it matters: near boundaries and at limits.

## Five Trust Postures

Graduated autonomy:

| Posture | Autonomy | Human Role |
|---|---|---|
| **Pseudo-Agent** | None | Human in-the-loop; agent is interface only |
| **Supervised** | Low | Human in-the-loop; agent proposes, human approves |
| **Shared Planning** | Medium | Human on-the-loop; co-planning |
| **Continuous Insight** | High | Human on-the-loop; agent executes, human monitors |
| **Delegated** | Full | Human on-the-loop; remote monitoring |

Postures upgrade through demonstrated performance. They downgrade instantly if conditions change.

## EATP Operations

- **ESTABLISH** - Create agent identity and initial trust
- **DELEGATE** - Transfer authority with constraints
- **VERIFY** - Validate trust chain and permissions
- **AUDIT** - Record and trace all trust operations

## The Traceability Distinction (Critical)

**EATP provides traceability, not accountability.**
- **Traceability**: Trace any AI action back to human authority. EATP delivers this.
- **Accountability**: Humans understand, evaluate, and bear consequences. No protocol can deliver this.
- Traceability is necessary for accountability but not sufficient.

## How EATP Differs from Existing Standards

| Standard | Handles | EATP Adds |
|---|---|---|
| **OAuth/OIDC** | User authentication | Agent trust delegation |
| **SPIFFE/SPIRE** | Service identity | Agent autonomy governance |
| **Zero-Trust** | Network security | Agent governance with trust lineage |
| **PKI** | Hierarchical identity | Action-to-human traceability |

Existing standards verify identity and access. EATP verifies that actions are within human-established trust boundaries with unbroken chains to human authority.

## Cascade Revocation

Trust revocation at any level automatically revokes all downstream delegations. No orphaned agents. Mitigations for propagation latency: short-lived credentials (5-minute validity), push-based revocation, action idempotency.

## Quick Reference

```
Human Authority
      |
      v [Genesis Record + Capability Attestation]
   Agent A
      |
      v [Delegation Record + Constraint Envelope]
   Agent B
      |
      v [Action + Audit Anchor]
   System Action
      |
      v [Trust Lineage Chain]
   Traceable to Human

Verification: Auto-approved → Flagged → Held → Blocked
Postures: Pseudo-Agent → Supervised → Shared Planning → Continuous Insight → Delegated
Operations: ESTABLISH → DELEGATE → VERIFY → AUDIT
```

## Relationship to Companion Frameworks

| Framework | Relationship |
|---|---|
| **CARE** | EATP operationalizes CARE's governance philosophy |
| **COC** | COC maps EATP concepts to development guardrails |
| **Kailash** | Reference implementation (Apache 2.0) |

## Standalone EATP SDK

The EATP protocol has a standalone Rust SDK crate (Apache 2.0, Terrene Foundation) with these key modules:

| Module           | Contents                                |
| ---------------- | --------------------------------------- |
| Keys             | Ed25519 key management (ZeroizeOnDrop)  |
| Chain            | CareChain (genesis, trust blocks)       |
| Delegation       | Delegation chains, constraint tightening |
| Verification     | Verification gradient (4 levels)        |
| Governed         | GovernedTaodRunner pipeline             |
| Human            | PseudoAgent, HoldQueue                  |
| Constraints      | 5-dimensional constraints + 6 templates |
| Store            | Memory, Filesystem (age-encrypted), PostgreSQL |
| CLI              | 16 commands                             |
| MCP              | MCP server (5 tools, 4 resources)       |

The Kailash Kaizen framework re-exports EATP types via its `trust` feature, so Python users of `kailash-enterprise` access these through the Kaizen module.

## For Detailed Information

For comprehensive analysis, invoke the **eatp-expert** agent.

Related skills:
- `.claude/skills/27-care-reference/` - CARE governance philosophy
- `.claude/skills/28-coc-reference/` - COC development guardrails
