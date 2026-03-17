# Python Framework Bindings

Use the 4 framework modules from Python: DataFlow, Enterprise, Kaizen, Nexus.

---

## Overview

Full Python bindings are available for all 4 Kailash frameworks. Each module exposes Rust-backed PyO3 types for performance-critical operations and pure-Python compat helpers for ergonomic patterns familiar to Python SDK users.

| Module         | Rust PyO3 Types | Python Compat Helpers | Import                               |
| -------------- | --------------- | --------------------- | ------------------------------------ |
| **DataFlow**   | 9               | 3                     | `from kailash.dataflow import ...`   |
| **Enterprise** | 18              | 13                    | `from kailash.enterprise import ...` |
| **Kaizen**     | 18              | 17+                   | `from kailash.kaizen import ...`     |
| **Nexus**      | 10              | 8                     | `from kailash.nexus import ...`      |

All Rust types are exposed through the public `kailash` module and framework subpackages (`kailash.dataflow`, `kailash.kaizen`, etc.). Never import from the internal `kailash._kailash` extension module directly.

---

## DataFlow

Zero-config database framework. Backend: sqlx (Rust).

### Imports

```python
# Rust-backed types
from kailash.dataflow import DataFlow, DataFlowConfig, DataFlowTransaction
from kailash.dataflow import ModelDefinition, FieldType, FieldDef
from kailash.dataflow import FilterCondition
from kailash.dataflow import TenantContext, QueryInterceptor

# Python compat helpers
from kailash.dataflow import db, F, with_tenant
```

### Model Definition with @db.model

```python
from kailash.dataflow import db
from typing import Optional

@db.model
class User:
    __table__ = "users"          # default: class name lowered + "s"
    __primary_key__ = "id"       # default: "id"
    __auto_timestamps__ = True   # default: True (adds created_at/updated_at)

    id: int
    name: str
    email: Optional[str]
    active: bool

# The decorator attaches a ModelDefinition instance:
print(User._model_definition)
# ModelDefinition(name="User", table="users", fields=6)  # 4 declared + 2 auto-timestamps
```

Supported type annotations: `int`, `str`, `float`, `bool`, `datetime.datetime`, and `Optional[T]` variants. Using unsupported types (e.g., `list`, `dict`) raises `TypeError: unsupported type annotation`.

> **Note**: `FieldDef` has no public constructor — field definitions are created internally by `@db.model` and `ModelDefinition.field()`. To add fields programmatically: `model.field(name, field_type, primary_key=False, nullable=False, required=False, soft_delete=False, default_value=None)`. `FieldType` variants are lowercase class methods: `FieldType.integer()`, `FieldType.text()`, `FieldType.real()`, `FieldType.boolean()`, `FieldType.float()`, `FieldType.json()`, `FieldType.timestamp()`, `FieldType.uuid()`.

### Filter Builder (F)

```python
from kailash.dataflow import F

# Comparison operators (return FilterCondition objects)
f = F("name") == "Alice"         # FilterCondition.eq("name", "Alice")
f = F("name") != "Bob"           # FilterCondition.ne("name", "Bob")
f = F("age") > 18                # FilterCondition.gt("age", 18)
f = F("age") >= 21               # FilterCondition.gte("age", 21)
f = F("score") < 100             # FilterCondition.lt("score", 100)
f = F("score") <= 50             # FilterCondition.lte("score", 50)

# Pattern matching and null checks
f = F("email").like("%@example%")   # FilterCondition.like(...)
f = F("deleted_at").is_null()       # FilterCondition.is_null(...)
f = F("name").is_not_null()         # FilterCondition.is_not_null(...)

# Set membership
f = F("status").in_list(["active", "pending"])  # FilterCondition.in_list(...)
```

### Multi-Tenancy (with_tenant)

```python
from kailash.dataflow import TenantContext, QueryInterceptor, with_tenant

base_ctx = TenantContext("default")
base = QueryInterceptor(base_ctx)

with with_tenant(base, "acme-001") as scoped:
    result = scoped.intercept_query("SELECT * FROM orders")
    # query is scoped to tenant acme-001

# Custom column name for tenant filtering:
with with_tenant(base, "acme-001", column_name="org_id") as scoped:
    result = scoped.intercept_query("SELECT * FROM orders")
```

The `with_tenant` context manager yields a **new** `QueryInterceptor` scoped to the given tenant. The original interceptor is not modified.

---

## Enterprise

RBAC, ABAC, audit trails, multi-tenancy, and context framework.

### Imports

