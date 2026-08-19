---
name: enterprise-policy
description: "Policy engine: RBAC + ABAC + custom expression rules with versioning and hot-reload. Use when asking 'policy engine', 'policy rules', 'combine strategy', 'policy versioning', 'policy rollback', 'custom expression'."
---

# Enterprise Policy Engine

`PolicyEngine` provides unified policy management combining RBAC, ABAC, and custom expression rules. Supports CRUD, evaluation with combination strategies, versioning with hot-reload, and rollback.

## Rust API

Source: `crates/kailash-enterprise/src/policy/engine.rs`

### Creating and Adding Policies

```rust
use kailash_enterprise::policy::engine::PolicyEngine;
use kailash_enterprise::policy::types::*;
use kailash_value::Value;

let mut engine = PolicyEngine::new();

// Policy with an RBAC rule
let policy = Policy::new("admin-access", "Admin Access")
    .with_rule(PolicyRule::Rbac {
        role: "admin".to_string(),
        resource: "users".to_string(),
        action: "write".to_string(),
    });

engine.add_policy(policy)?;
```

### Rule Types

Three rule types are supported:

```rust
// RBAC: checks user has a specific role for resource/action
PolicyRule::Rbac {
    role: "admin".to_string(),
    resource: "users".to_string(),   // or "*" for wildcard
    action: "write".to_string(),     // or "*" for wildcard
}

// ABAC: checks user attribute matches expected value
PolicyRule::Abac {
    attribute: "department".to_string(),
    value: Value::from("engineering"),
    resource: "users".to_string(),   // or "*" for wildcard
}

// Custom: sandboxed expression evaluated against context
PolicyRule::Custom {
    expression: "user.level >= 3".to_string(),
}
```

### Combination Strategies

Policies with multiple rules use a combination strategy:

```rust
let policy = Policy::new("mixed", "Mixed Policy")
    .with_rule(PolicyRule::Rbac { role: "admin".into(), resource: "users".into(), action: "write".into() })
    .with_rule(PolicyRule::Abac { attribute: "department".into(), value: Value::from("eng"), resource: "users".into() })
    .with_rule(PolicyRule::Custom { expression: "user.level >= 3".into() })
    .with_combination(CombineStrategy::AllMustPass);  // default
```

- `AllMustPass` -- all rules must pass (default)
- `AnyMustPass` -- at least one rule must pass
- `MajorityPass` -- more than 50% of rules must pass

### Evaluating Policies

```rust
let ctx = AccessContext::new(
    UserContext::new("alice")
        .with_role("admin")
        .with_attribute("department", Value::from("engineering"))
        .with_attribute("level", Value::Integer(5)),
    "users",
    "write",
);

// Evaluate a single policy
let decision = engine.evaluate("admin-access", &ctx);
assert!(decision.is_allowed());

// Evaluate all policies (all must allow)
let decision = engine.evaluate_all(&ctx);
```

### Three decision states, not two (#2712)

`PolicyDecision` is `Allow` / `Deny(String)` / `NoDecision(NoDecisionReason)`
(`crates/kailash-enterprise/src/policy/types.rs:338-353`). `NoDecision` means
**no policy evaluated the request** — the authorization control was inert. It is
fail-closed (`is_denied()` is `true`, `is_allowed()` is `false`, and
`is_allowed` is an equality against `Allow` alone) but reported separately, so a
caller can tell an inert control from a working one without substring-matching
the denial prose.

`NoDecisionReason` has **THREE** variants
(`crates/kailash-enterprise/src/policy/types.rs:248-275`), not two:

| Variant | Produced when | Constructed at |
| --- | --- | --- |
| `NoPoliciesConfigured` | the engine holds no policies at all | `engine.rs:168` |
| `PolicyNotFound(String)` | the id passed to `evaluate` is not registered | `engine.rs:146-148` |
| `PolicyHasNoRules(String)` | the policy IS registered but carries zero rules | `engine.rs:335-337` |

`PolicyHasNoRules` is the one that changed behaviour, and the reason to care:
a rules-less policy **previously returned `Allow`** — "vacuously true for
AllMustPass" — which made it an UNCONDITIONAL GRANT for every subject, resource
and action. `Policy` derives `Deserialize` with a bare `Vec<PolicyRule>` and
registration validates only expression syntax and duplicate ids, so a config
whose rules failed to load registered successfully and then permitted
everything. It now fails closed.

```rust
let decision = engine.evaluate_all(&ctx);

if decision.is_no_decision() {
    // The control is inert — nothing ran. Alert; do NOT report this as
    // "policy enforcement denied N requests".
} else if decision.is_policy_denial() {
    // A policy ran and refused.
}
```

`PolicyDecision::denial_reason()` reproduces the pre-4.44.0 `Deny(String)`
payload for one deprecation window. It is `#[deprecated(since = "4.44.0")]` and
scheduled for removal in 4.46.0 — a schedule enforced in CI by
`scripts/ci/deprecation-window-registry.d/enterprise-policy-decision-denial-reason-removal.json`,
not just asserted in prose. Recovering the distinction from prose is the defect
the third state closes.

