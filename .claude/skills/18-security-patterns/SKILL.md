---
name: security-patterns
description: "Kailash Rust security — input validation, secrets, injection prevention. Hardcoded secrets BLOCKED."
---

# Security Patterns - Kailash SDK

Mandatory security patterns for all Kailash SDK development. These patterns prevent common vulnerabilities and ensure secure application development.

## Rust-Specific Sub-Files

| File                                                                 | Topic                                                                                                                                | Origin                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| [`constant-time-comparison-rs.md`](./constant-time-comparison-rs.md) | Bitwise-OR credential loops, shared `kailash-auth` helper, anti-`.any()` pattern                                                     | journal `0021-RISK-r3-timing-leak-mcp-auth.md`                           |
| [`fail-closed-defaults-rs.md`](./fail-closed-defaults-rs.md)         | Restrictive `Default` impls, registry reject-duplicates, 0o600 file permissions, allowlist path loading, unsafe Send/Sync invariants | journal `0018-RISK-six-high-security-findings.md` (R1 six HIGH findings) |
| [`network-security-rs.md`](./network-security-rs.md)                 | DNS rebinding guard on HTTP MCP, stdio argv/env allowlist, log content fingerprinting                                                | R3 commits `173d054b`, `0d4ebd12`                                        |
| [`security-auth-middleware-rs.md`](./security-auth-middleware-rs.md) | Axum auth middleware composition, tower layers                                                                                       | prior                                                                    |

## Overview

Security patterns cover:

- Secret management (no hardcoded credentials)
- Input validation (prevent injection attacks)
- Authentication and authorization (constant-time comparison, fail-closed defaults)
- Network hardening (DNS rebinding, stdio allowlist, log sanitization)
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

## Red Team Security Patterns (v3.12.2, PRs #324-#335)

### Classification Fail-Closed Default (H1)

Thread-local caller clearance MUST default to most restrictive level, not least restrictive.

```rust
// DO — fail-closed: unconfigured callers see only Public data
thread_local! {
    static CALLER_CLEARANCE: RefCell<ClassificationLevel> = RefCell::new(ClassificationLevel::Public);
}

// DO NOT — fail-open: unconfigured callers bypass all redaction
static CALLER_CLEARANCE: RefCell<ClassificationLevel> = RefCell::new(ClassificationLevel::HighlyConfidential);
```

**Why:** Defaulting to the highest clearance makes the entire redaction system a no-op for any caller that forgets to set clearance. Fail-closed means unset callers get the safest behavior.

### Authority Registry Duplicate Protection (H2)

`Registry::register` MUST reject duplicate keys. Intentional rotation uses explicit `replace(force_replace=true)`.

```rust
// DO — reject duplicate, require explicit force for rotation
if registry.contains_key(&org_id) {
    return Err(AuthorityError::DuplicateOrgId { org_id });
}

// DO NOT — silently overwrite existing authority
registry.insert(org_id, new_authority); // attacker replaces legitimate authority
```

### File Permissions for Security-Sensitive Stores (H3/H4)

Audit stores, evidence sinks, and files containing PII/signatures MUST chmod 0o600 on creation.

```rust
// DO — restrictive permissions on security-sensitive files
#[cfg(unix)]
{
    use std::os::unix::fs::PermissionsExt;
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600))?;
}

// DO NOT — rely on umask (world-readable audit logs)
std::fs::write(&path, data)?; // inherits process umask, often 0o644
```

### Model Path Validation (H5 -- kailash-align-serving)

`allowed_model_roots: Vec<PathBuf>` pattern -- default-deny if empty.

```rust
// DO — canonicalize + symlink rejection + device-file rejection + root containment
fn validate_path(path: &Path, allowed_roots: &[PathBuf]) -> Result<PathBuf> {
    if allowed_roots.is_empty() { return Err(ModelPathError::NoRootsConfigured); }
    let canonical = path.canonicalize()?;
    if canonical.is_symlink() { return Err(ModelPathError::SymlinkRejected); }
    if !allowed_roots.iter().any(|r| canonical.starts_with(r)) {
        return Err(ModelPathError::OutsideAllowedRoots);
    }
    Ok(canonical)
}

// DO NOT — trust caller-supplied paths
let model = load_model(user_supplied_path)?; // path traversal, symlink escape
```

### Unsafe Send+Sync with Inference Latch (H6)

When wrapping non-thread-safe C libraries, use an internal `Mutex<()>` to serialize all FFI calls.

```rust
// DO — inference latch serializes all FFI access
struct Backend {
    ctx: *mut ffi::Context,        // non-thread-safe C pointer
    inference_latch: Mutex<()>,    // serializes all FFI calls
}
impl Backend {
    fn generate(&self, prompt: &str) -> Result<String> {
        let _guard = self.inference_latch.lock().unwrap();
        unsafe { ffi::generate(self.ctx, prompt) } // serialized
    }
}

// DO NOT — rely on external RwLock read guard (&self still allows parallel reads)
unsafe impl Send for Backend {}
unsafe impl Sync for Backend {} // SAFETY comment says "RwLock protects" but &self methods run in parallel
```

**Why:** `&self` methods under an external `RwLock<Backend>` still allow multiple concurrent readers. The internal `Mutex<()>` is the only guarantee that FFI calls are truly serialized.

## Integration with Rules

Security patterns are enforced by:

- `.claude/rules/security.md` - Security rules
- `.claude/hooks/validate-bash-command.js` - Command validation
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
