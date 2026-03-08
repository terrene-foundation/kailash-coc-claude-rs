---
name: template-workflow-basic
description: "Generate basic Kailash workflow template boilerplate code. Use when requesting 'workflow template', 'workflow boilerplate', 'scaffold workflow', 'starter code', or 'create new workflow from scratch'."
---

# Basic Workflow Template

Ready-to-use Kailash workflow template with all essential imports, structure, and execution pattern.

> **Skill Metadata**
> Category: `cross-cutting` (code-generation)
> Priority: `CRITICAL`
> Related Skills: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md), [`connection-patterns`](../../01-core-sdk/connection-patterns.md), [`node-patterns-common`](../../01-core-sdk/node-patterns-common.md)
> Related Subagents: `pattern-expert` (complex workflows), `tdd-implementer` (test-first development)

## Quick Start Template

Copy-paste this template to start any new Kailash workflow using the Rust-backed API:

```python
"""
Kailash Workflow Template
Uses the Rust-backed API via `import kailash`
"""

import kailash

def main():
    # 1. Create registry and builder
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()

    # 2. Add nodes (replace with your nodes)
    builder.add_node("EmbeddedPythonNode", "step1", {
        "code": "result = {'data': 'value'}"
    })

    builder.add_node("EmbeddedPythonNode", "step2", {
        "code": "result = {'processed': input_data}"
    })

    # 3. Connect nodes (define data flow)
    builder.connect("step1", "result", "step2", "input_data")

    # 4. Build workflow (pass registry for validation)
    wf = builder.build(reg)

    # 5. Execute
    rt = kailash.Runtime(reg)
    result = rt.execute(wf)

    # 6. Access results
    # result is dict: {"results": {...}, "run_id": "...", "metadata": {...}}
    print(f"Run ID: {result['run_id']}")
    print(f"Step2 result: {result['results']['step2']}")
    return result

if __name__ == "__main__":
    main()
```

This is the only API pattern -- there is no separate "legacy" or "v2" API.

## Template Variations

### CLI/Script Template

```python
#!/usr/bin/env python3
"""CLI Workflow Template"""

import sys
import kailash

def create_workflow(reg):
    """Create and return built workflow"""
    builder = kailash.WorkflowBuilder()

    builder.add_node("EmbeddedPythonNode", "process", {
        "code": "result = {'status': 'completed'}"
    })

    return builder.build(reg)

def main():
    reg = kailash.NodeRegistry()
    workflow = create_workflow(reg)
    rt = kailash.Runtime(reg)

    try:
        result = rt.execute(workflow)
        print(f"Success (Run ID: {result['run_id']})")
        print(f"Results: {result['results']}")
        return 0
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

### NexusApp Deployment Template

```python
"""NexusApp Workflow Template for multi-channel deployment"""

from kailash.nexus import NexusApp
import kailash

app = NexusApp()

@app.handler()
def execute_workflow(data):
    """Execute workflow via NexusApp handler"""
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()

    builder.add_node("EmbeddedPythonNode", "process", {
        "code": "result = {'processed': True}"
    })

    rt = kailash.Runtime(reg)
    return rt.execute(builder.build(reg))

# Accessible via API, CLI, and MCP
```

### Data Processing Template

```python
"""Data Processing Workflow Template"""

def create_etl_workflow(input_file: str, output_file: str, reg):
    """Create ETL workflow"""
    builder = kailash.WorkflowBuilder()

    # Extract
    builder.add_node("CSVProcessorNode", "extract", {
        "action": "read",
        "source_path": input_file
    })

    # Transform
    builder.add_node("EmbeddedPythonNode", "transform", {
        "code": """
import pandas as pd
df = pd.DataFrame(data)
# Add your transformation logic here
df['processed'] = df['value'] * 2
result = df.to_dict('records')
"""
    })

    # Load
    builder.add_node("FileWriterNode", "load", {
        "path": output_file
    })

    # Connect pipeline
    builder.connect("extract", "rows", "transform", "data")
    builder.connect("transform", "result", "load", "content")

    return builder.build(reg)

def main():
    reg = kailash.NodeRegistry()
    workflow = create_etl_workflow("input.csv", "output.csv", reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(workflow)
    print(f"Processed {len(result['results']['transform']['result'])} records")

if __name__ == "__main__":
    main()
```

## Template Customization Guide

### Step 1: Choose Your Nodes

Replace placeholders with actual node types based on your needs:

| Need               | Node Type            | Example Config                                                                      |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------- |
| **Read CSV**       | `CSVProcessorNode`   | `{"action": "read", "source_path": "data.csv"}`                                     |
| **Read JSON**      | `FileReaderNode`     | `{"path": "data.json"}`                                                             |
| **API Call**       | `HTTPRequestNode`    | `{"url": "https://...", "method": "GET"}`                                           |
| **Database Query** | `SQLQueryNode`       | `{"connection_string": "...", "query": "..."}`                                      |
| **LLM Processing** | `LLMNode`            | `{"model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o")}` (provider auto-detected) |
| **Custom Logic**   | `EmbeddedPythonNode` | `{"code": "result = {...}"}`                                                        |
| **Write CSV**      | `FileWriterNode`     | `{"path": "output.csv"}`                                                            |

### Step 2: Define Data Flow

Connect your nodes using the 4-parameter pattern:

```python
builder.connect(
    "source_node_id",    # source (source node ID)
    "output_field",      # source_output (output field from source)
    "target_node_id",    # target (target node ID)
    "input_field"        # target_input (input field on target)
)
```

### Step 3: Add Error Handling

```python
try:
    result = rt.execute(builder.build(reg))
except Exception as e:
    print(f"Workflow failed: {e}")
    # Handle error appropriately
```

## Related Patterns

- **Node selection**: [`node-selection-guide`](../../08-nodes-reference/node-selection-guide.md)
- **Connection patterns**: [`connection-patterns`](../../01-core-sdk/connection-patterns.md)
- **Parameter passing**: [`param-passing-quick`](../../01-core-sdk/param-passing-quick.md)
- **Runtime selection**: [`decide-runtime`](../decisions/decide-runtime.md)
- **Complete guide**: [`workflow-quickstart`](../../01-core-sdk/workflow-quickstart.md)

## When to Escalate to Subagent

Use `pattern-expert` subagent when:

- Need custom node development
- Implementing complex cyclic workflows
- Advanced parameter passing patterns
- Performance optimization required

Use `tdd-implementer` subagent when:

- Implementing test-first development
- Need complete test coverage strategy
- Building production-grade workflows

## Documentation References

### Primary Sources

- **Essential Pattern**: [`CLAUDE.md` (lines 106-137)](../../../../CLAUDE.md#L106-L137)

## Quick Tips

- 💡 **Start simple**: Use EmbeddedPythonNode for prototyping before specialized nodes
- 💡 **Build function**: Extract workflow creation into separate function for reusability
- 💡 **Type hints**: Add type hints to improve code maintainability
- 💡 **Docstrings**: Document what your workflow does
- 💡 **Error handling**: Always wrap execution in try-except for production
- 💡 **Logging**: Add logging for debugging and monitoring

<!-- Trigger Keywords: workflow template, workflow boilerplate, scaffold workflow, starter code, create new workflow from scratch, workflow skeleton, basic workflow template, empty workflow, workflow starter, generate workflow code -->
