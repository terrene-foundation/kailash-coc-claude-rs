# Kaizen Skills

AI agent framework for building intelligent agents with kailash-enterprise.

## Quick Links

| Skill                                                       | Description                                           |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| [kaizen-agent-patterns](kaizen-agent-patterns.md)           | Agent building blocks, tools, memory, known issues    |
| [kaizen-signatures](kaizen-signatures.md)                   | Input/output contracts (Signature, InputField)        |
| [kaizen-hooks-lifecycle](kaizen-hooks-lifecycle.md)         | Lifecycle hooks (9 events via HookManager)            |
| [kaizen-checkpoint-resume](kaizen-checkpoint-resume.md)     | Save/restore agent state                              |
| [kaizen-interrupt-mechanism](kaizen-interrupt-mechanism.md) | Timeouts, budgets, manual interrupts                  |
| [kaizen-pipelines](kaizen-pipelines.md)                     | Sequential, Parallel, Ensemble agent composition      |
| [kaizen-control-protocol](kaizen-control-protocol.md)       | Human-in-the-loop approval workflows                  |
| [kaizen-chain-of-thought](kaizen-chain-of-thought.md)       | Chain-of-thought agent implementation                 |
| [kaizen-react-pattern](kaizen-react-pattern.md)             | ReAct (Reasoning + Acting) agent pattern              |
| [kaizen-rag-agent](kaizen-rag-agent.md)                     | RAG agent implementation                              |
| [kaizen-cost-tracking](kaizen-cost-tracking.md)             | LLM cost tracking and budget management               |
| [kaizen-budget-tracking](kaizen-budget-tracking.md)         | Two-phase budget enforcement for tool agents          |
| [kaizen-trust-architecture](kaizen-trust-architecture.md)   | Three-layer trust stack map (EATP/Trust-Plane/Kaizen) |
| [kaizen-streaming](kaizen-streaming.md)                     | TaodRunner Python binding, CallerEvent streaming      |
| [kaizen-a2a-protocol](kaizen-a2a-protocol.md)               | Agent-to-Agent protocol (cards & registry)            |
| [kaizen-a2a](kaizen-a2a.md)                                 | A2A messaging, discovery, and delegation              |
| [kaizen-checkpoint](kaizen-checkpoint.md)                   | Checkpoint/resume with known issues & interrupts      |
| [kaizen-quickstart](kaizen-quickstart.md)                   | First agent in 5 minutes                              |
| [kaizen-llm-providers](kaizen-llm-providers.md)             | LlmClient, provider detection, mock testing           |
| [kaizen-memory](kaizen-memory.md)                           | SessionMemory, SharedMemory, PersistentMemory         |
| [kaizen-tools](kaizen-tools.md)                             | ToolDef, ToolRegistry, ToolParam, handler pattern     |
| [kaizen-orchestration](kaizen-orchestration.md)             | OrchestrationRuntime, strategies, AgentExecutor       |
| [create-agent](create-agent.md)                             | Scaffold a new agent (template skill)                 |

## Core API

```python
from kailash.kaizen import BaseAgent, LlmClient
from kailash.kaizen import ToolRegistry, ToolDef, ToolParam
from kailash.kaizen import SessionMemory, SharedMemory
from kailash.kaizen import AgentCheckpoint, CostTracker
from kailash.kaizen import Signature, InputField, OutputField
from kailash.kaizen import HookManager, InterruptManager, ControlProtocol
from kailash.kaizen import AgentCard, AgentRegistry
from kailash.kaizen import TrustLevel, TrustPosture
from kailash.kaizen.pipelines import SequentialPipeline, ParallelPipeline, EnsemblePipeline
from kailash.kaizen.pipelines import RouterPipeline, SupervisorPipeline
```

> **Known Issue**: `BaseAgent.execute()` raises `NotImplementedError` by default — override it in your subclass. Convenience methods `run()`, `extract_str()`, `extract_dict()`, and `write_to_memory()` are available on `BaseAgent` (added in P17-002).

> **Known Issue**: Memory methods in `.pyi` are wrong -- use `store()`/`recall()`/`remove()`, not `set()`/`get()`/`delete()`.

> **Known Issue**: ToolDef uses `handler=` kwarg, not `callback=`.

> **Known Issue**: `Signature.validate_inputs()` returns a `dict` of validated inputs with defaults filled in. Raises `ValueError` if a required field is missing.

> **Known Issue**: Checkpoint storage `load()` raises `RuntimeError` when checkpoint not found (does NOT return None).

> **Known Issue**: `HookManager.EVENTS` is a `tuple`, not a `list`.

> **Known Issue**: `AgentCheckpoint.memory_snapshot` and `tool_state` are `None` by default, not empty dicts.

> **Known Issue**: `InputField` default is `None` when omitted, not `""`.

> **Note**: Streaming is available via `StreamingAgent` and `StreamHandler` (`from kailash.kaizen import StreamingAgent, StreamHandler`).

## Phase 17 Additions

| Skill                                                   | Description                                  |
| ------------------------------------------------------- | -------------------------------------------- |
| [kaizen-structured-output](kaizen-structured-output.md) | StructuredOutput for typed agent responses   |
| [kaizen-multi-agent](kaizen-multi-agent.md)             | SupervisorAgent and WorkerAgent coordination |
| [kaizen-observability](kaizen-observability.md)         | ObservabilityManager and MetricsCollector    |

### New Imports (Phase 17)

```python
from kailash.kaizen import StructuredOutput
from kailash.kaizen import SupervisorAgent, WorkerAgent
from kailash.kaizen import ObservabilityManager, MetricsCollector
```

## Ontology Module (feature: `ontology`)

Embedding-backed concept classification via `OntologyRegistry`. Feature-gated behind `ontology` in `kailash-kaizen`.

| Type                    | Purpose                                            |
| ----------------------- | -------------------------------------------------- |
| `OntologyRegistry`      | Main registry: load YAML seeds, classify text      |
| `EmbeddingProvider`     | Trait for embedding models (OpenAI, local, mock)   |
| `MockEmbeddingProvider` | Deterministic mock for testing                     |
| `Namespace`             | Named concept collection with SHA-256 version hash |
| `Concept`               | Classification target with optional exemplar texts |
| `ClassificationResult`  | Top match with confidence score                    |
| `ConceptMatch`          | Single concept match (label, similarity)           |
| `ConceptEvaluation`     | Batch evaluation result                            |
| `EvaluationReport`      | Precision/recall/F1 evaluation harness output      |
| `OntologyConfig`        | Registry configuration                             |

Key operations: `classify(text)`, `classify_batch(texts)`, cosine similarity (in-crate, no external deps), YAML seed parsing.

Source: `crates/kailash-kaizen/src/ontology/` (6 files: `mod.rs`, `registry.rs`, `provider.rs`, `similarity.rs`, `types.rs`, `error.rs`)

## Specialist

For complex queries beyond these skills, use the **kaizen-specialist** agent.
