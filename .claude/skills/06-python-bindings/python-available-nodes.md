# Available Node Types in Python Bindings

All 139 built-in Rust nodes are available by string type name in the Python binding.

## Usage

`/python-available-nodes` — Complete list of node categories and type names

---

## How Nodes Are Used in Python

Node types are referenced as string literals. The same type name string that exists in the Rust registry is used in `add_node()`:

```python
import kailash

registry = kailash.NodeRegistry()

# List all registered types
all_types = registry.list_types()   # sorted list of strings
print(f"{len(registry)} types available")

# Use any type by name
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch")          # HTTP I/O
builder.add_node("JSONTransformNode", "transform")    # Transform
builder.add_node("LLMNode", "ai_call")                # AI/LLM
builder.add_node("SQLQueryNode", "query")             # SQL
```

---

## Node Categories

### System (3 nodes)

Basic infrastructure nodes.

| Type Name     | Description                                         |
| ------------- | --------------------------------------------------- |
| `HandlerNode` | Generic passthrough/handler                         |
| `NoOpNode`    | No-op passthrough — passes inputs through unchanged |
| `LogNode`     | Log a message or value to the tracing output        |

### Control Flow (8 nodes)

Workflow branching, looping, and coordination.

| Type Name          | Description                                     |
| ------------------ | ----------------------------------------------- |
| `SwitchNode`       | Route to one of N branches based on a condition |
| `MergeNode`        | Merge outputs from multiple branches            |
| `LoopNode`         | Repeat a subgraph N times or until condition    |
| `ConditionalNode`  | If/else branching                               |
| `ParallelNode`     | Fan-out to parallel branches                    |
| `RetryNode`        | Retry a node on failure with backoff            |
| `ErrorHandlerNode` | Catch and handle errors from upstream nodes     |
| `WaitNode`         | Delay execution for a specified duration        |

### Transform (8 nodes)

Data transformation and manipulation.

| Type Name              | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| `JSONTransformNode`    | JMESPath expression-based JSON transformation                      |
| `TextTransformNode`    | String operations (uppercase, lowercase, trim, split, join, regex) |
| `DataMapperNode`       | Map fields between schemas                                         |
| `SchemaValidatorNode`  | Validate data against a JSON Schema                                |
| `FormatConverterNode`  | Convert between JSON, YAML, TOML, CSV                              |
| `ArrayOperationsNode`  | Filter, map, sort, reduce arrays                                   |
| `StringOperationsNode` | String manipulation and formatting                                 |
| `MathOperationsNode`   | Arithmetic: add, subtract, multiply, divide, modulo, power         |
| `FilterNode`           | Filter records based on predicate                                  |

### HTTP I/O (7 nodes)

HTTP clients, WebSocket, and web scraping.

| Type Name            | Description                                      |
| -------------------- | ------------------------------------------------ |
| `HTTPRequestNode`    | HTTP GET/POST/PUT/PATCH/DELETE via reqwest       |
| `GraphQLNode`        | GraphQL query and mutation                       |
| `WebSocketNode`      | WebSocket client (tokio-tungstenite)             |
| `WebhookNode`        | Receive incoming webhook payloads                |
| `HTTPBatchNode`      | Batch multiple HTTP requests in parallel         |
| `WebScrapingNode`    | HTML scraping with CSS selectors (scraper crate) |
| `RateLimitedAPINode` | HTTP client with governor-based rate limiting    |

### SQL I/O (3 nodes)

Database access via sqlx.

| Type Name                | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `SQLQueryNode`           | Execute a SQL query (SELECT, INSERT, UPDATE, DELETE) |
| `DatabaseConnectionNode` | Manage database connection lifecycle                 |
| `SQLTransactionNode`     | Execute multiple statements in a transaction         |

### File I/O (7 nodes)

Read and write files in various formats.

| Type Name             | Description                                       |
| --------------------- | ------------------------------------------------- |
| `FileReaderNode`      | Read text or binary files                         |
| `FileWriterNode`      | Write text or binary files                        |
| `CSVProcessorNode`    | Parse and generate CSV (csv crate)                |
| `DirectoryReaderNode` | List files in a directory (walkdir)               |
| `ExcelReaderNode`     | Read .xlsx and .xls files (calamine)              |
| `PDFReaderNode`       | Extract text from PDFs (pdf-extract)              |
| `XMLParserNode`       | Parse and generate XML, limited XPath (quick-xml) |

### AI / LLM (9 nodes)

AI model integrations via raw HTTP to provider APIs.

| Type Name             | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `LLMNode`             | Text generation (OpenAI, Anthropic, Google, Mistral, Cohere) |
| `EmbeddingNode`       | Generate text embeddings                                     |
| `ClassificationNode`  | Classify text into categories                                |
| `SentimentNode`       | Sentiment analysis                                           |
| `SummarizationNode`   | Text summarization                                           |
| `VisionNode`          | Image understanding (multimodal LLMs)                        |
| `AudioNode`           | Audio transcription and analysis                             |
| `ImageGenerationNode` | Generate images (DALL-E, etc.)                               |
| `TextToSpeechNode`    | Text to speech synthesis                                     |

