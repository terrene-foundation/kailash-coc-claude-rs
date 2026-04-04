---
name: enterprise
description: "Kailash Enterprise patterns for RBAC, ABAC, audit trails, multi-tenancy, SSO, compliance, and policy management. Use when asking about 'RBAC', 'ABAC', 'audit', 'multi-tenancy', 'SSO', 'enterprise security', 'access control', 'tenant isolation', or 'compliance reports'."
---

# Kailash Enterprise -- Quick Reference

Enterprise-grade access control, audit, multi-tenancy, and compliance for the Kailash SDK. Crate: `kailash-enterprise`.

## Key Modules

| Module         | Purpose                        | Key Types                                                         | Skill File                 |
| -------------- | ------------------------------ | ----------------------------------------------------------------- | -------------------------- |
| **RBAC**       | Role-based access control      | `Role`, `Permission`, `RbacEngine`, hierarchical roles, wildcards | `enterprise-rbac.md`       |
| **ABAC**       | Attribute-based access control | `Policy`, `Evaluator`, 16 operators, combined evaluation          | `enterprise-abac.md`       |
| **Audit**      | Audit trail logging            | `AuditLog`, `AuditEntry`, tamper-evident, queryable               | `enterprise-audit.md`      |
| **Tenancy**    | Multi-tenant isolation         | `TenantContext`, propagation, data isolation                      | `enterprise-tenancy.md`    |
| **SSO**        | Single sign-on                 | SAML, OIDC integration patterns                                   | `enterprise-sso.md`        |
| **Compliance** | Compliance reporting           | EATP/CARE report generators, human competency tracking            | `enterprise-compliance.md` |
| **Policy**     | Policy management              | Policy engine, rule evaluation                                    | `enterprise-policy.md`     |
| **Tokens**     | Token management               | JWT, session tokens, refresh flows                                | `enterprise-tokens.md`     |

## Quick Patterns

### RBAC Check

```rust
let engine = RbacEngine::new();
engine.add_role("admin", &["read", "write", "delete"]);
engine.add_role("viewer", &["read"]);
engine.check("admin", "write")?; // Ok(true)
```

### ABAC Evaluation

```rust
let evaluator = AbacEvaluator::new();
evaluator.add_policy(policy);
let decision = evaluator.evaluate(&subject, &resource, &action, &environment)?;
```

### Audit Logging

```rust
let audit = AuditLog::new();
audit.record(AuditEntry::new("user:123", "document:456", "read"));
```

### Multi-Tenancy

```rust
let ctx = TenantContext::new("tenant-1");
// All operations within scope are tenant-isolated
```

## When to Use This Skill

- Setting up role-based or attribute-based access control
- Implementing audit trails for compliance
- Adding multi-tenant data isolation
- Configuring SSO (SAML/OIDC)
- Generating compliance reports

## Related

- **enterprise-specialist** agent -- Framework-level architecture decisions
- `skills/10-governance/` -- EATP/CARE governance patterns (trust enforcement)
- `skills/29-pact/` -- PACT organizational governance (D/T/R addressing)
- `enterprise-infra-bindings.md` -- Cross-language binding patterns for enterprise types
