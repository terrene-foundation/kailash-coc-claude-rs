---
skill: golden-patterns-catalog
description: Top 10 Kailash patterns ranked by production usage for codegen agents
priority: HIGH
tags: [nexus, patterns, codegen, handler, dataflow, auth, workflow, kaizen, mcp]
---

# Top 10 Kailash Patterns - Codegen Catalog

Definitive reference for codegen agents selecting implementation patterns. Ranked by usage frequency across three production projects: project-a (218K LOC), project-b (89K LOC), project-c (75K LOC).

**Package**: `pip install kailash-enterprise`

---

## Pattern 1: Nexus Handler Pattern

Register async functions as multi-channel endpoints (API + CLI + MCP) with a single decorator.

### When to Use

- Building REST API endpoints that need database access
- Service orchestration requiring async I/O (HTTP clients, databases)
- Full Python access needed (sandbox-blocked imports like `asyncio`, `httpx`)

### When NOT to Use

- Complex multi-step orchestration with branching (use WorkflowBuilder)
- Data transformation pipelines without side effects (use Core SDK workflow)

### Canonical Example

```python
import kailash

reg = kailash.NodeRegistry()
import os

app = NexusApp()  # Register workflows manually
df = kailash.DataFlow(os.environ["DATABASE_URL"])

@df.model
class User:
    id: str
    email: str
    name: str

@app.handler("create_user", description="Create a new user")
async def create_user(email: str, name: str) -> dict:
    """Handler for user creation - full Python access, no sandbox."""
    import uuid

    builder = kailash.WorkflowBuilder()
    builder.add_node("UserCreateNode", "create", {
        "id": f"user-{uuid.uuid4()}",
        "email": email,
        "name": name
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["create"]

app.start()
```

### Common Mistakes

- **Using EmbeddedPythonNode for business logic**: Sandbox blocks `asyncio`, `httpx`, database drivers. Use `@app.handler()` instead.
- **Forgetting type annotations**: Handler parameters without types default to `str`, losing validation.
- **Returning non-dict**: Returns like `"success"` get wrapped as `{"result": "success"}`. Return explicit dicts.
- **Using `List[dict]` annotation**: HandlerNode maps complex generics to `str`. Use plain `list` instead.

---

## Pattern 2: DataFlow Model Pattern

Define Python classes with `@db.model` to auto-generate 11 CRUD workflow nodes.

### When to Use

- Any database table/entity definition
- Need Create, Read, Update, Delete, List, Upsert, Count, Bulk operations
- Want MongoDB-style query syntax across PostgreSQL/MySQL/SQLite

### When NOT to Use

- Document databases without fixed schema (use raw MongoDB client)
- Read-only data sources (no CRUD needed)

### Canonical Example

```python
import kailash
from typing import Optional
from datetime import datetime

df = kailash.DataFlow(os.environ["DATABASE_URL"])

@df.model
class User:
    id: str                           # Primary key (MUST be named 'id')
    email: str                        # Required field
    name: str                         # Required field
    role: str = "member"              # Default value
    active: bool = True               # Default boolean
    created_at: datetime = None       # Auto-managed by DataFlow
    org_id: Optional[str] = None      # Optional foreign key

# Auto-generates 11 nodes:
# CRUD: UserCreateNode, UserReadNode, UserUpdateNode, UserDeleteNode, UserListNode, UserUpsertNode, UserCountNode
# Bulk: UserBulkCreateNode, UserBulkUpdateNode, UserBulkDeleteNode, UserBulkUpsertNode
```

### Common Mistakes

- **Primary key not named `id`**: DataFlow requires `id` as the primary key name.
- **Manually setting `created_at`/`updated_at`**: These are auto-managed. Never set them.
- **Using `user.save()` ORM pattern**: DataFlow is NOT an ORM. Use workflow nodes.

---

## Pattern 3: Nexus + DataFlow Integration

Wire DataFlow operations to Nexus endpoints with CRITICAL configuration to prevent blocking.

### When to Use

- Any API that reads/writes database
- SaaS backends with CRUD operations
- Multi-tenant applications

