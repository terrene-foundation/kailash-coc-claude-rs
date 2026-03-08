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
- **Policies**: Dict-based definitions with id, name, effect, actions, resources, conditions
- **Versioning**: Automatic version tracking on policy reload
- **Rollback**: Revert to previous policy versions
- **Evaluation**: Check access with user context (user_id, role, action, resource)

## Import

```python
from kailash.enterprise import PolicyEngine
```

## Basic Usage

```python
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Add a policy
pe.add_policy({
    "id": "admin_read",
    "name": "Admin Read Access",
    "effect": "allow",
    "actions": ["read"],
    "resources": ["documents/*"],
    "conditions": {"role": "admin"},
})

# Evaluate the policy
result = pe.evaluate("admin_read", {
    "user": {"user_id": "alice", "role": "admin"},
    "action": "read",
    "resource": "documents/report.pdf",
})

assert result == "allow"
```

## Policy Definition

Policies are defined as dicts with the following keys:

```python
policy = {
    "id": "unique-policy-id",          # Required: unique identifier
    "name": "Human-readable name",     # Required: descriptive name
    "effect": "allow",                  # Required: "allow" or "deny"
    "actions": ["read", "write"],       # Required: list of action strings
    "resources": ["documents/*"],       # Required: list of resource patterns (* for wildcard)
    "conditions": {"role": "admin"},    # Required: dict of conditions to match
}
```

## Multiple Policies

```python
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Allow admin read access
pe.add_policy({
    "id": "admin_read",
    "name": "Admin Read Access",
    "effect": "allow",
    "actions": ["read"],
    "resources": ["documents/*"],
    "conditions": {"role": "admin"},
})

# Allow admin write access
pe.add_policy({
    "id": "admin_write",
    "name": "Admin Write Access",
    "effect": "allow",
    "actions": ["write"],
    "resources": ["documents/*"],
    "conditions": {"role": "admin"},
})

# Deny all user delete actions
pe.add_policy({
    "id": "deny_delete",
    "name": "Deny Delete",
    "effect": "deny",
    "actions": ["delete"],
    "resources": ["*"],
    "conditions": {},
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
# Returns list of policy ID strings (e.g., ["admin_read", "user_write"])
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
# result: "allow" or "deny"
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
        "role": "admin",             # User's role (matched against conditions)
    },
    "action": "read",                # Action being performed
    "resource": "documents/file.pdf",# Resource being accessed
}
```

## Loading Policies from JSON

```python
import json
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()

# Load from a JSON structure with version, combination strategy, and rules
policy_json = json.dumps({
    "version": "1.0.0",
    "combination": "deny_override",
    "rules": [
        {
            "id": "admin_full",
            "name": "Admin Full Access",
            "effect": "allow",
            "actions": ["read", "write", "delete"],
            "resources": ["*"],
            "conditions": {"role": "admin"},
        },
        {
            "id": "user_read",
            "name": "User Read Only",
            "effect": "allow",
            "actions": ["read"],
            "resources": ["documents/*"],
            "conditions": {"role": "user"},
        },
    ],
})

pe.load_from_json(policy_json)
```

## Policy Versioning

Policies support automatic versioning when reloaded:

```python
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
            "effect": "allow",
            "actions": ["read"],
            "resources": ["*"],
            "conditions": {"role": "admin"},
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
            "effect": "allow",
            "actions": ["read", "list"],
            "resources": ["*"],
            "conditions": {"role": "admin"},
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
    "rules": [{"id": "r1", "name": "Rule 1", "effect": "allow", "actions": ["read"], "resources": ["*"], "conditions": {}}],
}))

# Load version 2
pe.load_from_json(json.dumps({
    "version": "2.0.0",
    "combination": "deny_override",
    "rules": [{"id": "r1", "name": "Rule 1 Updated", "effect": "deny", "actions": ["write"], "resources": ["*"], "conditions": {}}],
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

1. **Use deny_override combination** -- Deny policies always take precedence
2. **Version all policy changes** -- Use `load_from_json()` with version for traceability
3. **Test rollback** -- Use `rollback_policy(id, version)` and verify before deploying changes
4. **Least privilege** -- Default to deny, explicitly allow required actions
5. **Use resource wildcards carefully** -- `*` grants broad access
6. **Externalize policies** -- Load from files or config services, not hardcoded

## Related Skills

- [enterprise-compliance](enterprise-compliance.md) - Compliance framework evaluation
- [enterprise-tokens](enterprise-tokens.md) - Token lifecycle management
- [python-framework-bindings](../06-python-bindings/python-framework-bindings.md) - Enterprise RBAC/ABAC types

<!-- Trigger Keywords: policy engine, policy evaluation, policy versioning, policy rollback, access policy, authorization policy, fine-grained access control -->
