---
name: nodes-reference
description: "Comprehensive node reference documentation for all 139+ Kailash SDK nodes organized by category: AI, API, Code, Data, Database, File, Logic, Monitoring, Admin, Transaction, and Transform nodes. Use when asking about 'node reference', 'available nodes', 'node list', 'AI nodes', 'API nodes', 'code nodes', 'data nodes', 'database nodes', 'file nodes', 'logic nodes', 'monitoring nodes', 'transaction nodes', 'transform nodes', 'which nodes', 'node documentation', or 'node capabilities'."
---

# Kailash Nodes - Complete Reference

Comprehensive reference documentation for all 139+ workflow nodes in Kailash SDK, organized by category.

## Overview

Complete node catalog covering:

- **AI Nodes**: LLM, vision, audio, embeddings
- **API Nodes**: HTTP, webhooks, GraphQL
- **Code Nodes**: Python, JavaScript execution
- **Data Nodes**: Processing, transformation, validation
- **Database Nodes**: CRUD, queries, transactions
- **File Nodes**: Reading, writing, manipulation
- **Logic Nodes**: Conditionals, loops, routing
- **Monitoring Nodes**: Logging, metrics, alerts
- **Admin Nodes**: System management
- **Transaction Nodes**: ACID operations
- **Transform Nodes**: Data transformation

## Node Reference Documentation

### Quick Access

- **[nodes-quick-index](nodes-quick-index.md)** - Quick node lookup index

### By Category

#### AI & Machine Learning

- **[nodes-ai-reference](nodes-ai-reference.md)** - AI and LLM nodes
  - LLMNode (auto-detects provider from model name)
  - VisionNode, AudioNode
  - EmbeddingNode, ClassificationNode
  - LLMNode supports local models via Ollama-compatible API

## Node Selection Guide

### By Use Case

**AI & LLM Tasks** → Use AI nodes (`nodes-ai-reference`)

- Text generation: LLMNode (supports OpenAI, Anthropic, Google, Mistral, Cohere)
- Vision: VisionNode
- Audio: AudioNode
- Local LLMs: LLMNode with Ollama-compatible endpoint

**API Integration** → Use API nodes (`nodes-api-reference`)

- REST APIs: HTTPRequestNode, HTTPRequestNode
- Webhooks: WebhookNode
- GraphQL: GraphQLNode

**Custom Logic** → Use Code nodes (`nodes-code-reference`)

- Python: EmbeddedPythonNode (recommended)
- JavaScript: JavaScriptNode
- Shell: BashNode

**Database Work** → Use Database nodes (`nodes-database-reference`)

- SQL queries: SQLQueryNode
- CRUD with DataFlow: Auto-generated nodes

**File Operations** → Use File nodes (`nodes-file-reference`)

- Reading files: FileReaderNode
- Bulk operations: DirectoryReaderNode
- File watching: FileWatcherNode

**Conditional Logic** → Use Logic nodes (`nodes-logic-reference`)

- Simple conditions: SwitchNode
- Complex routing: ConditionalNode
- Loops: LoopNode

**Data Processing** → Use Data nodes (`nodes-data-reference`)

- CSV: CSVProcessorNode, FileWriterNode
- JSON: JSONTransformNode
- Validation: SchemaValidatorNode

**Monitoring** → Use Monitoring nodes (`nodes-monitoring-reference`)

- Logging: LogNode
- Metrics: MetricsCollectorNode
- Alerts: AlertNode

## Critical Node Patterns

All nodes follow the **canonical 4-parameter pattern** from `/01-core-sdk`.

### Usage Example

```python
# See /01-core-sdk for pattern details
builder.add_node("EmbeddedPythonNode", "node1", {
    "code": "result = input_data * 2"
})
builder.connect("node1", "result", "node2", "input_data")
```

### Common Nodes

- **EmbeddedPythonNode**: Most flexible, use for custom logic
- **SwitchNode**: Conditional routing based on values
- **CSVProcessorNode**: Reading CSV files
- **HTTPRequestNode**: HTTP API calls
- **LogNode**: Debug and production logging

## When to Use This Skill

## Quick Patterns

### Common Node Usage

```python
# AI/LLM Node
builder.add_node("LLMNode", "chat", {"model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"), "prompt": "..."})

# API Call
builder.add_node("HTTPRequestNode", "api", {"url": "...", "method": "POST"})

# Python Code
builder.add_node("EmbeddedPythonNode", "transform", {"code": "..."})
```

### Database Node

```python
import kailash
# DataFlow auto-generates these - don't use raw DB nodes
df = kailash.DataFlow("sqlite:///app.db")
# Creates: CreateUser, ReadUser, UpdateUser, DeleteUser, etc.
```

### Conditional Logic

```python
# SwitchNode matches the "condition" input against case keys
builder.add_node("SwitchNode", "router", {
    "cases": {"A": "path_a_handler", "B": "path_b_handler"},
    "default_branch": "path_a_handler"
})
# Connect: builder.connect("source", "type", "router", "condition")
# Outputs: "matched" (branch name) and "data" (forwarded)
```

## CRITICAL Gotchas

| Rule                                | Why                       |
| ----------------------------------- | ------------------------- |
| ❌ NEVER use raw database nodes     | Use DataFlow instead      |
| ✅ ALWAYS use string-based node IDs | Variables cause issues    |
| ❌ NEVER forget `.build()`          | Required before execution |

## When to Use This Skill

Use this skill when you need to:

- Find the right node for a task
- Understand node capabilities
- Look up node parameters
- See node usage examples
- Compare similar nodes
- Explore available nodes by category

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core workflow patterns
- **[06-cheatsheets](../cheatsheets/SKILL.md)** - Node usage patterns
- **[07-development-guides](../development-guides/SKILL.md)** - Custom node development
- **[02-dataflow](../../02-dataflow/SKILL.md)** - Auto-generated database nodes

## Support

For node-related questions, invoke:

- `pattern-expert` - Node pattern recommendations
- `sdk-navigator` - Find specific nodes
- `dataflow-specialist` - DataFlow-generated nodes
