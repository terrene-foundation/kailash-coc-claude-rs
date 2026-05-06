---
name: decide-node-for-task
description: "Select appropriate nodes from 140+ options for specific tasks and use cases. Use when asking 'which node', 'node for task', 'choose node', 'node selection', 'what node', or 'node recommendation'."
---

# Decision: Node Selection

Guide for choosing the right node from 140+ available node types in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting`
> Priority: `CRITICAL`

## Quick Reference

- **Primary Use**: Node selection for specific tasks
- **Category**: cross-cutting
- **Priority**: CRITICAL
- **Trigger Keywords**: which node, node for task, choose node, node selection, what node

## Node Selection by Task

### AI / LLM Tasks

| Task             | Node                  | Key Config                    |
| ---------------- | --------------------- | ----------------------------- |
| Text generation  | `LLMNode`             | `provider`, `model`, `prompt` |
| Embeddings       | `EmbeddingNode`       | `provider`, `model`, `text`   |
| Classification   | `ClassificationNode`  | `categories`, `text`          |
| Vision/images    | `VisionNode`          | `provider`, `image_url`       |
| Audio            | `AudioNode`           | `provider`, `audio_url`       |
| Image generation | `ImageGenerationNode` | `provider`, `prompt`          |
| Text to speech   | `TextToSpeechNode`    | `provider`, `text`            |

### HTTP / API Tasks

| Task             | Node                 | Key Config                  |
| ---------------- | -------------------- | --------------------------- |
| REST API calls   | `HTTPRequestNode`    | `url`, `method`, `headers`  |
| GraphQL queries  | `GraphQLNode`        | `url`, `query`, `variables` |
| WebSocket comms  | `WebSocketNode`      | `url`, `message`            |
| Webhook receiver | `WebhookNode`        | `path`, `method`            |
| Web scraping     | `WebScrapingNode`    | `url`, `selectors`          |
| Rate-limited API | `RateLimitedAPINode` | `url`, `rate_limit`         |

### Database Tasks

| Task          | Node                     | Key Config                     |
| ------------- | ------------------------ | ------------------------------ |
| SQL queries   | `SQLQueryNode`           | `query`, `connection_string`   |
| DB connection | `DatabaseConnectionNode` | `connection_string`            |
| Transactions  | `SQLTransactionNode`     | `queries`                      |
| DataFlow CRUD | Generated nodes          | Per-model (e.g., `CreateUser`) |

### File Tasks

| Task           | Node               | Key Config                     |
| -------------- | ------------------ | ------------------------------ |
| Read files     | `FileReaderNode`   | `file_path`                    |
| CSV processing | `CSVProcessorNode` | `file_path`, `delimiter`       |
| Excel reading  | `ExcelReaderNode`  | `file_path` (feature: `excel`) |
| PDF reading    | `PDFReaderNode`    | `file_path` (feature: `pdf`)   |
| XML parsing    | `XMLParserNode`    | `file_path`, `operation`       |

### Control Flow

| Task                | Node              | Key Config                |
| ------------------- | ----------------- | ------------------------- |
| Conditional routing | `SwitchNode`      | `condition`, `cases`      |
| Merge branches      | `MergeNode`       | `strategy`                |
| Loop iteration      | `LoopNode`        | `items`, `max_iterations` |
| Conditional exec    | `ConditionalNode` | `condition`               |
| Parallel execution  | `ParallelNode`    | `branches`                |
| Retry with backoff  | `RetryNode`       | `max_retries`, `backoff`  |

### Data Transform

| Task              | Node                  | Key Config          |
| ----------------- | --------------------- | ------------------- |
| JSON transform    | `JSONTransformNode`   | `expression`        |
| Text transform    | `TextTransformNode`   | `operation`, `text` |
| Data mapping      | `DataMapperNode`      | `mapping`           |
| Schema validation | `SchemaValidatorNode` | `schema`            |

### Security

| Task               | Node                    | Key Config                   |
| ------------------ | ----------------------- | ---------------------------- |
| JWT auth           | `JWTAuthNode`           | `secret`, `algorithm`        |
| OAuth2             | `OAuth2Node`            | `client_id`, `client_secret` |
| API key auth       | `APIKeyAuthNode`        | `api_key`                    |
| Encryption         | `EncryptionNode`        | `algorithm`, `key`           |
| Hashing            | `HashingNode`           | `algorithm`                  |
| Input sanitization | `InputSanitizationNode` | `rules`                      |
| Data masking       | `DataMaskingNode`       | `fields`, `strategy`         |

### RAG (Retrieval-Augmented Generation)

| Task              | Node                 | Key Config               |
| ----------------- | -------------------- | ------------------------ |
| Text splitting    | `TextSplitterNode`   | `chunk_size`, `overlap`  |
| Embedding storage | `EmbeddingStoreNode` | `store_type`             |
| Vector search     | `VectorSearchNode`   | `query`, `top_k`         |
| RAG pipeline      | `RAGPipelineNode`    | `retriever`, `generator` |

## Usage Example

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();

// Read CSV data
builder.add_node("CSVProcessorNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));

// Transform with JSON expression
builder.add_node("JSONTransformNode", "transform", ValueMap::from([
    ("expression".into(), Value::String("@.name".into())),
]));

// Connect reader output to transform input
builder.connect("reader", "data", "transform", "data");

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::new()).await?;
```

