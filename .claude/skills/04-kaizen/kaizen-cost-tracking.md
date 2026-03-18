# Cost Tracking

Token usage and budget management via `CostTracker`.

## CostTracker API

```python
import os
from kailash.kaizen import CostTracker

ct = CostTracker()

# Record LLM usage: record(model, prompt_tokens, completion_tokens)
ct.record(os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"), 100, 50)

# Query totals (all are methods, not properties)
print(ct.total_cost())              # 0.00125 (auto-calculated from model pricing)
print(ct.total_tokens())            # 150
print(ct.total_prompt_tokens())     # 100
print(ct.total_completion_tokens()) # 50
print(ct.request_count())           # 1

# Budget management
print(ct.is_over_budget())          # False
print(ct.remaining_budget())        # None (no budget set)

# Reset tracking
ct.reset()
```

### Methods

| Method                              | Returns       | Description                             |
| ----------------------------------- | ------------- | --------------------------------------- |
| `record(model, prompt, completion)` | None          | Record an LLM call                      |
| `total_cost()`                      | float         | Total cost across all recorded calls    |
| `total_tokens()`                    | int           | Total tokens (prompt + completion)      |
| `total_prompt_tokens()`             | int           | Total prompt tokens                     |
| `total_completion_tokens()`         | int           | Total completion tokens                 |
| `request_count()`                   | int           | Number of recorded LLM calls            |
| `is_over_budget()`                  | bool          | Whether budget limit has been exceeded  |
| `remaining_budget()`                | float or None | Remaining budget (None if no limit set) |
| `reset()`                           | None          | Reset all tracking to zero              |

## Integration with InterruptManager

For budget-based interruption of agent loops, use `InterruptManager` instead:

```python
from kailash.kaizen import InterruptManager

im = InterruptManager()
im.set_budget_limit(10.0)
im.record_cost(2.50)
if im.is_interrupted():
    print("Budget exceeded!")
```

> **Note**: `CostTracker` is standalone. `BaseAgent` has a `run()` convenience method (P17-002) that calls your custom `execute()`. Record costs manually via `CostTracker.record()`.

## BudgetTracker (Two-Phase Budget Enforcement)

For tool agent invocations where you need to **reserve** budget before spending, use `BudgetTracker` instead:

```python
from kailash.kaizen import BudgetTracker

tracker = BudgetTracker(10_000_000)  # $10 budget in microdollars
if tracker.reserve(50_000):          # Reserve $0.05
    # ... invoke tool ...
    tracker.record(50_000, 48_000)   # Actual cost was $0.048
print(tracker.remaining())          # Budget remaining
```

See [kaizen-budget-tracking](kaizen-budget-tracking.md) for the full two-phase reserve/record API.

## References

- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Related**: [kaizen-budget-tracking](kaizen-budget-tracking.md) for two-phase budget enforcement
- **Related**: [kaizen-interrupt-mechanism](kaizen-interrupt-mechanism.md) for budget-based interrupts
