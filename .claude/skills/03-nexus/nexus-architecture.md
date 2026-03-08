---
skill: nexus-architecture
description: How Nexus works internally - architecture overview, design principles, and implementation details
priority: MEDIUM
tags: [nexus, architecture, design, internal, overview]
---

# Nexus Architecture

Understanding how Nexus works internally.

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                  Nexus Platform                  │
│                                                  │
│  ┌──────────────────────────────────────────┐  │
│  │         Multi-Channel Layer              │  │
│  │  ┌──────┐  ┌──────┐  ┌──────┐          │  │
│  │  │ API  │  │ CLI  │  │ MCP  │          │  │
│  │  └──┬───┘  └──┬───┘  └──┬───┘          │  │
│  └─────┼─────────┼─────────┼──────────────┘  │
│        └─────────┴─────────┘                   │
│                  │                              │
│  ┌───────────────┴──────────────────────────┐  │
│  │        Session Manager & Router          │  │
│  │  - Unified sessions across channels      │  │
│  │  - Request routing and validation        │  │
│  │  - Event broadcasting                    │  │
│  └───────────────┬──────────────────────────┘  │
│                  │                              │
│  ┌───────────────┴──────────────────────────┐  │
│  │         Enterprise Gateway               │  │
│  │  - Authentication & Authorization        │  │
│  │  - Rate Limiting & Circuit Breaker       │  │
│  │  - Caching & Monitoring                  │  │
│  └───────────────┬──────────────────────────┘  │
│                  │                              │
├──────────────────┴──────────────────────────────┤
│              Kailash SDK Core                   │
│  - WorkflowBuilder & Runtime                    │
│  - 139+ Nodes                                   │
│  - Execution Engine                             │
└─────────────────────────────────────────────────┘
```

## Core Components

### 1. Multi-Channel Layer

**Purpose**: Expose workflows via API, CLI, and MCP

**Components**:

- **API Channel**: REST server (via enterprise gateway, axum internally)
- **CLI Channel**: Command-line interface (via enterprise gateway)
- **MCP Channel**: Model Context Protocol server (separate initialization)

**Key Features**:

- Single workflow registration via `Nexus.register()`
- Automatic endpoint generation through enterprise gateway
- Unified parameter handling

**Current Implementation:**

```python
# Current architecture - NO ChannelManager class
class Nexus:
    def __init__(self):
        # Channels initialized by Nexus directly:
        self._initialize_gateway()        # API + CLI channels
        self._initialize_mcp_server()     # MCP channel

    def register(self, name, workflow):
        # Single registration → Multi-channel exposure
        self._gateway.register_workflow(name, workflow)  # API + CLI
        self._mcp_channel.register_workflow(name, workflow)  # MCP

        # All three channels now have the workflow
```

**What Changed from Stubs:**

- ❌ **REMOVED**: `ChannelManager.initialize_channels()` (was stub returning success)
- ❌ **REMOVED**: `ChannelManager.register_workflow_on_channels()` (was stub logging success)
- ✅ **REALITY**: Nexus handles initialization and registration directly

### 2. Workflow State Management

**Purpose**: State tracking across workflow executions

**Approach**: Nexus workflows are stateless by default. For stateful workflows:

- **Workflow inputs/outputs**: Pass state between executions via `inputs`
- **EventBus**: Track lifecycle events with `app.event_bus()`
- **DataFlow**: Persist state in a database

```python
import kailash
from kailash.nexus import NexusApp

app = NexusApp()
bus = app.event_bus()

# Track workflow lifecycle events
app.on("workflow_started", lambda e: print(f"Started: {e}"))
app.on("workflow_completed", lambda e: print(f"Completed: {e}"))

# Publish custom events for cross-component communication
bus.publish("user_action", {"user_id": "123", "action": "login"})
```

### 3. Enterprise Gateway

**Purpose**: Production-grade features

**Components**:

- **Authentication**: OAuth2, JWT, API keys
- **Authorization**: RBAC, permissions
- **Rate Limiting**: Per-user, per-endpoint
- **Circuit Breaker**: Failure handling
- **Caching**: Response caching
- **Monitoring**: Metrics and tracing

The enterprise gateway is implemented server-side in Rust via axum + tower middleware.
NexusAuthPlugin configures JWT, RBAC, and tenant isolation. Rate limiting is configured
via `app.add_rate_limit()`. These are composed as tower middleware layers, not Python classes.

```python
# Configure enterprise gateway features via NexusApp methods and NexusAuthPlugin
from kailash.nexus import NexusApp, NexusAuthPlugin, JwtConfig, RbacConfig

app = NexusApp(config=NexusConfig(port=3000))
app.add_rate_limit(max_requests=1000, window_secs=60)

auth = NexusAuthPlugin(
    jwt=JwtConfig(secret_key=os.environ["JWT_SECRET"]),
    rbac=RbacConfig(roles={"admin": ["*"], "user": ["users.read"]}),
    tenant_header="X-Tenant-ID",
)
```

### 4. Workflow Registry

**Purpose**: Manage registered workflows

```python
# Workflow registration is handled by NexusApp directly
app = NexusApp(config=NexusConfig(port=3000))

