# Kaizen Hooks & Lifecycle

Register lifecycle callbacks on agent events using `HookManager`.

## API

```python
from kailash.kaizen import HookManager

hooks = HookManager()
```

## 9 Fixed Events

| Event           | When Triggered           |
| --------------- | ------------------------ |
| `on_start`      | Agent begins execution   |
| `on_think`      | Agent reasoning step     |
| `on_act`        | Agent takes an action    |
| `on_observe`    | Agent processes result   |
| `on_decide`     | Agent makes a decision   |
| `on_error`      | Error occurs             |
| `on_complete`   | Agent finishes execution |
| `on_interrupt`  | Interrupt received       |
| `on_checkpoint` | Checkpoint saved         |

## Usage

### Decorator Registration

```python
from kailash.kaizen import HookManager

hooks = HookManager()

@hooks.on("on_start")
def log_start(data):
    print(f"Agent started: {data}")
    return f"logged: {data}"

@hooks.on("on_error")
def handle_error(data):
    print(f"Error: {data}")

@hooks.on("on_complete")
def on_done(data):
    print(f"Completed: {data}")
```

### Manual Registration

```python
hooks.register("on_think", lambda data: print(f"Thinking: {data}"))
```

### Triggering Events

```python
# Returns list of results from all registered callbacks
results = hooks.trigger("on_start", {"agent": "my_agent", "input": "hello"})
print(results)  # ["logged: {'agent': 'my_agent', 'input': 'hello'}"]
```

## Methods

| Method                           | Description                            |
| -------------------------------- | -------------------------------------- |
| `on(event_name)`                 | Decorator to register callback         |
| `register(event_name, callback)` | Register callback manually             |
| `trigger(event_name, data)`      | Fire event, returns list of results    |
| `callback_count(event_name)`     | Number of callbacks for event          |
| `clear(event_name)`              | Remove all callbacks for event         |
| `EVENTS`                         | Class attribute: tuple of valid events |
