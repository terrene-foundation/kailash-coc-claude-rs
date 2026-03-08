---
skill: enterprise-policy
description: "PolicyEngine for fine-grained policy evaluation, versioning, and rollback. Use when asking about 'policy engine', 'policy evaluation', 'policy versioning', 'policy rollback', 'access policy', or 'authorization policy'."
priority: MEDIUM
tags: [enterprise, policy, authorization, versioning, rollback, access-control]
---

# Enterprise Policy Engine

Fine-grained policy evaluation with versioning and rollback support.

## Quick Reference

- **PolicyEngine**: Core class for managing and evaluating access policies
- **Policies**: Dict-based definitions with id, name, rules (list), and combine strategy
- **Rule Types**: `rbac` (role/resource/action), `abac` (attribute/value/resource), `custom` (expression)
- **Combine Strategies**: `all_must_pass`, `any_must_pass`, `majority_pass`
- **Versioning**: Automatic version tracking on policy reload
- **Rollback**: Revert to previous policy versions

## Import

```python
from kailash.enterprise import PolicyEngine
```

## Basic Usage

```python
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Add a policy -- dict with id, name, rules, and combine strategy
pe.add_policy({
    "id": "admin_access",
    "name": "Admin Access Policy",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "documents/*", "action": "read"},
    ],
    "combine": "all_must_pass",
})

# Evaluate the policy against an access context
result = pe.evaluate("admin_access", {
    "user": {"user_id": "alice", "role": "admin"},
    "action": "read",
    "resource": "documents/report.pdf",
})
# result: "allow" (string) or {"deny": "reason string"} (dict)
```

## Policy Definition

Policies are defined as dicts with the following keys:

```python
policy = {
    "id": "unique-policy-id",          # Required: unique identifier
    "name": "Human-readable name",     # Required: descriptive name
    "version": "1.0.0",                # Optional: version string
    "description": "What this does",   # Optional: description
    "rules": [                         # Required: list of rule dicts
        # RBAC rule -- role-based access control
        {"type": "rbac", "role": "admin", "resource": "documents/*", "action": "read"},

        # ABAC rule -- attribute-based access control
        {"type": "abac", "attribute": "department", "value": "engineering", "resource": "code/*"},

        # Custom rule -- expression-based
        {"type": "custom", "expression": "user.level >= 5"},
    ],
    "combine": "all_must_pass",        # Required: "all_must_pass", "any_must_pass", or "majority_pass"
}
```

## Rule Types

### RBAC Rules

Role-based access control rules require `role`, `resource`, and `action`:

```python
{"type": "rbac", "role": "admin", "resource": "documents/*", "action": "read"}
{"type": "rbac", "role": "editor", "resource": "posts/*", "action": "write"}
{"type": "rbac", "role": "viewer", "resource": "*", "action": "read"}
```

### ABAC Rules

Attribute-based access control rules require `attribute`, `value`, and `resource`:

```python
{"type": "abac", "attribute": "department", "value": "engineering", "resource": "code/*"}
{"type": "abac", "attribute": "clearance", "value": "top_secret", "resource": "classified/*"}
```

### Custom Rules

Expression-based rules require `expression`:

```python
{"type": "custom", "expression": "user.level >= 5 and resource.sensitivity < 3"}
```

## Multiple Policies

```python
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Allow admin read access
pe.add_policy({
    "id": "admin_read",
    "name": "Admin Read Access",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "documents/*", "action": "read"},
    ],
    "combine": "all_must_pass",
})

# Allow admin write access
pe.add_policy({
    "id": "admin_write",
    "name": "Admin Write Access",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "documents/*", "action": "write"},
    ],
    "combine": "all_must_pass",
})

# Multi-rule policy with RBAC + ABAC
pe.add_policy({
    "id": "eng_code_access",
    "name": "Engineering Code Access",
    "rules": [
        {"type": "rbac", "role": "developer", "resource": "code/*", "action": "write"},
        {"type": "abac", "attribute": "department", "value": "engineering", "resource": "code/*"},
    ],
    "combine": "all_must_pass",  # Both rules must pass
})
```

## Policy Management

### Get a Policy

```python
policy = pe.get_policy("admin_read")
# Returns the policy dict or None if not found
```

### List All Policies

```python
policies = pe.list_policies()
# Returns list of policy ID strings (e.g., ["admin_read", "admin_write"])
```

### Remove a Policy

```python
pe.remove_policy("admin_read")
```

## Evaluation

### Single Policy Evaluation

```python
result = pe.evaluate("admin_read", {
    "user": {"user_id": "alice", "role": "admin"},
    "action": "read",
    "resource": "documents/report.pdf",
})
# result: "allow" (string) or {"deny": "reason string"} (dict)
```

### Evaluate All Policies

```python
results = pe.evaluate_all({
    "user": {"user_id": "alice", "role": "admin"},
    "action": "read",
    "resource": "documents/report.pdf",
})
# Returns evaluation results across all policies
```

### Context Structure

The evaluation context is a dict with these keys:

```python
context = {
    "user": {
        "user_id": "alice",          # User identifier
        "role": "admin",             # User's role (matched against RBAC rules)
    },
    "action": "read",                # Action being performed
    "resource": "documents/file.pdf",# Resource being accessed
}
```

## Combine Strategies

The `combine` field determines how multiple rules within a policy are evaluated:

