---
name: kailash-imports
description: "Essential import statements for Kailash SDK. Use when asking 'how to import', 'kailash imports', 'from kailash', 'import WorkflowBuilder', 'import kailash.Runtime', 'import nodes', 'SDK imports', 'basic imports', 'what to import', or 'import statement'."
---

# Kailash SDK Essential Imports

Essential import statements and patterns for the Kailash SDK covering core components, nodes, and runtime.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **Core**: `WorkflowBuilder`, `NodeRegistry`, `Runtime`
- **Nodes**: String-based (no imports needed), or import for type hints
- **Pattern**: Minimal imports for most use cases
- **CRITICAL**: Use absolute imports, never relative imports

## Core Pattern

```python
# Minimal imports for basic workflows
import kailash

reg = kailash.NodeRegistry()

# Create workflow
builder = kailash.WorkflowBuilder()

# Execute workflow
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Common Use Cases

- **Basic Workflows**: Import `kailash` for WorkflowBuilder, NodeRegistry, and Runtime
- **All Workflows**: Single `kailash.Runtime(reg)` handles everything
- **Type Hints**: Import nodes for IDE support (optional)
- **Access Control**: Import security components
- **Custom Nodes**: Import base classes for extensions

## Step-by-Step Guide

### 1. Core Workflow Imports (Required)
```python
# Essential workflow components
import kailash
```

### 2. Runtime (All Contexts)
```python
# Same import for all contexts (Docker, CLI, NexusApp, etc.)
import kailash
```

### 3. Node Usage (String-Based, No Imports Needed)
```python
# Nodes are referenced by string name -- no imports needed
builder.add_node("PythonCodeNode", "code", {"code": "result = {'ok': True}"})
builder.add_node("CSVReaderNode", "reader", {"file_path": "data.csv"})
builder.add_node("SwitchNode", "switch", {"conditions": [...]})
builder.add_node("LLMAgentNode", "agent", {"model": "gpt-4"})
```

### 4. Access Control & Security
```python
import kailash
# Access control is built into kailash.Runtime
```

### 5. Custom Node Development
```python
import kailash
# Use kailash.NodeRegistry() and string-based node types
```

## Key Import Patterns

| Component | Import | When to Use |
|-----------|--------|-------------|
| **Everything** | `import kailash` | Always (single import) |
| **Nodes** | String-based (no import) | Production workflows |

## Common Mistakes

### ❌ Mistake 1: Importing Node Classes
```python
# Wrong - Node classes are not importable in the Rust-backed package
from kailash.nodes.code import PythonCodeNode   # ERROR: no such module
from kailash.nodes.data import CSVReaderNode     # ERROR: no such module

builder.add_node("CSVReaderNode", "reader", {})
```

### ✅ Fix: Minimal Imports
```python
# Correct - Only import core components
import kailash

# String-based nodes don't need imports
builder.add_node("CSVReaderNode", "reader", {})
builder.add_node("PythonCodeNode", "processor", {})
```

### ❌ Mistake 2: Relative Imports in SDK Usage
```python
# Wrong - Relative imports in user code
from .workflow.builder import WorkflowBuilder  # Error
```

### ✅ Fix: Always Use Absolute Imports
```python
# Correct - Single import
import kailash
```

## Examples

### Example 1: Basic Data Processing
```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

builder.add_node("CSVReaderNode", "reader", {
    "file_path": "data.csv"
})

builder.add_node("PythonCodeNode", "processor", {
    "code": "result = {'count': len(data)}"
})

builder.add_connection("reader", "data", "processor", "data")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Example 2: HTTP Request Workflow
```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

builder.add_node("HTTPRequestNode", "api_call", {
    "url": "https://api.example.com/data",
    "method": "GET"
})

builder.add_node("PythonCodeNode", "process", {
    "code": "result = {'status': 'processed'}"
})

builder.add_connection("api_call", "response", "process", "data")

# Execute workflow
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Example 3: Multi-Node Pipeline
```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

# All nodes are string-based -- no separate imports needed
builder.add_node("CSVReaderNode", "reader", {
    "file_path": "data.csv"
})

builder.add_node("PythonCodeNode", "processor", {
    "code": "result = {'count': len(data) if data else 0}"
})

builder.add_connection("reader", "data", "processor", "data")

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Related Patterns

- **For installation**: See [`kailash-installation`](#)
- **For workflow creation**: See [`workflow-quickstart`](#)
- **For runtime selection**: See [`decide-runtime`](#)
- **For absolute imports standard**: See [`gold-absolute-imports`](#)

## When to Escalate to Subagent

Use `sdk-navigator` subagent when:
- Finding specific node imports
- Exploring advanced SDK features
- Understanding module structure
- Resolving import errors

Use `pattern-expert` subagent when:
- Designing complex import patterns
- Structuring large projects
- Creating reusable components

## Quick Tips

- 💡 **Minimal imports**: Only import what you need (WorkflowBuilder + Runtime)
- 💡 **String-based nodes**: Don't import nodes for production workflows
- 💡 **Absolute imports**: Always use full module paths
- 💡 **Runtime**: `kailash.Runtime` handles both sync and async
- 💡 **Type hints**: Import nodes only if you want IDE support

## Version Notes

- String-based nodes are the recommended pattern (no imports needed)
- Absolute imports are required for all SDK usage

## Keywords for Auto-Trigger

<!-- Trigger Keywords: how to import, kailash imports, from kailash, import WorkflowBuilder, import kailash.Runtime, import nodes, SDK imports, basic imports, what to import, import statement, import pattern, essential imports -->
