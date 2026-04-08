# Python Framework Bindings

PyO3/maturin bindings for DataFlow, Enterprise, Kaizen, and Nexus. Rust types from `kailash._kailash`; Python compat helpers are pure-Python wrappers on top.

## DataFlow

Zero-config database framework (sqlx backend).

```python
# Rust types
from kailash.dataflow import DataFlow, DataFlowConfig, DataFlowTransaction
from kailash.dataflow import ModelDefinition, FieldType, FieldDef, FilterCondition
from kailash.dataflow import TenantContext, QueryInterceptor
# Python helpers
from kailash.dataflow import db, F, with_tenant
```

### @db.model

```python
@db.model
class User:
    __table__ = "users"            # default: lowered name + "s"
    __primary_key__ = "id"         # default: "id"
    __auto_timestamps__ = True     # default: True
    id: int
    name: str
    email: Optional[str]
    active: bool
# Attaches User._model_definition (ModelDefinition instance)
```

Supported types: `int`, `str`, `float`, `bool`, `datetime.datetime`, `Optional[T]`.

### Filter Builder (F)

```python
F("name") == "Alice"               # eq
F("age") > 18                      # gt  (also >=, <, <=, !=)
F("email").like("%@example%")      # pattern match
F("deleted_at").is_null()           # null check (.is_not_null() also)
F("status").in_list(["active"])     # set membership
```

### Multi-Tenancy

```python
base = QueryInterceptor(TenantContext("default"))
with with_tenant(base, "acme-001") as scoped:         # yields NEW interceptor
    scoped.intercept_query("SELECT * FROM orders")
with with_tenant(base, "acme-001", column_name="org_id") as scoped:  # custom column
    scoped.intercept_query("SELECT * FROM orders")
```

---

## Enterprise

RBAC, ABAC, audit, multi-tenancy, context framework.

```python
# Rust: RbacEvaluator, Role, Permission, User, AccessDecision, RbacPolicy, RbacPolicyBuilder,
#   RoleBuilder, AbacPolicy, AbacEvaluator, AuditLogger, AuditFilter, TenantStatus, TenantInfo,
#   EnterpriseTenantContext, TenantRegistry, SecurityClassification, EnterpriseContext
# Python: CombinedEvaluator, requires_permission, audit_action, tenant_scoped,
#   set/get_evaluator, set/get_audit_logger, set/get_current_user, set/get_current_tenant, clear_context
from kailash.enterprise import ...
```

### RBAC

```python
admin = Role("admin").with_permission(Permission("users", "read"))
admin = admin.with_permission(Permission("users", "write"))
evaluator = RbacEvaluator([admin])
user = User("alice").with_role("admin")
evaluator.check(user, "users", "read")    # True
evaluator.check(user, "users", "delete")  # False
```

### ABAC

```python
policy = AbacPolicy("time-restriction", "allow").with_action("read")
evaluator = AbacEvaluator([policy])
result = evaluator.evaluate(
    {"department": "engineering"},  # subject_attrs
    {"type": "documents"},         # resource_attrs
    "read",                        # action
    {"time_of_day": "business"},   # environment
)
# {"allowed": bool, "reason": str, "matched_policy_id": str | None}
```

### Combined Evaluator

```python
combined = CombinedEvaluator(rbac_eval, abac_eval, strategy="deny_override")  # or "first_applicable"
result = combined.evaluate(user, "docs", "read")
# {"allowed": True, "reason": "...", "rbac_result": True, "abac_result": {...}}
```

### Decorators

```python
set_evaluator(evaluator)                          # module-level RBAC
set_current_user(User("alice").with_role("admin")) # contextvars (async/thread safe)
set_current_tenant("acme-001")
set_audit_logger(AuditLogger())

@requires_permission("users", "read")             # RBAC gate
def list_users(): ...

@audit_action("data_access", "users")             # audit trail
def get_user(user_id): ...

@tenant_scoped                                     # injects tenant_id kwarg
def list_orders(tenant_id=None): ...

clear_context()  # resets user + tenant to None
```

---

