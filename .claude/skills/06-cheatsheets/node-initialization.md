---
name: node-initialization
description: "Node initialization patterns and parameter handling. Use when asking 'node initialization', 'node parameters', 'initialize nodes', 'node setup', or 'parameter patterns'."
---

# Node Initialization

Node Initialization guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `advanced`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Node Initialization
- **Category**: advanced
- **Priority**: HIGH
- **Trigger Keywords**: node initialization, node parameters, initialize nodes, node setup

## Core Pattern

```python
import kailash

# In the Rust-backed SDK, nodes are string-based via builder.add_node().
# Parameters are passed as config dicts — no subclassing needed.

builder = kailash.WorkflowBuilder()

# Add a node with parameters as a config dict
builder.add_node("EmbeddedPythonNode", "my_node", {
    "code": """
my_param = input_data.get("my_param", "default")
threshold = input_data.get("threshold", 0.75)

result = {"result": f"Processed with {my_param}"}
""",
    "output_vars": ["result"]
})

# Execute with runtime parameters
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg), inputs={
    "my_node": {"my_param": "custom_value", "threshold": 0.9}
})
```

## Common Use Cases

- **Custom Node Development**: Building specialized nodes with proper parameter validation and initialization order
- **LLM/Embedding Integration**: Correctly handling provider-specific formats and required parameters (provider, model, messages)
- **Fixing AttributeError Bugs**: Resolving "object has no attribute" errors by setting attributes before super().**init**()
- **Parameter Type Validation**: Using NodeParameter for proper type checking instead of returning raw values
- **Provider-Specific Formats**: Handling different response formats from Ollama, OpenAI, etc. (embeddings as dicts vs lists)

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For patterns**: See [`workflow-patterns-library`](#)
- **For parameters**: See [`param-passing-quick`](#)

## When to Escalate to Subagent

Use specialized subagents when:

- **pattern-expert**: Complex patterns, multi-node workflows
- **sdk-navigator**: Error resolution, parameter issues
- **testing-specialist**: Comprehensive testing strategies

## Quick Tips

- 💡 **Attributes Before super().**init**()**: Most common error - ALWAYS set all self.attributes BEFORE calling super().**init**() or Kailash validation will fail
- 💡 **Return NodeParameter Objects**: get_parameters() must return Dict[str, NodeParameter], not raw values like int/str/float
- 💡 **Implement Required Methods**: All custom nodes need get_parameters() and run() methods - missing either causes "Can't instantiate abstract class" error
- 💡 **Provider Auto-Detected**: LLMNode auto-detects the provider from the model name (no `provider` parameter needed). Embedding nodes may accept `provider` for explicit selection.
- 💡 **Check Provider Response Format**: Ollama embeddings return dicts with "embedding" key, not lists - use embedding_dict["embedding"] to extract vector
- 💡 **Use .run() Not .process()**: Call node.run() for execution, not .process() or .execute() directly
- 💡 **Test with Real Providers**: Mock data hides provider-specific format issues - always test with actual Ollama/OpenAI/etc.

## Keywords for Auto-Trigger

<!-- Trigger Keywords: node initialization, node parameters, initialize nodes, node setup -->
