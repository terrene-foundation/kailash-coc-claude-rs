# Enterprise ABAC Skill

ABAC policy guide: ABACPolicy structure, 16 operators, evaluation strategies, and RBAC+ABAC combined.

## Usage

`/enterprise-abac` -- Reference for attribute-based access control, the 16 operators, and combined RBAC+ABAC evaluation

## What ABAC Adds Over RBAC

RBAC controls access by role. ABAC controls access by attributes of the subject (user), resource, action, and environment. Use ABAC when you need:

- Ownership rules (`user.id == resource.owner_id`)
- Time-based restrictions (`env.time between 09:00 and 17:00`)
- Geographic restrictions (`user.country == "US"`)
- Classification levels (`user.clearance >= resource.classification`)

## Core Types

```rust
use kailash_enterprise::abac::{
    ABACPolicy, ABACRule, ABACEvaluator, ABACRequest, ABACDecision,
    EvaluationStrategy,
};
```

## ABACRequest

```rust
pub struct ABACRequest {
    /// Subject attributes (the user/agent performing the action)
    pub subject: HashMap<String, Value>,

    /// Resource attributes (the thing being accessed)
    pub resource: HashMap<String, Value>,

    /// Action being performed (e.g., "read", "write", "delete")
    pub action: String,

    /// Environment attributes (time, IP, location, etc.)
    pub environment: HashMap<String, Value>,
}
```

## ABACRule (Single Condition)

```rust
use kailash_enterprise::abac::{ABACRule, Operator};

// subject.role == "admin"
ABACRule::new()
    .attribute("subject.role")
    .operator(Operator::Eq)
    .value("admin")

// resource.owner_id == subject.user_id  (compare two attributes)
ABACRule::new()
    .attribute("resource.owner_id")
    .operator(Operator::Eq)
    .attribute_value("subject.user_id")  // Compare to another attribute

// resource.sensitivity_level <= 3
ABACRule::new()
    .attribute("resource.sensitivity_level")
    .operator(Operator::Lte)
    .value(3)
```

## The 16 Operators

| Operator     | Description                             | Example                                         |
| ------------ | --------------------------------------- | ----------------------------------------------- |
| `Eq`         | Equals                                  | `subject.role == "admin"`                       |
| `Ne`         | Not equals                              | `subject.status != "suspended"`                 |
| `Gt`         | Greater than                            | `subject.clearance > 2`                         |
| `Gte`        | Greater than or equal                   | `subject.clearance >= resource.required_level`  |
| `Lt`         | Less than                               | `resource.age < 30`                             |
| `Lte`        | Less than or equal                      | `resource.size <= 10485760`                     |
| `In`         | Value in list                           | `subject.country in ["US", "CA", "UK"]`         |
| `NotIn`      | Value not in list                       | `resource.type not_in ["restricted", "secret"]` |
| `Contains`   | String/array contains substring/element | `resource.tags contains "public"`               |
| `StartsWith` | String starts with prefix               | `resource.path starts_with "/public/"`          |
| `EndsWith`   | String ends with suffix                 | `resource.name ends_with ".pdf"`                |
| `Regex`      | Matches regex pattern                   | `subject.email regex ".*@example\\.com"`        |
| `IsNull`     | Attribute is null/absent                | `resource.deleted_at is_null`                   |
| `IsNotNull`  | Attribute is present and non-null       | `subject.verified_at is_not_null`               |
| `Between`    | Value within range (inclusive)          | `env.hour between 9 and 17`                     |
| `AnyOf`      | At least one element matches            | `subject.roles any_of ["admin", "moderator"]`   |

## ABACPolicy (Multiple Rules)

```rust
use kailash_enterprise::abac::{ABACPolicy, ABACRule, Operator};

// Policy: allow access only during business hours by verified employees
let policy = ABACPolicy::new("business_hours_access")
    .allow_if(ABACRule::new()
        .attribute("subject.employment_status")
        .operator(Operator::Eq)
        .value("active")
    )
    .allow_if(ABACRule::new()
        .attribute("subject.verified")
        .operator(Operator::Eq)
        .value(true)
    )
    .allow_if(ABACRule::new()
        .attribute("env.hour")
        .operator(Operator::Between)
        .value(vec![9, 17])
    );
```

## ABACEvaluator

