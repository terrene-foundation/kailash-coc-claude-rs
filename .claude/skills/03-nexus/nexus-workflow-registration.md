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

| Method           | Use Case                       | Example                                    |
| ---------------- | ------------------------------ | ------------------------------------------ |
| `app.register()` | WorkflowBuilder workflows      | `app.register("name", builder.build(reg))` |
| `@app.handler()` | Python functions (recommended) | `@app.handler("name")`                     |

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

# Register with name - single call exposes on ALL channels
app.register("data-fetcher", builder.build(reg))

# What happens internally:
# 1. Nexus stores workflow: self._workflows[name] = workflow
# 2. Gateway registration: self._gateway.register_workflow(name, workflow)
#    → API endpoint: POST /workflows/data-fetcher/execute
#    → CLI command: nexus execute data-fetcher
# 3. MCP registration: self._mcp_channel.register_workflow(name, workflow)
#    → MCP tool: workflow_data-fetcher

# No ChannelManager - Nexus handles everything directly
```

## Critical Rules

### Always Call .build()

```python
# CORRECT
app.register("workflow-name", builder.build(reg))

# WRONG - Will fail
app.register("workflow-name", workflow)
```

### Correct Parameter Order

```python
# CORRECT - name first, workflow second
app.register(name, builder.build(reg))

# WRONG - reversed parameters
app.register(builder.build(reg), name)
```

## Enhanced Registration with Metadata

**NOTE**: Metadata is currently NOT supported in the `register()` method signature.
The method only accepts `(name, workflow)` - no metadata parameter.

```python
# Current: No metadata parameter
app.register("data-fetcher", builder.build(reg))

# Planned for future version:
# app.register("data-fetcher", builder.build(reg), metadata={
#     "version": "1.0.0",
#     "description": "Fetches data from external API",
#     "tags": ["data", "api"]
# })

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

- ❌ `register(name, workflow, metadata)` not supported currently
- ✅ Only `register(name, workflow)` signature available
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
            if hasattr(module, 'workflow'):
                app.register(name, module.builder.build(reg))
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

        app.register(
            wf_config['name'],
            builder.build(reg),
            metadata=wf_config.get('metadata', {})
        )
```

## Workflow Versioning

### Version Management

```python
class WorkflowVersionManager:
    def __init__(self, nexus_app):
        self.app = nexus_app
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

        self.app.register(versioned_name, builder.build(reg), metadata=version_metadata)

        # Track versions
        if name not in self.versions:
            self.versions[name] = []
        self.versions[name].append(version)

        # Register as latest
        latest = max(self.versions[name])
        if version == latest:
            self.app.register(f"{name}:latest", builder.build(reg), metadata=version_metadata)
            self.app.register(name, builder.build(reg), metadata=version_metadata)

    def rollback(self, name, target_version):
        versioned_workflow = self.app.workflows.get(f"{name}:v{target_version}")
        if versioned_workflow:
            self.app.register(name, versioned_workflow.workflow)
            return True
        return False

# Usage
version_mgr = WorkflowVersionManager(app)
version_mgr.register_version("data-api", workflow, "1.0.0")
version_mgr.register_version("data-api", workflow_v2, "2.0.0")
version_mgr.rollback("data-api", "1.0.0")
```

### Blue-Green Deployment

```python
class BlueGreenDeployment:
    def __init__(self, nexus_app):
        self.app = nexus_app
        self.deployments = {}

    def deploy_blue(self, name, workflow, metadata=None):
        blue_name = f"{name}-blue"
        self.app.register(blue_name, builder.build(reg), metadata=metadata)
        print(f"Blue deployed: {blue_name}")
        return blue_name

    def deploy_green(self, name, workflow, metadata=None):
        green_name = f"{name}-green"
        self.app.register(green_name, builder.build(reg), metadata=metadata)
        print(f"Green deployed: {green_name}")
        return green_name

    def switch_traffic(self, name, target_environment):
        """Switch traffic to blue or green"""
        target_name = f"{name}-{target_environment}"

        if target_name in self.app.workflows:
            target_workflow = self.app.workflows[target_name]
            self.app.register(name, target_workflow.workflow, metadata=target_workflow.metadata)
            print(f"Traffic switched to {target_environment}")
            return True
        return False