```python
# Rust-backed types -- RBAC
from kailash.enterprise import RbacEvaluator, Role, Permission, User
from kailash.enterprise import RbacPolicy, RbacPolicyBuilder, RoleBuilder
from kailash.enterprise import AccessDecision

# Rust-backed types -- ABAC
from kailash.enterprise import AbacPolicy, AbacEvaluator

# Rust-backed types -- Audit
from kailash.enterprise import AuditLogger, AuditFilter

# Rust-backed types -- Tenancy
from kailash.enterprise import TenantStatus, TenantInfo
from kailash.enterprise import EnterpriseTenantContext, TenantRegistry

# Rust-backed types -- Security & Context
from kailash.enterprise import SecurityClassification, EnterpriseContext

# Python compat -- Combined evaluator
from kailash.enterprise import CombinedEvaluator

# Python compat -- Decorators
from kailash.enterprise import requires_permission, audit_action, tenant_scoped
from kailash.enterprise import set_evaluator, get_evaluator
from kailash.enterprise import set_audit_logger, get_audit_logger

# Python compat -- Context variables
from kailash.enterprise import set_current_user, get_current_user
from kailash.enterprise import set_current_tenant, get_current_tenant
from kailash.enterprise import clear_context

# Phase 17 -- Compliance, Policy, Tokens, SSO
from kailash.enterprise import ComplianceManager, PolicyEngine, TokenManager, SSOProvider
```

### RBAC Setup

```python
from kailash.enterprise import RbacEvaluator, Role, Permission, User

admin = Role("admin").with_permission(Permission("users", "read"))
admin = admin.with_permission(Permission("users", "write"))

evaluator = RbacEvaluator([admin])

user = User("alice").with_role("admin")
assert evaluator.check(user, "users", "read") is True
assert evaluator.check(user, "users", "delete") is False
```

### ABAC Setup

```python
from kailash.enterprise import AbacPolicy, AbacEvaluator

policy = AbacPolicy("time-restriction", "allow").with_action("read")
evaluator = AbacEvaluator([policy])

result = evaluator.evaluate(
    {"department": "engineering"},   # subject_attrs
    {"type": "documents"},           # resource_attrs
    "read",                          # action
    {"time_of_day": "business"},     # environment
)
# result: {"allowed": bool, "reason": str, "matched_policy_id": str | None}
```

### Combined Evaluator (RBAC + ABAC)

```python
from kailash.enterprise import (
    RbacEvaluator, AbacEvaluator, Role, Permission, AbacPolicy, User,
    CombinedEvaluator,
)

rbac = RbacEvaluator([Role("admin").with_permission(Permission("docs", "read"))])
abac = AbacEvaluator([AbacPolicy("p1", "allow").with_action("read")])

# Two strategies: "deny_override" (default) or "first_applicable"
combined = CombinedEvaluator(rbac, abac, strategy="deny_override")
result = combined.evaluate(User("alice").with_role("admin"), "docs", "read")
# result: {"allowed": True, "reason": "...", "rbac_result": True, "abac_result": {...}}
```

### Decorators

```python
from kailash.enterprise import (
    RbacEvaluator, Role, Permission, User,
    set_evaluator, set_current_user, requires_permission,
    set_audit_logger, AuditLogger, audit_action,
    set_current_tenant, tenant_scoped,
)

# 1. Configure module-level evaluator
evaluator = RbacEvaluator([Role("admin").with_permission(Permission("users", "read"))])
set_evaluator(evaluator)

# 2. Set current user (thread/task-safe via contextvars)
set_current_user(User("alice").with_role("admin"))

# 3. RBAC gate
@requires_permission("users", "read")
def list_users():
    return [{"id": 1, "name": "Alice"}]

list_users()  # OK -- alice has admin role with users:read

# 4. Audit trail
set_audit_logger(AuditLogger())

@audit_action("data_access", "users")
def get_user(user_id):
    return {"id": user_id}

# 5. Tenant scoping (injects tenant_id kwarg from context)
set_current_tenant("acme-001")

@tenant_scoped
def list_orders(tenant_id=None):
    return f"Orders for {tenant_id}"

list_orders()  # "Orders for acme-001"
```

### Context Variables

```python
from kailash.enterprise import (
    set_current_user, get_current_user,
    set_current_tenant, get_current_tenant,
    clear_context, User,
)

set_current_user(User("alice"))
set_current_tenant("acme-001")

user = get_current_user()     # User("alice")
tenant = get_current_tenant() # "acme-001"

clear_context()               # resets both to None
```

Context is stored in `contextvars.ContextVar` -- safe for async frameworks and threaded servers.

---

## Kaizen

AI agent framework with TAOD loop, tools, memory, checkpoints, A2A protocol, and trust.

### Imports

