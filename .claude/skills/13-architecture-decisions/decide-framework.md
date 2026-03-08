---
name: decide-framework
description: "Choose between Core SDK, DataFlow, Nexus, and Kaizen frameworks for your Kailash project. Use when asking 'which framework', 'should I use Core SDK or DataFlow', 'Nexus vs Core', 'framework selection', or 'what's the difference between frameworks'."
---

# Framework Selection Guide

Quick decision tree to choose the right Kailash framework: Core SDK, DataFlow, Nexus, or Kaizen.

> **Skill Metadata**
> Category: `cross-cutting` (decision-support)
> Priority: `CRITICAL`
> Related Skills: [`dataflow-quickstart`](../../02-dataflow/dataflow-quickstart.md), [`nexus-quickstart`](../../03-nexus/nexus-quickstart.md), [`kaizen-baseagent-template`](../../04-kaizen/kaizen-baseagent-template.md)
> Related Subagents: `framework-advisor` (complex architecture), `dataflow-specialist`, `nexus-specialist`, `kaizen-specialist`

## Quick Decision Matrix

| Your Primary Need                        | Choose                | Why                                            |
| ---------------------------------------- | --------------------- | ---------------------------------------------- |
| **Custom workflows, integrations**       | **Core SDK**          | Fine-grained control, 139+ nodes               |
| **Database operations**                  | **DataFlow**          | Zero-config, 11 auto-generated nodes per model |
| **Multi-channel platform** (API+CLI+MCP) | **Nexus**             | Zero-config multi-channel deployment           |
| **AI agents, multi-agent systems**       | **Kaizen**            | Signature-based programming, BaseAgent         |
| **Database + Multi-channel**             | **DataFlow + Nexus**  | Combine frameworks                             |
| **AI + Workflows**                       | **Core SDK + Kaizen** | Custom workflows with AI                       |
| **Complete AI platform**                 | **All 4**             | Full-stack enterprise solution                 |

## Framework Comparison

### Core SDK (`pip install kailash-enterprise`)

**Foundational building blocks for workflow automation**

**When to Choose:**

- ✅ Building custom workflows and automation
- ✅ Need fine-grained control over execution
- ✅ Integrating with existing systems
- ✅ Creating domain-specific solutions
- ✅ Single-purpose workflows

**Key Components:**

- WorkflowBuilder with 139+ nodes
- Runtime with NodeRegistry
- String-based node API
- MCP integration built-in

**Example:**

```python
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("CSVProcessorNode", "reader", {"action": "read", "source_path": "data.csv"})
builder.add_node("EmbeddedPythonNode", "process", {"code": "result = len(data)"})
builder.connect("reader", "rows", "process", "data")

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### DataFlow (`pip install kailash-enterprise` -- DataFlow included)

**Zero-config database framework built ON Core SDK**

**When to Choose:**

- ✅ Database operations are primary concern
- ✅ Need automatic CRUD node generation
- ✅ Want enterprise database features (pooling, transactions)
- ✅ Building data-intensive applications
- ✅ PostgreSQL or SQLite database

**Key Features:**

- `@db.model` decorator generates 11 nodes per model
- MongoDB-style query syntax
- Multi-tenancy, audit trails, compliance
- Auto-migration system
- **NOT an ORM** - workflow-based

**Example:**

```python

df = kailash.DataFlow("postgresql://localhost/db")

@db.model
class User:
    name: str
    email: str

# Automatically generates: UserCreateNode, UserReadNode, UserUpdateNode,
# UserDeleteNode, UserListNode, UserBulkCreateNode, etc.