### When NOT to Use

- Standalone CLI tools (use DataFlow directly)
- Batch processing jobs (use Core SDK runtime)

### Canonical Example

```python
import kailash

reg = kailash.NodeRegistry()
import uuid

# CRITICAL: These settings prevent blocking and slow startup
app = NexusApp(NexusConfig(port=8000))
# Register workflows manually (no auto_discovery param)

df = kailash.DataFlow(
    os.environ["DATABASE_URL"],
    auto_migrate=True,  # Works in Docker
)

@df.model
class Contact:
    id: str
    email: str
    name: str
    company_id: str

@app.handler("create_contact")
async def create_contact(email: str, name: str, company_id: str) -> dict:
    builder = kailash.WorkflowBuilder()
    builder.add_node("ContactCreateNode", "create", {
        "id": f"contact-{uuid.uuid4()}",
        "email": email,
        "name": name,
        "company_id": company_id
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["create"]

@app.handler("list_contacts")
async def list_contacts(company_id: str, limit: int = 20) -> dict:
    builder = kailash.WorkflowBuilder()
    builder.add_node("ContactListNode", "list", {
        "filter": {"company_id": company_id},
        "limit": limit,
        "order_by": ["-created_at"]
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return {"contacts": result["results"]["list"]["items"]}

app.start()
```

### Common Mistakes

- **Missing `auto_discovery=False`**: Causes infinite blocking on startup with DataFlow.
- **Using stale DataFlow parameters**: `enable_model_persistence` and `skip_migration` have been removed. Use `auto_migrate=True` (default).

---

## Pattern 4: Auth Middleware Stack

JWT verification + RBAC permissions + tenant isolation via NexusAuthPlugin.

### When to Use

- Production APIs requiring authentication
- Multi-tenant SaaS platforms
- Role-based access control requirements

### When NOT to Use

- Public APIs with no auth
- Internal microservices with network-level security only

### Canonical Example

```python
import kailash
import os

app = NexusApp()  # Register workflows manually

# Configure auth plugin with CORRECT parameters
auth = kailash.NexusAuthPlugin(
    jwt=kailash.JwtConfig(
        secret=os.environ["JWT_SECRET"],       # CRITICAL: 'secret', NOT 'secret_key'
        algorithm="HS256",
        exempt_paths=["/health", "/docs"],      # CRITICAL: 'exempt_paths', NOT 'exclude_paths'
    ),
    rbac={                                      # Plain dict, NOT RBACConfig
        "admin": ["*"],
        "member": ["contacts:read", "contacts:create"],
        "viewer": ["contacts:read"],
    },
    tenant_isolation=kailash.TenantConfig(      # TenantConfig object, NOT True/False
        jwt_claim="tenant_id",
        admin_role="super_admin",               # CRITICAL: singular 'admin_role', NOT 'admin_roles'
    ),
    audit=kailash.AuditConfig(backend="logging"),
)

app.add_plugin(auth)

# Use role/permission checks in handlers
@app.handler("admin_dashboard")
async def admin_dashboard(user=kailash.RequireRole("admin")) -> dict:
    return {"user_id": user.user_id, "roles": user.roles}

@app.handler("create_contact")
async def create_contact(
    email: str,
    name: str,
    user=kailash.RequirePermission("contacts:create"),
) -> dict:
    return {"created_by": user.user_id, "email": email, "name": name}

@app.handler("profile")
async def profile(user=kailash.get_current_user()) -> dict:
    return {"user_id": user.user_id, "roles": user.roles}

app.start()
```

### Factory Methods

```python
# Basic auth (JWT + audit)
auth = kailash.NexusAuthPlugin.basic_auth(jwt=kailash.JwtConfig(secret=os.environ["JWT_SECRET"]))

# SaaS (JWT + RBAC + tenant + audit)
auth = kailash.NexusAuthPlugin.saas_app(
    jwt=kailash.JwtConfig(secret=os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "user": ["read:*"]},
    tenant_isolation=kailash.TenantConfig(),
)

# Enterprise (all features)
auth = kailash.NexusAuthPlugin.enterprise(
    jwt=kailash.JwtConfig(secret=os.environ["JWT_SECRET"]),
    rbac={"admin": ["*"], "editor": ["read:*", "write:*"], "viewer": ["read:*"]},
    rate_limit=kailash.RateLimitConfig(requests_per_minute=100, burst_size=20),
    tenant_isolation=kailash.TenantConfig(),
    audit=kailash.AuditConfig(backend="logging"),
)
```