```python
# Rust-backed types -- Core
from kailash.kaizen import Agent, AgentConfig, LlmClient
from kailash.kaizen import CostTracker, OrchestrationRuntime

# Rust-backed types -- Tools
from kailash.kaizen import ToolParam, ToolDef, ToolRegistry

# Rust-backed types -- Memory
from kailash.kaizen import SessionMemory, SharedMemory

# Rust-backed types -- Checkpoint
from kailash.kaizen import AgentCheckpoint
from kailash.kaizen import InMemoryCheckpointStorage, FileCheckpointStorage

# Rust-backed types -- A2A Protocol
from kailash.kaizen import AgentCard, AgentRegistry
from kailash.kaizen import InMemoryMessageBus, A2AProtocol

# Rust-backed types -- Trust
from kailash.kaizen import TrustLevel, TrustPosture

# Python compat -- BaseAgent
from kailash.kaizen import BaseAgent

# Python compat -- Hooks
from kailash.kaizen import HookManager

# Python compat -- Signature
from kailash.kaizen import InputField, OutputField, Signature

# Python compat -- Control
from kailash.kaizen import InterruptManager, ControlProtocol

# Python compat -- Pre-built agent subclasses
from kailash.kaizen.agents import (
    SimpleQAAgent,
    ChainOfThoughtAgent,
    ReActAgent,
    RAGAgent,
    CodeGenAgent,
    PlanningAgent,
    MemoryAgent,
)

# Python compat -- Pipelines
from kailash.kaizen.pipelines import (
    SequentialPipeline,
    ParallelPipeline,
    RouterPipeline,
    EnsemblePipeline,
    SupervisorPipeline,
)

# Phase 17 -- Structured Output, Multi-Agent, Observability
from kailash.kaizen import StructuredOutput
from kailash.kaizen import SupervisorAgent, WorkerAgent
from kailash.kaizen import ObservabilityManager, MetricsCollector
```

> **Known Issue**: OrchestrationRuntime.run() is a stub -- returns config dict instead of executing agents.

### BaseAgent (Subclass Pattern)

```python
from kailash.kaizen import BaseAgent

class GreeterAgent(BaseAgent):
    name = "greeter"
    description = "A simple greeting agent"
    system_prompt = "You are a friendly greeter."
    model = None          # uses default from env
    max_iterations = 10
    temperature = 0.7

    def execute(self, input_text: str) -> dict:
        return {"response": f"Hello! You said: {input_text}"}

agent = GreeterAgent()
result = agent.execute("Hi there")
# {"response": "Hello! You said: Hi there"}
```

> **Known Issue**: BaseAgent.execute() currently raises NotImplementedError if not overridden. Pre-built agents (SimpleQAAgent, etc.) return static strings instead of making LLM calls. Use kailash.kaizen.Agent (Rust-backed) for actual LLM interaction.

Class-level attributes can also be overridden via kwargs:

```python
agent = GreeterAgent(model=os.environ.get("LLM_MODEL", "gpt-4o"), temperature=0.5)
```

### Tool Registration

```python
from kailash.kaizen import BaseAgent

class ToolAgent(BaseAgent):
    name = "tool-agent"

    def execute(self, input_text: str) -> dict:
        return {"response": f"Processed: {input_text}"}

agent = ToolAgent()
import ast

# SECURITY: Never use eval() on user input -- use ast.literal_eval() for safe
# evaluation of literal expressions (numbers, strings, lists, dicts, booleans).
agent.register_tool(
    "calculate",
    lambda args: {"result": ast.literal_eval(args.get("expression", "0"))},
    description="Evaluate a literal expression safely",
    params=[
        {"name": "expression", "param_type": "string", "required": True},
    ],
)
# agent.tool_registry now contains the "calculate" tool
```

### Memory

```python
from kailash.kaizen import BaseAgent, SessionMemory, SharedMemory

agent = BaseAgent(name="memo-agent")

# Session memory (per-conversation, HashMap-backed)
memory = SessionMemory()
memory.store("user_name", "Alice")
value = memory.recall("user_name")  # "Alice"
agent.set_memory(memory)

# Shared memory (cross-agent, thread-safe)
shared = SharedMemory()
shared.store("global_config", {"key": "value"})
```

> **Important**: Memory methods are store()/recall()/remove(), NOT set()/get()/delete().

Note: the retrieval method is `recall()`, not `retrieve()`.

### Hooks (Lifecycle Events)

```python
from kailash.kaizen import HookManager

hooks = HookManager()

@hooks.on("on_start")
def log_start(agent_name):
    print(f"Agent {agent_name} starting")

@hooks.on("on_complete")
def log_done(agent_name):
    print(f"Agent {agent_name} finished")

# Supported events (9 total):
# on_start, on_think, on_act, on_observe, on_decide,
# on_error, on_complete, on_interrupt, on_checkpoint

# Non-decorator form:
hooks.register("on_error", lambda name, err: print(f"Error in {name}: {err}"))

# Trigger events:
hooks.trigger("on_start", "my-agent")

# Management:
hooks.callback_count()                # total callbacks across all events
hooks.callback_count("on_start")      # callbacks for specific event
hooks.clear("on_start")               # clear one event
hooks.clear()                         # clear all
```

