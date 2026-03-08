# Python Binding Cheatsheet

30+ copy-paste patterns for the `kailash-enterprise` Python package.

## Basic Workflow

```python
import kailash

registry = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NoOpNode", "passthrough", {})
workflow = builder.build(registry)

runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {"data": "hello"})
```

## Multi-Node Workflow

```python
import kailash

registry = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

builder.add_node("JSONTransformNode", "parse", {"expression": "@.name"})
builder.add_node("TextTransformNode", "upper", {"operation": "uppercase"})
builder.connect("parse", "result", "upper", "text")

workflow = builder.build(registry)
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {"data": {"name": "alice"}})
# result["results"]["upper"]["result"] == "ALICE"
```

## Custom Node (register_callback)

```python
import kailash

def double(inputs):
    val = inputs.get("value", 0)
    return {"result": val * 2}

registry = kailash.NodeRegistry()
registry.register_callback("DoubleNode", double, ["value"], ["result"])

builder = kailash.WorkflowBuilder()
builder.add_node("DoubleNode", "d", {})
workflow = builder.build(registry)

runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {"value": 21})
# result["results"]["d"]["result"] == 42
```

## Stateful Custom Node

```python
import kailash
import threading

class Counter:
    def __init__(self):
        self.count = 0
        self.lock = threading.Lock()
    def __call__(self, inputs):
        with self.lock:
            self.count += 1
            return {"count": self.count}

counter = Counter()
registry = kailash.NodeRegistry()
registry.register_callback("CounterNode", counter, [], ["count"])
```

## List All Node Types

```python
import kailash
registry = kailash.NodeRegistry()
types = registry.list_types()  # Returns list of 139+ node type names
for t in sorted(types):
    print(t)
```

## Workflow Serialization

```python
import kailash, json

registry = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NoOpNode", "n", {})
workflow = builder.build(registry)

# Serialize
json_str = workflow.to_json()
data = json.loads(json_str)

# Deserialize (via WorkflowBuilder)
builder2 = kailash.WorkflowBuilder.from_json(json_str)
workflow2 = builder2.build(registry)
```

## Runtime Configuration

```python
import kailash

registry = kailash.NodeRegistry()
config = kailash.RuntimeConfig(max_concurrent_nodes=4)

runtime = kailash.Runtime(registry, config)
```

## Async Execution (from async Python)

```python
import kailash, asyncio

async def main():
    registry = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("NoOpNode", "n", {})
    workflow = builder.build(registry)
    runtime = kailash.Runtime(registry)

    # Native async (preferred)
    result = await runtime.execute_async(workflow, {"data": "hi"})

    # Alternative -- GIL-releasing sync via to_thread
    result = await asyncio.to_thread(runtime.execute, workflow, {"data": "hi"})
    print(result["results"])

asyncio.run(main())
```

## Conditional Workflow (SwitchNode)

```python
# SwitchNode matches the "condition" input against case keys
builder.add_node("SwitchNode", "switch", {
    "cases": {"active": "active_handler", "inactive": "inactive_handler"},
    "default_branch": "inactive_handler"
})
builder.connect("input", "status", "switch", "condition")
# SwitchNode outputs: "matched" (branch name string) and "data" (forwarded input)
```

## HTTP Request

```python
builder.add_node("HTTPRequestNode", "api", {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {"Authorization": "Bearer ${API_TOKEN}"}
})
```

## JSON Transform

```python
builder.add_node("JSONTransformNode", "extract", {
    "expression": "@.users[0].name"
})
builder.connect("source", "data", "extract", "data")
```

## Text Transform

```python
builder.add_node("TextTransformNode", "clean", {
    "operation": "trim"  # trim, uppercase, lowercase, replace, split, join
})
```

## File Reader

```python
builder.add_node("FileReaderNode", "reader", {
    "file_path": "/path/to/file.txt"
})
```

## CSV Processor

```python
builder.add_node("CSVProcessorNode", "csv", {
    "action": "read",
    "source_path": "data.csv",
    "has_headers": True
})
```

## DataFlow: Model Definition

