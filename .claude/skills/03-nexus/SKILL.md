---
name: nexus
description: "Kailash Nexus (Rust) — MANDATORY for API+CLI+MCP unified deployment. Direct axum/tonic BLOCKED."
---

# Kailash Nexus - Multi-Channel Platform Framework

Nexus is a zero-config multi-channel platform built on Kailash Core SDK that deploys workflows as API + CLI + MCP simultaneously.

## Features

Nexus transforms workflows into a complete platform with:

- **Zero Configuration**: Deploy workflows instantly without boilerplate code
- **Multi-Channel Access**: API, CLI, and MCP from single deployment
- **Unified Sessions**: Consistent session management across all channels
- **Enterprise Features**: Health monitoring, plugins, event system, comprehensive logging
- **DataFlow Integration**: Automatic CRUD API generation from database models
- **Production Ready**: Deployment patterns, monitoring, troubleshooting guides
- **Multi-Channel Platform**: Workflow-based platform without manual route definition
- **Async-First**: Uses kailash.Runtime by default for optimal performance

## Quick Start

```python
from kailash.nexus import NexusApp, NexusConfig

# Create app with custom port (or use defaults: host=0.0.0.0, port=3000)
app = NexusApp(config=NexusConfig(port=3000))

# Register handler - deployed to all channels at once
@app.handler(name="greet", description="Greet a user")
async def greet(name: str) -> dict:
    return {"message": f"Hello, {name}!"}

# Start the server (no arguments - host/port come from NexusConfig)
app.start()

# Now available via:
# - HTTP API: POST http://localhost:3000/api/greet
# - CLI: nexus run greet --name "World"
# - MCP: Connect via MCP client (Claude Desktop, etc.)
```

## Reference Documentation

### Getting Started

- **[nexus-quickstart](nexus-quickstart.md)** - Quick start guide
- **[nexus-installation](nexus-installation.md)** - Installation and setup
- **[nexus-architecture](nexus-architecture.md)** - Architecture overview
- **[README](README.md)** - Framework overview
- **[nexus-comparison](nexus-comparison.md)** - Nexus vs alternatives

### Core Concepts

- **[nexus-workflow-registration](nexus-workflow-registration.md)** - Registering workflows
- **[nexus-multi-channel](nexus-multi-channel.md)** - Multi-channel architecture
- **[nexus-sessions](nexus-sessions.md)** - Session management
- **[nexus-config-options](nexus-config-options.md)** - Configuration options

### Channel-Specific Patterns

- **[nexus-api-patterns](nexus-api-patterns.md)** - HTTP API patterns
- **[nexus-api-input-mapping](nexus-api-input-mapping.md)** - API input handling
- **[nexus-cli-patterns](nexus-cli-patterns.md)** - CLI usage patterns
- **[nexus-mcp-channel](nexus-mcp-channel.md)** - MCP channel configuration

### Integration

- **[nexus-dataflow-integration](nexus-dataflow-integration.md)** - DataFlow + Nexus patterns
- **[nexus-plugins](nexus-plugins.md)** - Plugin system
- **[nexus-event-system](nexus-event-system.md)** - Event-driven architecture

### Production & Operations

- **[nexus-production-deployment](nexus-production-deployment.md)** - Production deployment
- **[nexus-health-monitoring](nexus-health-monitoring.md)** - Health checks and monitoring
- **[nexus-enterprise-features](nexus-enterprise-features.md)** - Enterprise capabilities
- **[nexus-troubleshooting](nexus-troubleshooting.md)** - Common issues and solutions

### Additional Skills

- **[nexus-handler-support](nexus-handler-support.md)** - `@app.handler()` decorator for direct function registration
- **[nexus-auth-plugin](nexus-auth-plugin.md)** - NexusAuthPlugin unified auth (JWT, RBAC, SSO, rate limiting, tenant, audit)
- **[golden-patterns-catalog](golden-patterns-catalog.md)** - Top 7 production-validated codegen patterns
- **[codegen-decision-tree](codegen-decision-tree.md)** - Decision tree, anti-patterns, scaffolding templates

## Key Concepts

### Zero-Config Platform

Nexus eliminates boilerplate:

- **No manual routes** - Automatic API generation from workflows
- **No CLI arg parsing** - Automatic CLI creation
- **No MCP server setup** - Automatic MCP integration
- **Unified deployment** - One command for all channels

### Multi-Channel Architecture

Single deployment, three access methods:

1. **HTTP API**: RESTful JSON endpoints
2. **CLI**: Command-line interface
3. **MCP**: Model Context Protocol server

### Unified Sessions

Consistent session management:

- Cross-channel session tracking
- Session state persistence
- Session-scoped workflows
- Concurrent session support

### Enterprise Features

Production-ready capabilities:

- Health monitoring endpoints
- Plugin system for extensibility
- Event system for integrations
- Comprehensive logging and metrics
- Correct channel initialization flow
- Proper workflow registration

## When to Use This Skill

Use Nexus when you need to:

- Deploy workflows as production platforms
- Provide multiple access methods (API/CLI/MCP)
- Build enterprise platforms quickly
- Auto-generate CRUD APIs (with DataFlow)
- Build multi-channel platforms quickly
- Create multi-channel applications
- Deploy AI agent platforms (with Kaizen)

## Integration Patterns

### With DataFlow (Database-Backed Handlers)

```python
from kailash.nexus import NexusApp, NexusConfig
import kailash

# Initialize DataFlow
df = kailash.DataFlow("postgresql://user:pass@localhost/db")

@db.model
class User:
    id: str
    name: str

# Create Nexus app and register database-backed handlers
app = NexusApp(config=NexusConfig(port=3000))

@app.handler(name="create_user", description="Create a new user")
async def create_user(name: str) -> dict:
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("CreateUser", "create", {"data": {"name": name}})
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["create"]["result"]

app.start()
```