### Signature (Structured I/O Contracts)

```python
from kailash.kaizen import Signature, InputField, OutputField

class Summarize(Signature):
    text: InputField = InputField(description="Text to summarize")
    max_length: InputField = InputField(description="Max words", default=100)
    summary: OutputField = OutputField(description="The summary")

# Introspection
inputs = Summarize.input_fields()     # {"text": InputField(...), "max_length": InputField(...)}
outputs = Summarize.output_fields()   # {"summary": OutputField(...)}

# JSON Schema generation
schema = Summarize.json_schema()
# {"type": "object", "properties": {...}, "required": ["text"]}

# Validation with defaults
validated = Summarize.validate_inputs({"text": "Hello world"})
# {"text": "Hello world", "max_length": 100}
```

### Interrupt and Control

```python
from kailash.kaizen import InterruptManager, ControlProtocol

# InterruptManager: thread-safe interrupt signaling
interrupt = InterruptManager()
interrupt.set_timeout_secs(30)       # auto-interrupt after 30s
interrupt.set_budget_limit(1.0)      # auto-interrupt after $1.00
interrupt.record_cost(0.05)          # record $0.05 spent
interrupt.is_interrupted()           # False (not yet exceeded)
interrupt.request_interrupt()        # manual interrupt
interrupt.is_interrupted()           # True
interrupt.clear()                    # reset

# ControlProtocol: human-in-the-loop
control = ControlProtocol()
# response = control.ask_user("Continue?")
# approved = control.request_approval("Delete file?")
# history = control.history
```

### Pre-Built Agent Subclasses (7 types)

```python
from kailash.kaizen.agents import (
    SimpleQAAgent,         # Direct question answering
    ChainOfThoughtAgent,   # Step-by-step reasoning
    ReActAgent,            # Reason + Act loop with tools
    RAGAgent,              # Retrieval-augmented generation
    CodeGenAgent,          # Code generation
    PlanningAgent,         # Multi-step planning
    MemoryAgent,           # Memory-enhanced agent
)

agent = SimpleQAAgent(model=os.environ.get("LLM_MODEL", "gpt-4o"))
result = agent.execute("What is the capital of France?")
```

### Pipelines (5 patterns)

```python
from kailash.kaizen.pipelines import (
    SequentialPipeline,    # Run agents in sequence, passing output to next
    ParallelPipeline,      # Run agents in parallel, merge results
    RouterPipeline,        # Route to agent based on input
    EnsemblePipeline,      # Run multiple agents, aggregate (voting/best)
    SupervisorPipeline,    # Supervisor delegates to worker agents
)

pipeline = SequentialPipeline([agent1, agent2])
result = pipeline.run("Process this")
```

---

## Nexus

Multi-channel deployment platform. Backend: axum + tower (Rust).

> **Known Issue**: MCP Server (McpServer) has no transport bindings exposed to Python. Cannot serve MCP requests from Python.

### McpServer

```python
from kailash.nexus import McpServer, HandlerParam

# Both args required
server = McpServer("my-server", "1.0.0")

# Register tools (name, description, handler_callable, schema_dict=None)
server.register_tool(
    "search",
    "Search for items",
    lambda args: {"results": [], "query": args.get("query", "")},
    {"type": "object", "properties": {"query": {"type": "string"}}},
)

print(server.name)         # "my-server"
print(server.version)      # "1.0.0"
print(server.tool_count()) # 1
```

> **Note**: McpServer cannot serve requests — no transport bindings are exposed to Python. Use it for tool registration and metadata only.

### Imports

```python
# Rust-backed types
from kailash.nexus import Nexus, NexusConfig, HandlerParam, Preset
from kailash.nexus import JwtConfig, JwtClaims, RbacConfig
from kailash.nexus import AuthRateLimitConfig, MiddlewareConfig, McpServer

# Python compat -- App
from kailash.nexus import NexusApp

# Python compat -- Auth
from kailash.nexus import NexusAuthPlugin, SessionInfo, SessionStore

# Python compat -- Middleware helpers
from kailash.nexus import preset_to_middleware, cors, rate_limit

# Phase 17 -- PluginManager, EventBus, WorkflowRegistry
from kailash.nexus import PluginManager, EventBus, WorkflowRegistry

# Phase 17 -- MCP Application
from kailash.mcp import McpApplication, prompt_argument
from kailash.nexus.mcp import STDIO, SSE, HTTP
```

### NexusApp with @handler() Decorator

