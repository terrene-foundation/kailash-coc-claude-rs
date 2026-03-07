---
name: nodes-ai-reference
description: "AI/LLM nodes reference (OpenAI, Anthropic, Ollama, Cohere). Use when asking 'LLM node', 'AI nodes', 'OpenAI', 'Anthropic', 'embeddings', or 'iterative agent'."
---

# AI & LLM Nodes Reference

Complete reference for AI and machine learning nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `HIGH`
> Related Skills: [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (AI workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available AI nodes: LLMAgentNode, IterativeLLMAgentNode (Real MCP execution),
#   EmbeddingGeneratorNode, A2AAgentNode, SelfOrganizingAgentNode
```

## Core LLM Nodes

### LLMAgentNode
```python
import kailash

builder = kailash.WorkflowBuilder()
builder.add_node("LLMAgentNode", "agent", {
    "provider": "openai",
    "model": "gpt-4",
    "prompt": "Explain quantum computing",
    "temperature": 0.7,
    "max_tokens": 1000
})
```

### IterativeLLMAgentNode ⭐
```python
# Advanced agent with real MCP tool execution
builder.add_node("IterativeLLMAgentNode", "iterative_agent", {
    "provider": "openai",
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Get weather and analyze trends"}],
    "mcp_servers": [{
        "name": "weather",
        "transport": "stdio",
        "command": "python",
        "args": ["-m", "weather_mcp_server"]
    }],
    "max_iterations": 5,
    "auto_discover_tools": True,
    "auto_execute_tools": True
})
```

## Embeddings

### EmbeddingGeneratorNode
```python
builder.add_node("EmbeddingGeneratorNode", "embedder", {
    "provider": "openai",
    "model": "text-embedding-3-large",
    "input_text": "This is a sample document",
    "operation": "embed_text"
})
```

## Multi-Agent Nodes

### A2AAgentNode
```python
builder.add_node("A2AAgentNode", "agent", {
    "agent_id": "researcher_001",
    "provider": "openai",
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Analyze data"}],
    "memory_pool": "memory_pool_ref"
})
```

### SelfOrganizingAgentNode
```python
builder.add_node("SelfOrganizingAgentNode", "agent", {
    "agent_id": "adaptive_agent_001",
    "capabilities": ["data_analysis", "machine_learning"],
    "team_context": {"team_id": "research_team_1"}
})
```

## Related Skills

- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)
- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)

<!-- Trigger Keywords: LLM node, AI nodes, OpenAI, Anthropic, embeddings, iterative agent, LLMAgentNode, IterativeLLMAgentNode -->
