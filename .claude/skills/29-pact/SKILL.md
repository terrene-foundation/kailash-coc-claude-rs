---
name: pact
description: "PACT governance (Rust) — D/T/R addressing, clearance, envelopes, 5-step access, 4-zone gradient."
---

# PACT Governance Framework Patterns

Principled Architecture for Constrained Trust (PACT) -- organizational governance for AI agents. D/T/R addressing, knowledge clearance, operating envelopes, access enforcement, and verification gradient.

**Python module**: `kailash.pact` (backed by Rust implementation, source-available BSL 1.1)
**Depends on**: `kailash.governance` + `kailash.eatp` (governance engine and EATP protocol)
**Tests**: 1,396+ (governance 565 + eatp 58 + pact 58 + Python 109 + bridge enforcement 10)
**PyO3**: `from kailash import PactGovernanceEngine, PactAddress, PactDimensionName, PactVacancyDesignation, PactBridgeApprovalStatus`

## Reference Documentation

### Core Concepts

- **[pact-quick-start](pact-quick-start.md)** -- Define org, grant clearance, check access, verify action
- **[pact-dtr-addressing](pact-dtr-addressing.md)** -- D/T/R address grammar, parsing, ancestors, LCA
- **[pact-access-algorithm](pact-access-algorithm.md)** -- 5-step fail-closed algorithm with containment sub-paths (3a-3e)
- **[pact-envelope-model](pact-envelope-model.md)** -- 3-layer envelope model, intersection rules, posture defaults

### API and Integration

- **[pact-engine-api](pact-engine-api.md)** -- GovernanceEngine decision/query/mutation APIs, DelegationBuilder, PactGovernedAgent
- **[pact-kaizen-integration](pact-kaizen-integration.md)** -- PACT + Kaizen bridging pattern, EATP type convergence
- **[pact-mcp-bridge](pact-mcp-bridge.md)** -- MCP tool governance (`mcp` feature), 6-step evaluation, NaN protection

### Bindings and Patterns

- **[pact-python-binding](pact-python-binding.md)** -- PyO3 binding (21 types), address serde format, build/test
- **[governance-patterns](governance-patterns.md)** -- Governance integration patterns

## 16 User Flows

| #   | Flow                | Entry Point                                     | Key Invariant                                      |
| --- | ------------------- | ----------------------------------------------- | -------------------------------------------------- |
| 1   | Compile org         | `GovernanceEngine::new(org_def)`                | Grammar: D/T must be followed by R                 |
| 2   | Access check        | `engine.check_access(role_id, item, posture)`   | 5-step fail-closed algorithm                       |
| 3   | Posture ceiling     | Implicit in step 2                              | `effective = min(clearance, posture_ceiling)`      |
| 4   | Action verification | `engine.verify_action(addr, action, ctx)`       | 4-zone gradient, worst-zone wins                   |
| 5   | NEVER_DELEGATED     | Implicit in flow 4                              | 7 actions always HELD                              |
| 6   | Bridge access       | Step 3e in flow 2                               | Bilateral vs unilateral directionality             |
| 7   | Bridge approval     | `engine.request_bridge()` / `approve_bridge()`  | LCA approver, Pending->Approved gate               |
| 8   | Frozen context      | `engine.get_context(addr, posture)`             | No `&mut self`, no Deserialize                     |
| 9   | Python integration  | `from kailash import PactGovernanceEngine`      | 25+ types, thread-safe                             |
| 10  | Role discovery      | `engine.list_roles()` / `get_node_by_role_id()` | All roles (not just heads), v3.4.1                 |
| 11  | Address resolution  | `engine.resolve_role_id("D1-R1")`               | Resolves D/T/R address OR config ID, v3.4.1        |
| 12  | Vacancy designation | `engine.set_vacancy_designation()`              | Acting occupant, 24h expiry, fail-closed           |
| 13  | Auto-suspension     | `RoleConfig::auto_suspend_on_vacancy`           | BFS cascade, opt-in per-role                       |
| 14  | LCA computation     | `Address::lowest_common_ancestor(a, b)`         | O(depth), grammar-validated                        |
| 15  | Dimension scoping   | `DelegationRecord::dimension_scope`             | BTreeSet<DimensionName>, subset tightening         |
| 16  | Nested departments  | `DepartmentConfig::departments` (v3.6.1)        | Recursive D-R-D-R, `compile_department()` recurses |

See the PACT governance flows documentation for detailed storyboards.

## 4-Zone Gradient

| Zone         | `allowed()` | When                                     |
| ------------ | ----------- | ---------------------------------------- |
| AutoApproved | true        | Action within all limits                 |
| Flagged      | true        | Action >= 80% of a limit                 |
| Held         | false       | NEVER_DELEGATED action or unknown action |
| Blocked      | false       | Action exceeds hard limit                |

Worst zone across all 5 dimensions wins.

## Store Backends

| Backend                    | Feature  | Use Case                                      |
| -------------------------- | -------- | --------------------------------------------- |
| `MemoryEnvelopeStore` etc. | default  | In-process, bounded (10K FIFO), tests         |
| `SqlitePactStore`          | `sqlite` | Persistent, auto-migration, file or in-memory |

## Security Invariants

- GovernanceContext: Serialize only (NO Deserialize -- anti-forgery)
- FiniteF64: Rejects NaN/Inf at construction
- `evaluate_financial`: checks `is_finite()` for transaction_amount AND daily_total
- NEVER_DELEGATED_ACTIONS: 7 actions always HELD regardless of envelope
- Default-deny: unregistered tools blocked, step 4 denies, missing envelopes block
- Bounded stores: MAX_STORE_SIZE = 10,000 with FIFO eviction
- Address: MAX_SEGMENTS = 100 (DoS prevention)
- MCP bridge: default-deny, clearance-gated, financial-limited, NaN-protected