### Common Mistakes

| Wrong                                       | Correct                                     | Why                               |
| ------------------------------------------- | ------------------------------------------- | --------------------------------- |
| `JwtConfig(secret_key=...)`                 | `JwtConfig(secret=...)`                     | Parameter is named `secret`       |
| `JwtConfig(exclude_paths=[...])`            | `JwtConfig(exempt_paths=[...])`             | Parameter is named `exempt_paths` |
| `TenantConfig(admin_roles=[...])`           | `TenantConfig(admin_role="super_admin")`    | Singular string, not list         |
| `RBACConfig(roles={...})`                   | `rbac={"admin": ["*"], ...}`                | Plain dict, no RBACConfig class   |
| `tenant_isolation=True`                     | `tenant_isolation=TenantConfig(...)`        | Must pass config object           |
| `from nexus.auth.plugin import ...`         | `from kailash.nexus import NexusAuthPlugin` | All types from `kailash.*`        |
| `from __future__ import annotations` + deps | Remove PEP 563 import                       | Breaks runtime type resolution    |

### Middleware Execution Order (automatic)

```
Request -> Audit -> RateLimit -> JWT -> Tenant -> RBAC -> Handler
```

NexusAuthPlugin handles ordering automatically. Do NOT add middleware manually.

---

## Pattern 5: Multi-DataFlow Instance Pattern

Separate DataFlow instances per database/domain for isolation and scalability.

### When to Use

- Multiple databases (users DB, analytics DB, logs DB)
- Microservice boundaries within a monolith
- Read replicas vs write primary separation

### When NOT to Use

- Single database applications
- Tightly coupled domains sharing transactions

### Canonical Example

```python
import kailash
from datetime import datetime
import os

# Primary database for transactional data
users_df = kailash.DataFlow(
    os.environ["PRIMARY_DATABASE_URL"],
)

# Analytics database (read-heavy, different optimization)
analytics_df = kailash.DataFlow(
    os.environ["ANALYTICS_DATABASE_URL"],
    pool_size=30  # Higher pool for read-heavy workload
)

# Logs database (append-only, high throughput)
logs_df = kailash.DataFlow(
    os.environ["LOGS_DATABASE_URL"],
    echo=False  # Disable SQL logging for performance
)

# Models are scoped to their database instance
@users_db.model
class User:
    id: str
    email: str
    name: str

@analytics_db.model
class PageView:
    id: str
    user_id: str
    page: str
    timestamp: datetime

@logs_db.model
class AuditLog:
    id: str
    action: str
    actor_id: str
    resource: str
    timestamp: datetime

# Initialize all databases at startup
async def initialize_databases():
    await users_db.create_tables_async()
    await analytics_db.create_tables_async()
    await logs_db.create_tables_async()
```

### Common Mistakes

- One DataFlow for all databases -- loses connection pool optimization per workload.
- Sharing models across instances -- models are bound to their `@db.model` decorator's instance.
- Forgetting initialization order -- initialize in dependency order (users before logs).

---

## Pattern 6: Custom Node Pattern

Extend SDK with project-specific logic as reusable workflow nodes.

### When to Use

- Repeated logic across multiple workflows (API calls, transformations)
- Third-party integrations (payment gateways, notification services)
- Domain-specific calculations (pricing, scoring algorithms)

### When NOT to Use

- One-off logic (use `@app.handler()` instead)
- Simple transformations (use built-in TransformNode)

### Canonical Example