## Kaizen

AI agent framework: TAOD loop, tools, memory, checkpoints, A2A, trust.

```python
# Rust types
from kailash.kaizen import Agent, AgentConfig, LlmClient, CostTracker, OrchestrationRuntime
from kailash.kaizen import ToolParam, ToolDef, ToolRegistry
from kailash.kaizen import SessionMemory, SharedMemory
from kailash.kaizen import AgentCheckpoint, InMemoryCheckpointStorage, FileCheckpointStorage
from kailash.kaizen import AgentCard, AgentRegistry, InMemoryMessageBus, A2AProtocol
from kailash.kaizen import TrustLevel, TrustPosture
# Python helpers
from kailash.kaizen import BaseAgent, HookManager
from kailash.kaizen import InputField, OutputField, Signature
from kailash.kaizen import InterruptManager, ControlProtocol
from kailash.kaizen.agents import (SimpleQAAgent, ChainOfThoughtAgent, ReActAgent,
    RAGAgent, CodeGenAgent, PlanningAgent, MemoryAgent)
from kailash.kaizen.pipelines import (SequentialPipeline, ParallelPipeline,
    RouterPipeline, EnsemblePipeline, SupervisorPipeline)
```

### BaseAgent

```python
class GreeterAgent(BaseAgent):
    name = "greeter"
    description = "A simple greeting agent"
    system_prompt = "You are a friendly greeter."
    model = None           # default from env
    max_iterations = 10
    temperature = 0.7

    def execute(self, input_text: str) -> dict:
        return {"response": f"Hello! You said: {input_text}"}

agent = GreeterAgent()                        # or override: GreeterAgent(model="gpt-5", temperature=0.5)
```

### Tool Registration

```python
agent.register_tool(
    "calculate",
    lambda args: {"result": __import__('ast').literal_eval(args.get("expression", "0"))},
    description="Evaluate a math expression",
    params=[{"name": "expression", "param_type": "string", "required": True}],
)
# SECURITY: Never use eval() on user input. Use ast.literal_eval().
```

### Memory

```python
memory = SessionMemory()              # per-conversation, HashMap-backed
memory.store("user_name", "Alice")
memory.recall("user_name")           # "Alice" (NOT .retrieve())
agent.set_memory(memory)

shared = SharedMemory()               # cross-agent, thread-safe
shared.store("global_config", {"key": "value"})
```

### Hooks

```python
hooks = HookManager()

@hooks.on("on_start")
def log_start(agent_name): print(f"Agent {agent_name} starting")

hooks.register("on_error", lambda name, err: print(f"Error: {err}"))
hooks.trigger("on_start", "my-agent")
hooks.callback_count()       # total (or pass event name for specific)
hooks.clear()                # all (or pass event name for specific)
```

Events (9): `on_start`, `on_think`, `on_act`, `on_observe`, `on_decide`, `on_error`, `on_complete`, `on_interrupt`, `on_checkpoint`.

### Signature

```python
class Summarize(Signature):
    text: InputField = InputField(description="Text to summarize")
    max_length: InputField = InputField(description="Max words", default=100)
    summary: OutputField = OutputField(description="The summary")

Summarize.input_fields()       # {"text": ..., "max_length": ...}
Summarize.output_fields()      # {"summary": ...}
Summarize.json_schema()        # {"type": "object", "properties": {...}, "required": ["text"]}
Summarize.validate_inputs({"text": "Hello"})  # {"text": "Hello", "max_length": 100}
```

### Interrupt and Control

```python
interrupt = InterruptManager()
interrupt.set_timeout_secs(30)    # auto-interrupt after 30s
interrupt.set_budget_limit(1.0)   # auto-interrupt after $1.00
interrupt.record_cost(0.05)
interrupt.request_interrupt()     # manual
interrupt.is_interrupted()        # True
interrupt.clear()

control = ControlProtocol()       # human-in-the-loop: .ask_user(), .request_approval()
```

### Pipelines

