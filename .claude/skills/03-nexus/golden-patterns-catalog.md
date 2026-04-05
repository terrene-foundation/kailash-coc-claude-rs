---
skill: golden-patterns-catalog
description: Top 10 Kailash patterns ranked by production usage for codegen agents
priority: HIGH
tags: [nexus, patterns, codegen, handler, dataflow, auth, workflow, kaizen, mcp]
---

# Top 10 Kailash Patterns - Codegen Catalog

**Version**: 0.12.0

## Pattern 1: Nexus Handler

Register async functions as multi-channel endpoints (API + CLI + MCP).

```python
from nexus import Nexus
app = Nexus(auto_discovery=False)

@app.handler("create_user", description="Create a new user")
async def create_user(email: str, name: str) -> dict:
    from kailash.workflow.builder import WorkflowBuilder
    from kailash.runtime import AsyncLocalRuntime
    import uuid
    workflow = WorkflowBuilder()
    workflow.add_node("UserCreateNode", "create", {"id": f"user-{uuid.uuid4()}", "email": email, "name": name})
    runtime = AsyncLocalRuntime()
    results, _ = await runtime.execute_workflow_async(workflow.build(), inputs={})
    return results["create"]
```

**Mistakes**: PythonCodeNode for business logic (sandbox blocks imports), missing type annotations, returning non-dict, `List[dict]` annotation (maps to `str`).

## Pattern 2: DataFlow Model

`@db.model` auto-generates 11 CRUD nodes (Create, Read, Update, Delete, List, Upsert, Count, Bulk\*).

```python
from dataflow import DataFlow
db = DataFlow(os.environ["DATABASE_URL"])

@db.model
class User:
    id: str                       # MUST be named 'id'
    email: str
    name: str
    role: str = "member"
    org_id: Optional[str] = None
```

**Mistakes**: Primary key not named `id`, manually setting `created_at`/`updated_at`, using ORM `user.save()` pattern.

## Pattern 3: Nexus + DataFlow Integration

```python
app = Nexus(auto_discovery=False)  # CRITICAL: prevents blocking
db = DataFlow(database_url=os.environ["DATABASE_URL"], auto_migrate=True)
```

**Mistakes**: Missing `auto_discovery=False` (infinite blocking), stale params (`enable_model_persistence`, `skip_migration` removed).

## Pattern 4: Auth Middleware Stack

```python
from nexus.auth.plugin import NexusAuthPlugin
from nexus.auth import JWTConfig, TenantConfig, AuditConfig
from nexus.auth.dependencies import RequireRole, RequirePermission, get_current_user
from nexus.http import Depends

auth = NexusAuthPlugin(
    jwt=JWTConfig(secret=os.environ["JWT_SECRET"], algorithm="HS256", exempt_paths=["/health"]),
    rbac={"admin": ["*"], "member": ["contacts:read", "contacts:create"]},
    tenant_isolation=TenantConfig(jwt_claim="tenant_id", admin_role="super_admin"),
    audit=AuditConfig(backend="logging"),
)
app.add_plugin(auth)

@app.handler("admin_dashboard")
async def admin_dashboard(user=Depends(RequireRole("admin"))) -> dict:
    return {"user_id": user.user_id}
```

**Factory methods**: `NexusAuthPlugin.basic_auth()`, `.saas_app()`, `.enterprise()`.

**Middleware order** (automatic): Request -> Audit -> RateLimit -> JWT -> Tenant -> RBAC -> Handler.

| Wrong                     | Correct                              | Why                  |
| ------------------------- | ------------------------------------ | -------------------- |
| `secret_key`              | `secret`                             | JWTConfig param name |
| `exclude_paths`           | `exempt_paths`                       | JWTConfig param name |
| `admin_roles=[...]`       | `admin_role="str"`                   | Singular string      |
| `RBACConfig(roles={})`    | `rbac={"admin": ["*"]}`              | Plain dict           |
| `tenant_isolation=True`   | `tenant_isolation=TenantConfig(...)` | Config object        |
| `from nexus.plugins.auth` | `from nexus.auth.plugin`             | Correct import       |

## Pattern 5: Multi-DataFlow Instance

Separate instances per database/domain for isolation.

```python
users_db = DataFlow(database_url=os.environ["PRIMARY_DATABASE_URL"])
analytics_db = DataFlow(database_url=os.environ["ANALYTICS_DATABASE_URL"], pool_size=30)
logs_db = DataFlow(database_url=os.environ["LOGS_DATABASE_URL"], echo=False)

@users_db.model
class User: ...
@analytics_db.model
class PageView: ...
```

## Pattern 6: Custom Node