### Auth (10 nodes)

Authentication and identity management.

| Type Name                  | Description                                      |
| -------------------------- | ------------------------------------------------ |
| `JWTAuthNode`              | JWT token creation and validation (jsonwebtoken) |
| `OAuth2Node`               | OAuth2 flow (oauth2 crate)                       |
| `APIKeyAuthNode`           | API key validation                               |
| `MFANode`                  | Multi-factor auth (TOTP via totp-rs)             |
| `SSONode`                  | Single sign-on integration                       |
| `SessionManagerNode`       | Session lifecycle management                     |
| `DirectoryIntegrationNode` | LDAP directory integration                       |

### Security (12 nodes)

Encryption, hashing, and threat detection.

| Type Name               | Description                        |
| ----------------------- | ---------------------------------- |
| `EncryptionNode`        | Encrypt and decrypt data (ring)    |
| `HashingNode`           | Hash data (argon2, blake3)         |
| `CertificateNode`       | X.509 certificate operations       |
| `InputSanitizationNode` | Sanitize untrusted input (ammonia) |
| `DataMaskingNode`       | Mask PII and sensitive fields      |
| `ThreatDetectionNode`   | Detect known attack patterns       |
| `BehaviorAnalysisNode`  | Detect anomalous request patterns  |

### Monitoring (7+ nodes)

Health checks, metrics, and alerting.

| Type Name              | Description                         |
| ---------------------- | ----------------------------------- |
| `HealthCheckNode`      | Check service health endpoint       |
| `MetricsCollectorNode` | Collect Prometheus metrics          |
| `LogProcessorNode`     | Parse and route log entries         |
| `AlertNode`            | Send alerts via configured channels |
| `DiscordAlertNode`     | Send alerts to Discord webhook      |
| `SlackAlertNode`       | Send alerts to Slack webhook        |
| `EmailAlertNode`       | Send alerts via email (lettre/SMTP) |
| `PagerDutyAlertNode`   | Send PagerDuty incidents            |
| `TeamsAlertNode`       | Send Microsoft Teams Adaptive Cards |

### Admin (5 nodes)

User, role, and permission management.

| Type Name             | Description                        |
| --------------------- | ---------------------------------- |
| `AuditLogNode`        | Write structured audit log entries |
| `UserManagementNode`  | Create, update, delete users       |
| `RoleManagementNode`  | Manage RBAC roles                  |
| `PermissionCheckNode` | Check RBAC permissions             |

### Edge / Cloud (14 nodes)

Kubernetes, Docker, and cloud operations.

| Type Name              | Description                           |
| ---------------------- | ------------------------------------- |
| `KubernetesNode`       | Kubernetes API operations (kube-rs)   |
| `DockerNode`           | Docker container operations (bollard) |
| `CloudNode`            | Cloud provider API calls              |
| `ResourceAnalyzerNode` | System resource analysis (sysinfo)    |
| `EdgeStateMachineNode` | State machine for edge logic          |

### Transaction (5 nodes)

Distributed transaction patterns.

| Type Name                           | Description                       |
| ----------------------------------- | --------------------------------- |
| `SagaCoordinatorNode`               | Saga pattern orchestration        |
| `TwoPhaseCommitCoordinatorNode`     | 2PC transaction coordinator       |
| `DistributedTransactionManagerNode` | Distributed transaction lifecycle |

### Enterprise (8 nodes)

Multi-tenancy, compliance, and data governance.

| Type Name                 | Description                    |
| ------------------------- | ------------------------------ |
| `BatchProcessorNode`      | Batch data processing          |
| `DataLineageNode`         | Track data lineage             |
| `TenantAssignmentNode`    | Assign resources to tenants    |
| `MCPServiceDiscoveryNode` | MCP service registry discovery |
| `DataRetentionPolicyNode` | Apply data retention rules     |
| `GDPRComplianceNode`      | GDPR compliance checks         |

### Code Validation (4 nodes)

Validate code in multiple languages.

| Type Name            | Description                                   |
| -------------------- | --------------------------------------------- |
| `CodeValidationNode` | Validate Rust/Python/JS/JSON/YAML/TOML syntax |

### RAG (7 nodes)

Retrieval-Augmented Generation pipeline.

| Type Name               | Description                           |
| ----------------------- | ------------------------------------- |
| `TextSplitterNode`      | Split documents into chunks           |
| `EmbeddingStoreNode`    | Store embeddings with metadata        |
| `VectorSearchNode`      | Search by vector similarity           |
| `DocumentLoaderNode`    | Load documents from various sources   |
| `RerankNode`            | Rerank search results                 |
| `ResponseAssemblerNode` | Assemble context for LLM prompts      |
| `RAGPipelineNode`       | End-to-end RAG pipeline orchestration |

