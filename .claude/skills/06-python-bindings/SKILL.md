# Python Binding Reference

Python API reference for the Rust-backed `kailash-enterprise` package.

## Quick Links

| Skill                                                     | Description                                        |
| --------------------------------------------------------- | -------------------------------------------------- |
| [python-quickstart](python-quickstart.md)                 | Complete working script and result structure       |
| [python-cheatsheet](python-cheatsheet.md)                 | 30+ copy-paste patterns for common operations      |
| [python-common-mistakes](python-common-mistakes.md)       | Top 10 mistakes and error resolution               |
| [python-gold-standards](python-gold-standards.md)         | Compliance checklist for all code                  |
| [python-custom-nodes](python-custom-nodes.md)             | Register Python callables as workflow nodes        |
| [python-available-nodes](python-available-nodes.md)       | All 139 built-in node types by category            |
| [python-framework-bindings](python-framework-bindings.md) | DataFlow, Enterprise, Kaizen, Nexus Python APIs    |
| [python-migration-guide](python-migration-guide.md)       | Migrate from pure Python SDK to kailash-enterprise |

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "node_id", {"param": "value"})
builder.connect("source", "output", "target", "input")
wf = builder.build(reg)

rt = kailash.Runtime(reg)
result = rt.execute(wf)
# result is dict: {"results": {...}, "run_id": "...", "metadata": {...}}
```

## Install

```bash
pip install kailash-enterprise
```

## Phase 17 Types

For Phase 17 additions, see the framework-specific skill directories:

- **Enterprise**: `07-enterprise/` -- ComplianceManager, PolicyEngine, TokenManager, SSOProvider
- **Nexus**: `03-nexus/` -- PluginManager, EventBus, WorkflowRegistry
- **MCP**: `05-kailash-mcp/` -- McpApplication, prompt_argument, transports (STDIO, SSE, HTTP)
- **Kaizen**: `04-kaizen/` -- StructuredOutput, SupervisorAgent, WorkerAgent, ObservabilityManager, MetricsCollector

## Specialist

For complex queries beyond these skills, use the **pattern-expert** or **sdk-navigator** agents.