## Decision Flow

```
What task are you doing?
  |-- LLM/AI tasks -> LLMNode, EmbeddingNode, ClassificationNode
  |-- Database operations -> DataFlow generated nodes (CreateX, ReadX, etc.)
  |-- HTTP API calls -> HTTPRequestNode, GraphQLNode
  |-- File reading -> FileReaderNode, CSVProcessorNode, XMLParserNode
  |-- Conditional routing -> SwitchNode, ConditionalNode
  |-- Data transformation -> JSONTransformNode, DataMapperNode
  |-- Security -> EncryptionNode, JWTAuthNode, InputSanitizationNode
  |-- RAG pipeline -> TextSplitterNode, VectorSearchNode, RAGPipelineNode
  |-- Not sure? -> Check CLAUDE.md node categories table
```

## Custom Nodes

When no built-in node fits, create a custom node:

```rust
use kailash_macros::kailash_node;
use kailash_core::node::{NodeExecute, NodeError};
use kailash_core::value::ValueMap;
use kailash_core::ExecutionContext;
use async_trait::async_trait;

#[kailash_node(description = "My custom transform", category = "transform")]
pub struct MyTransformNode {
    #[input(required)]
    data: Value,
    #[output]
    result: Value,
}

#[async_trait]
impl NodeExecute for MyTransformNode {
    async fn execute(&self, inputs: ValueMap, _ctx: &ExecutionContext) -> Result<ValueMap, NodeError> {
        let data = inputs.get("data")
            .ok_or(NodeError::MissingInput { name: "data".into() })?;
        // ... transform logic ...
        Ok(ValueMap::from([("result".into(), data.clone())]))
    }
}
```

## Related Patterns

- **Node categories**: See CLAUDE.md -- kailash-nodes section
- **Custom nodes**: See `.claude/skills/01-core/`
- **DataFlow generated nodes**: See `.claude/skills/02-dataflow/`
- **Node registry**: See `crates/kailash-nodes/src/lib.rs`

## Documentation References

### Primary Sources

- [`CLAUDE.md`](../../../../CLAUDE.md) -- kailash-nodes section with full category table
- `crates/kailash-nodes/` -- Node implementations
- `crates/kailash-core/src/node.rs` -- Node trait definition

## Quick Tips

- Node names always end with `Node` suffix (e.g., `CSVProcessorNode`)
- All 140+ nodes use the same `Node` trait interface
- DataFlow generates 11 nodes per model automatically
- Feature-gated nodes (excel, pdf, wasm) need Cargo feature flags enabled
- Use `NodeRegistry::default()` to get all registered nodes

<!-- Trigger Keywords: which node, node for task, choose node, node selection, what node, node recommendation -->
