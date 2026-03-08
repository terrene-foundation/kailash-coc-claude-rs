---
skill: enterprise-sso
description: "SSOProvider for Single Sign-On integration with OIDC and SAML protocols. Use when asking about 'SSO', 'single sign-on', 'OIDC', 'OpenID Connect', 'SAML', 'login URL', 'SSO callback', or 'identity provider'."
priority: MEDIUM
tags: [enterprise, sso, oidc, saml, authentication, identity-provider]
---

# Enterprise SSO Provider

Single Sign-On integration with OIDC and SAML protocols.

## Quick Reference

- **SSOProvider**: Core class for SSO protocol integration
- **Protocols**: OIDC (OpenID Connect), SAML
- **Operations**: Login URL generation, callback handling, session management
- **Providers**: Okta, Auth0, Azure AD, Google, or any OIDC/SAML-compliant IdP

## Import

```python
from kailash.enterprise import SSOProvider
```

## Basic Usage

```python
from kailash.enterprise import SSOProvider

# Create an SSO provider with a config dict
sso = SSOProvider({
    "protocol": "oidc",
    "provider_name": "okta",
    "client_id": os.environ["SSO_CLIENT_ID"],
    "client_secret": os.environ["SSO_CLIENT_SECRET"],
    "redirect_uri": "https://app.example.com/callback",
    "metadata_url": "https://dev-123456.okta.com/.well-known/openid-configuration",
    "issuer": "https://dev-123456.okta.com",
    "scopes": ["openid", "profile", "email"],
})

# Generate a login URL (no args -- uses redirect_uri from config)
login_url = sso.login_url()
# Redirect the user to this URL to initiate SSO login
```

## Provider Configuration

### OIDC Provider

```python
import os
from kailash.enterprise import SSOProvider

# Okta OIDC -- config dict with protocol, provider_name, client_id, etc.
sso = SSOProvider({
    "protocol": "oidc",
    "provider_name": "okta",
    "client_id": os.environ["SSO_CLIENT_ID"],
    "client_secret": os.environ["SSO_CLIENT_SECRET"],
    "redirect_uri": "https://app.example.com/auth/callback",
    "metadata_url": "https://dev-123456.okta.com/.well-known/openid-configuration",
    "issuer": "https://dev-123456.okta.com",
    "scopes": ["openid", "profile", "email"],
})

# Configure OIDC discovery for auto-configuration of endpoints
sso.set_oidc_discovery({
    "authorization_endpoint": "https://dev-123456.okta.com/authorize",
    "token_endpoint": "https://dev-123456.okta.com/token",
    "userinfo_endpoint": "https://dev-123456.okta.com/userinfo",
    "jwks_uri": "https://dev-123456.okta.com/keys",
})

login_url = sso.login_url()  # no args -- uses redirect_uri from config
```

### SAML Provider

```python
import os
from kailash.enterprise import SSOProvider

sso = SSOProvider({
    "protocol": "saml2",
    "provider_name": "okta-saml",
    "client_id": "sp-entity-id",
    "redirect_uri": "https://app.example.com/saml/acs",
    "metadata_url": "https://dev-123456.okta.com/saml/sso",
    "issuer": "https://dev-123456.okta.com/saml",
})
login_url = sso.login_url()
```

## Login Flow

### Generate Login URL

```python
import os
from kailash.enterprise import SSOProvider

sso = SSOProvider({
    "protocol": "oidc",
    "provider_name": "okta",
    "client_id": os.environ["SSO_CLIENT_ID"],
    "client_secret": os.environ["SSO_CLIENT_SECRET"],
    "redirect_uri": "https://app.example.com/callback",
    "metadata_url": "https://dev-123456.okta.com/.well-known/openid-configuration",
    "issuer": "https://dev-123456.okta.com",
    "scopes": ["openid", "profile", "email"],
})

# Set up OIDC discovery endpoints
sso.set_oidc_discovery({
    "authorization_endpoint": "https://dev-123456.okta.com/authorize",
    "token_endpoint": "https://dev-123456.okta.com/token",
    "userinfo_endpoint": "https://dev-123456.okta.com/userinfo",
    "jwks_uri": "https://dev-123456.okta.com/keys",
})

# Generate login URL (uses redirect_uri from config)
login_url = sso.login_url()
# Redirect user's browser to login_url
```

