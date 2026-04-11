# Kailash Workspace Crate Reference

Quick reference for all crates in the workspace. For full API docs, read the crate source or run `cargo doc --workspace --no-deps`.

## Crate Map

| Crate                        | Purpose                | Key Types                                                                                         | Skill                        |
| ---------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------- |
| **kailash-value**            | Universal data type    | `Value` enum, `ValueMap` (`BTreeMap<Arc<str>, Value>`)                                            | (this file)                  |
| **kailash-core**             | Workflow engine        | `Node` trait, `WorkflowBuilder`, `Runtime`, `AuditLog`, `EventBus`                                | (this file)                  |
| **kailash-nodes**            | 145+ built-in nodes    | Control flow, HTTP, SQL, AI, Auth, Security, RAG, Edge                                            | `skills/08-nodes-reference/` |
| **kailash-macros**           | Proc-macros            | `#[kailash_node]`, `#[dataflow::model]`, `#[derive(Signature)]`                                   | (this file)                  |
| **kailash-plugin**           | WASM + native plugins  | `wasmtime` sandbox, `libloading` cdylib                                                           | (this file)                  |
| **kailash-plugin-guest**     | WASM guest SDK         | Plugin ABI contract (publishable to crates.io)                                                    | (this file)                  |
| **kailash-plugin-macros**    | Plugin proc-macros     | Plugin derive macros (publishable to crates.io)                                                   | (this file)                  |
| **kailash-capi**             | C ABI layer            | Opaque pointers, JSON data exchange, thread-local errors                                          | (this file)                  |
| **kailash-dataflow**         | Database framework     | `DataFlow`, `DataFlowExpressSync`, `QueryDialect`, `MigrationManager`, 11 nodes/model             | `skills/02-dataflow/`        |
| **kailash-nexus**            | Multi-channel platform | `NexusEngine`, axum handlers, tower middleware, K8s probes                                        | `skills/03-nexus/`           |
| **kailash-kaizen**           | AI agent SDK           | `BaseAgent`, TAOD loop, `LlmClient`, `CostTracker`                                                | `skills/04-kaizen/`          |
| **kaizen-agents**            | LLM orchestration      | `GovernedSupervisor`, `PlanMonitor`, hydration, CallerEvent streaming, TaodRunner Python binding  | `skills/32-kaizen-agents/`   |
| **eatp**                     | Trust protocol         | Ed25519 keys, CareChain, delegation, reasoning traces                                             | `skills/26-eatp-reference/`  |
| **trust-plane**              | Trust environment      | `TrustProject`, `StrictEnforcer`, shadow mode                                                     | `skills/29-trust-plane/`     |
| **kailash-governance**       | Governance primitives  | `GovernanceEngine`, D/T/R, envelopes, LCA, DelegationBuilder, RBAC matrix                         | `skills/29-pact/`            |
| **kailash-pact**             | PACT governance        | Re-exports governance, adds agent, MCP, YAML, SQLite                                              | `skills/29-pact/`            |
| **kailash-mcp**              | MCP protocol           | `JsonRpcRequest/Response/Error`, `McpClient`, `McpServerCore`, transports (stdio/http/sse)        | `skills/05-kailash-mcp/`     |
| **kailash-auth**             | Auth primitives        | `JwtConfig`, `RbacConfig`, `ApiKeyConfig`, `RateLimiter`, `TenantContext` (non-Clone, zeroize)    | `skills/05-enterprise/`      |
| **kailash-enterprise**       | Enterprise features    | RBAC, ABAC, audit, multi-tenancy, human competencies                                              | `skills/05-enterprise/`      |
| **kailash-nodes-enterprise** | Enterprise admin nodes | `AuditLogNode`, `PermissionCheckNode`, `RoleManagementNode` (extracted from kailash-nodes RS-004) | `skills/05-enterprise/`      |
| **kailash-cli**              | CLI binary             | Command-line interface for workflows                                                              | (this file)                  |
| **kailash-marketplace**      | Marketplace            | Workflow/node marketplace                                                                         | (this file)                  |
| **kailash-rl**               | Reinforcement learning | `Environment`, `Space`, `TabularAgent`, `ReplayBuffer`, `VecEnv`, Q-Learning/SARSA/MC             | (this file)                  |
| **kailash-align-serving**    | LLM model serving      | `InferenceEngine`, `ServingBackend`, `InferenceRequest`, `StreamToken`, `DrainGuard`              | (this file)                  |
| **kailash-ml** (19 crates)   | ML framework           | `Fit`, `Predict`, `DynEstimator`, `Pipeline`, `GridSearchCV`, 40+ algorithms                      | `skills/34-kailash-ml/`      |
| **kailash-python**           | Python binding (PyO3)  | `pip install kailash-enterprise`, maturin build, `.pyi` stubs                                     | `skills/06-python-bindings/` |
| **kailash-ruby**             | Ruby binding (Magnus)  | `require 'kailash'`, rb-sys, GVL release                                                          | `skills/28-ruby-bindings/`   |
| **kailash-node**             | Node.js binding (napi) | `npm install kailash`, napi-rs, TypeScript-first                                                  | (this file)                  |
| **kailash-wasm**             | WASM binding           | `wasm-bindgen`, browser + Deno                                                                    | (this file)                  |