builder = kailash.WorkflowBuilder()
builder.add_node("UserCreateNode", "create", {
    "name": "Alice",
    "email": "alice@example.com"
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Nexus (`pip install kailash-enterprise` -- Nexus included)

**Multi-channel platform built ON Core SDK**

**When to Choose:**

- ✅ Need API + CLI + MCP access simultaneously
- ✅ Want zero-configuration platform deployment
- ✅ Building AI agent integrations (MCP)
- ✅ Require unified session management
- ✅ Enterprise platform deployment

**Key Features:**

- True zero-config: `NexusApp()` with no parameters
- Automatic workflow registration
- Unified sessions across all channels
- Progressive enterprise enhancement

**Example:**

```python

from kailash.nexus import NexusApp

app = NexusApp()  # Zero configuration!

builder = kailash.WorkflowBuilder()
builder.add_node("EmbeddedPythonNode", "process", {
    "code": "result = {'message': 'Hello!'}"
})

reg = kailash.NodeRegistry()
app.register("my_workflow", builder.build(reg))
app.start()  # Now accessible via API, CLI, and MCP!
```

### Kaizen (`pip install kailash-enterprise` -- Kaizen included)

**AI agent framework built ON Core SDK**

**When to Choose:**

- ✅ Building AI agents with LLMs
- ✅ Multi-agent coordination needed
- ✅ Signature-based programming preferred
- ✅ Multi-modal processing (vision/audio/text)
- ✅ A2A protocol for semantic capability matching

**Key Features:**

- BaseAgent architecture with lazy initialization
- Signature-based I/O (InputField/OutputField)
- Memory management with write_to_memory() and read_relevant()
- Automatic A2A capability card generation

**Example:**

```python
from dataclasses import dataclass

class QASignature(Signature):
    question: str = InputField(description="User question")
    answer: str = OutputField(description="Answer")

@dataclass
class QAConfig:
    model: str = os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o")  # provider auto-detected from model name

class QAAgent(BaseAgent):
    def __init__(self, config: QAConfig):
        super().__init__(config=config, signature=QASignature())

    def ask(self, question: str) -> dict:
        return self.run(question=question)

agent = QAAgent(QAConfig())
result = agent.ask("What is machine learning?")
```

## Framework Combinations

### DataFlow + Nexus (Multi-Channel Database App)

Perfect for database applications needing API, CLI, and MCP access:

```python

# Step 1: Create NexusApp
from kailash.nexus import NexusApp

app = NexusApp()

# Step 2: Create kailash.DataFlow (defaults work correctly)
df = kailash.DataFlow("postgresql://localhost/db")

@db.model
class User:
    name: str
    email: str

# Step 3: Register workflows
builder = kailash.WorkflowBuilder()
builder.add_node("UserListNode", "list_users", {})
reg = kailash.NodeRegistry()
app.register("list_users", builder.build(reg))

app.start()
```

### Core SDK + Kaizen (AI-Powered Workflows)

Ideal for custom workflows with AI decision-making:

```python

# Kaizen agent for AI processing
agent = QAAgent(config)

# Core SDK workflow for orchestration
builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "ai_process", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o")  # provider auto-detected from model name
})
```

## Decision Flowchart

```
START: What's your primary use case?
  │
  ├─ Database-heavy application?
  │    YES → kailash.DataFlow
  │    │
  │    └─ Need multi-channel access (API/CLI/MCP)?
  │         YES → kailash.DataFlow + Nexus
  │         NO → kailash.DataFlow alone
  │
  ├─ Multi-channel platform needed?
  │    YES → Nexus
  │    │
  │    └─ Need database operations?
  │         YES → kailash.DataFlow + Nexus
  │         NO → Nexus alone
  │
  ├─ AI agent system?
  │    YES → Kaizen
  │    │
  │    └─ Need custom workflow orchestration?
  │         YES → Kaizen + Core SDK
  │         NO → Kaizen alone
  │
  └─ Custom workflows/integrations?
       YES → Core SDK
```

## When to Escalate to Subagent

Use `framework-advisor` subagent when:

- Complex multi-framework architecture needed
- Evaluating migration paths between frameworks
- Enterprise-scale system design
- Need coordination between multiple specialists

Use framework specialists when you've chosen:

- **DataFlow** → `dataflow-specialist` for implementation
- **Nexus** → `nexus-specialist` for deployment
- **Kaizen** → `kaizen-specialist` for AI patterns

## Documentation References

### Framework Documentation

- **Core SDK Overview**: [`CLAUDE.md` (lines 12-17)](../../../../CLAUDE.md#L12-L17)
- **DataFlow Overview**: [`CLAUDE.md` (lines 19-25)](../../../../CLAUDE.md#L19-L25)
- **Nexus Overview**: [`CLAUDE.md` (lines 27-33)](../../../../CLAUDE.md#L27-L33)
- **Kaizen Overview**: [`CLAUDE.md` (lines 35-41)](../../../../CLAUDE.md#L35-L41)
- **Framework Relationships**: [`CLAUDE.md` (lines 43-46)](../../../../CLAUDE.md#L43-L46)

### Detailed Guides

- **Framework Advisor**: [`.claude/agents/framework-advisor.md`](../../../../.claude/agents/framework-advisor.md)

## Quick Tips

- 💡 **Start with Core SDK**: If unsure, start with Core SDK and add frameworks later
- 💡 **Frameworks stack**: DataFlow/Nexus/Kaizen are built ON Core SDK, not replacements
- 💡 **Mix and match**: You can use multiple frameworks in the same project
- 💡 **Zero-config first**: Try DataFlow/Nexus zero-config before adding complexity
- 💡 **Consult specialists**: Use framework-specific subagents for detailed implementation

<!--Trigger Keywords: which framework, should I use Core SDK or DataFlow, Nexus vs Core, framework selection, what's the difference between frameworks, choose framework, Core SDK vs DataFlow, DataFlow vs Nexus, framework comparison, best framework for, framework decision -->
