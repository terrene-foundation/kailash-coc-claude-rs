# Orchestration Pipeline

The orchestration pipeline is the main integration loop for LLM-driven agent coordination. It decomposes objectives into subtasks, designs agents, composes plans, and handles failures with adaptive recomposition.

## Pipeline Flow

```
Objective (string)
  |
  v
TaskDecomposer::decompose(objective, context_keys)
  | LLM: structured output -> Vec<Subtask>
  v
AgentDesigner::design(subtask, budget_remaining_pct)
  | CapabilityMatcher: exact match first (no LLM)
  | SpawnPolicy: complexity > 0.5, tools > 3, budget < 10%
  | LLM: novel spec design (if no match)
  v
PlanComposer::compose(subtasks, specs)
  | LLM: edge wiring (which outputs -> which inputs)
  | PlanValidator: cycle detection, referential integrity
  v
PlanMonitor::run(objective, context_keys, execute_node)
  | Sequential node execution via callback
  | On failure: classify_failure() -> GradientAction
  | If retryable: FailureDiagnoser -> Recomposer -> apply modifications
  v
MonitorResult { plan, events, success, recovery_cycles }
```

## Gradient Classification Rules (G1-G9)

All deterministic -- NO LLM involvement.

| Rule | Condition                     | Action                             |
| ---- | ----------------------------- | ---------------------------------- |
| G4   | Envelope violation            | BLOCKED (always, non-configurable) |
| G9   | Parent terminated             | BLOCKED (cascade)                  |
| G5   | Plan cancelled                | Skip                               |
| G8   | Resolution timeout            | BLOCKED                            |
| G6   | Budget >= hold_threshold      | HELD                               |
| G7   | Budget >= flag_threshold      | FLAGGED                            |
| G1   | Retryable + retries remaining | Retry                              |
| G2   | Retries exhausted (required)  | HELD or BLOCKED (config)           |
| G3   | Optional node failure         | Skip/Flag/Hold (config)            |

Priority order: G4 > G9 > G5 > G8 > G6/G7 > G1 > G3 > G2.

## Key Types

The orchestration pipeline exposes these primary types:

- **PlanMonitor** -- Main integration loop that ties all stages together
- **MonitorConfig** -- Configuration for retry limits, timeouts, gradient thresholds
- **MonitorResult** -- Execution result with plan, events, success flag, recovery cycles
- **MonitorEvent** -- Events emitted during orchestration (for observability)
- **TaskDecomposer** -- Breaks objectives into structured subtasks
- **AgentDesigner** -- Matches capabilities and designs agent specs
- **PlanComposer** -- Wires subtasks into a validated plan DAG
- **FailureDiagnoser** -- Classifies failures into diagnosis categories
- **Recomposer** -- Generates plan modification actions from diagnosis
- **classify_failure** -- Deterministic G1-G9 gradient classification
- **ClassificationInput** -- Input structure for gradient classification
- **GradientAction** -- Action to take based on gradient classification
- **Subtask** -- Validated subtask from decomposition
- **SpawnDecision** -- Whether to spawn a new agent or inline execution

## Testing Pattern

All LLM-dependent modules use a mock structured LLM client with a FIFO response queue for deterministic testing. Push expected JSON responses, and they are consumed in order during test execution.