```python
from kailash.dataflow import DataFlowConfig, ModelDefinition, FieldType

config = DataFlowConfig("sqlite::memory:")
model = ModelDefinition("User", "users")
model.field("id", FieldType.text(), primary_key=True)
model.field("name", FieldType.text(), required=True)
model.field("email", FieldType.text(), nullable=True)
model.auto_timestamps()  # adds created_at/updated_at
```

## DataFlow: Python Compat (@db.model)

```python
from kailash.dataflow import db

@db.model
class User:
    __table__ = "users"
    id: str
    name: str
    email: str = ""
```

## Enterprise: RBAC

```python
from kailash.enterprise import RbacEvaluator, Role, Permission, User

evaluator = RbacEvaluator()
role = Role("admin") \
    .with_permission(Permission("users", "read")) \
    .with_permission(Permission("users", "write"))
evaluator.add_role(role)
user = User("u1").with_role("admin")
allowed = evaluator.check(user, "users", "read")  # returns bool
# allowed == True
```

## Enterprise: ABAC

```python
from kailash.enterprise import AbacEvaluator, AbacPolicy

policy = AbacPolicy("dept-access", "allow") \
    .with_subject_condition("department", "eq", "engineering")
evaluator = AbacEvaluator([policy])
result = evaluator.evaluate(
    subject={"department": "engineering"},
    resource={"type": "project"},
    action="read",
    environment={}
)
# result["allowed"] == True
```

## Enterprise: Python Compat Decorators

```python
from kailash.enterprise import requires_permission, audit_action, tenant_scoped

@requires_permission("users", "read")
async def get_users():
    return [{"id": "1", "name": "Alice"}]

@audit_action("user.login")
async def login(username: str):
    return {"status": "ok"}

@tenant_scoped
async def get_tenant_data():
    return {"data": []}
```

## Kaizen: Tool Registry

```python
from kailash.kaizen import ToolRegistry, ToolDef, ToolParam

def search_impl(args):
    return {"results": f"Results for: {args['query']}"}

tools = ToolRegistry()
tools.register(ToolDef(
    name="search",
    description="Search the web",
    handler=search_impl,
    params=[ToolParam(name="query", required=True)]
))
```

## Kaizen: BaseAgent

```python
import os
from kailash.kaizen import BaseAgent

class MyAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="my-agent", model=os.environ.get("LLM_MODEL"))

    def execute(self, input_text: str) -> dict:
        return {"response": f"Processed: {input_text}"}
```

## Nexus: Handler

```python
from kailash.nexus import NexusApp

app = NexusApp()

@app.handler("greet", description="Greeting handler")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

# app.start()  # Starts API + CLI + MCP channels
```

## Nexus: Auth Plugin

```python
from kailash.nexus import NexusAuthPlugin, SessionStore, JwtConfig

auth = NexusAuthPlugin(
    jwt=JwtConfig("your-jwt-secret-at-least-32-bytes!!"),
)
sessions = SessionStore()
sid = sessions.create("user-42", tenant_id="acme")
info = sessions.get(sid)  # SessionInfo or None
```

## Enterprise: ComplianceManager

```python
from kailash.enterprise import ComplianceManager

cm = ComplianceManager()
cm.add_framework("gdpr")
cm.set_context({
    "encryption_at_rest": True,
    "encryption_in_transit": True,
    "audit_logging_enabled": True,
    "data_retention_configured": True,
    "access_control_enabled": True,
    "consent_tracking_enabled": True,
    "data_deletion_capable": True,
})
result = cm.evaluate("gdpr")
assert result["overall_status"] == "pass"
```

## Enterprise: PolicyEngine

```python
from kailash.enterprise import PolicyEngine

pe = PolicyEngine()
pe.add_policy({
    "id": "admin_read",
    "name": "Admin Read Access",
    "rules": [
        {"type": "rbac", "role": "admin", "resource": "documents/*", "action": "read"},
    ],
    "combine": "all_must_pass",
})
result = pe.evaluate("admin_read", {
    "user": {"user_id": "alice", "role": "admin"},
    "action": "read",
    "resource": "documents/report.pdf",
})
assert result == "allow"
```

## Enterprise: TokenManager

