---
name: nexus-api-patterns
description: "REST API patterns using NexusApp: custom endpoints, handler-based routes, request/response format."
---

# Nexus API Patterns (kailash-rs)

REST API patterns using NexusApp handlers and custom endpoints.

## Handler-Based Routes (Multi-Channel)

Every handler registered via `@app.handler()` gets an automatic API endpoint:

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=3000))

@app.handler("greet", description="Greet a user")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

app.start()
```

```bash
# Auto-generated endpoint
curl -X POST http://localhost:3000/api/greet \
  -H "Content-Type: application/json" \
  -d '{"name": "World", "greeting": "Hi"}'
```

Handlers are also exposed on CLI and MCP channels simultaneously.

## Custom Endpoints (HTTP-Only)

Use `@app.endpoint()` for HTTP-specific routes that do not need CLI/MCP:

```python
@app.endpoint("/api/v1/users/{user_id}", methods=["GET"])
async def get_user(user_id: str):
    return {"user_id": user_id, "name": "Example User"}

@app.endpoint("/api/v1/search", methods=["GET", "POST"])
async def search(q: str = "", limit: int = 10):
    return {"query": q, "limit": limit, "results": []}

@app.endpoint("/api/v1/items/{item_id}", methods=["GET", "PUT", "DELETE"])
async def manage_item(item_id: str):
    return {"item_id": item_id}
```

Features: path parameters, query parameters with type coercion, multiple HTTP methods per endpoint.

## Built-In Endpoints

```bash
# Health check
curl http://localhost:3000/health

# List endpoints
curl http://localhost:3000/api/endpoints
```

## Request / Response Format

```json
// Handler request
{"name": "World", "greeting": "Hi"}

// Handler response (returned directly)
{"message": "Hi, World!"}
```

## CORS Configuration

```python
app = NexusApp(config=NexusConfig(port=3000))
app.add_cors(origins=["https://example.com"])
```

## Rate Limiting

```python
app.add_rate_limit(max_requests=100, window_secs=60)
```

## Authentication

```bash
curl -X POST http://localhost:3000/api/secure-handler \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data": "value"}'
```

See [nexus-security-best-practices](nexus-security-best-practices.md) for NexusAuthPlugin setup.

## Inspection

```python
# List all registered endpoints
endpoints = app.get_endpoints()
print(endpoints)

# List registered handlers
handlers = app.get_registered_handlers()
print(handlers)

# Health check
health = app.health_check()
print(health)
```

## Testing API Endpoints

```python
import requests

class TestNexusAPI:
    base_url = "http://localhost:3000"

    def test_handler_execution(self):
        response = requests.post(
            f"{self.base_url}/api/greet",
            json={"name": "World"},
        )
        assert response.status_code == 200
        assert "message" in response.json()

    def test_health_check(self):
        response = requests.get(f"{self.base_url}/health")
        assert response.status_code == 200
```

## Key Differences from kailash-py

| Aspect                    | kailash-py                  | kailash-rs                                             |
| ------------------------- | --------------------------- | ------------------------------------------------------ |
| Handler endpoint path     | `/workflows/{name}/execute` | `/api/{name}`                                          |
| Custom endpoint decorator | `@app.endpoint()` on Nexus  | `@app.endpoint()` on NexusApp                          |
| Default port              | 8000                        | 3000                                                   |
| CORS                      | `Nexus(cors_origins=[...])` | `app.add_cors(origins=[...])`                          |
| Rate limit                | `Nexus(rate_limit=1000)`    | `app.add_rate_limit(max_requests=100, window_secs=60)` |

## Related Skills

- [nexus-multi-channel](nexus-multi-channel.md) - All channels overview
- [nexus-handler-support](nexus-handler-support.md) - Handler patterns
- [nexus-security-best-practices](nexus-security-best-practices.md) - Auth and security
