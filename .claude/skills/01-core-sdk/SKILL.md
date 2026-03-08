---
name: core-sdk
description: "Kailash Core SDK fundamentals including workflow creation, node patterns, connections, runtime execution, parameter passing, error handling, cyclic workflows, async patterns, MCP integration, and installation. Use when asking about 'workflow basics', 'core sdk', 'create workflow', 'workflow builder', 'node patterns', 'connections', 'runtime', 'parameters', 'imports', 'installation', 'getting started', 'workflow execution', 'async workflows', 'error handling', 'cyclic workflows', 'PythonCode node', 'SwitchNode', or 'MCP integration'."
---

# Kailash Core SDK - Foundational Skills

Comprehensive guide to Kailash Core SDK fundamentals for workflow automation and integration.

## Features

The Core SDK provides the foundational building blocks for creating custom workflows with fine-grained control:

- **139 Workflow Nodes**: Pre-built nodes for AI, API, database, file operations, logic, and more
- **WorkflowBuilder API**: String-based workflow construction with type safety
- **Unified Runtime**: `kailash.Runtime` handles both sync and async execution
- **Advanced Patterns**: Cyclic workflows, conditional execution, error handling
- **MCP Integration**: Built-in Model Context Protocol support
- **Parameter Passing**: Flexible data flow between nodes
- **Zero Configuration**: Auto-detection of runtime context
- **Production Ready**: Enterprise features including monitoring, validation, and debugging

## Quick Start

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NodeName", "id", {"param": "value"})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Reference Documentation

### Getting Started

- **[workflow-quickstart](workflow-quickstart.md)** - Create basic workflows with WorkflowBuilder
- **[kailash-installation](kailash-installation.md)** - Installation and setup guide
- **[kailash-imports](kailash-imports.md)** - Import patterns and module organization

### Core Patterns

- **[node-patterns-common](node-patterns-common.md)** - Common node usage patterns
- **[connection-patterns](connection-patterns.md)** - Linking nodes and data flow
- **[param-passing-quick](param-passing-quick.md)** - Parameter passing strategies
- **[runtime-execution](runtime-execution.md)** - Executing workflows (sync/async)

### Advanced Topics

- **[async-workflow-patterns](async-workflow-patterns.md)** - Asynchronous workflow execution
- **[error-handling-patterns](error-handling-patterns.md)** - Error management strategies
- **[switchnode-patterns](switchnode-patterns.md)** - Conditional routing with SwitchNode
- **[pythoncode-best-practices](pythoncode-best-practices.md)** - PythonCode node best practices
- **[mcp-integration-guide](mcp-integration-guide.md)** - Model Context Protocol integration

## Key Concepts

### Canonical Node Pattern (3-Parameter)

**This is the single source of truth for node configuration.** All other skills reference this section.

```python
builder.add_node(
    "NodeClassName",  # 1. Node type (PascalCase, string)
    "unique_node_id", # 2. Unique ID (snake_case, string)
    {                 # 3. Configuration dict
        "param1": "value",
        "param2": 123
    }
)
```

| Parameter | Type | Description                      | Example                          |
| --------- | ---- | -------------------------------- | -------------------------------- |
| Node type | str  | The node class name (PascalCase) | `"LLMNode"`, `"HTTPRequestNode"` |
| Node ID   | str  | Unique identifier (snake_case)   | `"fetch_data"`, `"process_1"`    |
| Config    | dict | Node-specific configuration      | `{"url": "..."}`                 |

**Connection Method**:

```python
# connect (4-positional params: source, source_output, target, target_input)
builder.connect("read_file", "content", "transform", "input")
```

### WorkflowBuilder Pattern

- String-based node API: `builder.add_node("NodeName", "id", {})`
- Always call `.build()` before execution
- Never `builder.execute(rt)` (invalid) - always `rt.execute(builder.build(reg))`

### Runtime

- **kailash.Runtime**: Handles both sync and async execution automatically
- Returns a dict: `{"results": {...}, "run_id": "...", "metadata": {...}}`

### Runtime Architecture

`kailash.Runtime` is a single Rust-backed unified runtime:

**Core Capabilities**:

- Workflow execution via `rt.execute(wf)` and `rt.execute(wf, inputs={...})`
- Level-based parallelism: nodes at the same DAG level execute concurrently
- Result type: dict with keys `"results"`, `"run_id"`, `"metadata"`
- Validation happens at `builder.build(reg)` time

**Key Features**:

- Cycle detection and execution support
- Conditional execution and branching (SwitchNode)
- Connection validation between node inputs/outputs

## Critical Rules

- ALWAYS: `rt.execute(builder.build(reg))`
- String-based nodes: `builder.add_node("NodeName", "id", {})`
- 4-parameter connections: `(source_id, source_param, target_id, target_param)`
- NEVER: `builder.execute(rt)` (invalid)
- NEVER: Instance-based nodes

## When to Use This Skill

Use this skill when you need to:

- Create custom workflows from scratch
- Understand workflow fundamentals
- Learn node patterns and connections
- Set up runtime execution
- Handle errors in workflows
- Implement cyclic or async patterns
- Integrate with MCP
- Get started with Kailash SDK

## Related Skills

- **[02-dataflow](../02-dataflow/SKILL.md)** - Database operations framework built on Core SDK
- **[03-nexus](../03-nexus/SKILL.md)** - Multi-channel platform framework built on Core SDK
- **[04-kaizen](../04-kaizen/SKILL.md)** - AI agent framework built on Core SDK
- **[06-cheatsheets](../06-cheatsheets/SKILL.md)** - Quick reference patterns
- **[08-nodes-reference](../08-nodes-reference/SKILL.md)** - Complete node reference
- **[09-workflow-patterns](../09-workflow-patterns/SKILL.md)** - Industry workflow templates
- **[17-gold-standards](../17-gold-standards/SKILL.md)** - Mandatory best practices

## Support

For complex workflows or debugging, invoke:

- `pattern-expert` - Workflow patterns and cyclic debugging
- `sdk-navigator` - Find specific nodes or patterns
- `testing-specialist` - Test workflow implementations