```python
import os
from kailash.enterprise import TokenManager

tm = TokenManager({"secret": os.environ["TOKEN_SECRET"], "default_ttl_secs": 3600})
jwt = tm.create_jwt({"subject": "user-123", "scopes": ["read", "write"]})
info = tm.validate(jwt["value"])
assert info["claims"]["subject"] == "user-123"
```

## Enterprise: SSOProvider

```python
import os
from kailash.enterprise import SSOProvider

sso = SSOProvider({
    "protocol": "oidc", "provider_name": "okta",
    "client_id": os.environ["SSO_CLIENT_ID"],
    "client_secret": os.environ["SSO_CLIENT_SECRET"],
    "redirect_uri": "https://app.example.com/callback",
    "metadata_url": os.environ["SSO_METADATA_URL"],
    "issuer": os.environ["SSO_ISSUER"],
    "scopes": ["openid", "profile", "email"],
})
login_url = sso.login_url()  # no args -- uses redirect_uri from config
```

## Nexus: PluginManager

```python
from kailash.nexus import PluginManager

pm = PluginManager()
pm.load("auth-plugin", config={"secret": os.environ["AUTH_PLUGIN_SECRET"]})
assert pm.is_loaded("auth-plugin")
pm.reload("auth-plugin")
health = pm.health_check_all()
pm.unload("auth-plugin")
```

## Nexus: WorkflowRegistry

```python
from kailash.nexus import WorkflowRegistry

registry = WorkflowRegistry()
registry.register("my-workflow", {"steps": [...]})
wf = registry.get("my-workflow")
result = registry.execute("my-workflow", {"input": "data"})
```

## Nexus: EventBus

```python
from kailash.nexus import EventBus

bus = EventBus()
bus.subscribe("user.created", lambda data: print(data))
bus.publish("user.created", {"user_id": "123"})
```

## MCP: McpApplication

```python
from kailash.mcp import McpApplication, prompt_argument

app = McpApplication("my-server", "1.0")

@app.tool("search", "Search the web")
def search(params):
    return f"Results for {params['query']}"

@app.resource(uri="config://settings", name="Settings")
def get_settings(uri: str) -> str:
    return '{"theme": "dark"}'

@app.prompt("summarize", description="Summarize text")
def summarize_prompt(arguments):
    return [{"role": "user", "content": f"Please summarize: {arguments['text']}"}]
```

## Kaizen: ObservabilityManager

```python
from kailash.kaizen import ObservabilityManager

obs = ObservabilityManager()
obs.record_execution(agent_name="my-agent", duration_ms=1250, success=True)
stats = obs.get_stats("my-agent")
```

## Kaizen: MetricsCollector

```python
from kailash.kaizen import MetricsCollector

metrics = MetricsCollector()
metrics.record("agent.latency", 1.25, tags={"agent": "researcher"})
summary = metrics.summary("agent.latency")
```

## Error Handling

```python
try:
    result = runtime.execute(workflow, inputs)
except RuntimeError as e:
    print(f"Workflow execution error: {e}")
except TypeError as e:
    print(f"Config type error: {e}")
except ValueError as e:
    print(f"Invalid node config: {e}")
```

## Testing Pattern

```python
import kailash
import pytest

def test_my_workflow():
    registry = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("NoOpNode", "n", {})
    workflow = builder.build(registry)

    runtime = kailash.Runtime(registry)
    result = runtime.execute(workflow, {"data": "test"})

    assert "n" in result["results"]
    assert isinstance(result["run_id"], str)
```

## Multiple Custom Nodes in One Workflow

```python
def step1(inputs):
    return {"intermediate": inputs["data"] + " processed"}

def step2(inputs):
    return {"final": inputs["intermediate"].upper()}

registry = kailash.NodeRegistry()
registry.register_callback("Step1", step1, ["data"], ["intermediate"])
registry.register_callback("Step2", step2, ["intermediate"], ["final"])

builder = kailash.WorkflowBuilder()
builder.add_node("Step1", "s1", {})
builder.add_node("Step2", "s2", {})
builder.connect("s1", "intermediate", "s2", "intermediate")
workflow = builder.build(registry)

runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {"data": "hello"})
# result["results"]["s2"]["final"] == "HELLO PROCESSED"
```