```python
from kailash.nexus import NexusApp

app = NexusApp(preset="standard")

@app.handler()
def greet(name: str, greeting: str = "Hello"):
    """Greet a user by name."""
    return {"message": f"{greeting}, {name}!"}

@app.handler(name="add_numbers", description="Sum two integers")
def add(a: int, b: int):
    return {"result": a + b}

# Handler parameters are auto-inferred from function signatures:
# - Type annotations map: int->"integer", float->"number", bool->"boolean", str->"string"
# - Parameters with defaults are marked as not required

# Introspection
print(app.handler_count)               # 2
handlers = app.get_registered_handlers()  # list of handler metadata dicts
health = app.health_check()            # {"status": "ok", ...}

# Start the HTTP server (blocking)
app.start()
```

### Presets

```python
from kailash.nexus import NexusApp, Preset

# Via string name
app = NexusApp(preset="enterprise")

# Via Preset object
app = NexusApp(preset=Preset("saas"))

# Available presets: "none", "lightweight", "standard", "saas", "enterprise"
```

### Middleware

```python
from kailash.nexus import NexusApp, cors, rate_limit, preset_to_middleware

app = NexusApp()

# CORS
app.add_cors(origins=["https://example.com"])

# Rate limiting
app.add_rate_limit(max_requests=200, window_secs=60)

# Standalone middleware helpers
mw_cors = cors(origins=["https://example.com"])   # MiddlewareConfig with CORS
mw_rate = rate_limit(per_minute=200)               # MiddlewareConfig with rate limit
mw_preset = preset_to_middleware("standard")       # MiddlewareConfig from preset
```

### Authentication

```python
from kailash.nexus import NexusAuthPlugin, SessionStore, JwtConfig, RbacConfig

# Auth configuration bundle
auth = NexusAuthPlugin(
    jwt=JwtConfig("secret-at-least-32-bytes-long!!"),
    rbac=RbacConfig(roles={"admin": ["*"], "user": ["read"]}),
    tenant_header="X-Tenant-ID",
)

# Session management (thread-safe, in-memory)
sessions = SessionStore()
sid = sessions.create("user-42", tenant_id="acme", expiry_secs=1800)
info = sessions.get(sid)
# SessionInfo(session_id=..., user_id="user-42", tenant_id="acme", ...)

sessions.active_count()  # 1
sessions.revoke(sid)     # True
sessions.get(sid)        # None (revoked)
```

### Explicit HandlerParam

```python
from kailash.nexus import NexusApp, HandlerParam

app = NexusApp()

@app.handler(
    name="search",
    description="Search for items",
    params=[
        HandlerParam("query", "string", required=True),
        HandlerParam("limit", "integer", required=False),
    ],
)
def search(query, limit=10):
    return {"query": query, "limit": limit}
```

`HandlerParam` has `name`, `param_type` (default `"string"`), `required` (default `True`), and `description` attributes.

---

## Enterprise Infrastructure

Progressive infrastructure scaling from in-memory to distributed PostgreSQL. All types are behind the `enterprise-infra` feature (included by default in `kailash-enterprise`).

### Imports

```python
import kailash

# Auto-configuration (module-level functions)
rt = kailash.configure_from_env(reg)            # Returns Runtime
infra = kailash.configure_from_env_full(reg)    # Returns ConfiguredInfra

# Infrastructure types
from kailash import (
    ConfiguredInfra,            # Auto-configuration result
    InfraLevel,                 # Infrastructure level (4 variants)
    ShutdownToken,              # Graceful shutdown token
    InMemorySagaStore,          # Saga coordination store
    InProcessTaskQueue,         # In-process task queue
    IdempotencyKeyStrategy,     # Idempotency key strategies
    WorkflowTask,               # Task queue entry
    SagaDefinition,             # Saga with steps
    SagaStepDef,                # Single saga step
    SagaState,                  # Saga state
    SagaStepState,              # Step state
    SagaStatus,                 # Saga status enum
    SagaStepStatus,             # Step status enum
    TaskStatus,                 # Task status enum
    TaskInfo,                   # Task metadata
)
```

### Auto-Configuration

```python
import kailash

reg = kailash.NodeRegistry()

# Simple: returns a Runtime configured from env vars
rt = kailash.configure_from_env(reg)
result = rt.execute(wf)

# Full: returns ConfiguredInfra with runtime + queue + worker lifecycle
infra = kailash.configure_from_env_full(reg)
rt = infra.runtime             # kailash.Runtime
level = infra.level            # kailash.InfraLevel
worker_id = infra.worker_id    # str

# Level 2: start background worker
token = infra.start_worker()   # kailash.ShutdownToken
# ... later:
token.shutdown()
assert token.is_shutdown()
```

### InfraLevel

```python
level = kailash.InfraLevel.in_memory()       # Level 0 (default)
level = kailash.InfraLevel.local_file()      # Level 0.5 (SQLite)
level = kailash.InfraLevel.shared_state()    # Level 1 (PostgreSQL)
level = kailash.InfraLevel.multi_worker()    # Level 2 (PostgreSQL + workers)

print(level.kind)         # "in_memory" | "local_file" | "shared_state" | "multi_worker"
print(level.description)  # Human-readable description
```

