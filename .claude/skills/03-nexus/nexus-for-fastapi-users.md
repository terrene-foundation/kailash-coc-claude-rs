---
skill: nexus-for-fastapi-users
description: Nexus pattern translation for developers migrating from FastAPI to NexusApp (kailash-enterprise)
priority: HIGH
tags: [nexus, translation, onboarding, routes, handlers, api, fastapi]
---

# Nexus for Route-First Developers (kailash-enterprise)

NexusApp is workflow-first: register once, get API + CLI + MCP. This guide translates common route-first patterns into NexusApp equivalents.

## Route Definition

```python
# FastAPI: one decorator per endpoint
@app.get("/items/{id}")
async def get_item(id: int): ...

@app.post("/items")
async def create_item(item: ItemModel): ...

# NexusApp: one handler, all channels
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("get_item")
async def get_item(id: int) -> dict:
    return {"item": await db.express.read("Item", id)}

# Result: POST /api/get_item + CLI + MCP
```

## Request Validation

```python
# FastAPI: Pydantic model as parameter
class OrderRequest(BaseModel):
    user_id: str
    amount: float
    items: list[str]

@app.post("/orders")
async def create_order(order: OrderRequest): ...

# NexusApp: type annotations on handler function
@app.handler("create_order")
async def create_order(user_id: str, amount: float, items: list[str]) -> dict:
    return {"status": "created"}

# Request: POST /api/create_order
# Body: {"user_id": "123", "amount": 99.99, "items": ["a", "b"]}
```

## Dependency Injection → NexusAuthPlugin

```python
# FastAPI: Depends() for request-scoped dependencies
def get_current_user(token: str = Depends(oauth2_scheme)):
    return verify_token(token)

@app.get("/profile")
async def get_profile(user=Depends(get_current_user)): ...

# NexusApp: ctx populated by NexusAuthPlugin
from kailash.nexus import NexusApp, NexusAuthPlugin, JwtConfig

app = NexusApp()
auth = NexusAuthPlugin.saas_app(
    jwt=JwtConfig(secret="your-secret-key", algorithm="HS256"),
    roles={
        "admin": ["read:*", "write:*"],
        "user": ["read:posts"],
    },
)
app.add_plugin(auth)

@app.handler("get_profile")
async def get_profile(ctx) -> dict:
    return {"user_id": ctx.user.id, "org": ctx.user.organization_id}
```

## Middleware

```python
# FastAPI
from starlette.middleware.cors import CORSMiddleware
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# NexusApp: identical API
from kailash.nexus import NexusApp
app = NexusApp()
app.add_middleware(CORSMiddleware, allow_origins=["*"])
```

## Per-Handler Authorization (AuthGuard)

```python
# FastAPI: Depends(require_permission("x:y"))
@app.post("/agents")
async def create_agent(user=Depends(require_permission("agents:create"))): ...

# NexusApp: AuthGuard per handler
from kailash.nexus import AuthGuard

@app.handler("create_agent", guard=AuthGuard.RequirePermission("agents:create"))
async def create_agent(ctx, name: str) -> dict:
    return await service.create(name=name, org_id=ctx.user.organization_id)

@app.handler("delete_agent", guard=AuthGuard.RequireAllPermissions(["agents:delete", "admin:confirm"]))
async def delete_agent(ctx, agent_id: str) -> dict:
    return await service.delete(agent_id, ctx.user.organization_id)
```

## DataFlow Auto-CRUD

```python
# FastAPI: write 5 CRUD endpoints per model manually

# NexusApp: zero endpoints written
app = NexusApp()
db = DataFlow("postgresql://...", models=[User, Post, Comment])
app.register_dataflow(db)
# Result: /api/User/create, /api/User/read, /api/User/list, etc.
```

## Tenant Isolation

```python
# FastAPI: manual org_id extraction per route
@app.get("/agents")
async def list_agents(user=Depends(get_current_user)):
    return await service.list({"organization_id": user.org_id})

# NexusApp: ctx.user populated by NexusAuthPlugin — MUST NOT accept org_id as parameter
@app.handler("list_agents")
async def list_agents(ctx) -> dict:
    return await service.list({"organization_id": ctx.user.organization_id})
```

## Key Mental Model Shift

| Concept      | FastAPI                        | NexusApp                                   |
| ------------ | ------------------------------ | ------------------------------------------ |
| Unit of work | HTTP endpoint                  | Handler or workflow                        |
| Registration | Per-verb, per-path             | Once, all channels                         |
| Channels     | HTTP only                      | API + CLI + MCP                            |
| Auth         | `Depends(get_current_user)`    | `NexusAuthPlugin` populates `ctx`          |
| RBAC         | `Depends(require_permission)`  | `AuthGuard.RequirePermission`              |
| Tenant       | Manual org_id per route        | `ctx.user.organization_id` (trusted)       |
| Sessions     | External store                 | Built-in, cross-channel                    |
| CRUD         | Write each endpoint            | DataFlow auto-generates                    |
| Import       | `from fastapi import ...`      | `from kailash.nexus import NexusApp, ...`  |
