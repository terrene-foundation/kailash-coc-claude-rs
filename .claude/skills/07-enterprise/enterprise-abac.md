---
name: enterprise-abac
description: "ABAC policy guide: AbacPolicy, AbacEvaluator, 16 operators, evaluation strategies, and combined RBAC+ABAC. Use when asking 'ABAC', 'AbacPolicy', 'AbacEvaluator', 'attribute-based access', 'subject condition', 'resource condition', 'environment condition', 'CombinedEvaluator', or 'policy evaluation'."
---

# Enterprise ABAC

Attribute-Based Access Control using `kailash.enterprise`. Define policies with subject/resource/environment conditions, evaluate access decisions, and combine with RBAC.

## What ABAC Adds Over RBAC

RBAC controls access by role. ABAC controls access by attributes of the subject (user), resource, action, and environment. Use ABAC when you need:

- Ownership rules (`subject.user_id == resource.owner_id`)
- Time-based restrictions (`env.hour between 9 and 17`)
- Geographic restrictions (`subject.country == "US"`)
- Classification levels (`subject.clearance >= resource.min_level`)

## Imports

```python
from kailash.enterprise import AbacPolicy, AbacEvaluator
```

## AbacPolicy

A policy has an ID, an effect (`"allow"` or `"deny"`), and conditions on subject/resource/environment attributes.

```python
# Policy: allow active employees during business hours
policy = AbacPolicy("business_hours", "allow")
policy = policy.with_description("Allow access during business hours")
policy = policy.with_subject_condition("employment_status", "eq", "active")
policy = policy.with_subject_condition("verified", "eq", True)
policy = policy.with_environment_condition("hour", "gte", 9)
policy = policy.with_environment_condition("hour", "lte", 17)
policy = policy.with_action("read")

policy.id  # "business_hours"
```

### Condition Methods

| Method                     | Applies To  | Example                                                   |
| -------------------------- | ----------- | --------------------------------------------------------- |
| `with_subject_condition`   | Subject     | `.with_subject_condition("role", "eq", "admin")`          |
| `with_resource_condition`  | Resource    | `.with_resource_condition("classification", "eq", "public")` |
| `with_environment_condition`| Environment| `.with_environment_condition("hour", "gte", 9)`           |
| `with_action`              | Action      | `.with_action("write")`                                   |

### The 16 Operators

| Operator       | Description                             | Example Value                  |
| -------------- | --------------------------------------- | ------------------------------ |
| `eq`           | Equals                                  | `"admin"`                      |
| `ne`           | Not equals                              | `"suspended"`                  |
| `gt`           | Greater than                            | `2`                            |
| `gte`          | Greater than or equal                   | `3`                            |
| `lt`           | Less than                               | `30`                           |
| `lte`          | Less than or equal                      | `17`                           |
| `in`           | Value in list                           | `["US", "CA", "UK"]`           |
| `not_in`       | Value not in list                       | `["restricted", "secret"]`     |
| `contains`     | String/array contains element           | `"public"`                     |
| `starts_with`  | String starts with prefix               | `"/public/"`                   |
| `ends_with`    | String ends with suffix                 | `".pdf"`                       |
| `regex`        | Matches regex pattern                   | `".*@example\\.com"`           |
| `is_null`      | Attribute is null/absent                | `True`                         |
| `is_not_null`  | Attribute is present and non-null       | `True`                         |
| `between`      | Value within range (inclusive)          | `[9, 17]`                      |
| `not_contains` | String/array does not contain element   | `"restricted"`                 |

## AbacEvaluator

Evaluates requests against registered policies.

```python
# Create policies
allow_active = AbacPolicy("active_users", "allow")
allow_active = allow_active.with_subject_condition("status", "eq", "active")

deny_suspended = AbacPolicy("deny_suspended", "deny")
deny_suspended = deny_suspended.with_subject_condition("status", "eq", "suspended")

# Create evaluator with strategy
evaluator = AbacEvaluator(
    policies=[deny_suspended, allow_active],
    strategy="first_applicable",  # or "deny_override"
)

# Evaluate access
result = evaluator.evaluate(
    subject={"user_id": "alice", "status": "active", "department": "engineering"},
    resource={"type": "document", "owner_id": "alice"},
    action="write",
    environment={"hour": 10, "ip": "192.168.1.1"},
)

# Result is a dict:
# {
#     "allowed": True,
#     "matched_policy_id": "active_users",
#     "reason": "..."
# }

if result["allowed"]:
    print("Access granted")
else:
    print(f"Access denied: {result['reason']}")
```