### IdempotencyKeyStrategy

```python
strategy = kailash.IdempotencyKeyStrategy.none()
strategy = kailash.IdempotencyKeyStrategy.execution_scoped()
strategy = kailash.IdempotencyKeyStrategy.input_scoped()
strategy = kailash.IdempotencyKeyStrategy.from_input("payment_id")

print(strategy.kind)         # "none" | "execution_scoped" | "input_scoped" | "from_input"
print(strategy.field_name)   # None or "payment_id"
```

### Saga Store

```python
store = kailash.InMemorySagaStore()

# Create a saga
saga = kailash.SagaDefinition(
    saga_id="order-001",
    workflow_run_id="run-001",
    steps=[
        kailash.SagaStepDef(step_name="charge_card", compensation_action="refund_card"),
        kailash.SagaStepDef(step_name="reserve_inventory", compensation_action="release_inventory"),
    ],
)
store.create(saga)

# Step lifecycle
store.step_completed("order-001", 0)
store.step_failed("order-001", 1, "out of stock")

# Get steps that need compensation (returns list of (index, step) tuples)
to_compensate = store.steps_to_compensate("order-001")
for idx, step in to_compensate:
    # Execute compensation action...
    store.step_compensated("order-001", idx)
store.mark_compensated("order-001")

# Query
state = store.get("order-001")       # SagaState or None
active = store.list_active()          # list of SagaState
```

### Task Queue

```python
queue = kailash.InProcessTaskQueue(capacity=100)

# Submit a task
task = kailash.WorkflowTask(
    task_id="task-001",
    workflow_hash="abc123",
    inputs=None,       # optional dict
    priority=0,        # lower = higher priority
    metadata=None,     # optional dict
)
queue.submit(task)

# Claim next task (returns WorkflowTask or None)
claimed = queue.claim("worker-1")
if claimed:
    # Process...
    queue.complete(claimed.task_id, "run-001")
    # Or on failure:
    # queue.fail(claimed.task_id, "error message")

# Query
count = queue.pending_count()
info = queue.status("task-001")   # TaskInfo or None
```

---

## Common Patterns

### Using Multiple Frameworks Together

```python
from kailash.enterprise import (
    RbacEvaluator, Role, Permission, User,
    set_evaluator, set_current_user, requires_permission,
    set_current_tenant, tenant_scoped,
)
from kailash.nexus import NexusApp
from kailash.dataflow import db, F
from typing import Optional

# 1. Define a model
@db.model
class Order:
    __table__ = "orders"
    id: int
    customer: str
    total: float
    status: str

# 2. Set up RBAC
evaluator = RbacEvaluator([
    Role("manager").with_permission(Permission("orders", "read")),
])
set_evaluator(evaluator)

# 3. Build the Nexus app
app = NexusApp(preset="standard")

@app.handler()
@requires_permission("orders", "read")
@tenant_scoped
def list_orders(status: str = "active", tenant_id: Optional[str] = None):
    """List orders, filtered by status and scoped to tenant."""
    f = F("status") == status
    return {"filter": str(f), "tenant": tenant_id}
```

### Agent with Enterprise Auth

```python
from kailash.kaizen import BaseAgent
from kailash.enterprise import (
    set_current_user, User, requires_permission, set_evaluator,
    RbacEvaluator, Role, Permission,
)

evaluator = RbacEvaluator([
    Role("ai-user").with_permission(Permission("agents", "execute")),
])
set_evaluator(evaluator)
set_current_user(User("alice").with_role("ai-user"))

class SecureAgent(BaseAgent):
    name = "secure-agent"

    @requires_permission("agents", "execute")
    def execute(self, input_text: str) -> dict:
        return {"response": f"Secure response to: {input_text}"}
```

---

## Type Reference

### DataFlow Types

| Type                  | Layer  | Purpose                                      |
| --------------------- | ------ | -------------------------------------------- |
| `DataFlow`            | Rust   | Core DataFlow engine                         |
| `DataFlowConfig`      | Rust   | DataFlow configuration                       |
| `DataFlowTransaction` | Rust   | Transaction wrapper                          |
| `ModelDefinition`     | Rust   | Schema definition for generated nodes        |
| `FieldType`           | Rust   | Column type enum (integer, text, real, etc.) |
| `FieldDef`            | Rust   | Field definition (name, type, constraints)   |
| `FilterCondition`     | Rust   | Query filter (eq, ne, gt, like, etc.)        |
| `TenantContext`       | Rust   | Tenant identity for multi-tenancy            |
| `QueryInterceptor`    | Rust   | Intercepts and scopes queries by tenant      |
| `db`                  | Python | `@db.model` decorator namespace              |
| `F`                   | Python | Filter builder with operator overloading     |
| `with_tenant`         | Python | Context manager for tenant-scoped queries    |

