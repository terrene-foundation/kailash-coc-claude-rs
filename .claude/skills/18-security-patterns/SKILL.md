---
name: security-patterns
description: "Security patterns and best practices for Kailash SDK including input validation, secret management, injection prevention, authentication, authorization, and OWASP compliance. Use when asking about 'security', 'secrets', 'authentication', 'authorization', 'injection prevention', 'input validation', 'OWASP', 'credentials', 'API keys', 'secure coding', or 'security review'."
---

# Security Patterns - Kailash SDK

Mandatory security patterns for all Kailash SDK development. These patterns prevent common vulnerabilities and ensure secure application development.

## Overview

Security patterns cover:

- Secret management (no hardcoded credentials)
- Input validation (prevent injection attacks)
- Authentication and authorization
- OWASP Top 10 prevention
- Secure API design
- Environment variable handling

## Critical Rules

### 1. NEVER Hardcode Secrets

```python
# ❌ WRONG - Hardcoded credentials
api_key = "sk-1234567890abcdef"
db_password = "mypassword123"

# ✅ CORRECT - Environment variables
import os
api_key = os.environ["API_KEY"]
db_password = os.environ["DATABASE_PASSWORD"]
```

### 2. Validate All User Inputs

```python
# ❌ WRONG - No validation
def process_user_input(user_data):
    return db.execute(f"SELECT * FROM users WHERE id = {user_data}")

# ✅ CORRECT - Parameterized queries (via DataFlow)
workflow.add_node("User_Read", "read_user", {
    "id": validated_user_id  # DataFlow handles parameterization
})
```

### 3. Use HTTPS for API Calls

```python
# ❌ WRONG - HTTP in production
workflow.add_node("APICallNode", "api", {
    "url": "http://api.example.com/data"  # Insecure!
})

# ✅ CORRECT - HTTPS always
workflow.add_node("APICallNode", "api", {
    "url": "https://api.example.com/data"
})
```

## Reference Documentation

### Core Security

- **[security-secrets](security-secrets.md)** - Secret management patterns
- **[security-input-validation](security-input-validation.md)** - Input validation
- **[security-injection-prevention](security-injection-prevention.md)** - SQL/code injection prevention

### Authentication & Authorization

- **[security-auth-patterns](security-auth-patterns.md)** - Auth best practices
- **[security-api-keys](security-api-keys.md)** - API key management
- **[security-tokens](security-tokens.md)** - Token handling

### OWASP Compliance

- **[security-owasp-top10](security-owasp-top10.md)** - OWASP Top 10 prevention
- **[security-audit-checklist](security-audit-checklist.md)** - Security audit checklist

## Security Checklist

### Before Every Commit

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL/code injection prevented
- [ ] HTTPS used for all API calls
- [ ] Sensitive data not logged
- [ ] Error messages don't expose internals

### Before Every Deployment

- [ ] Environment variables configured
- [ ] Secrets stored in secure vault
- [ ] Authentication enabled
- [ ] Authorization rules defined
- [ ] OWASP Top 10 checked
- [ ] Security review completed

## Common Vulnerabilities Prevented

| Vulnerability            | Prevention Pattern                              |
| ------------------------ | ----------------------------------------------- |
| SQL Injection            | Use DataFlow parameterized nodes                |
| Code Injection           | Avoid `eval()`, use PythonCodeNode safely       |
| Credential Exposure      | Environment variables, secret managers          |
| XSS                      | Output encoding, CSP headers                    |
| CSRF                     | Token validation, SameSite cookies              |
| Insecure Deserialization | Validate serialized data, `deny_unknown_fields` |
| SSRF                     | `url_safety::check_url()` on all provider URLs  |

## Convergence Security Patterns (v3.12.1)

### SSRF Validation (`kailash-kaizen/src/llm/url_safety.rs`)

Canonical URL validation for all outbound HTTP. Blocks private IPs (10.x, 172.16-31.x, 192.168.x), loopback (127.x, ::1), link-local (169.254.x), cloud metadata, and non-HTTP schemes. Used by both LLM client (`validate_base_url`) and MCP transport (`validate_url`). DNS rebinding is a known limitation — documented, not syntactically fixable.

### JWT Secret Zeroization (`kailash-auth/src/jwt/mod.rs`)

`JwtConfig` implements `Drop` with `zeroize()` on the secret `Vec<u8>`. Prevents key material lingering in freed memory. `Debug` impl redacts the secret field.

### Rate Limiter Packed Atomic (`kailash-auth/src/rate_limit/mod.rs`)

Window epoch (upper 32 bits) + counter (lower 32 bits) packed into a single `AtomicU64`. Window reset + counter reset is a single CAS operation — eliminates the race condition where two threads at a window boundary could both reset independently.

### Constraint `deny_unknown_fields`

All 8 EATP constraint dimension sub-structs have `#[serde(deny_unknown_fields)]`. A misspelled field (e.g., `max_transactin_cents`) now produces a deserialization error instead of silently defaulting to 0 (maximum restriction).

### Auth Config Debug Redaction

`ApiKeyConfig` and `JwtConfig` both implement manual `Debug` that redacts sensitive fields. `TenantContext` is non-Clone with `SecretString` zeroed on drop.

## Integration with Rules

Security patterns are enforced by:

- `.claude/rules/security.md` - Security rules
- `scripts/hooks/validate-bash-command.js` - Command validation
- `gold-standards-validator` agent - Compliance checking

## When to Use This Skill

Use this skill when:

- Handling user input or external data
- Storing or transmitting credentials
- Making API calls to external services
- Implementing authentication/authorization
- Conducting security reviews
- Preparing for deployment

## Related Skills

- **[17-gold-standards](../17-gold-standards/SKILL.md)** - Mandatory best practices
- **[16-validation-patterns](../16-validation-patterns/SKILL.md)** - Validation patterns
- **[01-core-sdk](../01-core-sdk/SKILL.md)** - Core workflow patterns

## Support

For security-related questions, invoke:

- `security-reviewer` - OWASP-based security analysis
- `gold-standards-validator` - Compliance checking
- `testing-specialist` - Security testing patterns