### Versioning and Hot-Reload

```rust
// Load initial policy
engine.add_policy(Policy::new("rbac-admin", "Admin RBAC v1")
    .with_rule(PolicyRule::Rbac { role: "admin".into(), resource: "users".into(), action: "write".into() }))?;

// Hot-reload with new version
let v2 = Policy::new("rbac-admin", "Admin RBAC v2")
    .with_version("2.0")
    .with_rule(PolicyRule::Rbac { role: "admin".into(), resource: "*".into(), action: "*".into() });
engine.reload_policy("rbac-admin", v2)?;

// Check version history
let history = engine.policy_versions("rbac-admin");
assert_eq!(history[0].version, "1.0");

// Rollback to previous version
engine.rollback_policy("rbac-admin", "1.0")?;
```

### Loading from JSON

```rust
let json = r#"{
    "id": "json-policy",
    "version": "1.0",
    "name": "JSON Policy",
    "description": "Loaded from JSON",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "users", "action": "write"}
    ],
    "combination": "all_must_pass",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
}"#;
engine.load_from_json(json)?;
```

## Python API

Source: `bindings/kailash-python/src/enterprise.rs` (`PyPolicyEngine`)

### Creating and Adding Policies

```python
from kailash import PolicyEngine

engine = PolicyEngine()

engine.add_policy({
    "id": "admin-access",
    "name": "Admin Access",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "users", "action": "write"}
    ],
    "combine": "all_must_pass",  # optional, default is all_must_pass
})
```

Policy dict schema:

- `id` (str, required): unique policy ID
- `name` (str, required): human-readable name
- `rules` (list[dict], required): list of rule dicts
- `combine` (str, optional): `"all_must_pass"` | `"any_must_pass"` | `"majority_pass"`
- `version` (str, optional): policy version (default `"1.0"`)
- `description` (str, optional): description

Rule dict format depends on `type`:

- RBAC: `{"type": "rbac", "role": "admin", "resource": "users", "action": "write"}`
- ABAC: `{"type": "abac", "attribute": "department", "value": "engineering", "resource": "users"}`
- Custom: `{"type": "custom", "expression": "user.level >= 3"}`

### Evaluating Policies

```python
result = engine.evaluate("admin-access", {
    "user": {"user_id": "alice", "roles": ["admin"], "attributes": {}},
    "resource": "users",
    "action": "write",
    "environment": {},
})
# Returns the STRING "allow", or {"deny": reason}, or -- when nothing evaluated
# the request -- {"deny": reason, "no_decision": tag} where tag is one of
# "no_policies_configured" / "policy_not_found" / "policy_has_no_rules".
# The "deny" key is present on BOTH denial shapes, so `if "deny" in result`
# stays fail-closed; "no_decision" is the additive discriminator.
assert result == "allow"
if isinstance(result, dict) and "no_decision" in result:
    ...  # the authorization control is inert -- alert, do not count as enforcement
```

### CRUD Operations

```python
# List policy IDs
ids = engine.list_policies()

# Get policy as dict
policy = engine.get_policy("admin-access")

# Remove policy
engine.remove_policy("admin-access")

# Load from JSON string
engine.load_from_json('{"id": "json-pol", "name": "JSON", "rules": [...]}')
```

### Versioning and Hot-Reload

```python
# Hot-reload a policy
engine.reload_policy("admin-access", {
    "id": "admin-access",
    "name": "Admin Access v2",
    "version": "2.0",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "*", "action": "*"}
    ],
})

# Get version history (list of version strings)
versions = engine.policy_versions("admin-access")

# Rollback to a previous version
engine.rollback_policy("admin-access", "1.0")
```

### Evaluate All Policies

```python
result = engine.evaluate_all({
    "user": {"user_id": "alice", "roles": ["admin"], "attributes": {}},
    "resource": "users",
    "action": "write",
    "environment": {},
})
```

## Custom Expressions

Custom expression rules use a sandboxed evaluator supporting comparisons against user attributes:

```
user.level >= 3
user.department == "engineering"
user.clearance > 2
```

Expressions are validated at policy add time -- invalid expressions are rejected immediately.

## Source Files

- `crates/kailash-enterprise/src/policy/engine.rs` -- `PolicyEngine`
- `crates/kailash-enterprise/src/policy/types.rs` -- `Policy`, `PolicyRule`, `CombineStrategy`, `PolicyDecision`, `NoDecisionReason`, `AccessContext`, `UserContext`
- `crates/kailash-enterprise/src/policy/expression.rs` -- `evaluate_expression`, `validate_expression`
- `bindings/kailash-python/src/enterprise.rs` -- `PyPolicyEngine`

<!-- Trigger Keywords: policy engine, PolicyEngine, RBAC rule, ABAC rule, custom expression, combine strategy, all_must_pass, any_must_pass, majority_pass, policy versioning, policy rollback, hot-reload, AccessContext -->