## kailash-rl

Rust-native reinforcement learning engine. Leaf crate (no workspace deps). 239 tests.

**Key types**: `Environment` trait (Gymnasium interface: `reset(seed)` → `step(action)` → `StepResult`), `Space` enum (Discrete/Box/MultiDiscrete/MultiBinary/Tuple/Dict), `SpaceValue`, `TabularAgent` trait, `EpsilonSchedule`.

**Algorithms**: `QLearning`, `Sarsa`, `ExpectedSarsa`, `MonteCarlo` (tabular); `EpsilonGreedyBandit`, `Ucb1Bandit`, `ThompsonSampling` (bandits).

**Environments**: `CartPole`, `MountainCar`, `Pendulum`, `GridWorld`, `FrozenLake`, `CliffWalking`.

**Buffers**: `ReplayBuffer` (uniform, circular), `RolloutBuffer` (on-policy, GAE), `TrajectoryBuffer` (full episodes).

**Vectorized**: `VecEnv` (sync), `ThreadedVecEnv` (parallel via `std::thread::scope`).

**Wrappers**: `TimeLimit`, `RewardScaling`, `RewardClipping` — composable via `Environment` trait.

**Utils**: `RunningStats` (Welford's), `RunningMeanStd` (observation normalization), `seeded_rng`/`global_seed`.

**Feature flags**: `burn-backend` (future Phase 1+). Deps: ndarray, rand, serde.

## kailash-align-serving

LLM fine-tuning alignment and model serving. Depends on `kailash-value`.

**InferenceEngine**: Primary entry point. Composes a `ServingBackend` with `DefaultAdapterManager`. Coordinated adapter hot-swapping with in-flight request draining via `InFlightCounter` + `DashMap` drain flags. Config: `drain_timeout`, `max_concurrent_requests`.

**Core trait**: `ServingBackend` — async trait with `load_model`, `generate`, `generate_stream`, `load_adapter`, `remove_adapter`, `model_info`, `is_ready`.

**Inference**: `InferenceRequest` (prompt + `SamplingParams` + stop sequences), `InferenceResponse` (text + token counts + `FinishReason` + `InferenceTiming`), `StreamToken` (per-token streaming with index/text/logprob/finish_reason).

**Adapters**: `DefaultAdapterManager` (thread-safe `DashMap` registry), `AdapterMetadata` (13 fields), `TrainingMethod` enum (6 variants), SHA-256 checksum validation.

**Drain**: `InFlightCounter` + `DrainGuard` — RAII pattern for hot-swap coordination.

**Backends**: `MockServingBackend` (testing), `LlamaCppBackend` (feature-gated behind `llama-cpp`, requires cmake). GGUF loading, LoRA adapters, streaming generation.

**Feature flags**: `llama-cpp` (optional), `nexus` (M5 future). Deps: tokio, serde, sha2, dashmap, tokio-stream.

## kailash-value

```rust
pub enum Value {
    Null, Bool(bool), Integer(i64), Float(f64),
    String(Arc<str>), Bytes(Bytes),
    Array(Vec<Value>), Object(BTreeMap<Arc<str>, Value>),
}
pub type ValueMap = BTreeMap<Arc<str>, Value>;
```

Design: `Arc<str>` zero-cost cloning, `BTreeMap` deterministic iteration, `Bytes` for binary. Feature: `arrow` enables `From<arrow::RecordBatch>`.

## kailash-core

**Node trait**: Single async trait — `type_name()`, `input_params()`, `output_params()`, `execute()`.

**WorkflowBuilder**: `add_node(type, id, config)` → `connect(src, out, dst, in)` → `build(&registry)?` (validation boundary).

**Runtime**: `execute(&workflow, inputs).await` (async) or `execute_sync(&workflow, inputs)` (sync wrapper). Returns `ExecutionResult { results, run_id, metadata }`.

**RuntimeConfig**: `strict_input_validation: bool` (default false).

**Resources**: `PoolRegistry` (global sharing) → `ResourceRegistry` (LIFO shutdown via `runtime.shutdown().await`).

**AuditLog** (v3.3): Append-only SHA-256 hash chain, `verify_chain()`, retention policies, legal hold.

**EventBus** (v3.3): `DomainEventBus` trait, `InMemoryEventBus` (DashMap), `EventBridge`.

**Telemetry**: Feature-gated `telemetry` — `init_telemetry()`, `workflow_span()`, `node_span()`.

## kailash-nodes

139 nodes (binding) / ~145+ (workspace with `excel`, `pdf`, `wasm` features). Categories: control_flow(8), transform(9), http(7), sql(3), file(7), ai(9), auth(10), security(12), monitoring(10), edge(14), rag(7), enterprise(8), embedded(4), + DataFlow-generated (11/model).

## kailash-dataflow

sqlx-backed. `#[dataflow::model]` generates 11 node types. Multi-database (SQLite/PG/MySQL) via `QueryDialect::from_url()`. Field validation (7 validators), data classification, `LazyDataFlow`, `MigrationManager`, `QueryEngine`.

**Gotchas**: Never set `created_at`/`updated_at` manually. `Create` uses flat params. `Update` uses `filter` + `fields`. PK must be `id`. `soft_delete` only affects DELETE.

## kailash-nexus

axum + tower. Handler pattern, Presets (None/Lightweight/Standard/SaaS/Enterprise), enterprise middleware (Auth JWT RS256, CSRF, Audit, Metrics), K8s probes, `OpenApiGenerator`, MCP channel, AgentUI SSE.

## kailash-kaizen + kaizen-agents

SDK (`kailash-kaizen`): BaseAgent TAOD loop, `#[derive(Signature)]`, LLM providers (OpenAI/Anthropic/Google/Mistral/Cohere), memory, trust framework (GovernedAgent, CircuitBreaker, ShadowEnforcer), CostTracker.

Orchestration (`kaizen-agents`): GovernedSupervisor, PlanMonitor, gradient (G1-G9), hydration (TF-IDF, search_tools), CallerEvent streaming (6 variants + wire types), 9 governance modules, audit trail. See `skills/32-kaizen-agents/`.

## Language Bindings

| Binding | Technology           | Install                                    |
| ------- | -------------------- | ------------------------------------------ |
| Python  | PyO3 + maturin       | `pip install kailash-enterprise`           |
| Ruby    | Magnus + rb-sys      | `gem install kailash`                      |
| Node.js | napi-rs              | `npm install @kailash/core`                |
| WASM    | wasm-bindgen         | `npm install @kailash/wasm`                |
| Go      | CGo via kailash-capi | `go get github.com/kailash-sdk/kailash-go` |
| Java    | JNI via kailash-capi | Maven `com.kailash:kailash-core`           |

C ABI (`kailash-capi`): Opaque pointers, JSON exchange, `cbindgen` header generation.