### With Kaizen (Agent Platform)

```python
from kailash.nexus import NexusApp
from kailash.kaizen import BaseAgent

# Deploy agents via all channels using handlers
app = NexusApp()

@app.handler(name="agent_chat", description="Chat with AI agent")
async def agent_chat(message: str) -> dict:
    agent = BaseAgent()
    result = agent.execute(message)
    return {"response": result.get("output", "")}

app.start()  # Agents accessible via API, CLI, and MCP
```

### With Core SDK (Custom Workflows)

```python
from kailash.nexus import NexusApp, NexusConfig
import kailash

app = NexusApp(config=NexusConfig(port=3000))

# Register workflow execution as handlers
@app.handler(name="process_data", description="Run data processing workflow")
async def process_data(input_text: str) -> dict:
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "process", {
        "code": "result = {'processed': True}",
        "output_vars": ["result"]
    })
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["process"]["outputs"]

app.start()
```

### Standalone Platform

```python
from kailash.nexus import NexusApp, NexusConfig, Preset

# Complete platform with enterprise preset and custom config
app = NexusApp(
    config=NexusConfig(host="0.0.0.0", port=3000),
    preset="enterprise",  # or Preset.enterprise()
)

# Add middleware
app.add_cors(origins=["https://app.example.com"])
app.add_rate_limit(max_requests=100, window_secs=60)

# Register handlers
@app.handler(name="status", description="Platform status")
async def status() -> dict:
    return app.health_check()

app.start()  # Host/port configured via NexusConfig
```

## Critical Rules

- Use Nexus for workflow platforms
- Register workflows, not individual routes
- Leverage unified sessions across channels
- Enable health monitoring in production
- Use plugins for custom behavior
- Nexus uses kailash.Runtime by default (correct for Docker)
- NEVER bypass Nexus with raw framework routes
- NEVER implement manual API/CLI/MCP servers when Nexus can do it
- NEVER skip health checks in production

## Deployment Patterns

### Development

```python
from kailash.nexus import NexusApp

app = NexusApp()  # Defaults: host=0.0.0.0, port=3000

@app.handler(name="hello", description="Hello world")
async def hello(name: str = "World") -> dict:
    return {"message": f"Hello, {name}!"}

app.start()
```

### Production (Docker)

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(
    config=NexusConfig(host="0.0.0.0", port=3000),
    preset="enterprise",
)
app.add_cors(origins=["https://app.example.com"])
app.add_rate_limit(max_requests=100, window_secs=60)

# Register production handlers...

app.start()
```

### With Load Balancer

```bash
# Deploy multiple Nexus instances behind nginx/traefik
docker-compose up --scale nexus=3
```

## Channel Comparison

| Feature       | API  | CLI       | MCP         |
| ------------- | ---- | --------- | ----------- |
| **Access**    | HTTP | Terminal  | MCP Clients |
| **Input**     | JSON | Args/JSON | Structured  |
| **Output**    | JSON | Text/JSON | Structured  |
| **Sessions**  | Yes  | Yes       | Yes         |
| **Auth**      | Yes  | Yes       | Yes         |
| **Streaming** | Yes  | Yes       | Yes         |

## DataFlowEventBridge (NP-023)

Feature-gated behind `dataflow-bridge`. Bridges DataFlow model change events to the Nexus EventBus, enabling Nexus subscribers (SSE clients, plugin hooks, monitoring) to react to DataFlow writes without direct coupling.

```toml
kailash-nexus = { version = "...", features = ["dataflow-bridge"] }
```

### NexusEvent::DataFlowEvent variant

| Field        | Type                | Description                                                      |
| ------------ | ------------------- | ---------------------------------------------------------------- |
| `event_type` | `String`            | DataFlow event type (`"model.created"`, `"model.updated"`, etc.) |
| `model_name` | `String`            | Name of the model that changed                                   |
| `payload`    | `serde_json::Value` | Event payload as JSON                                            |
| `timestamp`  | `DateTime<Utc>`     | When the change occurred                                         |

Subscribes to topics: `model.created`, `model.updated`, `model.deleted`, `model.upserted`, `model.bulk_created`.

### Usage

```rust
use kailash_nexus::Nexus;
use std::sync::Arc;

// domain_bus is the DomainEventBus from DataFlow
let mut nexus = Nexus::new(config);
nexus.bridge_dataflow(domain_bus);
```

`Nexus::bridge_dataflow(&mut self, domain_bus: Arc<dyn DomainEventBus>) -> &mut Self` registers the bridge as a background service. The bridge converts each `DomainEvent` into a `NexusEvent::DataFlowEvent` and publishes it on the Nexus `EventBus`.

Source: `crates/kailash-nexus/src/bridge.rs`, `crates/kailash-nexus/src/events/mod.rs`

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core workflow patterns
- **[02-dataflow](../02-dataflow/SKILL.md)** - Auto CRUD API generation
- **[04-kaizen](../04-kaizen/SKILL.md)** - AI agent deployment
- **[05-kailash-mcp](../05-kailash-mcp/SKILL.md)** - MCP channel details
- **[17-gold-standards](../../17-gold-standards/SKILL.md)** - Best practices

## Support

For Nexus-specific questions, invoke:

- `nexus-specialist` - Nexus implementation and deployment
- `release-specialist` - Production deployment patterns
- ``decide-framework` skill` - When to use Nexus vs other approaches