### Enterprise Types

| Type                      | Layer  | Purpose                                     |
| ------------------------- | ------ | ------------------------------------------- |
| `RbacEvaluator`           | Rust   | Role-based access control evaluator         |
| `Role`                    | Rust   | Role definition with permissions            |
| `Permission`              | Rust   | Resource + action permission                |
| `User`                    | Rust   | User with roles                             |
| `AbacPolicy`              | Rust   | Attribute-based access control policy       |
| `AbacEvaluator`           | Rust   | ABAC evaluator (16 operators)               |
| `AuditLogger`             | Rust   | Structured audit event logging              |
| `AuditFilter`             | Rust   | Filter audit log entries                    |
| `AccessDecision`          | Rust   | Access decision result                      |
| `RbacPolicy`              | Rust   | RBAC policy definition                      |
| `RbacPolicyBuilder`       | Rust   | Builder for RBAC policies                   |
| `RoleBuilder`             | Rust   | Builder for roles                           |
| `SecurityClassification`  | Rust   | Data classification level                   |
| `EnterpriseContext`       | Rust   | Enterprise-wide context                     |
| `TenantStatus`            | Rust   | Tenant status enum                          |
| `TenantInfo`              | Rust   | Tenant metadata                             |
| `EnterpriseTenantContext` | Rust   | Tenant context for enterprise               |
| `TenantRegistry`          | Rust   | Registry of tenants                         |
| `ComplianceManager`       | Rust   | Regulatory compliance evaluation (P17)      |
| `PolicyEngine`            | Rust   | Fine-grained policy eval + versioning (P17) |
| `TokenManager`            | Rust   | JWT/opaque/API key token lifecycle (P17)    |
| `SSOProvider`             | Rust   | SSO integration (OIDC/SAML) (P17)           |
| `CombinedEvaluator`       | Python | Unified RBAC + ABAC evaluator               |
| `requires_permission`     | Python | RBAC gate decorator                         |
| `audit_action`            | Python | Audit trail decorator                       |
| `tenant_scoped`           | Python | Tenant injection decorator                  |
| `set_current_user`        | Python | Set user in context (contextvars)           |
| `get_current_user`        | Python | Get user from context                       |
| `set_current_tenant`      | Python | Set tenant in context                       |
| `get_current_tenant`      | Python | Get tenant from context                     |
| `clear_context`           | Python | Reset user and tenant to None               |
| `set_evaluator`           | Python | Set module-level RBAC evaluator             |
| `get_evaluator`           | Python | Get module-level RBAC evaluator             |
| `set_audit_logger`        | Python | Set module-level audit logger               |
| `get_audit_logger`        | Python | Get module-level audit logger               |

### Kaizen Types

| Type                        | Layer  | Purpose                             |
| --------------------------- | ------ | ----------------------------------- |
| `Agent`                     | Rust   | Core agent type                     |
| `AgentConfig`               | Rust   | Agent configuration                 |
| `LlmClient`                 | Rust   | LLM provider client                 |
| `CostTracker`               | Rust   | Cost tracking (atomic microdollars) |
| `OrchestrationRuntime`      | Rust   | Multi-agent coordination            |
| `ToolParam`                 | Rust   | Tool parameter definition           |
| `ToolDef`                   | Rust   | Tool definition                     |
| `ToolRegistry`              | Rust   | Tool registry                       |
| `SessionMemory`             | Rust   | Per-session memory (HashMap)        |
| `SharedMemory`              | Rust   | Cross-agent shared memory           |
| `AgentCheckpoint`           | Rust   | Checkpoint for resume               |
| `InMemoryCheckpointStorage` | Rust   | In-memory checkpoint storage        |
| `FileCheckpointStorage`     | Rust   | File-based checkpoint storage       |
| `AgentCard`                 | Rust   | A2A agent identity card             |
| `AgentRegistry`             | Rust   | Registry for A2A agents             |
| `InMemoryMessageBus`        | Rust   | In-memory A2A message bus           |
| `A2AProtocol`               | Rust   | Agent-to-Agent protocol             |
| `TrustLevel`                | Rust   | EATP trust level                    |
| `TrustPosture`              | Rust   | EATP trust posture                  |
| `BaseAgent`                 | Python | Subclass-friendly agent base        |
| `HookManager`               | Python | Lifecycle event hooks (9 events)    |
| `InputField`                | Python | Signature input field               |
| `OutputField`               | Python | Signature output field              |
| `Signature`                 | Python | Structured I/O contract base        |
| `InterruptManager`          | Python | Thread-safe interrupt signaling     |
| `ControlProtocol`           | Python | Human-in-the-loop control           |
| `SimpleQAAgent`             | Python | Direct QA agent                     |
| `ChainOfThoughtAgent`       | Python | Step-by-step reasoning agent        |
| `ReActAgent`                | Python | Reason + Act loop agent             |
| `RAGAgent`                  | Python | Retrieval-augmented agent           |
| `CodeGenAgent`              | Python | Code generation agent               |
| `PlanningAgent`             | Python | Multi-step planning agent           |
| `MemoryAgent`               | Python | Memory-enhanced agent               |
| `SequentialPipeline`        | Python | Sequential agent pipeline           |
| `ParallelPipeline`          | Python | Parallel agent pipeline             |
| `RouterPipeline`            | Python | Input-based routing pipeline        |
| `EnsemblePipeline`          | Python | Ensemble (voting/best) pipeline     |
| `SupervisorPipeline`        | Python | Supervisor-worker pipeline          |
| `StructuredOutput`          | Python | Typed agent output schema (P17)     |
| `SupervisorAgent`           | Python | Supervisor for multi-agent (P17)    |
| `WorkerAgent`               | Python | Worker for multi-agent (P17)        |
| `ObservabilityManager`      | Python | Agent observability hub (P17)       |
| `MetricsCollector`          | Python | Agent metrics collection (P17)      |

