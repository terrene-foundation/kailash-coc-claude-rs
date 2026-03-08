# Kaizen Interrupt Mechanism

Control agent execution with timeouts, budgets, and manual interrupts.

## API

```python
from kailash.kaizen import InterruptManager

im = InterruptManager()
```

## Methods

| Method                     | Description                          |
| -------------------------- | ------------------------------------ |
| `request_interrupt()`      | Manually trigger interrupt (no args) |
| `is_interrupted()` -> bool | Check if interrupted                 |
| `clear()`                  | Reset interrupt state                |
| `set_timeout_secs(secs)`   | Set timeout in seconds               |
| `set_budget_limit(amount)` | Set cost budget limit                |
| `record_cost(amount)`      | Record cost towards budget           |
| `elapsed_secs` (property)  | Seconds since creation               |

## Usage

### Manual Interrupt

```python
from kailash.kaizen import InterruptManager

im = InterruptManager()
print(im.is_interrupted())  # False

im.request_interrupt()
print(im.is_interrupted())  # True

im.clear()
print(im.is_interrupted())  # False
```

### Timeout-Based Interrupt

```python
im = InterruptManager()
im.set_timeout_secs(30)  # Auto-interrupt after 30 seconds

# Check in your agent loop
while not im.is_interrupted():
    # do work...
    pass

print(f"Ran for {im.elapsed_secs:.1f} seconds")
```

### Budget-Based Interrupt

```python
im = InterruptManager()
im.set_budget_limit(10.0)  # $10 budget

# Record costs as you make LLM calls
im.record_cost(2.50)  # $2.50
im.record_cost(3.00)  # $3.00

# Check if over budget
if im.is_interrupted():
    print("Budget exceeded!")
```

### Integration with Agent Loop

```python
from kailash.kaizen import BaseAgent, InterruptManager

class MyAgent(BaseAgent):
    def __init__(self):
        super().__init__()
        self.interrupt = InterruptManager()
        self.interrupt.set_timeout_secs(60)
        self.interrupt.set_budget_limit(5.0)

    def execute(self, input_data):
        steps = 0
        while not self.interrupt.is_interrupted():
            # Agent work here...
            self.interrupt.record_cost(0.10)
            steps += 1
        return {"steps": steps, "elapsed": self.interrupt.elapsed_secs}
```

## Limitations

- No signal handler integration (no SIGINT/SIGTERM handling)
- No multi-agent interrupt propagation
- `request_interrupt()` takes no reason argument
- `elapsed_secs` is a property, not a method
