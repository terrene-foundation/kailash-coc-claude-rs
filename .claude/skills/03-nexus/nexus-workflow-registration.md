---
skill: nexus-workflow-registration
description: Master workflow registration patterns including manual registration, auto-discovery, versioning, and lifecycle management
priority: HIGH
tags: [nexus, workflow, registration, auto-discovery, versioning]
---

# Nexus Workflow Registration

Master workflow registration patterns from basic to advanced.

## Registration Methods

Nexus provides two registration approaches:

| Method           | Use Case                       | Example                                                         |
| ---------------- | ------------------------------ | --------------------------------------------------------------- |
| `app.register()` | WorkflowBuilder workflows      | `app.register("name", lambda **inputs: rt.execute(wf, inputs))` |
| `@app.handler()` | Python functions (recommended) | `@app.handler("name")`                                          |

**Recommendation**: Use `@app.handler()` for most cases. It bypasses EmbeddedPythonNode sandbox restrictions and provides better IDE support.

## Handler Registration (Recommended)

Register Python functions directly as multi-channel workflows:

```python
import kailash

from kailash.nexus import NexusApp
app = NexusApp()

@app.handler("greet", description="Greet a user")
async def greet(name: str, greeting: str = "Hello") -> dict:
    return {"message": f"{greeting}, {name}!"}

# Full Python access - no sandbox restrictions
@app.handler("search_users")
async def search_users(query: str, limit: int = 10) -> dict:
    from my_app.services import UserService
    service = UserService()
    users = await service.search(query, limit)
    return {"users": users}

app.start()
```

### Non-Decorator Handler Registration

```python
from my_app.handlers import process_order

app = NexusApp()
app.register_handler("process_order", process_order, description="Process an order")
app.start()
```

### Handler Benefits

- Full Python access (no sandbox restrictions)
- Automatic parameter derivation from function signature
- Works with async and sync functions
- IDE support (type hints, autocomplete)
- Docstrings used as descriptions

