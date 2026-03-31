# Setup ABAC Skill

Configure Attribute-Based Access Control (ABAC) policies using kailash-enterprise.

## Usage

`/setup-abac` -- Generate ABAC policy configuration with attribute definitions, rules, evaluation strategy, and optional RBAC+ABAC combination

## Steps

1. Read existing ABAC patterns from:
   - `crates/kailash-enterprise/src/abac/mod.rs` -- ABACPolicy, ABACRule, ABACAttribute, ABACEngine
   - `crates/kailash-enterprise/src/abac/operators.rs` -- Comparison operators (Equals, Contains, GreaterThan, etc.)
   - `crates/kailash-enterprise/src/abac/evaluation.rs` -- EvaluationStrategy (AllOf, AnyOf, Priority)
   - `crates/kailash-enterprise/src/rbac/mod.rs` -- RBAC integration for combined RBAC+ABAC

2. Define the attribute schema for your domain (subject, resource, action, environment attributes).

3. Create ABAC rules with operators and conditions.

4. Configure the evaluation strategy (AllOf for strict, AnyOf for permissive, Priority for ordered).

5. Write tests covering:
   - Permit and deny decisions
   - Multiple rules with chosen evaluation strategy
   - Attribute type validation
   - Combined RBAC+ABAC evaluation

## Template

### Basic ABAC Policy

```rust
use kailash_enterprise::abac::{
    ABACEngine, ABACPolicy, ABACRule, ABACAttribute,
    AttributeType, Operator, Decision, EvaluationStrategy,
};
use std::collections::HashMap;

fn main() {
    // 1. Define attributes
    let subject_attrs = vec![
        ABACAttribute::new("department", AttributeType::String),
        ABACAttribute::new("clearance_level", AttributeType::Integer),
        ABACAttribute::new("is_manager", AttributeType::Boolean),
    ];

    let resource_attrs = vec![
        ABACAttribute::new("classification", AttributeType::String),
        ABACAttribute::new("min_clearance", AttributeType::Integer),
        ABACAttribute::new("owner_department", AttributeType::String),
    ];

    // 2. Create rules
    let rules = vec![
        // Rule 1: Users can access resources in their own department
        ABACRule::new("same-department-access")
            .description("Allow access to resources within the same department")
            .condition("subject.department", Operator::Equals, "resource.owner_department")
            .decision(Decision::Permit),

        // Rule 2: Clearance level must meet minimum requirement
        ABACRule::new("clearance-check")
            .description("Deny if clearance level is below resource minimum")
            .condition("subject.clearance_level", Operator::LessThan, "resource.min_clearance")
            .decision(Decision::Deny),

        // Rule 3: Managers can access any resource in their department
        ABACRule::new("manager-override")
            .description("Managers get full access within their department")
            .condition("subject.is_manager", Operator::Equals, "true")
            .condition("subject.department", Operator::Equals, "resource.owner_department")
            .decision(Decision::Permit),
    ];

    // 3. Build policy with evaluation strategy
    let policy = ABACPolicy::new("document-access")
        .description("Controls access to classified documents")
        .subject_attributes(subject_attrs)
        .resource_attributes(resource_attrs)
        .rules(rules)
        .strategy(EvaluationStrategy::Priority); // First matching rule wins

    // 4. Create engine and register policy
    let mut engine = ABACEngine::new();
    engine.register_policy(policy);

    // 5. Evaluate access request
    let mut subject = HashMap::new();
    subject.insert("department".to_string(), "engineering".into());
    subject.insert("clearance_level".to_string(), 3_i64.into());
    subject.insert("is_manager".to_string(), false.into());

    let mut resource = HashMap::new();
    resource.insert("classification".to_string(), "internal".into());
    resource.insert("min_clearance".to_string(), 2_i64.into());
    resource.insert("owner_department".to_string(), "engineering".into());

    let decision = engine.evaluate("document-access", &subject, &resource, "read")
        .expect("evaluation should succeed");

    println!("Access decision: {:?}", decision); // Permit
}
```

### Combined RBAC + ABAC

