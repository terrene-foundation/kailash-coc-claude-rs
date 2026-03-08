---
skill: enterprise-tokens
description: "TokenManager for JWT, opaque, and API key token lifecycle management. Use when asking about 'token manager', 'JWT', 'opaque token', 'API key', 'token validation', 'token refresh', 'token revocation', or 'token lifecycle'."
priority: MEDIUM
tags: [enterprise, tokens, jwt, api-key, authentication, token-lifecycle]
---

# Enterprise Token Manager

Manage JWT, opaque, and API key token lifecycles with validation, refresh, and revocation.

## Quick Reference

- **TokenManager**: Core class for creating, validating, refreshing, and revoking tokens
- **Token Types**: JWT (stateless), opaque (random), API key (long-lived)
- **Lifecycle**: Create, validate, refresh, revoke, list active tokens
- **TTL**: Configurable time-to-live in seconds for all token types

## Import

```python
from kailash.enterprise import TokenManager
```

## Basic Usage

```python
import os
from kailash.enterprise import TokenManager

# Create a TokenManager with a config dict (secret from env)
tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create a JWT token
token = tm.create_jwt({"subject": "user-123", "scopes": ["read", "write"]})

# Validate the token
info = tm.validate(token["value"])
assert info["claims"]["subject"] == "user-123"
assert info["status"] == "valid"
```

## Token Types

### JWT Tokens

Stateless, self-contained tokens with claims:

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create a JWT with subject, scopes, and TTL
jwt = tm.create_jwt("user-123", ["read", "write", "admin"], ttl_secs=3600)

# Validate returns token info
info = tm.validate(jwt)
# info: {
#     "subject": "user-123",
#     "scopes": ["read", "write", "admin"],
#     "token_type": "jwt",
#     ...
# }
```

### Opaque Tokens

Random, server-tracked tokens:

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create an opaque token
opaque = tm.create_opaque("user-456", ["read"], ttl_secs=1800)

# Validate
info = tm.validate(opaque)
assert info["subject"] == "user-456"
assert info["token_type"] == "opaque"
```

### API Key Tokens

Long-lived tokens for service-to-service communication:

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create an API key with longer TTL
api_key = tm.create_api_key("service-account-1", ["read", "write"], ttl_secs=86400 * 365)

# Validate
info = tm.validate(api_key)
assert info["subject"] == "service-account-1"
assert info["token_type"] == "api_key"
```

## Token Validation

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})
token = tm.create_jwt("user-123", ["read"], ttl_secs=3600)

# Validate returns a dict with token info
info = tm.validate(token)

# Validation result fields
info["subject"]     # "user-123" -- who the token belongs to
info["scopes"]      # ["read"] -- what the token allows
info["token_type"]  # "jwt", "opaque", or "api_key"
```

## Token Refresh

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create initial token
token = tm.create_jwt("user-123", ["read", "write"], ttl_secs=3600)

# Refresh the token -- returns a new token with extended TTL
new_token = tm.refresh(token)

# Validate the new token
info = tm.validate(new_token)
assert info["subject"] == "user-123"
```

## Token Revocation

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create a token
token = tm.create_jwt("user-123", ["read"], ttl_secs=3600)

# Revoke the token
tm.revoke(token)

# Revoked tokens fail validation
# tm.validate(token) -- raises or returns error/None
```

## List Active Tokens

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create several tokens
t1 = tm.create_jwt("user-1", ["read"], ttl_secs=3600)
t2 = tm.create_jwt("user-2", ["write"], ttl_secs=3600)
t3 = tm.create_opaque("user-3", ["admin"], ttl_secs=1800)

# List all active tokens
active = tm.list_active()
# Returns list of active token info dicts
```

## Token Expiration

Tokens automatically expire based on their TTL:

```python
from kailash.enterprise import TokenManager
import time

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create a short-lived token (1 second)
token = tm.create_jwt("user-123", ["read"], ttl_secs=1)

# Valid immediately
info = tm.validate(token)
assert info["subject"] == "user-123"

# After expiration
time.sleep(2)
# tm.validate(token) -- fails because token has expired
```

## Production Pattern

```python
import os
from kailash.enterprise import TokenManager

def create_token_manager():
    """Create a production token manager."""
    secret = os.environ["TOKEN_SECRET"]
    return TokenManager({"secret": secret, "default_ttl_secs": 3600})

def authenticate_request(tm, token):
    """Authenticate a request using token validation."""
    try:
        info = tm.validate(token)
        return {
            "authenticated": True,
            "user_id": info["subject"],
            "scopes": info["scopes"],
            "token_type": info["token_type"],
        }
    except Exception:
        return {"authenticated": False}

def issue_token(tm, user_id, scopes, token_type="jwt"):
    """Issue a new token for a user."""
    ttl = int(os.getenv("TOKEN_TTL_SECS", "3600"))

    if token_type == "jwt":
        return tm.create_jwt(user_id, scopes, ttl_secs=ttl)
    elif token_type == "opaque":
        return tm.create_opaque(user_id, scopes, ttl_secs=ttl)
    elif token_type == "api_key":
        api_key_ttl = int(os.getenv("API_KEY_TTL_SECS", "31536000"))
        return tm.create_api_key(user_id, scopes, ttl_secs=api_key_ttl)
    else:
        raise ValueError(f"Unknown token type: {token_type}")

# Usage
tm = create_token_manager()
token = issue_token(tm, "alice", ["read", "write"])
auth = authenticate_request(tm, token)
```

## Integration with Nexus

```python
import os
from kailash.enterprise import TokenManager
from kailash.nexus import NexusApp

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"], "default_ttl_secs": 3600})
app = NexusApp()

@app.handler(name="login", description="Authenticate and receive token")
async def login(username: str, password: str) -> dict:
    # Validate credentials (implement your own logic)
    user_id = authenticate_user(username, password)
    if not user_id:
        return {"error": "Invalid credentials"}

    token = tm.create_jwt(user_id, ["read", "write"], ttl_secs=3600)
    return {"token": token, "user_id": user_id}

@app.handler(name="protected", description="Protected endpoint")
async def protected(token: str) -> dict:
    info = tm.validate(token)
    return {"user": info["subject"], "scopes": info["scopes"]}
```

## Best Practices

1. **Use environment variables for secrets** -- Never hardcode the secret key
2. **Choose appropriate token types** -- JWT for stateless APIs, opaque for server-tracked sessions, API keys for services
3. **Set reasonable TTLs** -- Short for user sessions (1h), long for API keys (1y)
4. **Implement token refresh** -- Avoid forcing re-authentication for active users
5. **Revoke on logout/compromise** -- Always revoke tokens when sessions end
6. **Monitor active tokens** -- Use `list_active()` to track token usage

## Related Skills

- [enterprise-sso](enterprise-sso.md) - Single Sign-On integration
- [enterprise-policy](enterprise-policy.md) - Policy-based access control
- [python-framework-bindings](../06-python-bindings/python-framework-bindings.md) - Enterprise type reference

<!-- Trigger Keywords: token manager, JWT, opaque token, API key, token validation, token refresh, token revocation, token lifecycle, authentication token -->