```rust
use kailash_enterprise::abac::{ABACEvaluator, EvaluationStrategy};

let mut evaluator = ABACEvaluator::new()
    .strategy(EvaluationStrategy::DenyOverride)  // Any deny = denied
    .add_policy(business_hours_policy)
    .add_policy(ownership_policy);

let request = ABACRequest {
    subject: HashMap::from([
        ("user_id".to_string(), Value::String("user-123".into())),
        ("roles".to_string(), Value::Array(vec!["editor".into()])),
        ("employment_status".to_string(), Value::String("active".into())),
        ("verified".to_string(), Value::Bool(true)),
    ]),
    resource: HashMap::from([
        ("owner_id".to_string(), Value::String("user-123".into())),
        ("type".to_string(), Value::String("document".into())),
    ]),
    action: "write".to_string(),
    environment: HashMap::from([
        ("hour".to_string(), Value::Integer(10)),
        ("ip_address".to_string(), Value::String("192.168.1.1".into())),
    ]),
};

let decision = evaluator.evaluate(&request);
match decision {
    ABACDecision::Allow => println!("Access granted"),
    ABACDecision::Deny(reason) => println!("Access denied: {}", reason),
    ABACDecision::NotApplicable => println!("No policy matched"),
}
```

## EvaluationStrategy

```rust
pub enum EvaluationStrategy {
    /// First matching policy wins (Allow or Deny)
    FirstApplicable,

    /// Any Deny decision overrides all Allow decisions
    DenyOverride,

    /// All applicable policies must Allow (any Deny or NotApplicable = Deny)
    AllMustAllow,
}
```

## Combined RBAC + ABAC

Use ABAC on top of RBAC for fine-grained control:

```rust
use kailash_enterprise::combined::{CombinedAuthEvaluator, CombinedDecision};

let combined = CombinedAuthEvaluator::new()
    .rbac_policy(rbac_policy)     // RBAC handles role-level access
    .abac_evaluator(abac_evaluator);  // ABAC handles attribute-level rules

// Both RBAC and ABAC must allow
let decision = combined.evaluate(
    &["editor".to_string()],  // User's roles (for RBAC)
    "documents:write",         // Permission to check (RBAC)
    &abac_request,             // Full attributes (ABAC)
);

match decision {
    CombinedDecision::Allow => { /* proceed */ }
    CombinedDecision::DeniedByRbac => { /* wrong role */ }
    CombinedDecision::DeniedByAbac(reason) => { /* attribute condition failed */ }
}
```

## Ownership Policy (Common Pattern)

```rust
// Allow users to edit their own resources only
let ownership_policy = ABACPolicy::new("ownership")
    .allow_if(ABACRule::new()
        .attribute("subject.user_id")
        .operator(Operator::Eq)
        .attribute_value("resource.owner_id")  // Compare to another attribute
    );

// Allow if: user IS the owner AND resource is not archived
let safe_edit_policy = ABACPolicy::new("safe_edit")
    .allow_if(ABACRule::new()
        .attribute("subject.user_id")
        .operator(Operator::Eq)
        .attribute_value("resource.owner_id")
    )
    .allow_if(ABACRule::new()
        .attribute("resource.archived")
        .operator(Operator::Eq)
        .value(false)
    );
```

## Testing ABAC Policies

```rust
#[cfg(test)]
mod tests {
    use super::*;

    fn make_request(subject_role: &str, resource_owner: &str, subject_id: &str, hour: i64)
        -> ABACRequest
    {
        ABACRequest {
            subject: HashMap::from([
                ("role".to_string(), Value::String(subject_role.into())),
                ("user_id".to_string(), Value::String(subject_id.into())),
            ]),
            resource: HashMap::from([
                ("owner_id".to_string(), Value::String(resource_owner.into())),
            ]),
            action: "write".to_string(),
            environment: HashMap::from([
                ("hour".to_string(), Value::Integer(hour)),
            ]),
        }
    }

    #[test]
    fn owner_can_edit_their_own_resource() {
        let evaluator = test_evaluator();
        let request = make_request("user", "alice", "alice", 10);
        assert_eq!(evaluator.evaluate(&request), ABACDecision::Allow);
    }

    #[test]
    fn user_cannot_edit_others_resource() {
        let evaluator = test_evaluator();
        let request = make_request("user", "alice", "bob", 10);
        assert!(matches!(evaluator.evaluate(&request), ABACDecision::Deny(_)));
    }

    #[test]
    fn access_denied_outside_business_hours() {
        let evaluator = test_evaluator();
        let request = make_request("user", "alice", "alice", 23);  // 11pm
        assert!(matches!(evaluator.evaluate(&request), ABACDecision::Deny(_)));
    }
}
```

## Verify

```bash
PATH="$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH" SDKROOT=$(xcrun --show-sdk-path) cargo test -p kailash-enterprise -- abac --nocapture 2>&1
```