### Adding Policies After Construction

```python
evaluator = AbacEvaluator(policies=[], strategy="deny_override")
evaluator.add_policy(policy1)
evaluator.add_policy(policy2)
evaluator.policy_count()  # 2
```

### Evaluation Strategies

| Strategy            | Behavior                                        |
| ------------------- | ----------------------------------------------- |
| `first_applicable`  | First matching policy wins (allow or deny)       |
| `deny_override`     | Any deny decision overrides all allow decisions  |

## Ownership Policy (Common Pattern)

```python
# Allow users to edit only their own resources
ownership = AbacPolicy("ownership", "allow")
ownership = ownership.with_subject_condition("user_id", "eq", "resource.owner_id")

# Deny edits to archived resources
no_archived = AbacPolicy("no_archived_edit", "deny")
no_archived = no_archived.with_resource_condition("archived", "eq", True)

evaluator = AbacEvaluator(
    policies=[no_archived, ownership],
    strategy="first_applicable",
)
```

## Combined RBAC + ABAC

Use ABAC on top of RBAC for fine-grained control. The `CombinedEvaluator` checks RBAC first, then ABAC.

```python
from kailash.enterprise import (
    RbacEvaluator, Role, Permission, User,
    AbacPolicy, AbacEvaluator,
    CombinedEvaluator,
)

# RBAC layer: role-based permissions
rbac = RbacEvaluator()
rbac.add_role(
    Role("editor")
    .with_permission(Permission("documents", "read"))
    .with_permission(Permission("documents", "write"))
)

# ABAC layer: attribute-based constraints
business_hours = AbacPolicy("business_hours", "allow")
business_hours = business_hours.with_environment_condition("hour", "gte", 9)
business_hours = business_hours.with_environment_condition("hour", "lte", 17)

abac = AbacEvaluator(policies=[business_hours], strategy="first_applicable")

# Combined: both RBAC and ABAC must allow
combined = CombinedEvaluator(rbac, abac, strategy="deny_override")

user = User("alice").with_role("editor")
result = combined.evaluate(user, "documents", "write", environment={"hour": 14})
# result["allowed"], result["reason"]
```

## Business Hours Policy

```python
biz_hours = AbacPolicy("business_hours_only", "allow")
biz_hours = biz_hours.with_subject_condition("employment_status", "eq", "active")
biz_hours = biz_hours.with_environment_condition("hour", "gte", 9)
biz_hours = biz_hours.with_environment_condition("hour", "lt", 17)

deny_default = AbacPolicy("deny_outside_hours", "deny")

evaluator = AbacEvaluator(
    policies=[biz_hours, deny_default],
    strategy="first_applicable",
)

# During business hours
result = evaluator.evaluate(
    subject={"employment_status": "active"},
    resource={},
    action="write",
    environment={"hour": 14},
)
assert result["allowed"] is True

# Outside business hours
result = evaluator.evaluate(
    subject={"employment_status": "active"},
    resource={},
    action="write",
    environment={"hour": 23},
)
assert result["allowed"] is False
```

## Testing ABAC

```python
def test_owner_can_edit():
    policy = AbacPolicy("ownership", "allow")
    policy = policy.with_subject_condition("user_id", "eq", "resource.owner_id")

    evaluator = AbacEvaluator(policies=[policy], strategy="first_applicable")

    result = evaluator.evaluate(
        subject={"user_id": "alice"},
        resource={"owner_id": "alice"},
        action="write",
        environment={},
    )
    assert result["allowed"] is True


def test_non_owner_denied():
    policy = AbacPolicy("ownership", "allow")
    policy = policy.with_subject_condition("user_id", "eq", "resource.owner_id")

    evaluator = AbacEvaluator(policies=[policy], strategy="first_applicable")

    result = evaluator.evaluate(
        subject={"user_id": "bob"},
        resource={"owner_id": "alice"},
        action="write",
        environment={},
    )
    assert result["allowed"] is False
```

## API Reference

| Class            | Key Methods                                                                      |
| ---------------- | -------------------------------------------------------------------------------- |
| `AbacPolicy`     | `__init__(id, effect)`, `.with_subject_condition(attr, op, val)`, `.with_action()`|
| `AbacEvaluator`  | `__init__(policies, strategy)`, `.evaluate(subject, resource, action, env)`       |
| `CombinedEvaluator`| `__init__(rbac_evaluator, abac_evaluator, strategy="deny_override")`, `.evaluate(user, resource_type, action, environment=None)` |
