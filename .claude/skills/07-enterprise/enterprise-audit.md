---
name: enterprise-audit
description: "Audit event logging, querying, and filtering for kailash-enterprise. Use when asking 'audit logging', 'AuditLogger', 'AuditFilter', 'audit trail', 'audit events', 'log_event', 'query', 'get_events', or 'event_count'."
---

# Enterprise Audit Logging

Structured audit event capture, querying, and filtering using `kailash.enterprise`.

## Imports

```python
from kailash.enterprise import AuditLogger, AuditFilter
```

## AuditLogger

The `AuditLogger` captures structured audit events with actor, resource, action, and outcome information.

### Creating a Logger

```python
# Default: in-memory storage
logger = AuditLogger()  # No constructor parameters
```

### Logging Events

Use `log_event` to record an audit event:

```python
logger.log_event(
    event_type="authentication",   # category of the event
    actor_type="user",             # who performed the action
    actor_id="alice",              # actor identifier
    resource_type="session",       # what was acted upon
    action="login",                # what was done
    success=True,                  # outcome
)

# Log an authorization failure
logger.log_event(
    event_type="authorization",
    actor_type="user",
    actor_id="bob",
    resource_type="admin_panel",
    action="access",
    success=False,
)

# Log a data modification
logger.log_event(
    event_type="data_modification",
    actor_type="service",
    actor_id="batch-processor",
    resource_type="orders",
    action="bulk_update",
    success=True,
)
```

### Event Types

| Event Type          | Purpose                           |
| ------------------- | --------------------------------- |
| `authentication`    | Login, logout, token refresh      |
| `authorization`     | Permission granted/denied         |
| `data_access`       | Reads, queries                    |
| `data_modification` | Creates, updates, deletes         |
| `system_event`      | Startup, shutdown, config changes |
| `security_event`    | Failed logins, brute force        |
| `admin_action`      | Role changes, user management     |

### Retrieving Events

```python
# Get all events
events = logger.get_events()
# Returns: List[Dict[str, Any]]
# Each dict has: event_type, actor_type, actor_id, resource_type, action, success, timestamp, ...

# Count total events
count = logger.event_count()

# Clear all stored events
logger.clear()
```

## AuditFilter

Build filters to query specific audit events.

### Creating Filters

```python
f = AuditFilter()

# Filter by actor
f = f.with_actor("alice")

# Filter by action
f = f.with_action("login")

# Filter by resource type
f = f.with_resource_type("session")

# Filter by outcome
f = f.with_success(True)       # True for success, False for failure
```

### Chaining Filters

Filters are immutable and chainable:

```python
# Find all failed events for alice
f = (AuditFilter()
     .with_actor("alice")
     .with_success(False))
```

### Querying with Filters

```python
# Query events matching a filter
events = logger.query(f)
# Returns: List[Dict[str, Any]]
```

## Typical Audit Patterns

### Authentication Audit Trail

```python
logger = AuditLogger()

def on_login(user_id: str, success: bool, ip: str):
    logger.log_event(
        event_type="authentication",
        actor_type="user",
        actor_id=user_id,
        resource_type="session",
        action="login",
        success=success,
    )

def on_logout(user_id: str):
    logger.log_event(
        event_type="authentication",
        actor_type="user",
        actor_id=user_id,
        resource_type="session",
        action="logout",
        success=True,
    )
```

### Authorization Audit

```python
def check_and_log(evaluator, user, resource, action, logger):
    allowed = evaluator.check(user, resource, action)
    logger.log_event(
        event_type="authorization",
        actor_type="user",
        actor_id=user.user_id,
        resource_type=resource,
        action=action,
        success=allowed,
    )
    return allowed
```

### Data Modification Audit

```python
def update_record(record_id: str, user_id: str, changes: dict, logger: AuditLogger):
    # ... perform update ...
    logger.log_event(
        event_type="data_modification",
        actor_type="user",
        actor_id=user_id,
        resource_type="records",
        action="update",
        success=True,
    )
```

### Security Event Monitoring

```python
# Query recent security events by action
security_filter = (AuditFilter()
    .with_action("security_scan"))

events = logger.query(security_filter)
for event in events:
    print(f"Security event: {event['action']} by {event['actor_id']}")

# Count failed login attempts for a specific user
failed_logins = (AuditFilter()
    .with_actor("bob")
    .with_success(False))

attempts = logger.query(failed_logins)
if len(attempts) > 5:
    print("Account lockout threshold reached")
```

## Testing Audit

```python
def test_audit_logging():
    logger = AuditLogger()

    logger.log_event("authentication", "user", "alice", "session", "login", True)
    logger.log_event("authorization", "user", "alice", "admin_panel", "access", False)
    logger.log_event("authentication", "user", "bob", "session", "login", True)

    assert logger.event_count() == 3

    # Filter by actor
    f = AuditFilter().with_actor("alice")
    events = logger.query(f)
    assert len(events) == 2

    # Filter by outcome
    f = AuditFilter().with_success(False)
    events = logger.query(f)
    assert len(events) == 1
    assert events[0]["actor_id"] == "alice"

    # Clear
    logger.clear()
    assert logger.event_count() == 0


def test_audit_filter_chaining():
    logger = AuditLogger()
    logger.log_event("authentication", "user", "alice", "session", "login", True)
    logger.log_event("authentication", "user", "alice", "session", "login", False)

    f = (AuditFilter()
         .with_actor("alice")
         .with_action("login")
         .with_success(True))
    events = logger.query(f)
    assert len(events) == 1
```

## API Reference

| Class         | Key Methods                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `AuditLogger` | `__init__()`, `.log_event(...)`, `.get_events()`, `.query(filter)`, `.clear()`, `.event_count()`            |
| `AuditFilter` | `__init__()`, `.with_actor(id)`, `.with_action(action)`, `.with_resource_type(type)`, `.with_success(bool)` |
