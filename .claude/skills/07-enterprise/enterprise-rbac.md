---
name: enterprise-rbac
description: "RBAC configuration, role hierarchy, wildcard permissions, and evaluator usage. Use when asking 'RBAC', 'RbacEvaluator', 'Role', 'Permission', 'User', 'role hierarchy', 'wildcard permissions', 'check permission', or 'access control'."
---

# Enterprise RBAC

Role-Based Access Control using `kailash.enterprise`. Configure roles, assign permissions, build hierarchies, and evaluate access.

## Core Concepts

- **Role**: A named group of permissions (e.g., `admin`, `viewer`, `editor`)
- **Permission**: A resource/action pair (e.g., `Permission("users", "read")`)
- **User**: A user with assigned roles, direct permissions, and attributes
- **RbacEvaluator**: Evaluates whether a user has access to a resource/action
- **Role Hierarchy**: A role can inherit all permissions of a parent role
- **Wildcards**: `Permission.wildcard("users")` grants all actions on a resource

## Imports

```python
from kailash.enterprise import (
    RbacEvaluator,
    Role,
    Permission,
    User,
)
```

## Permission

```python
# Specific resource/action permission
p = Permission("users", "read")
p.resource   # "users"
p.action     # "read"
p.matches("users", "read")   # True
p.matches("users", "write")  # False

# Wildcard: all actions on a resource
p_all = Permission.wildcard("users")
p_all.matches("users", "read")    # True
p_all.matches("users", "delete")  # True

# Global wildcard: all actions on all resources
p_god = Permission.global_wildcard()
p_god.matches("anything", "everything")  # True
```

## Role

```python
# Create a role with permissions
viewer = Role("viewer")
viewer = viewer.with_permission(Permission("users", "read"))
viewer = viewer.with_permission(Permission("reports", "read"))

editor = Role("editor")
editor = editor.with_permission(Permission("users", "read"))
editor = editor.with_permission(Permission("users", "write"))
editor = editor.with_permission(Permission("reports", "read"))
editor = editor.with_permission(Permission("reports", "write"))

admin = Role("admin")
admin = admin.with_permission(Permission.global_wildcard())

viewer.name  # "viewer"
```

## Role Hierarchy (Inheritance)

```python
base_user = Role("base_user")
base_user = base_user.with_permission(Permission("profile", "read"))
base_user = base_user.with_permission(Permission("profile", "write"))

member = Role("member")
member = member.inherits("base_user")  # Gets all base_user permissions
member = member.with_permission(Permission("content", "read"))

premium = Role("premium_member")
premium = premium.inherits("member")   # Gets member + base_user permissions
premium = premium.with_permission(Permission("content", "write"))
premium = premium.with_permission(Permission("analytics", "read"))

# premium_member has: profile:read, profile:write, content:read, content:write, analytics:read
```

## User

```python
# Create a user with roles
user = User("alice")
user = user.with_role("editor")
user = user.with_role("billing_admin")

# Direct permissions (bypass roles)
user = user.with_direct_permission(Permission("special", "access"))

# Attributes for ABAC
user = user.with_attribute("department", "engineering")
user = user.with_attribute("clearance", 5)

user.user_id  # "alice"
```

## RbacEvaluator

```python
# Create evaluator with roles
evaluator = RbacEvaluator()
evaluator.add_role(
    Role("viewer")
    .with_permission(Permission("users", "read"))
    .with_permission(Permission("reports", "read"))
)
evaluator.add_role(
    Role("admin")
    .with_permission(Permission.global_wildcard())
)

# Or pass roles at construction
evaluator = RbacEvaluator(roles=[viewer, editor, admin])

# Check access
user = User("alice").with_role("viewer")
evaluator.check(user, "users", "read")     # True
evaluator.check(user, "users", "write")    # False

admin_user = User("bob").with_role("admin")
evaluator.check(admin_user, "users", "read")     # True
evaluator.check(admin_user, "anything", "any")   # True (wildcard)

# Check with context attributes
evaluator.check_with_context(user, "users", "read", {"ip": "10.0.0.1"})

# Explain a decision (returns dict with details)
result = evaluator.explain(user, "users", "read")
# {"allowed": True, "matched_role": "viewer", ...}

# Validate role hierarchy (raises on circular inheritance)
evaluator.validate_hierarchy()

# Count registered roles
evaluator.role_count()  # 3
```

## Multi-Role Users

```python
# Users can have multiple roles -- permissions are unioned
user = User("alice").with_role("viewer").with_role("billing_admin")

evaluator.check(user, "users", "read")      # True (from viewer)
evaluator.check(user, "billing", "manage")   # True (from billing_admin)
evaluator.check(user, "users", "write")      # False (neither role has it)
```

## Permission Naming Conventions

| Pattern          | Meaning                       |
| ---------------- | ----------------------------- |
| `users:read`     | Read user records             |
| `users:write`    | Create or update user records |
| `users:delete`   | Delete user records           |
| `users:*`        | Any action on users           |
| `reports:export` | Export reports                 |
| `admin:*`        | All admin actions              |
| `*`              | Everything (superadmin)        |

## Combined RBAC + ABAC

For attribute-based access control layered on top of RBAC, see `/enterprise-abac`.

```python
from kailash.enterprise import CombinedEvaluator

combined = CombinedEvaluator(rbac=evaluator, abac=abac_evaluator)
result = combined.evaluate(user, "documents", "write", resource_attrs, env_attrs)
```

## Testing RBAC

```python
def test_viewer_can_read_not_write():
    evaluator = RbacEvaluator()
    evaluator.add_role(Role("viewer").with_permission(Permission("users", "read")))

    user = User("alice").with_role("viewer")
    assert evaluator.check(user, "users", "read") is True
    assert evaluator.check(user, "users", "write") is False


def test_admin_has_all_permissions():
    evaluator = RbacEvaluator()
    evaluator.add_role(Role("admin").with_permission(Permission.global_wildcard()))

    user = User("admin-1").with_role("admin")
    assert evaluator.check(user, "users", "read") is True
    assert evaluator.check(user, "reports", "export") is True
    assert evaluator.check(user, "anything", "arbitrary") is True


def test_no_roles_means_no_permissions():
    evaluator = RbacEvaluator()
    evaluator.add_role(Role("viewer").with_permission(Permission("users", "read")))

    user = User("nobody")  # No roles
    assert evaluator.check(user, "users", "read") is False
```

## API Reference

| Class          | Key Methods                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `Permission`   | `__init__(resource, action)`, `.wildcard(resource)`, `.global_wildcard()`   |
| `Role`         | `__init__(name)`, `.with_permission(perm)`, `.inherits(parent)`             |
| `User`         | `__init__(user_id)`, `.with_role(name)`, `.with_direct_permission(perm)`    |
| `RbacEvaluator`| `__init__(roles=None)`, `.add_role(role)`, `.check(user, resource, action)` |
