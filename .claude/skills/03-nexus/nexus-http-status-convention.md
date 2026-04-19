# Nexus HTTP Error Response Convention

Nexus HTTP handlers return a consistent error response shape so downstream clients (JS fetchers, Python httpx callers, retry middleware, typed SDK wrappers) can discriminate error cases uniformly without per-endpoint special-casing.

## The Shape

Every error response body MUST have exactly two top-level keys:

```json
{
  "error":  "<human-readable message, one sentence>",
  "status": <HTTP status code as integer>
}
```

The `status` key duplicates the HTTP status code in the body so callers that only inspect the body (common in streamed / multiplexed / queued-request pipelines) still see the code without a second lookup.

## Status Code Catalog

| Status | Meaning                                                  | Example `error` message                                   |
| ------ | -------------------------------------------------------- | --------------------------------------------------------- |
| 400    | Validation error — payload parsed but values invalid     | `"policy.type must be one of ['rbac', 'abac', 'custom']"` |
| 401    | Authentication required or failed                        | `"missing bearer token"`                                  |
| 403    | Authenticated but not authorized                         | `"clearance=Public cannot read SECRET"`                   |
| 404    | Resource does not exist                                  | `"model 'User' not found"`                                |
| 409    | Conflict — write would violate an invariant              | `"tenant_id 'acme' already has a default policy"`         |
| 413    | Payload too large                                        | `"request body exceeds 1 MiB limit"`                      |
| 422    | Semantic validation passed parse but failed domain rules | `"migration 0043 requires force_drop=True"`               |
| 429    | Rate limited                                             | `"too many requests; retry after 5s"`                     |
| 500    | Internal error — handler crashed                         | `"internal error"` (no stack leak)                        |
| 502    | Upstream service failed                                  | `"upstream kaizen service unavailable"`                   |
| 503    | Service temporarily unavailable                          | `"database pool exhausted; retry"`                        |

## Examples

### 400 — Validation

```python
from nexus import App, HTTPException

app = App()

@app.post("/policies")
async def create_policy(payload: dict):
    if not isinstance(payload, dict):
        raise HTTPException(400, "policy payload must be a JSON object")
    if payload.get("type") not in ("rbac", "abac", "custom"):
        raise HTTPException(400, "policy.type must be one of ['rbac', 'abac', 'custom']")
    ...
```

Response:

```json
{
  "error": "policy.type must be one of ['rbac', 'abac', 'custom']",
  "status": 400
}
```

### 404 — Not Found

```python
@app.get("/models/{name}")
async def get_model(name: str):
    model = db.express.read_model(name)
    if model is None:
        raise HTTPException(404, f"model '{name}' not found")
    return model
```

Response:

```json
{ "error": "model 'User' not found", "status": 404 }
```

### 413 — Payload Too Large

```python
MAX_BODY_BYTES = 1 * 1024 * 1024  # 1 MiB

@app.post("/upload")
async def upload(request):
    length = int(request.headers.get("content-length", "0"))
    if length > MAX_BODY_BYTES:
        raise HTTPException(413, f"request body exceeds {MAX_BODY_BYTES} byte limit")
    ...
```

Response:

```json
{ "error": "request body exceeds 1048576 byte limit", "status": 413 }
```

### 429 — Rate Limited

```python
@app.get("/search")
async def search(query: str):
    if not rate_limiter.allow(client_id):
        raise HTTPException(429, "too many requests; retry after 5s")
    ...
```

Response:

```json
{ "error": "too many requests; retry after 5s", "status": 429 }
```

Include a `Retry-After: 5` header on 429 responses where the delay is deterministic.

## What NOT To Do

### No Bare Strings

```json
// DO NOT — bare string body
"policy.type must be one of ['rbac', 'abac', 'custom']"
```

Clients cannot dispatch on the shape.

### No Stack Traces

```json
// DO NOT — stack leak
{
  "error": "NullPointerException at com.example.PolicyHandler.create(PolicyHandler.py:47)",
  "status": 500
}
```

Logs get the stack. Clients get the message.

### No Domain-Specific Top-Level Keys

```json
// DO NOT — custom top-level shape
{ "code": "POLICY_TYPE_INVALID", "details": {...}, "httpStatus": 400 }
```

Custom shapes force clients to special-case every endpoint. Stick to `{error, status}`.

### No Mismatched `status` vs HTTP Code

```http
HTTP/1.1 200 OK
Content-Type: application/json

{ "error": "not found", "status": 404 }
```

The body's `status` MUST equal the HTTP status code. Mismatches break middleware that inspects one or the other.

## Testing The Convention

```python
import pytest
from httpx import AsyncClient

@pytest.mark.integration
async def test_missing_model_returns_404(client: AsyncClient):
    response = await client.get("/models/DoesNotExist")
    assert response.status_code == 404
    body = response.json()
    assert set(body.keys()) == {"error", "status"}
    assert body["status"] == 404
    assert "not found" in body["error"]
```

## When To Deviate

- **Streaming endpoints** (SSE / WebSockets): errors mid-stream use the protocol's frame shape (SSE `event: error`, WS close frame with reason), not the JSON body shape.
- **OpenAPI-first endpoints** generated from an external spec: follow the spec, note the deviation in the handler docstring.
- **Legacy endpoints** during migration: keep the old shape temporarily, add a deprecation header, and migrate before the next major release.

## Related

- `rules/security.md` § No Secrets in Logs — applies to error messages: never echo credentials, tokens, or internal paths.
- `rules/communication.md` — the `error` message should be human-readable for frontend display, not developer-only shorthand.
- `skills/03-nexus/nexus-essential-patterns.md` — broader Nexus handler patterns.

Origin: gh-coc-claude-rs#51 item 3a (2026-04-17). Reporter observation that COC rules mandate Nexus as the API layer but ship no error-response convention, causing every downstream consumer to invent their own shape. This skill is that convention.
