---
name: enterprise-sso
description: "SSO provider: OIDC and SAML 2.0 authentication flows. Use when asking 'SSO', 'OIDC', 'SAML', 'login URL', 'SSO callback', 'SSO session', 'single sign-on', 'SSOProvider'."
---

# Enterprise SSO

`SSOProvider` provides a protocol-agnostic API for SSO authentication supporting OIDC and SAML 2.0. Handles login URL generation, callback processing, session validation, and logout.

## Rust API

Source: `crates/kailash-enterprise/src/sso/provider.rs`

### Creating an SSO Provider

```rust
use kailash_enterprise::sso::types::{SSOConfig, SSOProtocol, AttributeMapping};
use kailash_enterprise::sso::provider::SSOProvider;

let config = SSOConfig {
    protocol: SSOProtocol::OIDC,
    provider_name: "okta".to_string(),
    client_id: "my-client-id".to_string(),
    client_secret: Some("my-secret".to_string()),
    metadata_url: Some("https://idp.example.com/.well-known/openid-configuration".to_string()),
    redirect_uri: "https://app.example.com/callback".to_string(),
    attribute_mapping: AttributeMapping::new("sub", "email"),
    issuer: Some("https://idp.example.com".to_string()),
    scopes: vec!["openid".to_string()],
};

let provider = SSOProvider::new(config)?;
```

Feature flags required:

- `sso-oidc` for OIDC protocol support
- `sso-saml` for SAML 2.0 protocol support

### Authentication Flow

```rust
// 1. Generate login URL (redirect user to IdP)
let login_url = provider.login_url()?;

// 2. Handle callback from IdP (returns an SSOSession)
let session = provider.handle_callback(callback_json_string)?;

// 3. Validate session
let is_valid = provider.validate_session(&session);

// 4. Logout URL (if IdP supports it)
let logout = provider.logout_url(&session); // Option<String>

// 5. Refresh session (OIDC only, requires refresh token)
let refreshed = provider.refresh_session(&session)?;
```

### Key Types

- `handle_callback` takes a **JSON string** (not a dict):
  - OIDC: `{"code": "...", "state": "..."}` or pre-fetched token response
  - SAML: JSON-serialized SAML assertion
- `logout_url` takes an **`&SSOSession`** (not a URL string)
- `validate_session` takes an **`&SSOSession`** and returns `bool`

## Python API

Source: `bindings/kailash-python/src/enterprise.rs` (`PySSOProvider`)

### Creating an SSO Provider

```python
from kailash import SSOProvider

provider = SSOProvider({
    "protocol": "oidc",            # or "saml2"
    "provider_name": "okta",
    "client_id": "my-client-id",
    "client_secret": "my-secret",  # optional for SAML
    "redirect_uri": "https://app.example.com/callback",
    "metadata_url": "https://idp.example.com/.well-known/openid-configuration",
    "issuer": "https://idp.example.com",
    "attribute_mapping": {
        "user_id": "sub",
        "email": "email",
        "name": "name",            # optional
    },
    "scopes": ["openid", "profile", "email"],  # optional, defaults provided
})
```

Config dict required keys: `protocol`, `provider_name`, `client_id`, `redirect_uri`, `attribute_mapping` (with `user_id` and `email` sub-keys).

### Authentication Flow

```python
# 1. Generate login URL
url = provider.login_url()
# Redirect user to this URL

# 2. Process callback (takes a JSON string)
import json
callback_data = json.dumps({"code": auth_code, "state": state_param})
session = provider.handle_callback(callback_data)
# Returns a dict:
# {
#     "user": {"user_id": "...", "email": "...", "name": "...", "roles": [...], ...},
#     "token": "...",
#     "expires_at": "...",
#     "idp_session_id": "...",
#     "refresh_token": "...",
# }

# 3. Validate session (takes a session dict)
is_valid = provider.validate_session(session)

# 4. Logout URL (takes a session dict, returns str or None)
logout = provider.logout_url(session)

# 5. Refresh session (OIDC only, takes a session dict)
refreshed = provider.refresh_session(session)
```

### Provider Info

```python
print(provider.protocol())       # "oidc" or "saml2"
print(provider.provider_name())  # "okta"
```

### Testing with OIDC Discovery

For testing, set the OIDC discovery document directly:

```python
provider.set_oidc_discovery({
    "authorization_endpoint": "https://idp.example.com/authorize",
    "token_endpoint": "https://idp.example.com/token",
    "userinfo_endpoint": "https://idp.example.com/userinfo",
    "end_session_endpoint": "https://idp.example.com/logout",
    "jwks_uri": "https://idp.example.com/.well-known/jwks.json",
})
```

## Common Mistakes

1. **`handle_callback` takes a JSON string**, not a Python dict. Serialize with `json.dumps()` first.
2. **`logout_url` and `validate_session` take session dicts** (as returned by `handle_callback`), not URL strings.
3. **Feature flags are required** in Rust -- `sso-oidc` and/or `sso-saml` must be enabled. Without them, `SSOProvider::new()` returns an error.
4. **`attribute_mapping` is required** in the config dict, with at least `user_id` and `email` keys.

## Source Files

- `crates/kailash-enterprise/src/sso/provider.rs` -- `SSOProvider`
- `crates/kailash-enterprise/src/sso/types.rs` -- `SSOConfig`, `SSOProtocol`, `SSOSession`, `SSOUser`, `AttributeMapping`
- `crates/kailash-enterprise/src/sso/oidc.rs` -- OIDC-specific handler
- `crates/kailash-enterprise/src/sso/saml.rs` -- SAML-specific handler
- `crates/kailash-enterprise/src/sso/mapping.rs` -- `AttributeMapper`
- `bindings/kailash-python/src/enterprise.rs` -- `PySSOProvider`

<!-- Trigger Keywords: SSO, OIDC, SAML, login URL, SSO callback, SSO session, single sign-on, SSOProvider, SSOConfig, attribute mapping, handle_callback, logout_url, validate_session -->
