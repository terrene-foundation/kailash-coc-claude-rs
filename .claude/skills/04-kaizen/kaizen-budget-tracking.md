# Budget Tracking

Two-phase budget enforcement for tool agent invocations via `BudgetTracker`.

## Two Budget Primitives

| Aspect    | CostTracker                              | BudgetTracker                            |
| --------- | ---------------------------------------- | ---------------------------------------- |
| Direction | Accumulates spend upward                 | Deducts from allocated budget            |
| Pattern   | One-phase: record and check              | Two-phase: reserve then record           |
| Use case  | LLM cost observation                     | Tool agent invocation budget enforcement |

Both use lock-free atomic operations internally for high concurrency (~10ns per operation).

## BudgetTracker API (Python)

```python
from kailash.kaizen import BudgetTracker, BudgetSnapshot

# Allocate a $10 budget (in microdollars: $1 = 1,000,000)
tracker = BudgetTracker(10_000_000)

# Phase 1: Reserve budget before invoking a tool
success = tracker.reserve(50_000)  # Reserve $0.05
if not success:
    print("Insufficient budget!")

# Phase 2: Record actual spend after invocation
tracker.record(50_000, 48_000)  # Reserved $0.05, spent $0.048
# The $0.002 excess returns to available budget

# Query state
print(tracker.allocated())    # 10_000_000
print(tracker.reserved())     # 0 (no pending reservations)
print(tracker.committed())    # 48_000
print(tracker.remaining())    # 9_952_000
```

### Methods

| Method                           | Returns | Description                                    |
| -------------------------------- | ------- | ---------------------------------------------- |
| `BudgetTracker(microdollars)`    | tracker | Create with allocated budget                   |
| `reserve(microdollars)`          | bool    | Atomically reserve budget (False if exceeds)   |
| `record(reserved, actual)`       | None    | Subtract from reserved, add actual to committed |
| `allocated()`                    | int     | Total allocated budget                         |
| `reserved()`                     | int     | Currently reserved (pending invocations)       |
| `committed()`                    | int     | Total committed (completed invocations)        |
| `remaining()`                    | int     | Available budget (allocated - reserved - committed) |
| `snapshot()`                     | BudgetSnapshot | Serializable snapshot of current state    |
| `from_snapshot(snapshot)`        | BudgetTracker  | Restore from snapshot (class method)     |

### BudgetSnapshot

```python
snap = tracker.snapshot()
print(snap.allocated)    # 10_000_000
print(snap.reserved)     # 0
print(snap.committed)    # 48_000

# Persist and restore
restored = BudgetTracker.from_snapshot(snap)
```

## Two-Phase Reserve/Record Lifecycle

```
reserve(50_000)  ->  True     # Atomic: check budget + add to reserved counter
    ... invoke tool agent ...
record(50_000, 48_000)        # Subtract 50k from reserved, add 48k to committed
                              # 2k excess returns to available budget
```

Why two phases:
- **reserve** prevents over-spending when multiple tool invocations run concurrently.
- **record** reconciles actual vs reserved cost after invocation completes.

## Microdollar Convention

All budget values are in microdollars (u64 integers):

| Dollars | Microdollars    |
| ------- | --------------- |
| $0.01   | 10,000          |
| $0.05   | 50,000          |
| $1.00   | 1,000,000       |
| $10.00  | 10,000,000      |
| $100.00 | 100,000,000     |

Using integers avoids floating-point rounding errors in financial calculations.

## Cross-Process Notes

`BudgetTracker` is in-process only. For multi-worker deployments:
- Use `snapshot()` to serialize state for persistence (e.g., via DataFlow).
- Use `from_snapshot()` to restore state on another worker.
- Pending reservations are lost when serializing -- only `allocated` and `committed` survive.
- Cross-process budget synchronization is the application's responsibility.

## Integration with CostTracker

`CostTracker` and `BudgetTracker` serve different purposes and can be used together:

```python
from kailash.kaizen import CostTracker, BudgetTracker
import os

# CostTracker observes LLM costs
cost_tracker = CostTracker()

# BudgetTracker enforces tool invocation budgets
budget = BudgetTracker(5_000_000)  # $5 budget

# Before invoking a tool agent
if budget.reserve(100_000):  # $0.10
    # ... invoke tool ...
    budget.record(100_000, 95_000)  # Actual cost was $0.095

    # Also record in CostTracker for observability
    cost_tracker.record(os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"), 500, 200)
```

## References

- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Related**: [kaizen-cost-tracking](kaizen-cost-tracking.md) for LLM cost observation
- **Related**: [kaizen-interrupt-mechanism](kaizen-interrupt-mechanism.md) for budget-based interrupts
