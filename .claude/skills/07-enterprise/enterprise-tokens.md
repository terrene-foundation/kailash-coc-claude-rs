---
name: enterprise-tokens
description: "Token lifecycle management: JWT, opaque, API key. Use when asking 'create JWT', 'token manager', 'API key', 'opaque token', 'token validation', 'token revocation', 'token rotation'."
---

# Enterprise Token Management

Token lifecycle management via `TokenManager` -- supports JWT (HMAC-SHA256), opaque, and API key tokens with validation, refresh, revocation, and rotation policies.

## Rust API

Source: `crates/kailash-enterprise/src/token/manager.rs`

### Creating a TokenManager

```rust
use kailash_enterprise::token::{TokenManager, TokenConfig, TokenClaims};

let config = TokenConfig::new("my-secret-that-is-at-least-32-bytes-long!");
let mgr = TokenManager::new(config);
```

Config options (builder pattern):

```rust
use kailash_enterprise::token::{TokenConfig, RotationPolicy};

let config = TokenConfig::new("my-secret-that-is-at-least-32-bytes-long!")
    .with_issuer("my-app")
    .with_default_ttl_secs(3600)       // 1 hour default
    .with_refresh_ttl_secs(7200)       // 2 hour refresh
    .with_api_key_prefix("myapp_")     // default: "kailash_"
    .with_rotation_policy(RotationPolicy::OnRefresh);
```

### Creating Tokens

All `create_*` methods take `TokenClaims`:

```rust
use kailash_enterprise::token::TokenClaims;

let claims = TokenClaims::new("user-1")
    .with_scope("read")
    .with_scope("write")
    .with_issuer("my-app")
    .with_audience("api")
    .with_custom("org_id", serde_json::json!("org-1"));

// JWT (HMAC-SHA256 signed, contains dots)
let jwt_token = mgr.create_jwt(claims.clone())?;

// Opaque (32-byte random hex)
let opaque_token = mgr.create_opaque(claims.clone())?;

// API key (prefix + random hex)
let api_key = mgr.create_api_key(claims)?;
assert!(api_key.value.starts_with("kailash_"));
```

### Validating Tokens

```rust
use kailash_enterprise::token::TokenValidation;

match mgr.validate(&token.value) {
    TokenValidation::Valid(claims) => {
        println!("Subject: {}", claims.subject);
        println!("Scopes: {:?}", claims.scopes);
    },
    TokenValidation::Expired => println!("Token has expired"),
    TokenValidation::Revoked => println!("Token was revoked"),
    TokenValidation::Invalid(reason) => println!("Invalid: {reason}"),
}
```

### Refresh and Revocation

```rust
// Refresh (extends TTL or rotates based on policy)
let refreshed = mgr.refresh(&token.value)?;

// Revoke
mgr.revoke(&token.value)?;
assert!(mgr.is_revoked(&token.value));

// Revoked tokens cannot be refreshed
assert!(mgr.refresh(&token.value).is_err());

// List active (non-revoked, non-expired) tokens
let active = mgr.list_active();
```

### Rotation Policies

- `RotationPolicy::None` -- refresh extends TTL, keeps same token value
- `RotationPolicy::OnRefresh` -- refresh creates new token, revokes old one

```rust
let config = TokenConfig::new("secret-at-least-32-bytes-for-hmac-sha256!")
    .with_rotation_policy(RotationPolicy::OnRefresh);
let mgr = TokenManager::new(config);

let original = mgr.create_jwt(TokenClaims::new("user"))?;
let refreshed = mgr.refresh(&original.value)?;

// New value, old one revoked
assert_ne!(refreshed.value, original.value);
assert!(mgr.is_revoked(&original.value));
```

## Python API

Source: `bindings/kailash-python/src/enterprise.rs` (`PyTokenManager`)

### Creating a TokenManager

```python
from kailash import TokenManager

mgr = TokenManager({
    "secret": "my-secret-at-least-32-bytes-long-for-security",
    "default_ttl_secs": 3600,
    "refresh_ttl_secs": 7200,
    "api_key_prefix": "myapp_",
    "rotation_policy": "none",   # or "on_refresh"
    "issuer": "my-app",
})
```

The config dict requires `secret` (str). All other keys are optional.

### Creating Tokens

`create_jwt`, `create_opaque`, and `create_api_key` all take a **claims dict**:

```python
# Claims dict -- "subject" is required, all others optional
claims = {
    "subject": "user-1",
    "scopes": ["read", "write"],
    "issuer": "my-app",
    "audience": "api",
    "custom": {"org_id": "org-1"},
}

token = mgr.create_jwt(claims)
# Returns a dict:
# {
#     "value": "eyJ...",
#     "token_type": "jwt",
#     "claims": {"subject": "user-1", "scopes": ["read", "write"], ...},
#     "created_at": "2026-03-08T...",
#     "expires_at": "2026-03-08T...",
# }

opaque = mgr.create_opaque({"subject": "svc-1"})
api_key = mgr.create_api_key({"subject": "app-1", "scopes": ["api"]})
```

### Validating Tokens

```python
result = mgr.validate(token["value"])
# Returns a dict:
# {"status": "valid", "claims": {"subject": "user-1", ...}}
# {"status": "expired"}
# {"status": "revoked"}
# {"status": "invalid", "reason": "..."}

assert result["status"] == "valid"
assert result["claims"]["subject"] == "user-1"
```

### Refresh and Revocation

```python
refreshed = mgr.refresh(token["value"])
mgr.revoke(token["value"])
assert mgr.is_revoked(token["value"])

active = mgr.list_active()  # list of token dicts
```

## Common Patterns

### Service-to-Service Authentication

```python
mgr = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Issue a service token
svc_token = mgr.create_opaque({
    "subject": "payment-service",
    "scopes": ["process_payments", "read_orders"],
})

# Validate incoming request
result = mgr.validate(request_token)
if result["status"] != "valid":
    raise AuthError("Invalid token")
if "process_payments" not in result["claims"]["scopes"]:
    raise AuthError("Insufficient scope")
```

### API Key Management

```python
mgr = TokenManager({
    "secret": os.environ["TOKEN_SECRET"],
    "api_key_prefix": "sk_live_",
})

key = mgr.create_api_key({
    "subject": "customer-123",
    "scopes": ["api"],
    "custom": {"plan": "pro"},
})

# key["value"] starts with "sk_live_"
```

## Security Notes

- JWT signing uses HMAC-SHA256; secrets should be at least 32 bytes
- Opaque token and API key validation uses constant-time comparison (prevents timing attacks)
- The signing secret is never exposed in Debug output (shows `[REDACTED]`)
- TokenManager is `Send + Sync` -- safe for concurrent use

## Source Files

- `crates/kailash-enterprise/src/token/manager.rs` -- `TokenManager`
- `crates/kailash-enterprise/src/token/mod.rs` -- `TokenConfig`, `TokenClaims`, `Token`, `TokenValidation`, `RotationPolicy`
- `crates/kailash-enterprise/src/token/store.rs` -- `TokenStore` trait, `InMemoryTokenStore`
- `bindings/kailash-python/src/enterprise.rs` -- `PyTokenManager`

<!-- Trigger Keywords: JWT, token manager, create JWT, API key, opaque token, token validation, token revocation, token refresh, rotation policy, TokenManager, TokenClaims -->