### Cache (3 nodes)

In-memory caching with optional Redis backend.

| Type Name             | Description                      |
| --------------------- | -------------------------------- |
| `CacheGetNode`        | Read from cache by key           |
| `CacheSetNode`        | Write to cache with optional TTL |
| `CacheInvalidateNode` | Invalidate cache keys            |

### Streaming (3 nodes)

Async stream processing via tokio mpsc.

| Type Name             | Description                 |
| --------------------- | --------------------------- |
| `StreamProducerNode`  | Produce items into a stream |
| `StreamConsumerNode`  | Consume items from a stream |
| `StreamTransformNode` | Transform items in flight   |

### Redis (3 nodes)

Redis operations (feature-gated in Rust, enabled in Python binding).

| Type Name          | Description                     |
| ------------------ | ------------------------------- |
| `RedisCommandNode` | Execute Redis commands          |
| `RedisPubSubNode`  | Redis Pub/Sub messaging         |
| `RedisStreamNode`  | Redis Streams producer/consumer |

### Vector DB (3 nodes)

pgvector-backed vector storage.

| Type Name          | Description                  |
| ------------------ | ---------------------------- |
| `VectorUpsertNode` | Upsert vectors with metadata |
| `VectorQueryNode`  | Query by vector similarity   |
| `VectorDeleteNode` | Delete vectors by ID         |

### Kafka (3 nodes)

Kafka integration via pluggable backend.

| Type Name           | Description                        |
| ------------------- | ---------------------------------- |
| `KafkaConsumerNode` | Consume messages from Kafka topics |
| `KafkaProducerNode` | Produce messages to Kafka topics   |
| `KafkaStreamNode`   | Stream processing via Kafka        |

### Graph DB (1 node)

Graph database operations.

| Type Name           | Description                                               |
| ------------------- | --------------------------------------------------------- |
| `GraphDatabaseNode` | Vertex/edge CRUD and traversal via pluggable GraphBackend |

### Document Store (1 node)

Document database with aggregation.

| Type Name           | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `DocumentStoreNode` | CRUD and aggregation pipeline via pluggable DocumentBackend |

### ABAC (Enterprise — 1 node)

Attribute-based access control.

| Type Name                     | Description                                                          |
| ----------------------------- | -------------------------------------------------------------------- |
| `ABACPermissionEvaluatorNode` | Evaluate ABAC policy against subject/resource/environment attributes |

---

## Checking Available Types at Runtime

```python
import kailash

registry = kailash.NodeRegistry()
all_types = registry.list_types()

# Check if a specific node is available
assert "MathOperationsNode" in all_types
assert "LLMNode" in all_types

# Find all AI-related types
ai_nodes = [t for t in all_types if "llm" in t.lower() or "ai" in t.lower() or "embedding" in t.lower()]
print(ai_nodes)

# Print all types organized by prefix
for t in all_types:
    print(t)
```

---

## Framework Python APIs (Added in Phase 12)

All four framework modules are available as Python classes (61 Rust PyO3 types + ~32 Python compat helpers):

| Module         | Python Import                        | Key Types                                                                                                                     |
| -------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **DataFlow**   | `from kailash.dataflow import ...`   | `DataFlow`, `ModelDefinition`, `FieldType`, `db`, `F`, `with_tenant`                                                          |
| **Enterprise** | `from kailash.enterprise import ...` | `RbacEvaluator`, `Role`, `Permission`, `AbacEvaluator`, `AuditLogger`, `requires_permission`, `audit_action`, `tenant_scoped` |
| **Kaizen**     | `from kailash.kaizen import ...`     | `Agent`, `AgentConfig`, `LlmClient`, `BaseAgent`, `HookManager`, `Signature`, `SimpleQAAgent`, `ReActAgent`, `RAGAgent`       |
| **Nexus**      | `from kailash.nexus import ...`      | `Nexus`, `NexusConfig`, `Preset`, `NexusApp`, `NexusAuthPlugin`, `SessionStore`                                               |

### Limitation

| Limitation                   | Workaround                                                |
| ---------------------------- | --------------------------------------------------------- |
| `BaseNode` class inheritance | `registry.register_callback("Name", fn, inputs, outputs)` |

---

## LLM Node Configuration Example

Nodes that make external API calls typically need their credentials configured via node config or workflow inputs:

```python
import kailash
import os

registry = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()

builder.add_node("LLMNode", "chat", {
    "provider": "openai",
    "model":    os.environ.get("LLM_MODEL", "gpt-5"), # read from .env in production
    "api_key":  os.environ["OPENAI_API_KEY"],        # NEVER hardcode
})

workflow = builder.build(registry)
runtime = kailash.Runtime(registry)
result = runtime.execute(workflow, {
    "prompt": "Explain the Kailash workflow engine in one sentence.",
})
print(result["results"]["chat"]["response"])
```

Always read API keys and model names from environment variables, never hardcode them.
