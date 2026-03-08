---
name: nodes-quick-index
description: "Quick reference to all 139+ Kailash nodes. Use when asking 'node list', 'all nodes', 'node reference', 'what nodes', 'available nodes', or 'node catalog'."
---

# Nodes Quick Index

Quick reference to all 139+ tested and validated Kailash workflow nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `CRITICAL`
> Related Skills: All node-specific skills
> Related Subagents: `pattern-expert` (node selection, workflow patterns)

## Quick Decision: Which Node to Use?

| Task                     | Use This Node                         | Not EmbeddedPythonNode |
| ------------------------ | ------------------------------------- | ---------------------- | ------------------------------------- | ------------------ |
| Read CSV/Excel           | `CSVProcessorNode`, `ExcelReaderNode` | Read CSV/Excel         | `CSVProcessorNode`, `ExcelReaderNode` | ❌ `pd.read_csv()` |
| Call REST API            | `HTTPRequestNode`                     | ❌ `requests.get()`    |
| Query Database           | `SQLQueryNode` ⭐                     | ❌ `cursor.execute()`  |
| Use LLM/AI               | `LLMNode` ⭐                          | ❌ OpenAI SDK          |
| Filter/Transform         | `FilterNode`, `DataMapperNode`        | ❌ List comprehensions |
| Route Logic              | `SwitchNode`, `ConditionalNode`       | ❌ if/else blocks      |
| Send Alerts              | `DiscordAlertNode`, `EmailSenderNode` | ❌ SMTP/webhook code   |
| Distributed Transactions | `DistributedTransactionManagerNode`   | ❌ Manual 2PC/Saga     |

## Node Categories (139+ total)

### 📁 Data I/O (20+ nodes)

```python
import kailash

# File operation nodes (string-based):
#   CSVProcessorNode, FileWriterNode, FileReaderNode, JSONTransformNode,
#   ExcelReaderNode (feature: excel), PDFReaderNode (feature: pdf), XMLParserNode

# Database nodes (string-based):
#   SQLQueryNode (Production recommended)
#   DatabaseConnectionNode (Connection pooling)
#   SQLDatabaseNode (Simple queries)

builder = kailash.WorkflowBuilder()
builder.add_node("CSVProcessorNode", "reader", {"action": "read", "source_path": "data.csv"})
```

### 🤖 AI/ML (20+ nodes)

```python
import kailash

# AI/LLM nodes (string-based):
#   LLMNode (multi-provider chat completions with tool calling)
#   EmbeddingNode (text-to-vector embedding generation)
#   ClassificationNode (zero-shot/few-shot text classification)
#   SentimentNode (sentiment analysis)
#   SummarizationNode (text summarization)
#   VisionNode (image analysis)
#   AudioNode (audio processing)
#   ImageGenerationNode (image generation)
#   TextToSpeechNode (text to speech)
#
# Note: Multi-agent coordination (A2A) is handled by the Kaizen agent
# framework (`kailash.kaizen`), not by workflow nodes.

builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "agent", {"model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o")})  # provider auto-detected from model name
```

## Most Used Nodes (Top 10)

```python
import kailash

# All used as strings with builder.add_node("NodeType", "id", {...}):
# Data:      CSVProcessorNode, SQLQueryNode, DatabaseConnectionNode
# AI:        LLMNode (with tool calling), EmbeddingNode
# API:       HTTPRequestNode
# Logic:     SwitchNode, MergeNode
# Transform: FilterNode
```

## Node Selection by Task

### Data Processing

- **CSV/Excel**: [`nodes-data-reference`](nodes-data-reference.md)
- **Database**: `SQLQueryNode`, `DatabaseConnectionNode`
- **API**: [`nodes-api-reference`](nodes-api-reference.md)

### AI/ML

- **LLM**: [`nodes-ai-reference`](nodes-ai-reference.md)
- **Embeddings**: `EmbeddingNode`
- **Multi-Agent**: Use Kaizen agent framework (`kailash.kaizen`) for A2A coordination

### Logic & Control

- **Routing**: [`nodes-logic-reference`](nodes-logic-reference.md)
- **Conditionals**: `SwitchNode`, `ConditionalNode`
- **Loops**: `LoopNode`

### Enterprise

- **Security**: `OAuth2Node`, `JWTValidatorNode`, `EncryptionNode`
- **Admin**: [`nodes-admin-reference`](nodes-admin-reference.md)
- **Monitoring**: [`nodes-monitoring-reference`](nodes-monitoring-reference.md)
- **Transactions**: [`nodes-transaction-reference`](nodes-transaction-reference.md)

## Navigation Strategy

1. **Quick task lookup** → Use table above
2. **Category browsing** → Use category-specific skills
3. **Full details** → See comprehensive-node-catalog.md (2194 lines)

## When NOT to Use Nodes

**❌ Avoid EmbeddedPythonNode for:**

- File I/O operations (use CSVProcessorNode, etc.)
- HTTP requests (use HTTPRequestNode)
- Database queries (use SQLQueryNode)
- Data filtering/transformation (use FilterNode, DataMapperNode)
- Authentication (use OAuth2Node, JWTValidatorNode)
- Standard ML operations (use specialized AI nodes)

**✅ Use EmbeddedPythonNode only for:**

- Ollama/local LLM integration
- Complex custom business logic
- Temporary prototyping

## Related Skills

- **Data Nodes**: [`nodes-data-reference`](nodes-data-reference.md)
- **AI Nodes**: [`nodes-ai-reference`](nodes-ai-reference.md)
- **API Nodes**: [`nodes-api-reference`](nodes-api-reference.md)
- **Database Nodes**: [`nodes-database-reference`](nodes-database-reference.md)
- **Transform Nodes**: [`nodes-transform-reference`](nodes-transform-reference.md)
- **Code Nodes**: [`nodes-code-reference`](nodes-code-reference.md)
- **Logic Nodes**: [`nodes-logic-reference`](nodes-logic-reference.md)
- **File Nodes**: [`nodes-file-reference`](nodes-file-reference.md)
- **Monitoring Nodes**: [`nodes-monitoring-reference`](nodes-monitoring-reference.md)
- **Transaction Nodes**: [`nodes-transaction-reference`](nodes-transaction-reference.md)
- **Admin Nodes**: [`nodes-admin-reference`](nodes-admin-reference.md)

## When to Escalate to Subagent

Use `pattern-expert` subagent when:

- Choosing between multiple node options
- Building complex multi-node workflows
- Optimizing node selection for performance
- Troubleshooting node parameter issues

## Quick Tips

- Start with specialized nodes before considering EmbeddedPythonNode
- Use production nodes (SQLQueryNode, HTTPRequestNode) for real workloads
- Leverage enterprise nodes (monitoring, transactions, security) for production
- Check node-specific skills for detailed usage patterns

## Version Notes

<!-- Trigger Keywords: node list, all nodes, node reference, what nodes, available nodes, node catalog, kailash nodes, node index, node types, workflow nodes -->
