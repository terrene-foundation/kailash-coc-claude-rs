---
name: decide-framework
description: "Choose between Core SDK, DataFlow, Nexus, and Kaizen frameworks for your Kailash Rust project. Use when asking 'which framework', 'should I use Core SDK or DataFlow', 'Nexus vs Core', 'framework selection', or 'what's the difference between frameworks'."
---

# Framework Selection Guide

Quick decision tree to choose the right Kailash framework: Core SDK, DataFlow, Nexus, or Kaizen.

> **Skill Metadata**
> Category: `cross-cutting` (decision-support)
> Priority: `CRITICAL`
> Related Skills: [`dataflow-quickstart`](../../02-dataflow/dataflow-quickstart.md), [`nexus-quickstart`](../../03-nexus/nexus-quickstart.md), [`kaizen-baseagent-template`](../../04-kaizen/kaizen-baseagent-template.md)
> Related Subagents: ``decide-framework` skill` (complex architecture), `dataflow-specialist`, `nexus-specialist`, `kaizen-specialist`

## Quick Decision Matrix

| Your Primary Need                        | Choose                | Why                                            |
| ---------------------------------------- | --------------------- | ---------------------------------------------- |
| **Custom workflows, integrations**       | **Core SDK**          | Fine-grained control, 140+ nodes               |
| **Database operations**                  | **DataFlow**          | Zero-config, 11 auto-generated nodes per model |
| **Multi-channel platform** (API+CLI+MCP) | **Nexus**             | Zero-config multi-channel deployment           |
| **AI agents, multi-agent systems**       | **Kaizen**            | Signature-based programming, BaseAgent         |
| **Database + Multi-channel**             | **DataFlow + Nexus**  | Combine frameworks                             |
| **AI + Workflows**                       | **Core SDK + Kaizen** | Custom workflows with AI                       |
| **Complete AI platform**                 | **All 4**             | Full-stack enterprise solution                 |

## Framework Comparison

### Core SDK (`kailash-core` / `kailash-nodes`)

**Foundational building blocks for workflow automation**

**When to Choose:**

- Building custom workflows and automation
- Need fine-grained control over execution
- Integrating with existing systems
- Creating domain-specific solutions
- Single-purpose workflows

**Key Components:**

- WorkflowBuilder with 140+ nodes
- Unified Runtime with `execute()` (async) and `execute_sync()` (sync)
- String-based node API
- NodeRegistry for node discovery

**Example:**

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();
builder.add_node("CSVProcessorNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));
builder.add_node("JSONTransformNode", "process", ValueMap::from([
    ("expression".into(), Value::String("@.length()".into())),
]));
builder.connect("reader", "data", "process", "data");

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::new()).await?;
```

### DataFlow (`kailash-dataflow`)

**Zero-config database framework built ON Core SDK**

**When to Choose:**

- Database operations are primary concern
- Need automatic CRUD node generation
- Want enterprise database features (pooling, transactions)
- Building data-intensive applications
- PostgreSQL or SQLite database

**Key Features:**

- `ModelDefinition` generates 11 nodes per model
- Compile-time query verification via sqlx
- Multi-tenancy, audit trails, compliance
- Auto-migration system
- **NOT an ORM** -- workflow-based

**Example:**

```rust
use kailash_dataflow::{DataFlow, ModelDefinition, FieldType};

let user_model = ModelDefinition::new("User")
    .field("id", FieldType::Integer, |f| f.primary_key())
    .field("name", FieldType::String, |f| f.required())
    .field("email", FieldType::String, |f| f.required().unique())
    .build()?;

let df = DataFlow::new("postgres://localhost/db").await?;
df.register_model(user_model)?;
// Auto-generates: CreateUser, ReadUser, UpdateUser, DeleteUser,
// ListUser, BulkCreateUser, CountUser, UpsertUser, etc.
```

### Nexus (`kailash-nexus`)

**Multi-channel platform built ON Core SDK**

**When to Choose:**

- Need API + CLI + MCP access simultaneously
- Want zero-configuration platform deployment
- Building AI agent integrations (MCP)
- Require unified session management
- Enterprise platform deployment

**Key Features:**

- Builder pattern: `NexusApp::builder().preset(Preset::Standard).build()?`
- Automatic workflow registration
- Unified sessions across all channels
- Tower middleware: CORS, rate limiting, auth, audit
- Preset system: None, Lightweight, Standard, SaaS, Enterprise

**Example:**

```rust
use kailash_nexus::{NexusApp, Preset};

let app = NexusApp::builder()
    .preset(Preset::Standard)
    .build()?;

app.register("my_handler", handler_fn).await?;
app.serve("0.0.0.0:3000").await?;
// Now accessible via API, CLI, and MCP
```

### Kaizen (`kailash-kaizen`)

**AI agent framework built ON Core SDK**

**When to Choose:**

- Building AI agents with LLMs
- Multi-agent coordination needed
- Signature-based programming preferred
- Multi-modal processing (vision/audio/text)
- A2A protocol for semantic capability matching

**Key Features:**

- BaseAgent architecture with TAOD loop (think/act/observe/decide)
- `#[derive(Signature)]` for structured I/O contracts
- OrchestrationRuntime for multi-agent coordination
- LLM providers: OpenAI, Anthropic, Google, Mistral, Cohere via raw HTTP
- Cost tracking with atomic microdollar accounting

