# Kaizen Control Protocol

Human-in-the-loop controls for agent approval workflows.

## API

```python
from kailash.kaizen import ControlProtocol

cp = ControlProtocol()
```

## Methods

| Method                     | Description                                  |
| -------------------------- | -------------------------------------------- |
| `ask_user(question)`       | Prompt user via stdin, returns response      |
| `request_approval(action)` | Ask user to approve action, returns `bool` |
| `history`                  | Property: list of past interactions          |

## Usage

```python
from kailash.kaizen import ControlProtocol

cp = ControlProtocol()

# Ask user a question (reads from stdin)
answer = cp.ask_user("What database should I use?")
print(f"User said: {answer}")

# Request approval before dangerous action (returns bool)
if cp.request_approval("Delete all records from users table"):
    # proceed with action
    pass

# Review interaction history
for interaction in cp.history:
    print(interaction)
```

## Limitations

- **Stdin only**: Both methods read from stdin — no transport abstraction
- **Blocking**: Calls block until user provides input
- **No `report_progress()`**: Only ask/approve, no progress reporting
- **No programmatic transport**: Cannot swap stdin for HTTP/WebSocket/etc.
- Best suited for CLI-based agent workflows, not server deployments