### Nexus Types

| Type                   | Layer  | Purpose                                 |
| ---------------------- | ------ | --------------------------------------- |
| `Nexus`                | Rust   | Core Nexus server                       |
| `NexusConfig`          | Rust   | Server configuration (host, port)       |
| `HandlerParam`         | Rust   | Handler parameter definition            |
| `Preset`               | Rust   | Middleware preset                       |
| `JwtConfig`            | Rust   | JWT authentication config               |
| `JwtClaims`            | Rust   | JWT claims                              |
| `RbacConfig`           | Rust   | RBAC configuration for Nexus            |
| `AuthRateLimitConfig`  | Rust   | Rate limit config                       |
| `MiddlewareConfig`     | Rust   | Composable middleware configuration     |
| `McpServer`            | Rust   | MCP protocol server                     |
| `NexusApp`             | Python | Flask-like app with @handler()          |
| `NexusAuthPlugin`      | Python | Auth configuration bundle               |
| `SessionInfo`          | Python | Session metadata dataclass              |
| `SessionStore`         | Python | Thread-safe in-memory session store     |
| `preset_to_middleware` | Python | Convert preset name to MiddlewareConfig |
| `cors`                 | Python | CORS middleware helper                  |
| `rate_limit`           | Python | Rate limit middleware helper            |
| `PluginManager`        | Rust   | Plugin lifecycle manager (P17)          |
| `EventBus`             | Rust   | Pub/sub event system (P17)              |
| `WorkflowRegistry`     | Rust   | Standalone workflow registry (P17)      |

### MCP Types (Phase 17)

| Type              | Layer  | Purpose                          |
| ----------------- | ------ | -------------------------------- |
| `McpApplication`  | Python | Decorator-based MCP server (P17) |
| `prompt_argument` | Python | Prompt argument helper (P17)     |
| `STDIO`           | Rust   | STDIO transport constant (P17)   |
| `SSE`             | Rust   | SSE transport constant (P17)     |
| `HTTP`            | Rust   | HTTP transport constant (P17)    |

### Enterprise Infrastructure Types (enterprise-infra feature)

| Type                        | Layer    | Purpose                                  |
| --------------------------- | -------- | ---------------------------------------- |
| `ConfiguredInfra`           | Rust     | Auto-configuration result (runtime + queue) |
| `InfraLevel`                | Rust     | Infrastructure level (4 variants)        |
| `ShutdownToken`             | Rust     | Cancellation token for graceful shutdown |
| `InMemorySagaStore`         | Rust     | In-memory saga coordination store        |
| `SagaDefinition`            | Rust     | Saga with ordered steps                  |
| `SagaStepDef`               | Rust     | Single saga step definition              |
| `SagaState`                 | Rust     | Saga current state                       |
| `SagaStepState`             | Rust     | Step current state                       |
| `SagaStatus`                | Rust     | Saga status enum                         |
| `SagaStepStatus`            | Rust     | Step status enum                         |
| `IdempotencyKeyStrategy`    | Rust     | Idempotency key strategy (4 variants)    |
| `InProcessTaskQueue`        | Rust     | In-process task queue                    |
| `WorkflowTask`              | Rust     | Task queue entry                         |
| `TaskStatus`                | Rust     | Task status enum                         |
| `TaskInfo`                  | Rust     | Task metadata                            |
| `configure_from_env`        | Function | Auto-configure Runtime from env vars     |
| `configure_from_env_full`   | Function | Auto-configure Runtime + queue + worker  |
