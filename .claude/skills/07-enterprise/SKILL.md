# Enterprise Skills

Skills for Kailash Enterprise features: RBAC, ABAC, audit logging, tenant management, compliance, policy, tokens, and SSO.

## Files

| File                       | Topic                      |
| -------------------------- | -------------------------- |
| `enterprise-compliance.md` | ComplianceManager patterns |
| `enterprise-policy.md`     | PolicyEngine patterns      |
| `enterprise-tokens.md`     | TokenManager patterns      |
| `enterprise-sso.md`        | SSOProvider patterns       |

## Quick Reference

```python
from kailash.enterprise import ComplianceManager, PolicyEngine, TokenManager, SSOProvider
```

## When to Use

Use these skills when working with:

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
