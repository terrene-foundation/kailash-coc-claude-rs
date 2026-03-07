---
paths:
  - "**/*.py"
  - "**/*.ts"
  - "**/*.js"
---

# Kailash Pattern Rules

## Scope

These rules apply to all code using the Kailash Python package (`kailash-enterprise`).

## MUST Rules

### 1. Runtime Execution Pattern

MUST use `rt.execute(wf)` where `wf = builder.build(reg)`.

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "node_id", {"param": "value"})
wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
# result is dict: {"results": {...}, "run_id": "...", "metadata": {...}}
```

**Incorrect**:

```python
❌ workflow.execute(runtime)  # WRONG order
❌ runtime.execute(workflow)  # Missing .build()
❌ runtime.run(workflow)  # Wrong method
```

**Enforced by**: validate-workflow hook
**Violation**: Code review flag

### 2. String-Based Node IDs

Node IDs MUST be string literals.

**Correct**:

```python
builder.add_node("NodeType", "my_node_id", {"param": "value"})
```

**Incorrect**:

```python
❌ builder.add_node("NodeType", node_id_var, {...})
❌ builder.add_node("NodeType", f"node_{i}", {...})
```

**Enforced by**: Code review
**Violation**: Potential runtime issues

### 3. Absolute Imports

MUST use `import kailash` for all Kailash types.

**Correct**:

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
rt = kailash.Runtime(reg)
df = kailash.DataFlow("sqlite:///db.sqlite")
nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
agent = kailash.Agent(config, client)
```

**Enforced by**: validate-workflow hook
**Violation**: Code review flag

### 4. Environment Variable Loading

MUST load .env before any operation.

> See `env-models.md` for full .env rules, model-key pairings, and enforcement details.

**Enforced by**: session-start hook, validate-workflow hook
**Violation**: Runtime errors

### 5. 3-Parameter Node Pattern

MUST use correct parameter order for add_node.

```python
builder.add_node(
    "NodeType",      # 1. Type (string)
    "node_id",       # 2. ID (string)
    {"param": "v"}   # 3. Config (dict, optional)
)
```

## Framework-Specific Rules

### DataFlow

```python
import kailash

df = kailash.DataFlow("sqlite:///mydb.sqlite")

model = kailash.ModelDefinition("User")
model.add_field(kailash.FieldDef("name", kailash.FieldType.String))
df.register_model(model)

# Use in workflows — generates CRUD + Bulk + Count + Upsert nodes
builder = kailash.WorkflowBuilder()
builder.add_node("CreateUser", "create", {"name": "Alice"})
```

### Nexus

```python
import kailash

nexus = kailash.Nexus(kailash.NexusConfig(port=8000))
nexus.register_handler("chat", my_handler_fn)
nexus.start()
```

### Kaizen

```python
import os
import kailash

config = kailash.AgentConfig(
    model=os.environ["OPENAI_PROD_MODEL"],  # NEVER hardcode model names
)
client = kailash.LlmClient("openai", os.environ["OPENAI_API_KEY"])
agent = kailash.Agent(config, client)
```

### Enterprise

```python
import kailash

# RBAC
role = kailash.RoleBuilder("admin").add_permission("users", "read").build()
evaluator = kailash.RbacEvaluator()
evaluator.add_role(role)

# ABAC
policy = kailash.AbacPolicy("age-check", {"age": {"gte": 18}})
abac = kailash.AbacEvaluator()
abac.add_policy(policy)

# Audit
logger = kailash.AuditLogger()
logger.log("user_created", {"user_id": "123"})
```

## Exceptions

Pattern exceptions require:

1. Written justification
2. Approval from pattern-expert
3. Documentation in code comments