| Strategy | Behavior |
| --- | --- |
| `all_must_pass` | All rules must pass for the policy to allow access |
| `any_must_pass` | At least one rule must pass for the policy to allow access |
| `majority_pass` | More than half of the rules must pass |

```python
# Strict: all rules must pass
pe.add_policy({
    "id": "strict_access",
    "name": "Strict Access",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "*", "action": "write"},
        {"type": "abac", "attribute": "clearance", "value": "high", "resource": "*"},
    ],
    "combine": "all_must_pass",
})

# Flexible: any rule can grant access
pe.add_policy({
    "id": "flexible_read",
    "name": "Flexible Read",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "docs/*", "action": "read"},
        {"type": "rbac", "role": "viewer", "resource": "docs/*", "action": "read"},
    ],
    "combine": "any_must_pass",
})
```

## Loading Policies from JSON

```python
import json
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Load from JSON -- policies are defined inline with rules and combine
policy_json = json.dumps({
    "version": "1.0.0",
    "combination": "deny_override",
    "rules": [
        {
            "id": "admin_full",
            "name": "Admin Full Access",
            "rules": [
                {"type": "rbac", "role": "admin", "resource": "*", "action": "read"},
                {"type": "rbac", "role": "admin", "resource": "*", "action": "write"},
                {"type": "rbac", "role": "admin", "resource": "*", "action": "delete"},
            ],
            "combine": "any_must_pass",
        },
        {
            "id": "user_read",
            "name": "User Read Only",
            "rules": [
                {"type": "rbac", "role": "user", "resource": "documents/*", "action": "read"},
            ],
            "combine": "all_must_pass",
        },
    ],
})

pe.load_from_json(policy_json)
```

## Policy Versioning

Policies support automatic versioning when reloaded:

```python
import json
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Load initial version
pe.load_from_json(json.dumps({
    "version": "1.0.0",
    "combination": "deny_override",
    "rules": [
        {
            "id": "admin_read",
            "name": "Admin Read",
            "rules": [
                {"type": "rbac", "role": "admin", "resource": "*", "action": "read"},
            ],
            "combine": "all_must_pass",
        },
    ],
}))

# Load updated version -- creates a new version automatically
pe.load_from_json(json.dumps({
    "version": "2.0.0",
    "combination": "deny_override",
    "rules": [
        {
            "id": "admin_read",
            "name": "Admin Read (Updated)",
            "rules": [
                {"type": "rbac", "role": "admin", "resource": "*", "action": "read"},
                {"type": "rbac", "role": "admin", "resource": "*", "action": "list"},
            ],
            "combine": "any_must_pass",
        },
    ],
}))

# Version 2.0.0 is now active
```

## Policy Rollback

Roll back to a previous policy version using `rollback_policy(policy_id, version)`:

```python
import json
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Load version 1
pe.load_from_json(json.dumps({
    "version": "1.0.0",
    "combination": "deny_override",
    "rules": [
        {
            "id": "r1",
            "name": "Rule 1",
            "rules": [{"type": "rbac", "role": "admin", "resource": "*", "action": "read"}],
            "combine": "all_must_pass",
        },
    ],
}))

# Load version 2
pe.load_from_json(json.dumps({
    "version": "2.0.0",
    "combination": "deny_override",
    "rules": [
        {
            "id": "r1",
            "name": "Rule 1 Updated",
            "rules": [{"type": "rbac", "role": "admin", "resource": "*", "action": "write"}],
            "combine": "all_must_pass",
        },
    ],
}))

# Roll back policy "r1" to version 1.0
pe.rollback_policy("r1", "1.0")

# Check version history
versions = pe.policy_versions("r1")
# Returns list of version strings
```

## Production Pattern

```python
import os
import json
from kailash.enterprise import PolicyEngine

def create_policy_engine():
    """Create and configure a production policy engine."""
    pe = PolicyEngine()

    # Load policies from a file
    policy_path = os.getenv("POLICY_FILE", "policies.json")
    with open(policy_path) as f:
        pe.load_from_json(f.read())

    return pe

def check_access(pe, user_id, role, action, resource):
    """Check if a user has access to perform an action on a resource."""
    context = {
        "user": {"user_id": user_id, "role": role},
        "action": action,
        "resource": resource,
    }

    results = pe.evaluate_all(context)
    return results

# Usage
pe = create_policy_engine()
access = check_access(pe, "alice", "admin", "read", "documents/report.pdf")
```

## Best Practices

1. **Use `all_must_pass` for strict access** -- Require all rules to pass for sensitive resources
2. **Version all policy changes** -- Use `load_from_json()` with version for traceability
3. **Test rollback** -- Use `rollback_policy(id, version)` and verify before deploying changes
4. **Least privilege** -- Default to deny, explicitly allow required actions
5. **Use resource wildcards carefully** -- `*` grants broad access
6. **Externalize policies** -- Load from files or config services, not hardcoded
7. **Combine RBAC + ABAC** -- Use multiple rule types in a single policy for defense in depth

## Related Skills

- [enterprise-compliance](enterprise-compliance.md) - Compliance framework evaluation
- [enterprise-tokens](enterprise-tokens.md) - Token lifecycle management
- [python-framework-bindings](../06-python-bindings/python-framework-bindings.md) - Enterprise RBAC/ABAC types

<!-- Trigger Keywords: policy engine, policy evaluation, policy versioning, policy rollback, access policy, authorization policy, fine-grained access control -->
