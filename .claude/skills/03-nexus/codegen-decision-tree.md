---
skill: codegen-decision-tree
description: Structured decision logic for codegen agents to select the right Kailash pattern
priority: HIGH
tags: [nexus, codegen, decision-tree, anti-patterns, templates, scaffolding]
---

# Codegen Decision Tree

Every scaffolding task MUST start by traversing this tree. **Version**: 0.12.0

## Master Decision Tree

```
START: What are you building?
|
+-- API endpoint that reads/writes data?
|   +-- Simple CRUD? --> Handler + DataFlow Model (SaaS API template)
|   +-- Multi-model with relationships? --> Nexus+DataFlow + Multi-DataFlow (Multi-Tenant template)
|   +-- Complex validation/transformation? --> WorkflowBuilder + Custom Node
|   +-- Requires auth? --> NexusAuthPlugin + above patterns
|
+-- AI-powered feature?
|   +-- Single LLM call? --> Handler with agent.run() inside
|   +-- Multi-step agent? --> Kaizen Agent + Handler (AI Agent template)
|   +-- RAG/semantic search? --> Kaizen Agent + MCP + DataFlow pgvector
|   +-- AI agent integration? --> MCP Integration
|
+-- Background/batch processing?
|   +-- Event-driven? --> WorkflowBuilder + AsyncLocalRuntime
|   +-- Scheduled jobs? --> WorkflowBuilder + external scheduler
|   +-- Bulk data import? --> DataFlow BulkCreateNode/BulkUpsertNode
|
+-- Infrastructure only?
    +-- Authentication? --> NexusAuthPlugin
    +-- Custom middleware? --> app.add_middleware()
```

## Anti-Patterns

### 1. PythonCodeNode for Business Logic

PythonCodeNode sandbox blocks imports (`asyncio`, `httpx`, DB drivers). Use `@app.handler()` instead.

### 2. Raw HTTP Routes Alongside Nexus

MUST NOT access `app._gateway.app`. Use `@app.handler()`, `app.include_router()`, or `@app.endpoint()`.

### 3. Building Auth from Scratch

Use `NexusAuthPlugin` -- handles JWT, refresh tokens, RBAC, tenant isolation.

### 4. DataFlow Instance Per Request

Create DataFlow at module level. Per-request instances exhaust connection pools.

### 5. WorkflowBuilder for Simple CRUD

Use `@app.handler()` for simple operations. WorkflowBuilder is for multi-step orchestration.

### 6. Mocking in Integration Tests

Use real `DataFlow("sqlite:///:memory:")` instead of mocking DataFlow.

### 7. Accessing `app._gateway.app`

Use `app.add_middleware()` -- public API is stable across versions.

## Scaffolding Templates

### Template 1: SaaS API Backend

```python
import os, uuid
from nexus import Nexus
from nexus.auth.plugin import NexusAuthPlugin
from nexus.auth import JWTConfig, TenantConfig
from nexus.auth.dependencies import RequirePermission
from dataflow import DataFlow
from kailash.workflow.builder import WorkflowBuilder
from kailash.runtime import AsyncLocalRuntime
from nexus.http import Depends

app = Nexus(api_port=8000, mcp_port=3001, auto_discovery=False)
db = DataFlow(database_url=os.environ.get("DATABASE_URL", "sqlite:///app.db"), auto_migrate=True)
runtime = AsyncLocalRuntime()

auth = NexusAuthPlugin(
    jwt=JWTConfig(secret=os.environ["JWT_SECRET"], algorithm="HS256", exempt_paths=["/health", "/docs"]),
    rbac={"admin": ["*"], "member": ["contacts:read", "contacts:create"], "viewer": ["contacts:read"]},
    tenant_isolation=TenantConfig(jwt_claim="tenant_id", admin_role="admin"),
)
app.add_plugin(auth)

@db.model
class Contact:
    id: str; email: str; name: str; company: str = None; org_id: str = None

@app.handler("create_contact", description="Create a new contact")
async def create_contact(email: str, name: str, company: str = None, user=Depends(RequirePermission("contacts:create"))) -> dict:
    workflow = WorkflowBuilder()
    workflow.add_node("ContactCreateNode", "create", {"id": f"contact-{uuid.uuid4()}", "email": email, "name": name, "company": company, "created_by": user.user_id})
    results, _ = await runtime.execute_workflow_async(workflow.build(), inputs={})
    return results["create"]

@app.endpoint("/health", methods=["GET"])
async def health_check():
    return {"status": "healthy"}
```

### Template 2: AI Agent Backend

```python
import os
from nexus import Nexus
from kaizen.core.base_agent import BaseAgent
from kaizen.signatures import Signature, InputField, OutputField

class ChatSignature(Signature):
    message: str = InputField(description="User message")
    context: str = InputField(description="Context", default="")
    response: str = OutputField(description="Assistant response")
    confidence: float = OutputField(description="Confidence 0-1")

class ChatAgent(BaseAgent):
    def __init__(self, config):
        super().__init__(config=config, signature=ChatSignature())
    async def chat(self, message: str, session_id: str, context: str = "") -> dict:
        return await self.run_async(message=message, context=context, session_id=session_id)

app = Nexus(api_port=8000, mcp_port=3001, auto_discovery=False)
chat_agent = ChatAgent({"llm_provider": "openai", "model": os.environ.get("LLM_MODEL", "")})

@app.handler("chat", description="Send a chat message")
async def chat(message: str, session_id: str = "default", context: str = "") -> dict:
    return await chat_agent.chat(message, session_id, context)
```

### Template 3: Multi-Tenant Enterprise

Separate DataFlow instances per concern (primary, analytics, audit) with full tenant isolation. Follows Template 1 auth pattern but adds:

```python
primary_db = DataFlow(database_url=os.environ["PRIMARY_DATABASE_URL"])
analytics_db = DataFlow(database_url=os.environ["ANALYTICS_DATABASE_URL"], pool_size=30)
audit_db = DataFlow(database_url=os.environ["AUDIT_DATABASE_URL"], echo=False)

# Models scoped to their database instance
@primary_db.model
class User: ...
@analytics_db.model
class PageView: ...
@audit_db.model
class AuditLog: ...

async def initialize_databases():
    await primary_db.create_tables_async()
    await analytics_db.create_tables_async()
    await audit_db.create_tables_async()
```

## Critical Settings

```python
app = Nexus(auto_discovery=False)       # CRITICAL for DataFlow integration
db = DataFlow(auto_migrate=True)        # Default, works in Docker/async
runtime = AsyncLocalRuntime()           # CRITICAL for async contexts
```

## Auth Import Cheat Sheet

```python
from nexus.auth.plugin import NexusAuthPlugin
from nexus.auth import JWTConfig, TenantConfig, RateLimitConfig, AuditConfig
from nexus.auth.dependencies import RequireRole, RequirePermission, get_current_user

JWTConfig(secret=..., exempt_paths=[...])       # NOT secret_key, NOT exclude_paths
TenantConfig(admin_role="admin")                 # NOT admin_roles (singular string)
rbac={"admin": ["*"]}                            # Plain dict, NOT RBACConfig
tenant_isolation=TenantConfig(jwt_claim="...")    # TenantConfig object, NOT True
```
