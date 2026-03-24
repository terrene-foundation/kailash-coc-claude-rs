---
description: "L3 Agent Autonomy types available in the Kailash Python and Ruby bindings. Covers envelope tracking, plan DAGs, agent state machines, messaging, and governance gradient."
---

# L3 Agent Autonomy Types (v3.1.1)

## Available Types — 25 L3 Types

| Category | Types | Count |
|----------|-------|-------|
| Envelope | PlanGradient, DimensionGradient, CostEntry, BudgetRemaining, DimensionUsage, ReclaimResult, EnvelopeTracker, AllocationRequest, EnvelopeVerdict | 9 |
| Context | ScopeProjection, ContextScope, MergeResult | 3 |
| Messaging | Priority, EscalationSeverity, ResourceSnapshot, MessageEnvelope | 4 |
| Factory | AgentSpec, AgentInstance | 2 |
| Plan | Plan, PlanNode, PlanEdge, PlanNodeOutput, GradientClassification | 5 |
| State | AgentState, PlanState | 2 |

Plus 2 free functions: `split_envelope`, `validate_split`.

## Python Usage

```python
from kailash import (
    PlanGradient, EnvelopeTracker, CostEntry, BudgetRemaining,
    AllocationRequest, EnvelopeVerdict,
    AgentState, PlanState,
    Plan, PlanNode, PlanEdge, PlanNodeOutput,
    Priority, EscalationSeverity, ResourceSnapshot, MessageEnvelope,
    AgentSpec, AgentInstance,
    split_envelope, validate_split,
)

# Create a gradient and tracker
gradient = PlanGradient(budget_flag_threshold=0.80, budget_hold_threshold=0.95)
tracker = EnvelopeTracker(envelope, gradient)

# Record a cost
entry = CostEntry("llm_call", "financial", 50000, "00000000-0000-0000-0000-000000000001")
verdict = tracker.record_consumption(entry)
if verdict.is_allowed:
    print(f"Approved (zone={verdict.zone})")

# Check agent state transitions
state = AgentState.pending()
assert state.can_transition_to(AgentState.running())

# Build a plan DAG
plan = Plan("my-plan", envelope=my_envelope, gradient=gradient)
plan.add_node(PlanNode("reviewer", reviewer_spec))
plan.add_edge(PlanEdge.data("reviewer", "writer"))
errors = Plan.validate(plan)
```

## Ruby Usage

```ruby
require 'kailash'

# Create a gradient and tracker
gradient = Kailash::L3::PlanGradient.new(
  budget_flag_threshold: 0.80,
  budget_hold_threshold: 0.95
)
tracker = Kailash::L3::EnvelopeTracker.new(envelope, gradient)

# Record a cost
entry = Kailash::L3::CostEntry.new("llm_call", "financial", 50000, uuid)
verdict = tracker.record_consumption(entry)
puts "Approved" if verdict.allowed?

# Check agent state transitions
state = Kailash::L3::AgentState.pending
puts state.can_transition_to?(Kailash::L3::AgentState.running) # true

# Build a plan DAG
plan = Kailash::L3::Plan.new("my-plan", envelope: my_envelope, gradient: gradient)
plan.add_node(Kailash::L3::PlanNode.new("reviewer", reviewer_spec))
plan.add_edge(Kailash::L3::PlanEdge.data("reviewer", "writer"))
errors = Kailash::L3::PlanValidator.validate(plan)
```

## Key Patterns

### NaN/Inf Protection

All financial values are validated at the binding boundary. Passing `NaN`, `Infinity`, or negative values to cost/budget methods raises `ValueError` (Python) or `ArgumentError` (Ruby).

### Envelope Splitting

Split a parent envelope into child envelopes with budget allocation:

```python
children = split_envelope(parent_envelope, [
    AllocationRequest("child-a", financial_ratio=0.5, temporal_ratio=0.3),
    AllocationRequest("child-b", financial_ratio=0.3, temporal_ratio=0.5),
], reserve_pct=0.2)
```

### State Machine Validation

Both `AgentState` and `PlanState` validate transitions. Invalid transitions raise errors:
- Agent: Pending -> Running -> Waiting/Completed/Failed/Terminated
- Plan: Draft -> Validated -> Executing -> Completed/Failed/Suspended/Cancelled

## Installation

```bash
# Python
pip install kailash-enterprise

# Ruby
gem install kailash
```
