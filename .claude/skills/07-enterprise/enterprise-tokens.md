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

# Create a JWT -- claims is a dict with "subject" (required) and optional keys
jwt = tm.create_jwt({
    "subject": "user-123",
    "scopes": ["read", "write", "admin"],
})

# Validate returns token info
info = tm.validate(jwt["value"])
# info: {
#     "status": "valid",
#     "claims": {
#         "subject": "user-123",
#         "scopes": ["read", "write", "admin"],
#     }
# }
```

### Opaque Tokens

Random, server-tracked tokens:

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create an opaque token -- same claims dict pattern
opaque = tm.create_opaque({"subject": "user-456", "scopes": ["read"]})

# Validate
info = tm.validate(opaque["value"])
assert info["status"] == "valid"
assert info["claims"]["subject"] == "user-456"
```

### API Key Tokens

Long-lived tokens for service-to-service communication:

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create an API key -- same claims dict pattern
api_key = tm.create_api_key({"subject": "service-account-1", "scopes": ["read", "write"]})

# Validate
info = tm.validate(api_key["value"])
assert info["status"] == "valid"
assert info["claims"]["subject"] == "service-account-1"
```

## Token Validation

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})
token = tm.create_jwt({"subject": "user-123", "scopes": ["read"]})

# Validate takes the token value string, returns a dict with token info
info = tm.validate(token["value"])

# Validation result fields
info["status"]               # "valid", "expired", "revoked", or "invalid"
info["claims"]["subject"]    # "user-123" -- who the token belongs to
info["claims"]["scopes"]     # ["read"] -- what the token allows
```

## Token Refresh

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create initial token
token = tm.create_jwt({"subject": "user-123", "scopes": ["read", "write"]})

# Refresh the token -- takes the token value string, returns a new token dict
new_token = tm.refresh(token["value"])

# Validate the new token
info = tm.validate(new_token["value"])
assert info["claims"]["subject"] == "user-123"
```

## Token Revocation

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create a token
token = tm.create_jwt({"subject": "user-123", "scopes": ["read"]})

# Revoke the token -- takes the token value string
tm.revoke(token["value"])

# Revoked tokens fail validation
# tm.validate(token["value"]) -- raises or returns error/None
```

## List Active Tokens

```python
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"]})

# Create several tokens -- all take a claims dict
t1 = tm.create_jwt({"subject": "user-1", "scopes": ["read"]})
t2 = tm.create_jwt({"subject": "user-2", "scopes": ["write"]})
t3 = tm.create_opaque({"subject": "user-3", "scopes": ["admin"]})

# List all active tokens
active = tm.list_active()
# Returns list of active token info dicts
```

## Token Expiration

Tokens automatically expire based on their TTL (configured in TokenManager config):

```python
from kailash.enterprise import TokenManager
import time

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"], "default_ttl_secs": 1})

# Create a short-lived token (uses default_ttl_secs from config)
token = tm.create_jwt({"subject": "user-123", "scopes": ["read"]})

# Valid immediately
info = tm.validate(token["value"])
assert info["claims"]["subject"] == "user-123"

# After expiration
time.sleep(2)
# tm.validate(token["value"]) -- fails because token has expired
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
    info = tm.validate(token)
    if info["status"] == "valid":
        return {
            "authenticated": True,
            "user_id": info["claims"]["subject"],
            "scopes": info["claims"]["scopes"],
        }
    return {"authenticated": False, "reason": info["status"]}

def issue_token(tm, user_id, scopes, token_type="jwt"):
    """Issue a new token for a user."""
    claims = {"subject": user_id, "scopes": scopes}

    if token_type == "jwt":
        return tm.create_jwt(claims)
    elif token_type == "opaque":
        return tm.create_opaque(claims)
    elif token_type == "api_key":
        return tm.create_api_key(claims)
    else:
        raise ValueError(f"Unknown token type: {token_type}")

# Usage
tm = create_token_manager()
token = issue_token(tm, "alice", ["read", "write"])
auth = authenticate_request(tm, token["value"])
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

    token = tm.create_jwt({"subject": user_id, "scopes": ["read", "write"]})
    return {"token": token, "user_id": user_id}

@app.handler(name="protected", description="Protected endpoint")
async def protected(token: str) -> dict:
    info = tm.validate(token)
    if info["status"] != "valid":
        return {"error": f"Token {info['status']}"}
    return {"user": info["claims"]["subject"], "scopes": info["claims"]["scopes"]}
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