# Register workflows
app.register("my-workflow", builder.build(reg))

# List registered handlers
handlers = app.get_registered_handlers()
print(handlers)
```

## Design Principles

### 1. Zero Configuration

**Goal**: Work out-of-the-box with no config

```python
# Just works
app = NexusApp()
app.start()
```

**Implementation**:

- Smart defaults for all settings
- Auto-detection of environment
- Graceful fallbacks

### 2. Progressive Enhancement

**Goal**: Start simple, add features as needed

```python
# Start simple
app = NexusApp()

# Add features progressively
app.add_rate_limit(1000)
# Auth configured via NexusAuthPlugin (see nexus-auth-plugin.md)
```

**Implementation**:

- Feature flags for all components
- Lazy initialization
- Optional dependencies

### 3. Multi-Channel Orchestration

**Goal**: Single source, multiple interfaces

**Implementation**:

- Abstract workflow execution layer
- Channel-agnostic request handling
- Unified response formatting

### 4. Built on Core SDK

**Goal**: Leverage existing Kailash SDK

**Benefits**:

- No SDK modification needed
- All 139+ nodes available
- Proven execution engine

```python
# Nexus uses Kailash SDK underneath
import kailash

reg = kailash.NodeRegistry()

# Build workflow with SDK
builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "test", {...})

# Nexus registers and exposes it
app.register("test", builder.build(reg))
```

## Request Flow

### API Request Flow

```
1. Client sends HTTP POST to /workflows/name/execute
   ↓
2. Enterprise Gateway receives request
   ↓
3. Gateway processes (built-in):
   - Authentication (if enabled)
   - Rate limiting (if configured)
   - Request validation
   ↓
4. Gateway retrieves workflow from registry
   ↓
5. Kailash Runtime executes workflow
   ↓
6. Gateway formats response
   ↓
7. Monitoring records metrics (if enabled)
   ↓
8. Response returned to client

NOTE: Session management uses lazy initialization (v1.1 planned feature)
NOTE: Response caching is optional (enable_durability flag)
```

### CLI Request Flow

```
1. User executes: nexus run workflow-name --param value
   ↓
2. CLI Channel parses arguments
   ↓
3. Converts to workflow request format
   ↓
4. Routes through Enterprise Gateway
   ↓
5. Workflow executed via Runtime
   ↓
6. Output formatted for terminal
   ↓
7. Displayed to user
```

### MCP Request Flow

```
1. AI agent discovers tools via MCP
   ↓
2. Agent calls tool with parameters
   ↓
3. MCP Channel receives request
   ↓
4. Routes through Enterprise Gateway
   ↓
5. Workflow executed
   ↓
6. Result formatted for AI consumption
   ↓
7. Returned to agent
```

## Parameter Broadcasting

Parameter broadcasting is handled internally by the Rust runtime. API inputs
are broadcast to all nodes in the workflow -- each node receives the full
inputs dict merged with its static config.

## Key Implementation Details

### Auto-Discovery

Auto-discovery scans for workflow files matching patterns like `workflows/*.py`,
`*.workflow.py`, `workflow_*.py`, `*_workflow.py`. However, auto-discovery is
disabled by default and should stay disabled when using DataFlow to avoid blocking.
Register workflows manually with `app.register()` or `@app.handler()` instead.

### Health Checking

```python
# Health checking is built into NexusApp
app = NexusApp()
health = app.health_check()
print(health)  # {"status": "healthy", ...}

# Health endpoint is available at GET /health
```

## Performance Optimizations

### 1. Connection Pooling

```python
# Database connections
pool = ConnectionPool(
    min_connections=5,
    max_connections=20,
    timeout=30
)
```

### 2. Response Caching

```python
# Cache expensive workflows
cache.set(
    key=f"workflow:{name}:{hash(inputs)}",
    value=result,
    ttl=300
)
```

### 3. Async Execution

```python
# Use async runtime
import kailash

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(workflow, inputs)
```

## Key Takeaways

- **Multi-layer architecture**: Nexus → Enterprise Gateway → Kailash SDK
- **Zero-configuration**: `Nexus()` with smart defaults
- **Built on Kailash SDK**: Leverages proven workflow execution
- **Single registration path**: `Nexus.register()` handles all channels
- **Enterprise gateway integration**: Multi-channel support
- **Parameter broadcasting**: Inputs broadcast to all nodes via runtime

**Current Features:**

- ✅ Multi-channel exposure (API, CLI, MCP)
- ✅ Workflow registration and execution
- ✅ Custom REST endpoints with rate limiting
- ✅ Health monitoring and metrics
- ✅ Event logging (via EventBus `subscribe()` and `publish()`)

**Planned for v1.1:**

- 🔜 Real-time event broadcasting (WebSocket/SSE)
- 🔜 Automatic workflow schema inference
- 🔜 Cross-channel session synchronization

## Related Skills

- [nexus-quickstart](#) - Get started quickly
- [nexus-multi-channel](#) - Multi-channel deep dive
- [nexus-enterprise-features](#) - Enterprise components
- [nexus-production-deployment](#) - Deploy architecture
