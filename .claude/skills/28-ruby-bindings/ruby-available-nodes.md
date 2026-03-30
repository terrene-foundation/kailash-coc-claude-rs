# Available Node Types in Ruby Binding

All 139 built-in Rust nodes are available by string type name in the Ruby binding.

## Usage

`/ruby-available-nodes` — Complete list of node categories and type names

---

## How Nodes Are Used in Ruby

Node types are referenced as string literals. The same type name string that exists in the Rust registry is used in `add_node()`:

```ruby
require "kailash"

registry = Kailash::Registry.new

# List all registered types
types = registry.list_types   # sorted Array of Strings
puts "#{registry.length} types available"

# Use any type by name
builder = Kailash::WorkflowBuilder.new
builder.add_node("HTTPRequestNode", "fetch", {})        # HTTP I/O
builder.add_node("JSONTransformNode", "transform", {})  # Transform
builder.add_node("LLMNode", "ai_call", {})              # AI/LLM
builder.add_node("SQLQueryNode", "query", {})            # SQL

registry.close
```

---

## Node Categories

The full node list is identical to the Python binding — all 139 nodes are available.

For the complete categorized list, see skill `06-python-bindings/python-available-nodes`.

### Quick Reference (most used)

| Category       | Count | Key Types                                                                             |
| -------------- | ----- | ------------------------------------------------------------------------------------- |
| System         | 3     | `NoOpNode`, `LogNode`, `HandlerNode`                                                  |
| Control Flow   | 8     | `SwitchNode`, `MergeNode`, `LoopNode`, `ConditionalNode`, `ParallelNode`, `RetryNode` |
| Transform      | 9     | `JSONTransformNode`, `TextTransformNode`, `MathOperationsNode`, `DataMapperNode`      |
| HTTP I/O       | 7     | `HTTPRequestNode`, `GraphQLNode`, `WebSocketNode`, `WebhookNode`, `WebScrapingNode`   |
| SQL I/O        | 3     | `SQLQueryNode`, `DatabaseConnectionNode`, `SQLTransactionNode`                        |
| File I/O       | 7     | `FileReaderNode`, `FileWriterNode`, `CSVProcessorNode`, `XMLParserNode`               |
| AI/LLM         | 9     | `LLMNode`, `EmbeddingNode`, `ClassificationNode`, `VisionNode`, `AudioNode`           |
| Auth           | 10    | `JWTAuthNode`, `OAuth2Node`, `APIKeyAuthNode`, `MFANode`, `SSONode`                   |
| Security       | 12    | `EncryptionNode`, `HashingNode`, `DataMaskingNode`, `ThreatDetectionNode`             |
| Monitoring     | 10    | `HealthCheckNode`, `MetricsCollectorNode`, `AlertNode`, `SlackAlertNode`              |
| Edge/Cloud     | 14    | `KubernetesNode`, `DockerNode`, `CloudNode`                                           |
| Enterprise     | 8     | `BatchProcessorNode`, `DataLineageNode`, `GDPRComplianceNode`                         |
| RAG            | 7     | `TextSplitterNode`, `VectorSearchNode`, `RAGPipelineNode`                             |
| Cache          | 3     | `CacheGetNode`, `CacheSetNode`, `CacheInvalidateNode`                                 |
| Streaming      | 3     | `StreamProducerNode`, `StreamConsumerNode`, `StreamTransformNode`                     |
| Redis          | 3     | `RedisCommandNode`, `RedisPubSubNode`, `RedisStreamNode`                              |
| Vector DB      | 3     | `VectorUpsertNode`, `VectorQueryNode`, `VectorDeleteNode`                             |
| Kafka          | 3     | `KafkaConsumerNode`, `KafkaProducerNode`, `KafkaStreamNode`                           |
| Code           | 1     | `CodeValidationNode`                                                                  |
| Graph DB       | 1     | `GraphDatabaseNode`                                                                   |
| Document Store | 1     | `DocumentStoreNode`                                                                   |

---

## Checking Available Types at Runtime

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  types = registry.list_types

  # Check if a specific node is available
  puts types.include?("MathOperationsNode")  # true
  puts types.include?("LLMNode")             # true

  # Find all AI-related types
  ai_nodes = types.select { |t| t.downcase.include?("llm") || t.downcase.include?("embedding") }
  puts ai_nodes.inspect

  # Print all types
  types.each { |t| puts t }
end
```

---

## LLM Node Configuration Example

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("LLMNode", "chat", {
    "provider" => "openai",
    "model"    => ENV.fetch("LLM_MODEL", "gpt-5"),
    "api_key"  => ENV.fetch("OPENAI_API_KEY"),        # NEVER hardcode
  })

  workflow = builder.build(registry)

  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow, {
      "prompt" => "Explain the Kailash workflow engine in one sentence.",
    })
    puts result.results["chat"]["response"]
  end
  workflow.close
end
```

Always read API keys and model names from environment variables, never hardcode them.

---

## Framework Ruby APIs

All four framework modules are available as Ruby classes:

| Module         | Ruby Namespace           | Key Classes                                                                       |
| -------------- | ------------------------ | --------------------------------------------------------------------------------- |
| **Kaizen**     | `Kailash::Kaizen::*`     | Agent, AgentConfig, LlmClient, ToolRegistry, ToolDef, SessionMemory, SharedMemory |
| **Enterprise** | `Kailash::Enterprise::*` | RbacEvaluator, Role, Permission, User, AbacPolicy, AbacEvaluator, AuditLogger     |
| **Nexus**      | `Kailash::Nexus::*`      | NexusConfig, JwtConfig, RbacConfig, HandlerParam, Preset, MiddlewareConfig        |
| **DataFlow**   | `Kailash::DataFlow::*`   | DataFlowConfig, ModelDefinition, FieldType, FieldDef, FilterCondition             |