**Example:**

```rust
use kailash_kaizen::{BaseAgent, AgentConfig, LlmClient};

let config = AgentConfig::builder()
    .provider("openai")
    .model_from_env("OPENAI_MODEL")
    .build()?;

let agent = BaseAgent::new(config);
let response = agent.run("What is machine learning?").await?;
```

## Framework Combinations

### DataFlow + Nexus (Multi-Channel Database App)

Perfect for database applications needing API, CLI, and MCP access:

```rust
use kailash_dataflow::{DataFlow, ModelDefinition, FieldType};
use kailash_nexus::{NexusApp, Preset};
use kailash_core::{WorkflowBuilder, NodeRegistry};
use kailash_core::value::ValueMap;
use std::sync::Arc;

// Step 1: Define models
let user_model = ModelDefinition::new("User")
    .field("id", FieldType::Integer, |f| f.primary_key())
    .field("name", FieldType::String, |f| f.required())
    .field("email", FieldType::String, |f| f.required().unique())
    .build()?;

let df = DataFlow::new("postgres://localhost/db").await?;
df.register_model(user_model)?;

// Step 2: Create Nexus app
let app = NexusApp::builder()
    .preset(Preset::Standard)
    .build()?;

// Step 3: Register workflows using generated nodes
let registry = Arc::new(NodeRegistry::default());
let mut builder = WorkflowBuilder::new();
builder.add_node("ListUser", "list_users", ValueMap::new());
let workflow = builder.build(&registry)?;

app.register("list_users", workflow).await?;
app.serve("0.0.0.0:3000").await?;
```

### Core SDK + Kaizen (AI-Powered Workflows)

Ideal for custom workflows with AI decision-making:

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();
builder.add_node("LLMNode", "ai_process", ValueMap::from([
    ("provider".into(), Value::String("openai".into())),
    ("model".into(), Value::String(
        std::env::var("OPENAI_MODEL").unwrap_or_default().into()
    )),
]));

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::new()).await?;
```

## Decision Flowchart

```
START: What's your primary use case?
  |
  |-- Database-heavy application?
  |     YES -> DataFlow
  |     |
  |     +-- Need multi-channel access (API/CLI/MCP)?
  |          YES -> DataFlow + Nexus
  |          NO -> DataFlow alone
  |
  |-- Multi-channel platform needed?
  |     YES -> Nexus
  |     |
  |     +-- Need database operations?
  |          YES -> DataFlow + Nexus
  |          NO -> Nexus alone
  |
  |-- AI agent system?
  |     YES -> Kaizen
  |     |
  |     +-- Need custom workflow orchestration?
  |          YES -> Kaizen + Core SDK
  |          NO -> Kaizen alone
  |
  +-- Custom workflows/integrations?
       YES -> Core SDK
```

## When to Escalate to Subagent

Use ``decide-framework` skill` subagent when:

- Complex multi-framework architecture needed
- Evaluating migration paths between frameworks
- Enterprise-scale system design
- Need coordination between multiple specialists

Use framework specialists when you've chosen:

- **DataFlow** -> `dataflow-specialist` for implementation
- **Nexus** -> `nexus-specialist` for deployment
- **Kaizen** -> `kaizen-specialist` for AI patterns

## Documentation References

### Framework Documentation

- **Workspace Architecture**: [`CLAUDE.md`](../../../../CLAUDE.md) -- Workspace Architecture section
- **Core SDK**: `crates/kailash-core/` -- Node trait, WorkflowBuilder, Runtime
- **DataFlow**: `crates/kailash-dataflow/` -- ModelDefinition, sqlx, QueryInterceptor
- **Nexus**: `crates/kailash-nexus/` -- axum handlers, tower middleware, presets
- **Kaizen**: `crates/kailash-kaizen/` -- BaseAgent, TAOD loop, OrchestrationRuntime

### Detailed Guides

- **Skills**: `.claude/skills/01-core/`, `.claude/skills/02-dataflow/`, `.claude/skills/03-nexus/`, `.claude/skills/04-kaizen/`
- **Examples**: `examples/` directory

## Quick Tips

- **Start with Core SDK**: If unsure, start with Core SDK and add frameworks later
- **Frameworks stack**: DataFlow/Nexus/Kaizen are built ON Core SDK, not replacements
- **Mix and match**: You can use multiple frameworks in the same project
- **Consult specialists**: Use framework-specific subagents for detailed implementation

<!--Trigger Keywords: which framework, should I use Core SDK or DataFlow, Nexus vs Core, framework selection, what's the difference between frameworks, choose framework, Core SDK vs DataFlow, DataFlow vs Nexus, framework comparison, best framework for, framework decision -->
