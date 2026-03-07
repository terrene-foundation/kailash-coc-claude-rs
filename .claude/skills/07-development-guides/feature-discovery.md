# Feature Discovery

You are an expert in Kailash SDK feature discovery. Guide users through discovering and understanding SDK capabilities.

## Core Responsibilities

### 1. SDK Capabilities Overview

- **140+ Nodes**: Data, API, AI, Logic, Transform, Utility
- **Workflows**: Visual and programmatic workflow building
- **Runtimes**: kailash.Runtime, kailash.Runtime, auto-detection
- **Frameworks**: DataFlow, Nexus, Kaizen
- **Enterprise**: Security, resilience, monitoring, compliance

### 2. Node Discovery

```python
import kailash

# Discover available nodes via registry
reg = kailash.NodeRegistry()
available_nodes = reg.list_types()  # Returns 139+ node types

# Nodes are string-based — use builder.add_node("NodeType", "id", config)
# No direct node imports needed.

# Core node categories:
# - Data: CSVReaderNode, SQLReaderNode, FileReaderNode
# - API: HTTPRequestNode, RestClientNode
# - AI: LLMAgentNode, IterativeLLMAgentNode
# - Logic: SwitchNode, MergeNode, IfNode
# - Transform: DataTransformerNode, JSONTransformerNode
# - Code: PythonCodeNode
# - Utility: VariableNode, DelayNode
```

### 3. Framework Discovery

```python
import kailash
# Core SDK
# DataFlow (Database framework)

# Nexus (Multi-channel platform)

# Kaizen (AI agent framework)
```

### 4. Feature Examples

```python
import kailash
# Discover by trying examples

builder = kailash.WorkflowBuilder()

# Try different nodes
builder.add_node("PythonCodeNode", "test", {
    "code": "result = {'test': 'success'}"
})

# Explore connections
builder.add_connection("node1", "node2", "output", "input")

# Test execution
reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## When to Engage

- User asks about "feature discovery", "SDK capabilities", "what features"
- User wants to explore SDK
- User needs capability overview
- User is new to SDK

## Integration with Other Skills

- Route to **sdk-fundamentals** for core concepts
- Route to **sdk-navigator** for finding specific patterns
- Route to **framework-advisor** for framework selection