```python
SequentialPipeline([a1, a2]).run("input")    # chain output to next
ParallelPipeline([a1, a2]).run("input")      # parallel, merge results
RouterPipeline([a1, a2]).run("input")        # route by input
EnsemblePipeline([a1, a2]).run("input")      # voting/best
SupervisorPipeline([a1, a2]).run("input")    # supervisor delegates
```

---

## Nexus

Multi-channel deployment platform (axum + tower backend).

```python
# Rust types
from kailash.nexus import Nexus, NexusConfig, HandlerParam, Preset
from kailash.nexus import JwtConfig, JwtClaims, RbacConfig
from kailash.nexus import AuthRateLimitConfig, MiddlewareConfig, McpServer
# Python helpers
from kailash.nexus import NexusApp, NexusAuthPlugin, SessionInfo, SessionStore
from kailash.nexus import preset_to_middleware, cors, rate_limit
```

### NexusApp

```python
app = NexusApp(preset="standard")   # "none"|"lightweight"|"standard"|"saas"|"enterprise"

@app.handler()
def greet(name: str, greeting: str = "Hello"):
    """Greet a user."""
    return {"message": f"{greeting}, {name}!"}

@app.handler(name="search", description="Search items", params=[
    HandlerParam("query", "string", required=True),
    HandlerParam("limit", "integer", required=False),
])
def search(query, limit=10):
    return {"query": query, "limit": limit}

app.handler_count                     # 2
app.get_registered_handlers()         # list of handler metadata
app.health_check()                    # {"status": "ok", ...}
app.start()                           # blocking HTTP server
```

Type annotation mapping: `int`->"integer", `float`->"number", `bool`->"boolean", `str`->"string". Defaults mark param as not required.

`HandlerParam.param_type` ("string"|"integer"|"float"|"bool"|"object"|"array"|"any") is write-only -- used internally for docs/CLI/MCP schema, not readable from object.

### Middleware

```python
app.add_cors(origins=["https://example.com"])
app.add_rate_limit(max_requests=200, window_secs=60)

cors(origins=["https://example.com"])     # standalone MiddlewareConfig
rate_limit(per_minute=200)                # standalone MiddlewareConfig
preset_to_middleware("standard")          # MiddlewareConfig from preset
```

### Authentication

```python
auth = NexusAuthPlugin(
    jwt=JwtConfig("secret-at-least-32-bytes-long!!"),
    rbac=RbacConfig(["admin", "user"]),
    tenant_header="X-Tenant-ID",
)

sessions = SessionStore()                             # thread-safe, in-memory
sid = sessions.create("user-42", tenant_id="acme", expiry_secs=1800)
info = sessions.get(sid)    # SessionInfo(session_id, user_id, tenant_id, ...)
sessions.active_count()     # 1
sessions.revoke(sid)        # True
```

---

## Cross-Framework Patterns

### Nexus + Enterprise + DataFlow

```python
app = NexusApp(preset="standard")
set_evaluator(RbacEvaluator([Role("manager").with_permission(Permission("orders", "read"))]))

@app.handler()
@requires_permission("orders", "read")
@tenant_scoped
def list_orders(status: str = "active", tenant_id: Optional[str] = None):
    return {"filter": str(F("status") == status), "tenant": tenant_id}
```

### Agent + Enterprise Auth

```python
set_evaluator(RbacEvaluator([Role("ai-user").with_permission(Permission("agents", "execute"))]))
set_current_user(User("alice").with_role("ai-user"))

class SecureAgent(BaseAgent):
    name = "secure-agent"
    @requires_permission("agents", "execute")
    def execute(self, input_text: str) -> dict:
        return {"response": f"Secure response to: {input_text}"}
```

---

## Source Files

All under `bindings/kailash-python/`: `python/kailash/__init__.py` (root re-exports), `python/kailash/dataflow/` (model, filter, tenancy), `python/kailash/enterprise/` (combined, context, decorators), `python/kailash/kaizen/` (agent, hooks, signature, control, agents/7, pipelines/5), `python/kailash/nexus/` (app, auth, middleware). Rust infra: `src/infra.rs` (15 pyclass + 2 fns).