```python
import kailash
import httpx
import os

def sendgrid_email_handler(inputs):
    """Custom node for sending emails via Sendgrid API."""
    api_key = os.environ["SENDGRID_API_KEY"]

    response = httpx.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "personalizations": [{
                "to": [{"email": inputs["to_email"]}],
                "dynamic_template_data": inputs.get("template_data", {})
            }],
            "from": {"email": "noreply@example.com"},
            "subject": inputs["subject"],
            "template_id": inputs["template_id"]
        }
    )

    return {
        "success": response.status_code == 202,
        "status_code": response.status_code
    }

registry = kailash.NodeRegistry()
registry.register_callback(
    "SendgridEmailNode", sendgrid_email_handler,
    ["to_email", "subject", "template_id", "template_data"],
    ["success", "status_code"]
)

# Usage in workflow
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("SendgridEmailNode", "send_welcome", {
    "to_email": "user@example.com",
    "subject": "Welcome!",
    "template_id": "d-abc123",
    "template_data": {"name": "Alice"}
})
```

### Common Mistakes

- Not using `@register_node()` -- required for string-based node references in workflows.
- Blocking I/O in execute() -- always use `async with httpx.AsyncClient()` not `requests`.
- Missing required parameters -- define all parameters with proper `required` flag.

---

## Pattern 7: Kaizen Agent Pattern

AI agent with structured outputs and automatic execution strategies.

### When to Use

- LLM-powered features (chat, analysis, summarization)
- Tool-using agents (file operations, API calls)
- Multi-step reasoning tasks

### When NOT to Use

- Simple string templating (use format strings)
- Deterministic data processing (use workflows)

### Canonical Example

```python
import kailash
from dataclasses import dataclass

@dataclass
class AnalysisConfig:
    llm_provider: str = "openai"
    model: str = os.environ.get("DEFAULT_LLM_MODEL", "gpt-5")
    temperature: float = 0.1
    max_tokens: int = 2000

class AnalysisSignature(kailash.Signature):
    """Signature defines type-safe inputs and outputs."""
    document: str = kailash.InputField(description="Document text to analyze")
    question: str = kailash.InputField(description="Analysis question")

    answer: str = kailash.OutputField(description="Analysis answer")
    confidence: float = kailash.OutputField(description="Confidence score 0.0-1.0")
    citations: list = kailash.OutputField(description="Supporting quotes from document")

class DocumentAnalyzer(kailash.BaseAgent):
    """Agent for document analysis with structured outputs."""

    def __init__(self, config: AnalysisConfig):
        super().__init__(config=config, signature=AnalysisSignature())

    async def analyze(self, document: str, question: str) -> dict:
        result = await self.run_async(document=document, question=question)
        if result.get("confidence", 0) < 0.5:
            result["warning"] = "Low confidence - consider manual review"
        return result

# Usage
async def main():
    config = AnalysisConfig()
    analyzer = DocumentAnalyzer(config)
    result = await analyzer.analyze(
        document="Quarterly revenue increased 15% YoY...",
        question="What was the revenue growth?"
    )
```

### Common Mistakes

- Creating agent configs manually -- let BaseAgent auto-convert domain configs.
- Calling strategy.execute() directly -- always use `self.run()` or `self.run_async()`.
- Missing `.env` file -- must `load_dotenv()` before creating agents (API keys).

---

## Pattern 8: Workflow Builder Pattern

Multi-step orchestrated workflows with branching, cycles, and complex data flows.

### When to Use

- Multi-step pipelines (ETL, approval flows)
- Conditional branching (SwitchNode for business rules)
- Cyclic workflows (retry loops, iterative refinement)
- Connecting multiple nodes with data dependencies

### When NOT to Use

- Single-step operations (use `@app.handler()`)
- Simple CRUD without orchestration (use DataFlow directly)

### Canonical Example