```python
from kailash.nodes.base import Node, NodeParameter, register_node

@register_node("SendgridEmailNode")
class SendgridEmailNode(Node):
    def get_parameters(self) -> dict[str, NodeParameter]:
        return {
            "to_email": NodeParameter(name="to_email", type=str, required=True),
            "subject": NodeParameter(name="subject", type=str, required=True),
            "template_id": NodeParameter(name="template_id", type=str, required=True),
            "template_data": NodeParameter(name="template_data", type=dict, required=False, default={}),
        }
    async def execute(self, **kwargs) -> dict:
        import httpx, os
        async with httpx.AsyncClient() as client:
            response = await client.post("https://api.sendgrid.com/v3/mail/send",
                headers={"Authorization": f"Bearer {os.environ['SENDGRID_API_KEY']}"},
                json={...})
        return {"success": response.status_code == 202}
```

**Mistakes**: Missing `@register_node()`, blocking I/O (`requests` instead of `httpx`).

## Pattern 7: Kaizen Agent

```python
from kaizen.core.base_agent import BaseAgent
from kaizen.signatures import Signature, InputField, OutputField

class AnalysisSignature(Signature):
    document: str = InputField(description="Document text")
    question: str = InputField(description="Analysis question")
    answer: str = OutputField(description="Answer")
    confidence: float = OutputField(description="Confidence 0-1")

class DocumentAnalyzer(BaseAgent):
    def __init__(self, config):
        super().__init__(config=config, signature=AnalysisSignature())
    async def analyze(self, document: str, question: str) -> dict:
        return await self.run_async(document=document, question=question)
```

**Mistakes**: Manual BaseAgentConfig, calling strategy.execute() directly, missing `.env` load.

## Pattern 8: Workflow Builder

Multi-step orchestration with branching and data flow.

```python
from kailash.workflow.builder import WorkflowBuilder
from kailash.runtime import AsyncLocalRuntime

workflow = WorkflowBuilder()
workflow.add_node("PythonCodeNode", "validate", {"code": "result = {...}"})
workflow.add_node("OrderCreateNode", "create_order", {"status": "confirmed"})
workflow.add_connection("validate", "order.product_id", "create_order", "product_id")

runtime = AsyncLocalRuntime()
results, run_id = await runtime.execute_workflow_async(workflow.build(), inputs={"order": order})
```

**Mistakes**: Forgetting `.build()`, using `${...}` template syntax, missing runtime.

## Pattern 9: AsyncLocalRuntime

```python
from kailash.runtime import AsyncLocalRuntime
runtime = AsyncLocalRuntime()  # Initialize ONCE at module level
results, run_id = await runtime.execute_workflow_async(workflow.build(), inputs={})

# Sync context (CLI/scripts): use LocalRuntime
# Auto-detect: get_runtime() returns correct type
```

**Mistakes**: Runtime per request, LocalRuntime in async context.

## Pattern 10: MCP Integration

Every `@app.handler()` automatically becomes an MCP tool. Set `mcp_port` on Nexus.

```python
app = Nexus(api_port=8000, mcp_port=3001, auto_discovery=False)

@app.handler("search_contacts", description="Search contacts by company or email")
async def search_contacts(company: str = None, limit: int = 10) -> dict:
    return {"contacts": results, "count": len(results)}
```

**Mistakes**: No descriptions (AI agents need them), complex return types, missing param defaults.

## Quick Reference

| Pattern              | Primary Use     | Key Import                                             |
| -------------------- | --------------- | ------------------------------------------------------ |
| 1. Handler           | API endpoints   | `from nexus import Nexus`                              |
| 2. DataFlow Model    | DB entities     | `from dataflow import DataFlow`                        |
| 3. Nexus+DataFlow    | API+DB          | Both above                                             |
| 4. Auth Stack        | Authentication  | `from nexus.auth.plugin import NexusAuthPlugin`        |
| 5. Multi-DataFlow    | Multiple DBs    | `from dataflow import DataFlow`                        |
| 6. Custom Node       | Reusable logic  | `from kailash.nodes.base import Node`                  |
| 7. Kaizen Agent      | AI features     | `from kaizen.core.base_agent import BaseAgent`         |
| 8. Workflow Builder  | Orchestration   | `from kailash.workflow.builder import WorkflowBuilder` |
| 9. AsyncLocalRuntime | Async execution | `from kailash.runtime import AsyncLocalRuntime`        |
| 10. MCP Integration  | AI tools        | `from nexus import Nexus`                              |

## Critical Config

```python
app = Nexus(auto_discovery=False)
db = DataFlow(database_url="...", auto_migrate=True)
runtime = AsyncLocalRuntime()
results, run_id = await runtime.execute_workflow_async(workflow.build(), inputs={})
```