See [nexus-handler-support](#) for complete handler documentation.

## Workflow Registration

```python
import kailash

reg = kailash.NodeRegistry()

from kailash.nexus import NexusApp
app = NexusApp()

# Create workflow
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://api.example.com/data",
    "method": "GET"
})

# Build workflow and create runtime
workflow = builder.build(reg)
rt = kailash.Runtime(reg)

# Register with name - single call exposes on ALL channels
app.register("data-fetcher", lambda **inputs: rt.execute(workflow, inputs))

# What happens internally:
# 1. Nexus stores callable: self._handlers[name] = callable
# 2. Gateway registration: self._gateway.register_workflow(name, callable)
#    → API endpoint: POST /workflows/data-fetcher/execute
#    → CLI command: nexus execute data-fetcher
# 3. MCP registration: self._mcp_channel.register_workflow(name, callable)
#    → MCP tool: workflow_data-fetcher

# No ChannelManager - Nexus handles everything directly
```

## Critical Rules

### Always Call .build() and Wrap in a Callable

```python
# CORRECT - build workflow, create runtime, register a callable
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("workflow-name", lambda **inputs: rt.execute(workflow, inputs))

# WRONG - register() takes a callable, not a Workflow object
app.register("workflow-name", builder.build(reg))
```

### Correct Parameter Order

```python
# CORRECT - name first, callable second
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register(name, lambda **inputs: rt.execute(workflow, inputs))

# WRONG - reversed parameters
app.register(builder.build(reg), name)
```

## Enhanced Registration with Metadata

**NOTE**: Metadata is currently NOT supported in the `register()` method signature.
The method accepts `(name, callable, params=None, description=None, auto_params=False)`.

```python
# Current: register with callable + optional params/description
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("data-fetcher", lambda **inputs: rt.execute(workflow, inputs))

# With description:
# app.register("data-fetcher", lambda **inputs: rt.execute(workflow, inputs),
#     description="Fetches data from external API"
# )

# Current workaround: Store metadata separately
app._workflow_metadata = getattr(app, '_workflow_metadata', {})
app._workflow_metadata["data-fetcher"] = {
    "version": "1.0.0",
    "description": "Fetches data from external API",
    "author": "Development Team",
    "tags": ["data", "api", "production"]
}
```

**What Changed:**

- ❌ `register(name, callable, metadata)` not supported currently
- ✅ Only `register(name, callable)` signature available
- 🔜 Metadata support planned for future version

## Auto-Discovery

Nexus automatically discovers workflows in these patterns:

### File Patterns

- `workflows/*.py`
- `*.workflow.py`
- `workflow_*.py`
- `*_workflow.py`

### Example Workflow File

```python
# my_workflow.py
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://httpbin.org/json",
    "method": "GET"
})
```

### Enable/Disable Auto-Discovery

```python
# Enable (default)
app = NexusApp()  # auto_discovery not a NexusApp param

# Disable (recommended with DataFlow)
app = NexusApp()  # Register workflows manually
```

## Dynamic Registration

### Runtime Workflow Discovery

```python
import kailash

reg = kailash.NodeRegistry()
import os
import importlib.util

from kailash.nexus import NexusApp
app = NexusApp()

def discover_and_register(directory="./workflows"):
    for filename in os.listdir(directory):
        if filename.endswith("_workflow.py"):
            name = filename[:-12]  # Remove '_workflow.py'

            # Load module
            spec = importlib.util.spec_from_file_location(
                name,
                os.path.join(directory, filename)
            )
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

            # Register workflow
            if hasattr(module, 'builder'):
                workflow = module.builder.build(reg)
                rt = kailash.Runtime(reg)
                app.register(name, lambda **inputs, _rt=rt, _wf=workflow: _rt.execute(_wf, inputs))
                print(f"Registered: {name}")

discover_and_register()
```

### Configuration-Driven Registration

```python
import yaml

def register_from_config(app, config_file="workflows.yaml"):
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)

    for wf_config in config['workflows']:
        builder = kailash.WorkflowBuilder()

        # Build from config
        for node in wf_config['nodes']:
            builder.add_node(
                node['type'],
                node['id'],
                node['parameters']
            )

        # Add connections
        for conn in wf_config.get('connections', []):
            builder.connect(
                conn['source'], "result",
                conn['target'], "input"
            )

        # NOTE: register() only accepts (name, callable) -- no metadata parameter
        workflow = builder.build(reg)
        rt = kailash.Runtime(reg)
        app.register(
            wf_config['name'],
            lambda **inputs, _rt=rt, _wf=workflow: _rt.execute(_wf, inputs),
        )
```

## Workflow Versioning

### Version Management

```python
class WorkflowVersionManager:
    def __init__(self, nexus_app, runtime):
        self.app = nexus_app
        self.rt = runtime
        self.versions = {}

    def register_version(self, name, workflow, version, metadata=None):
        versioned_name = f"{name}:v{version}"

        # Enhanced metadata
        version_metadata = {
            "version": version,
            "workflow_name": name,
            "registered_at": datetime.now().isoformat(),
            **(metadata or {})
        }

        # NOTE: register() only accepts (name, callable) -- no metadata parameter
        rt = self.rt
        self.app.register(versioned_name, lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))

        # Track versions
        if name not in self.versions:
            self.versions[name] = []
        self.versions[name].append(version)

        # Register as latest
        latest = max(self.versions[name])
        if version == latest:
            self.app.register(f"{name}:latest", lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))
            self.app.register(name, lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))

    def rollback(self, name, target_version):
        # NOTE: app.workflows does not exist. Use app.get_registered_handlers()
        # This is a conceptual pattern -- actual implementation needs a version store.
        versioned_workflow = self._version_store.get(f"{name}:v{target_version}")
        if versioned_workflow:
            rt = self.rt
            wf = versioned_workflow.workflow
            self.app.register(name, lambda **inputs, _wf=wf: rt.execute(_wf, inputs))
            return True
        return False

# Usage
rt = kailash.Runtime(reg)
version_mgr = WorkflowVersionManager(app, rt)
version_mgr.register_version("data-api", workflow, "1.0.0")
version_mgr.register_version("data-api", workflow_v2, "2.0.0")
version_mgr.rollback("data-api", "1.0.0")
```

### Blue-Green Deployment

```python
class BlueGreenDeployment:
    def __init__(self, nexus_app, runtime):
        self.app = nexus_app
        self.rt = runtime
        self.deployments = {}

    def deploy_blue(self, name, workflow, metadata=None):
        blue_name = f"{name}-blue"
        rt = self.rt
        self.app.register(blue_name, lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))
        self.deployments[blue_name] = workflow
        print(f"Blue deployed: {blue_name}")
        return blue_name

    def deploy_green(self, name, workflow, metadata=None):
        green_name = f"{name}-green"
        rt = self.rt
        self.app.register(green_name, lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))
        self.deployments[green_name] = workflow
        print(f"Green deployed: {green_name}")
        return green_name

    def switch_traffic(self, name, target_environment):
        """Switch traffic to blue or green"""
        target_name = f"{name}-{target_environment}"
        # NOTE: app.workflows does not exist. This is a conceptual pattern.
        # Actual implementation needs a workflow store to look up by name.

        if target_name in self.deployments:
            target_workflow = self.deployments[target_name]
            rt = self.rt
            self.app.register(name, lambda **inputs, _wf=target_workflow: rt.execute(_wf, inputs))
            print(f"Traffic switched to {target_environment}")
            return True
        return False

# Usage
rt = kailash.Runtime(reg)
bg = BlueGreenDeployment(app, rt)

# Deploy production to blue
bg.deploy_blue("data-service", prod_workflow)
bg.switch_traffic("data-service", "blue")

# Deploy new version to green
bg.deploy_green("data-service", new_workflow)

# Test green, then switch
bg.switch_traffic("data-service", "green")
```

## Lifecycle Management

### Lifecycle Hooks

```python
class WorkflowLifecycleManager:
    def __init__(self, nexus_app, runtime):
        self.app = nexus_app
        self.rt = runtime
        self.hooks = {
            "pre_register": [],
            "post_register": [],
            "pre_execute": [],
            "post_execute": []
        }

    def add_hook(self, event, hook_function):
        self.hooks[event].append(hook_function)

    def trigger_hooks(self, event, context):
        for hook in self.hooks.get(event, []):
            try:
                hook(context)
            except Exception as e:
                print(f"Hook error: {e}")

    def register_with_lifecycle(self, name, workflow, metadata=None):
        context = {
            "name": name,
            "workflow": workflow,
            "metadata": metadata,
            "timestamp": time.time()
        }

        # Pre-registration hooks
        self.trigger_hooks("pre_register", context)

        # Register callable (no metadata parameter)
        rt = self.rt
        self.app.register(name, lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))

        # Post-registration hooks
        context["registered"] = True
        self.trigger_hooks("post_register", context)

# Define hooks
def validate_workflow(context):
    if not context['workflow'].nodes:
        raise ValueError("Workflow has no nodes")
    print(f"Validated: {context['name']}")

def log_registration(context):
    print(f"Logged: {context['name']} at {context['timestamp']}")

# Use lifecycle management
rt = kailash.Runtime(reg)
lifecycle = WorkflowLifecycleManager(app, rt)
lifecycle.add_hook("pre_register", validate_workflow)
lifecycle.add_hook("pre_register", log_registration)
lifecycle.register_with_lifecycle("my-workflow", workflow)
```

## Conditional Registration

```python
def conditional_register(app, rt, name, workflow_factory, condition_func):
    """Register only if condition is met"""
    if condition_func():
        workflow = workflow_factory()
        app.register(name, lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))
        print(f"Registered: {name}")
        return True
    else:
        print(f"Skipped: {name}")
        return False

# Condition functions
def is_production():
    return os.getenv("ENVIRONMENT") == "production"

def has_database_access():
    return check_database_connection()

# Conditional registration
rt = kailash.Runtime(reg)
conditional_register(
    app,
    rt,
    "production-api",
    create_production_workflow,
    is_production,
)
```

## WorkflowRegistry (Rust-backed)

The `WorkflowRegistry` class from `kailash.nexus` provides a Rust-backed workflow registry for registering, retrieving, and executing workflows by name.

```python
import kailash
from kailash.nexus import WorkflowRegistry

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {"url": "https://api.example.com/data"})
builder.add_node("JSONTransformNode", "parse", {"expression": "@.results"})
builder.connect("fetch", "response", "parse", "data")
wf = builder.build(reg)

# Register a built Workflow object
wr = WorkflowRegistry()
wr.register("my-workflow", wf, description="Fetch and parse data")

# Retrieve a registered workflow
stored_wf = wr.get("my-workflow")

# Execute a registered workflow with a Runtime
rt = kailash.Runtime(reg)
result = wr.execute("my-workflow", rt, inputs={"url": "https://api.example.com/data"})
```

### WorkflowRegistry vs NexusApp Registration

| Feature       | `WorkflowRegistry`             | `app.register()` / `@app.handler()` |
| ------------- | ------------------------------ | ----------------------------------- |
| Backend       | Rust (standalone)              | Python (NexusApp)                   |
| Multi-channel | No (registry only)             | Yes (API + CLI + MCP)               |
| Execution     | `registry.execute()`           | Via HTTP, CLI, or MCP               |
| Best for      | Standalone workflow management | Platform deployment                 |

### Production Pattern

```python
import kailash
from kailash.nexus import WorkflowRegistry, NexusApp

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

# Use WorkflowRegistry for centralized workflow management
wr = WorkflowRegistry()

# Build and register workflows
builder1 = kailash.WorkflowBuilder()
builder1.add_node("HTTPRequestNode", "fetch", {"url": "https://api.example.com/data"})
wf1 = builder1.build(reg)
wr.register("data-pipeline", wf1)

# Bridge to NexusApp for multi-channel deployment
app = NexusApp()

@app.handler(name="run_workflow", description="Execute a registered workflow")
async def run_workflow(workflow_name: str) -> dict:
    result = wr.execute(workflow_name, rt)
    return result

app.start()
```

## Workflow Validation

```python
class WorkflowValidator:
    @staticmethod
    def validate_workflow(workflow, name):
        errors = []
        warnings = []

        # Check structure
        if not workflow.nodes:
            errors.append("No nodes")

        if len(workflow.nodes) == 1:
            warnings.append("Only one node")

        # Check connections
        if len(workflow.nodes) > 1 and not workflow.connections:
            warnings.append("No connections")

        return {"errors": errors, "warnings": warnings}

    @staticmethod
    def safe_register(app, rt, name, workflow, strict=False):
        """Register with validation"""
        result = WorkflowValidator.validate_workflow(workflow, name)

        # Print warnings
        for warning in result["warnings"]:
            print(f"Warning: {warning}")

        # Check errors
        if result["errors"]:
            for error in result["errors"]:
                print(f"Error: {error}")

            if strict:
                raise ValueError(f"Validation failed: {name}")
            return False

        # Register callable if valid (no metadata parameter)
        app.register(name, lambda **inputs, _wf=workflow: rt.execute(_wf, inputs))
        print(f"Validated and registered: {name}")
        return True

# Usage
rt = kailash.Runtime(reg)
validator = WorkflowValidator()
validator.safe_register(app, rt, "my-workflow", workflow)
```

## Best Practices

1. **Always call .build()** and wrap the workflow in a callable before registration
2. **Use descriptive names** for workflows
3. **Add metadata** for documentation and discovery
4. **Validate workflows** before registration
5. **Use versioning** for production deployments
6. **Implement lifecycle hooks** for monitoring
7. **Test registration** in development environment

## Common Issues

### Workflow Not Found

```python
# Ensure .build() is called and wrapped in a callable
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("workflow", lambda **inputs: rt.execute(workflow, inputs))  # Correct
```

### Auto-Discovery Blocking

```python
# Disable when using DataFlow
app = NexusApp()  # Register workflows manually
```

### Registration Order

```python
# Name first, callable second
workflow = builder.build(reg)
rt = kailash.Runtime(reg)
app.register(name, lambda **inputs: rt.execute(workflow, inputs))  # Correct
```

## Key Takeaways

**Registration Flow:**

- ✅ Single `app.register(name, lambda **inputs: rt.execute(workflow, inputs))` call
- ✅ Automatically exposes on API, CLI, and MCP channels
- ✅ No ChannelManager - Nexus handles everything directly
- ✅ Enterprise gateway provides multi-channel support

**Current Limitations:**

- ❌ No metadata parameter on `register()` (use workaround with `_workflow_metadata`)
- ❌ No auto-discovery — register all workflows manually with `app.register()`
- ✅ Versioning and lifecycle management require custom implementation

**Always Remember:**

1. Call `.build()` and wrap the result in a callable (`lambda **inputs: rt.execute(workflow, inputs)`) before registration
2. Register all workflows manually (NexusApp has no `auto_discovery` param)
3. Single registration → multi-channel exposure
4. No need to manage channels manually

## Related Skills

- [nexus-quickstart](#) - Basic registration
- [nexus-handler-support](#) - Handler registration (recommended)
- [nexus-dataflow-integration](#) - DataFlow workflow registration
- [nexus-production-deployment](#) - Production patterns
- [nexus-troubleshooting](#) - Fix registration issues
