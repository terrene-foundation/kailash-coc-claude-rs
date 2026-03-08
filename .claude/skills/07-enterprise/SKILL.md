# Enterprise Skills

Skills for Kailash Enterprise features: RBAC, ABAC, audit logging, tenant management, compliance, policy, tokens, and SSO.

## Files

| File                       | Topic                                    |
| -------------------------- | ---------------------------------------- |
| `enterprise-rbac.md`       | RBAC: roles, permissions, evaluator      |
| `enterprise-abac.md`       | ABAC: policies, 16 operators, evaluator  |
| `enterprise-audit.md`      | Audit logging, filtering, querying       |
| `enterprise-tenancy.md`    | Multi-tenancy: context, registry, bypass |
| `setup-abac.md`            | Step-by-step ABAC setup guide            |
| `enterprise-compliance.md` | ComplianceManager patterns               |
| `enterprise-policy.md`     | PolicyEngine patterns                    |
| `enterprise-tokens.md`     | TokenManager patterns                    |
| `enterprise-sso.md`        | SSOProvider patterns                     |

## Quick Reference

```python
from kailash.enterprise import (
    # RBAC
    RbacEvaluator, Role, Permission, User,
    # ABAC
    AbacPolicy, AbacEvaluator,
    # Audit
    AuditLogger, AuditFilter,
    # Tenancy
    TenantStatus, TenantInfo, EnterpriseTenantContext, TenantRegistry,
    # Combined
    CombinedEvaluator, AccessDecision,
    # Context
    EnterpriseContext, SecurityClassification,
    # Compliance, Policy, Tokens, SSO
    ComplianceManager, PolicyEngine, TokenManager, SSOProvider,
)
```

## When to Use

Use these skills when working with:

- Role-based access control (RBAC) with hierarchical roles
- Attribute-based access control (ABAC) with 16 operators
- Combined RBAC+ABAC evaluation
- Structured audit logging and querying
- Multi-tenant data isolation and context propagation
- Regulatory compliance checks (GDPR, SOC2, HIPAA, PCI-DSS)
- Fine-grained policy evaluation and versioning
- Token lifecycle management (JWT, opaque, API key)
- Single Sign-On integration (OIDC, SAML)

## Related Skills

- **[06-python-bindings](../06-python-bindings/SKILL.md)** - Enterprise RBAC/ABAC/Audit types
- **[03-nexus](../03-nexus/SKILL.md)** - NexusAuthPlugin for auth in platform apps
- **[18-security-patterns](../18-security-patterns/SKILL.md)** - Security best practices

## Specialist

For complex queries beyond these skills, use the **security-reviewer** or **framework-advisor** agents.