### Handle Callback

```python
# After the IdP redirects back to your callback URL
# Handle the callback to extract user information
user_info = sso.handle_callback(callback_data)
# user_info contains: user_id, email, name, groups, etc.
```

## Logout

### Generate Logout URL

```python
# Generate logout URL
logout_url = sso.logout_url("https://app.example.com")
# Redirect user's browser to logout_url
```

## Session Management

### Validate Session

```python
# Validate an existing SSO session -- returns True/False
valid = sso.validate_session(session_dict)
# session_dict must contain: user, token, expires_at, idp_session_id, refresh_token
```

### Refresh Session

```python
# Refresh an SSO session
new_session = sso.refresh_session(session_token)
```

## OIDC Discovery

Configure OIDC discovery for auto-configuration of authorization, token, userinfo, and JWKS endpoints:

```python
# set_oidc_discovery takes a dict of endpoint URLs
sso.set_oidc_discovery({
    "authorization_endpoint": "https://dev-123456.okta.com/authorize",
    "token_endpoint": "https://dev-123456.okta.com/token",
    "userinfo_endpoint": "https://dev-123456.okta.com/userinfo",
    "jwks_uri": "https://dev-123456.okta.com/keys",
})
```

## Production Pattern

```python
import os
from kailash.enterprise import SSOProvider, TokenManager
from kailash.nexus import NexusApp

# Configure SSO with a config dict
sso = SSOProvider({
    "protocol": os.environ.get("SSO_PROTOCOL", "oidc"),
    "provider_name": os.environ["SSO_PROVIDER"],
    "client_id": os.environ["SSO_CLIENT_ID"],
    "client_secret": os.environ["SSO_CLIENT_SECRET"],
    "redirect_uri": os.environ["SSO_REDIRECT_URI"],
    "metadata_url": os.environ["SSO_METADATA_URL"],
    "issuer": os.environ["SSO_ISSUER"],
    "scopes": ["openid", "profile", "email"],
})
tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

app = NexusApp()

@app.handler(name="sso_login", description="Initiate SSO login")
async def sso_login(callback_url: str) -> dict:
    login_url = sso.login_url()  # no args -- uses redirect_uri from config
    return {"login_url": login_url}

@app.handler(name="sso_callback", description="Handle SSO callback")
async def sso_callback(code: str, state: str) -> dict:
    # Handle the SSO callback
    user_info = sso.handle_callback({"code": code, "state": state})

    # Issue an application token
    token = tm.create_jwt(
        user_info["user_id"],
        user_info.get("scopes", ["read"]),
        ttl_secs=3600,
    )

    return {"token": token, "user": user_info}

@app.handler(name="sso_logout", description="Initiate SSO logout")
async def sso_logout(redirect_url: str) -> dict:
    logout_url = sso.logout_url(redirect_url)
    return {"logout_url": logout_url}
```

## Best Practices

1. **Use OIDC when possible** -- More modern, better tooling support than SAML
2. **Configure discovery** -- Let OIDC auto-configure endpoints from the discovery URL
3. **Validate callbacks** -- Always validate the state parameter in callbacks
4. **Issue local tokens** -- Convert SSO assertions to application tokens (JWT)
5. **Handle session refresh** -- Refresh SSO sessions before they expire
6. **Use environment variables** -- Store SSO configuration in environment, not code

## Related Skills

- [enterprise-tokens](enterprise-tokens.md) - Issue application tokens after SSO login
- [enterprise-policy](enterprise-policy.md) - Apply policies based on SSO user attributes
- [python-framework-bindings](../06-python-bindings/python-framework-bindings.md) - Enterprise type reference

<!-- Trigger Keywords: SSO, single sign-on, OIDC, OpenID Connect, SAML, login URL, SSO callback, identity provider, sso provider -->
