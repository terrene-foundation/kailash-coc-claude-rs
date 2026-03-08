---
name: setup-abac
description: "Step-by-step guide to configure Attribute-Based Access Control (ABAC) policies. Use when asking 'set up ABAC', 'configure ABAC', 'create ABAC policy', 'ABAC setup', 'ABAC walkthrough', or 'combined RBAC+ABAC setup'."
---

# Setup ABAC

Step-by-step guide to configure Attribute-Based Access Control (ABAC) policies using `kailash.enterprise`.

## Usage

`/setup-abac` -- Generate ABAC policy configuration with attribute definitions, rules, evaluation strategy, and optional RBAC+ABAC combination.

## Steps

1. Define the attribute schema for your domain (subject, resource, action, environment attributes).
2. Create ABAC policies with conditions and effects.
3. Configure the evaluation strategy (`first_applicable` or `deny_override`).
4. Optionally combine with RBAC for layered access control.
5. Write tests covering permit and deny decisions.

## Template: Basic ABAC Policy

```python
from kailash.enterprise import AbacPolicy, AbacEvaluator

# 1. Create policies with conditions

# Policy: allow access within the same department
same_dept = AbacPolicy("same-department-access", "allow")
same_dept = same_dept.with_description("Allow access to resources within the same department")
same_dept = same_dept.with_subject_condition("department", "eq", "resource.owner_department")

# Policy: deny if clearance level is too low
clearance_check = AbacPolicy("clearance-check", "deny")
clearance_check = clearance_check.with_description("Deny if clearance below resource minimum")
clearance_check = clearance_check.with_subject_condition("clearance_level", "lt", "resource.min_clearance")

# Policy: managers get full access in their department
manager_override = AbacPolicy("manager-override", "allow")
manager_override = manager_override.with_description("Managers get full access in their department")
manager_override = manager_override.with_subject_condition("is_manager", "eq", True)
manager_override = manager_override.with_subject_condition("department", "eq", "resource.owner_department")

# 2. Create evaluator with strategy
evaluator = AbacEvaluator(
    policies=[clearance_check, manager_override, same_dept],
    strategy="first_applicable",   # First matching policy wins
)

# 3. Evaluate access
result = evaluator.evaluate(
    subject={
        "department": "engineering",
        "clearance_level": 3,
        "is_manager": False,
    },
    resource={
        "classification": "internal",
        "min_clearance": 2,
        "owner_department": "engineering",
    },
    action="read",
    environment={},
)

print(f"Access: {'granted' if result['allowed'] else 'denied'}")
```

## Template: Combined RBAC + ABAC

```python
from kailash.enterprise import (
    RbacEvaluator, Role, Permission, User,
    AbacPolicy, AbacEvaluator,
    CombinedEvaluator,
)

# 1. Set up RBAC (role-based layer)
rbac = RbacEvaluator()
rbac.add_role(
    Role("editor")
    .with_permission(Permission("documents", "read"))
    .with_permission(Permission("documents", "write"))
)
rbac.add_role(
    Role("viewer")
    .with_permission(Permission("documents", "read"))
)

# 2. Set up ABAC (attribute-based layer)
business_hours = AbacPolicy("business-hours-only", "allow")
business_hours = business_hours.with_description("Writes only during business hours")
business_hours = business_hours.with_environment_condition("hour", "gte", 9)
business_hours = business_hours.with_environment_condition("hour", "lt", 17)

deny_default = AbacPolicy("deny-outside-hours", "deny")
deny_default = deny_default.with_description("Deny writes outside business hours")

abac = AbacEvaluator(
    policies=[business_hours, deny_default],
    strategy="first_applicable",
)

# 3. Combined evaluation: RBAC first, then ABAC
combined = CombinedEvaluator(rbac, abac, strategy="deny_override")

user = User("alice").with_role("editor")
result = combined.evaluate(user, "documents", "write", environment={"hour": 14})

print(f"Allowed: {result['allowed']}")
print(f"Reason: {result['reason']}")
```

## Template: Tests

```python
from kailash.enterprise import AbacPolicy, AbacEvaluator


def test_permits_matching_department():
    policy = AbacPolicy("allow-engineering", "allow")
    policy = policy.with_subject_condition("department", "eq", "engineering")

    deny = AbacPolicy("default-deny", "deny")

    evaluator = AbacEvaluator(
        policies=[policy, deny],
        strategy="first_applicable",
    )

    result = evaluator.evaluate(
        subject={"department": "engineering"},
        resource={},
        action="read",
        environment={},
    )
    assert result["allowed"] is True


def test_denies_non_matching_department():
    policy = AbacPolicy("allow-engineering", "allow")
    policy = policy.with_subject_condition("department", "eq", "engineering")

    deny = AbacPolicy("default-deny", "deny")

    evaluator = AbacEvaluator(
        policies=[policy, deny],
        strategy="first_applicable",
    )

    result = evaluator.evaluate(
        subject={"department": "marketing"},
        resource={},
        action="read",
        environment={},
    )
    assert result["allowed"] is False


def test_deny_override_strategy():
    allow_dept = AbacPolicy("allow-dept", "allow")
    allow_dept = allow_dept.with_subject_condition("department", "eq", "engineering")

    deny_low_clearance = AbacPolicy("deny-clearance", "deny")
    deny_low_clearance = deny_low_clearance.with_subject_condition("clearance_level", "lt", 3)

    evaluator = AbacEvaluator(
        policies=[allow_dept, deny_low_clearance],
        strategy="deny_override",  # Any deny overrides allow
    )

    result = evaluator.evaluate(
        subject={"department": "engineering", "clearance_level": 2},
        resource={},
        action="read",
        environment={},
    )
    # Even though department matches, clearance is too low
    assert result["allowed"] is False


def test_combined_rbac_abac():
    from kailash.enterprise import (
        RbacEvaluator, Role, Permission, User,
        CombinedEvaluator,
    )

    rbac = RbacEvaluator()
    rbac.add_role(
        Role("editor")
        .with_permission(Permission("documents", "write"))
    )

    biz_hours = AbacPolicy("biz-hours", "allow")
    biz_hours = biz_hours.with_environment_condition("hour", "gte", 9)
    biz_hours = biz_hours.with_environment_condition("hour", "lt", 17)

    abac = AbacEvaluator(policies=[biz_hours], strategy="first_applicable")
    combined = CombinedEvaluator(rbac, abac, strategy="deny_override")

    user = User("alice").with_role("editor")
    result = combined.evaluate(user, "documents", "write", environment={"hour": 14})
    assert result["allowed"] is True
```

## Checklist

- [ ] Subject attributes defined (user properties: role, department, clearance)
- [ ] Resource attributes defined (document properties: owner, classification)
- [ ] Environment attributes defined (time, IP, location)
- [ ] Policies created with correct effects (`"allow"` or `"deny"`)
- [ ] Evaluation strategy chosen (`first_applicable` or `deny_override`)
- [ ] Tests cover both permit and deny cases
- [ ] Combined RBAC+ABAC tested if using `CombinedEvaluator`