```rust
use kailash_enterprise::abac::{
    ABACEngine, ABACPolicy, ABACRule, ABACAttribute,
    AttributeType, Operator, Decision, EvaluationStrategy,
};
use kailash_enterprise::rbac::{RBACEngine, Role, Permission};
use std::collections::HashMap;

fn main() {
    // 1. Set up RBAC (role-based layer)
    let mut rbac = RBACEngine::new();
    rbac.add_role(Role::new("editor")
        .add_permission(Permission::new("documents", "read"))
        .add_permission(Permission::new("documents", "write"))
    );
    rbac.add_role(Role::new("viewer")
        .add_permission(Permission::new("documents", "read"))
    );

    // 2. Set up ABAC (attribute-based layer)
    let mut abac = ABACEngine::new();

    let policy = ABACPolicy::new("document-write-policy")
        .description("Additional ABAC checks for write operations")
        .rules(vec![
            ABACRule::new("business-hours-only")
                .description("Writes only allowed during business hours")
                .condition("environment.hour", Operator::GreaterThanOrEqual, "9")
                .condition("environment.hour", Operator::LessThan, "17")
                .decision(Decision::Permit),

            ABACRule::new("deny-outside-hours")
                .description("Deny writes outside business hours")
                .decision(Decision::Deny),
        ])
        .strategy(EvaluationStrategy::Priority);

    abac.register_policy(policy);

    // 3. Combined evaluation: RBAC first, then ABAC
    let user_role = "editor";
    let action = "write";
    let resource_type = "documents";

    // Step 1: Check RBAC permission
    let rbac_allowed = rbac.check_permission(user_role, resource_type, action);
    println!("RBAC check: {}", if rbac_allowed { "PERMIT" } else { "DENY" });

    if rbac_allowed {
        // Step 2: Check ABAC policy for additional constraints
        let subject = HashMap::new();
        let resource = HashMap::new();
        let mut environment = HashMap::new();
        environment.insert("hour".to_string(), 14_i64.into()); // 2 PM

        let abac_decision = abac.evaluate_with_environment(
            "document-write-policy", &subject, &resource, action, &environment
        ).expect("evaluation should succeed");

        println!("ABAC check: {:?}", abac_decision);
        println!("Final decision: {:?}", abac_decision);
    }
}
```

### Test Template

```rust
#[cfg(test)]
mod tests {
    use kailash_enterprise::abac::{
        ABACEngine, ABACPolicy, ABACRule, ABACAttribute,
        AttributeType, Operator, Decision, EvaluationStrategy,
    };
    use std::collections::HashMap;

    fn test_engine() -> ABACEngine {
        let mut engine = ABACEngine::new();
        let policy = ABACPolicy::new("test-policy")
            .rules(vec![
                ABACRule::new("allow-engineering")
                    .condition("subject.department", Operator::Equals, "engineering")
                    .decision(Decision::Permit),
                ABACRule::new("default-deny")
                    .decision(Decision::Deny),
            ])
            .strategy(EvaluationStrategy::Priority);
        engine.register_policy(policy);
        engine
    }

    #[test]
    fn permits_matching_department() {
        let engine = test_engine();
        let mut subject = HashMap::new();
        subject.insert("department".to_string(), "engineering".into());
        let resource = HashMap::new();

        let decision = engine.evaluate("test-policy", &subject, &resource, "read").unwrap();
        assert_eq!(decision, Decision::Permit);
    }

    #[test]
    fn denies_non_matching_department() {
        let engine = test_engine();
        let mut subject = HashMap::new();
        subject.insert("department".to_string(), "marketing".into());
        let resource = HashMap::new();

        let decision = engine.evaluate("test-policy", &subject, &resource, "read").unwrap();
        assert_eq!(decision, Decision::Deny);
    }

    #[test]
    fn all_of_strategy_requires_all_rules() {
        let mut engine = ABACEngine::new();
        let policy = ABACPolicy::new("strict-policy")
            .rules(vec![
                ABACRule::new("check-dept")
                    .condition("subject.department", Operator::Equals, "engineering")
                    .decision(Decision::Permit),
                ABACRule::new("check-level")
                    .condition("subject.clearance_level", Operator::GreaterThanOrEqual, "3")
                    .decision(Decision::Permit),
            ])
            .strategy(EvaluationStrategy::AllOf);
        engine.register_policy(policy);

        let mut subject = HashMap::new();
        subject.insert("department".to_string(), "engineering".into());
        subject.insert("clearance_level".to_string(), 2_i64.into()); // Below threshold

        let decision = engine.evaluate("strict-policy", &subject, &HashMap::new(), "read").unwrap();
        assert_eq!(decision, Decision::Deny); // Fails clearance check
    }
}
```

## Verify

```bash
PATH="/Users/esperie/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:$PATH" SDKROOT=$(xcrun --show-sdk-path) cargo test -p kailash-enterprise -- abac && cargo clippy -p kailash-enterprise -- -D warnings
```