# Usage
bg = BlueGreenDeployment(app)

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
    def __init__(self, nexus_app):
        self.app = nexus_app
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

        # Register
        self.app.register(name, builder.build(reg), metadata=metadata)

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
lifecycle = WorkflowLifecycleManager(app)
lifecycle.add_hook("pre_register", validate_workflow)
lifecycle.add_hook("pre_register", log_registration)
lifecycle.register_with_lifecycle("my-workflow", workflow)
```

## Conditional Registration

```python
def conditional_register(app, name, workflow_factory, condition_func, metadata=None):
    """Register only if condition is met"""
    if condition_func():
        workflow = workflow_factory()
        app.register(name, builder.build(reg), metadata=metadata)
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
conditional_register(
    app,
    "production-api",
    create_production_workflow,
    is_production,
    metadata={"environment": "production"}
)
```

## WorkflowRegistry (Rust-backed)

The `WorkflowRegistry` class from `kailash.nexus` provides a Rust-backed workflow registry for registering, retrieving, and executing workflows by name.

```python
from kailash.nexus import WorkflowRegistry

registry = WorkflowRegistry()

# Register a workflow definition
registry.register("my-workflow", {"steps": [
    {"type": "HTTPRequestNode", "id": "fetch", "params": {"url": "https://api.example.com/data"}},
    {"type": "JSONTransformNode", "id": "parse", "params": {"expression": "@.results"}},
]})

# Retrieve a registered workflow
wf = registry.get("my-workflow")
# Returns the workflow definition dict

# Execute a registered workflow with input data
result = registry.execute("my-workflow", {"input": "data"})
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
from kailash.nexus import WorkflowRegistry, NexusApp

# Use WorkflowRegistry for centralized workflow management
registry = WorkflowRegistry()

# Register workflow definitions
registry.register("data-pipeline", {"steps": [...]})
registry.register("report-generator", {"steps": [...]})

# Bridge to NexusApp for multi-channel deployment
app = NexusApp()

@app.handler(name="run_workflow", description="Execute a registered workflow")
async def run_workflow(workflow_name: str, input_data: dict) -> dict:
    return registry.execute(workflow_name, input_data)

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
    def safe_register(app, name, workflow, metadata=None, strict=False):
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

        # Register if valid
        app.register(name, builder.build(reg), metadata=metadata)
        print(f"Validated and registered: {name}")
        return True

# Usage
validator = WorkflowValidator()
validator.safe_register(app, "my-workflow", workflow)
```

## Best Practices

1. **Always call .build()** before registration
2. **Use descriptive names** for workflows
3. **Add metadata** for documentation and discovery
4. **Validate workflows** before registration
5. **Use versioning** for production deployments
6. **Implement lifecycle hooks** for monitoring
7. **Test registration** in development environment

## Common Issues

### Workflow Not Found

```python
# Ensure .build() is called
app.register("workflow", builder.build(reg))  # Correct
```

### Auto-Discovery Blocking

```python
# Disable when using DataFlow
app = NexusApp()  # Register workflows manually
```

### Registration Order

```python
# Name first, workflow second
app.register(name, builder.build(reg))  # Correct
```

## Key Takeaways

**Registration Flow:**

- ✅ Single `app.register(name, builder.build(reg))` call
- ✅ Automatically exposes on API, CLI, and MCP channels
- ✅ No ChannelManager - Nexus handles everything directly
- ✅ Enterprise gateway provides multi-channel support

**Current Limitations:**

- ❌ No metadata parameter (use workaround with `_workflow_metadata`)
- ❌ Auto-discovery can block with DataFlow (use `auto_discovery=False`)
- ✅ Versioning and lifecycle management require custom implementation

**Always Remember:**

1. Call `.build()` before registration
2. Use `auto_discovery=False` when integrating with DataFlow
3. Single registration → multi-channel exposure
4. No need to manage channels manually

## Related Skills

- [nexus-quickstart](#) - Basic registration
- [nexus-handler-support](#) - Handler registration (recommended)
- [nexus-dataflow-integration](#) - DataFlow workflow registration
- [nexus-production-deployment](#) - Production patterns
- [nexus-troubleshooting](#) - Fix registration issues