```python
import kailash

reg = kailash.NodeRegistry()

def build_order_processing_workflow():
    """Multi-step order processing with validation and notification."""
    builder = kailash.WorkflowBuilder()

    # Step 1: Validate order
    builder.add_node("EmbeddedPythonNode", "validate", {
        "code": """
result = {
    "valid": order["quantity"] > 0 and order["price"] > 0,
    "order": order
}
"""
    })

    # Step 2: Check inventory
    builder.add_node("InventoryCheckNode", "check_inventory", {
        "product_id": None
    })

    # Step 3: Create order in database
    builder.add_node("OrderCreateNode", "create_order", {
        "product_id": None,
        "quantity": None,
        "price": None,
        "status": "confirmed"
    })

    # Step 4: Send confirmation
    builder.add_node("SendgridEmailNode", "send_confirmation", {
        "to_email": None,
        "subject": "Order Confirmed",
        "template_id": "d-order-confirmed"
    })

    # Wire connections (explicit data flow, NOT template syntax)
    builder.connect("validate", "order.product_id", "check_inventory", "product_id")
    builder.connect("validate", "order.product_id", "create_order", "product_id")
    builder.connect("validate", "order.quantity", "create_order", "quantity")
    builder.connect("validate", "order.price", "create_order", "price")
    builder.connect("validate", "order.customer_email", "send_confirmation", "to_email")

    return workflow

# Execute
async def process_order(order: dict):
    workflow = build_order_processing_workflow()
    rt = kailash.Runtime(reg)
    result = rt.execute(
        builder.build(reg),  # ALWAYS call .build()
        inputs={"order": order}
    )
    return results
```

### Common Mistakes

- Forgetting `.build()` -- must call `builder.build(reg)` before `runtime.execute()`.
- Using template syntax `${...}` -- use `connect()` for data flow, not string interpolation.
- Missing runtime -- always create runtime before execution.
- Using `inputs.get()` in EmbeddedPythonNode -- use try/except for optional parameters instead.

---

## Pattern 9: kailash.Runtime Pattern

Async-first execution for Docker with proper event loop handling.

### When to Use

- Nexus handler endpoints
- Docker deployments
- Concurrent request handling
- Any async context (`async def`)

### When NOT to Use

- Already inside a Nexus handler (handler manages execution)
- Sync-only CLI scripts (use `rt.execute()` directly)

### Canonical Example

```python
import kailash

reg = kailash.NodeRegistry()

# Initialize runtime once (not per request!)
rt = kailash.Runtime(reg)

async def process_data(data: dict) -> dict:
    builder = kailash.WorkflowBuilder()
    builder.add_node("TransformNode", "transform", {
        "data": data,
        "operation": "normalize"
    })

    # kailash.Runtime handles event loop correctly
    result = rt.execute(
        builder.build(reg),
        inputs={}
    )

    return {"result": result["results"]["transform"]}
```

### Sync Context (CLI/Scripts)

```python
import kailash

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Auto-Detection

```python
import kailash

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
```

### Common Mistakes

- Creating runtime per request -- creates overhead. Initialize once at module level.
- Using `rt.execute()` returns a dict -- do not tuple-unpack it.

---

## Pattern 10: MCP Integration Pattern

Expose workflows as MCP tools for AI agent consumption.

### When to Use

- AI agent integrations (Claude, GPT agents)
- Tool-using scenarios
- Automated workflows triggered by AI

### When NOT to Use

- Human-only APIs
- Simple REST endpoints without AI integration

### Canonical Example

```python
import kailash

app = NexusApp(NexusConfig(port=8000))
# Register workflows manually (no auto_discovery param)

# Every registered handler automatically becomes an MCP tool
@app.handler("search_contacts", description="Search contacts by company or email")
async def search_contacts(
    company: str = None,
    email_pattern: str = None,
    limit: int = 10
) -> dict:
    """
    Search contacts in the database.

    Args:
        company: Filter by company name (partial match)
        email_pattern: Filter by email pattern
        limit: Maximum results to return

    Returns:
        List of matching contacts
    """
    filters = {}
    if company:
        filters["company"] = {"$regex": company}
    if email_pattern:
        filters["email"] = {"$regex": email_pattern}

    results = await query_contacts(filters, limit)
    return {"contacts": results, "count": len(results)}

app.start()
# API at http://localhost:8000, MCP at ws://localhost:3001
```

### Common Mistakes

- No descriptions -- AI agents need descriptions to understand tool purpose.
- Complex return types -- keep returns as simple dicts for AI parsing.
- Missing parameter defaults -- optional params should have defaults for AI flexibility.

---

## Quick Reference Table

| Pattern             | Primary Use Case  | Key Import                                   | File Location          |
| ------------------- | ----------------- | -------------------------------------------- | ---------------------- |
| 1. Handler          | API endpoints     | `import kailash`                             | `app/handlers/`        |
| 2. DataFlow Model   | Database entities | `import kailash`                             | `app/models/`          |
| 3. Nexus+DataFlow   | API+Database      | Both above                                   | `app/main.py`          |
| 4. Auth Stack       | Authentication    | `import kailash` (`kailash.NexusAuthPlugin`) | `app/auth/`            |
| 5. Multi-DataFlow   | Multiple DBs      | `import kailash`                             | `app/core/database.py` |
| 6. Custom Node      | Reusable logic    | `import kailash` (`kailash.Node`)            | `app/nodes/`           |
| 7. Kaizen Agent     | AI features       | `import kailash` (`kailash.BaseAgent`)       | `app/agents/`          |
| 8. Workflow Builder | Orchestration     | `import kailash`                             | `app/workflows/`       |
| 9. kailash.Runtime  | Async execution   | `import kailash`                             | `app/core/runtime.py`  |
| 10. MCP Integration | AI tools          | `import kailash`                             | `app/mcp/`             |

---

## Critical Configuration Summary

```python
import kailash

# ALWAYS use these settings for Nexus + DataFlow
app = NexusApp()
# Register workflows manually (no auto_discovery param)

db = kailash.DataFlow(
    "...",
    auto_migrate=True,  # Default: Works in Docker
)

reg = kailash.NodeRegistry()

# kailash.Runtime handles async automatically
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# ALWAYS use type annotations in handlers
@app.handler("my_handler")
async def my_handler(required_param: str, optional_param: int = 10) -> dict:
    return {"result": "..."}

# Auth types (all from import kailash)
# kailash.NexusAuthPlugin, kailash.JwtConfig, kailash.TenantConfig
# kailash.RateLimitConfig, kailash.AuditConfig
# kailash.RequireRole, kailash.RequirePermission, kailash.get_current_user
```

### Auth Parameter Gotchas

| Wrong                        | Correct                                     | Component    |
| ---------------------------- | ------------------------------------------- | ------------ |
| `secret_key`                 | `secret`                                    | JwtConfig    |
| `exclude_paths`              | `exempt_paths`                              | JwtConfig    |
| `admin_roles`                | `admin_role` (singular string)              | TenantConfig |
| `RBACConfig(roles={...})`    | `rbac={"admin": ["*"], ...}` dict           | Plugin init  |
| `tenant_isolation=True`      | `tenant_isolation=TenantConfig()`           | Plugin init  |
| `from nexus.auth.plugin ...` | `from kailash.nexus import NexusAuthPlugin` | Import path  |

## Validation Tests

All 10 patterns validated with 53 passing tests in `tests/docs/golden_patterns/`:

- `test_pattern1_handler.py`: 6 tests (registration, params, execution, defaults, dict return, type mapping)
- `test_pattern2_dataflow_model.py`: 5 tests (CRUD nodes, id requirement, defaults, optional, multiple)
- `test_pattern3_nexus_dataflow.py`: 5 tests (critical config, handler+DataFlow, list filters, multiple)
- `test_pattern4_auth_stack.py`: 10 tests (health no-auth, admin access, rejection, CRUD perms, profile, expired, imports)
- `test_pattern5_multi_dataflow.py`: 4 tests (separate instances, model scoping, settings, registration)
- `test_pattern6_custom_node.py`: 4 tests (registration, parameters, execute, workflow usage)
- `test_pattern7_kaizen_agent.py`: 4 tests (handler wrapping, defaults, structured output, multiple)
- `test_pattern8_workflow_builder.py`: 5 tests (.build() requirement, multi-step, tuple return, string IDs, inputs)
- `test_pattern9_async_runtime.py`: 5 tests (async execute, same structure, sync, async inputs, reuse)
- `test_pattern10_mcp.py`: 5 tests (description for MCP, param derivation, optional, dict return, multiple)
