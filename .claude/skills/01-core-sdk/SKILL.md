---
name: core-sdk
description: "Kailash Core SDK (Rust) — workspace crate map (value/core/nodes/macros/plugin), 139+ nodes, WorkflowBuilder, AuditLog, EventBus. Use for crate navigation + node patterns."
---

# Kailash Workspace Crate Reference

Quick reference for all crates in the workspace. For full API docs, read the crate source or run `cargo doc --workspace --no-deps`.

## Crate Map

| Crate                  | Purpose                | Key Types                                                                                        | Skill                        |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------- |
| **kailash-value**      | Universal data type    | `Value` enum, `ValueMap` (`BTreeMap<Arc<str>, Value>`)                                           | (this file)                  |
| **kailash-core**       | Workflow engine        | `Node` trait, `WorkflowBuilder`, `Runtime`, `AuditLog`, `EventBus`                               | (this file)                  |
| **kailash-nodes**      | 139+ built-in nodes    | Control flow, HTTP, SQL, AI, Auth, Security, RAG, Edge                                           | `skills/08-nodes-reference/` |
| **kailash-macros**     | Proc-macros            | `#[kailash_node]`, `#[dataflow::model]`, `#[derive(Signature)]`                                  | (this file)                  |
| **kailash-plugin**     | WASM + native plugins  | `wasmtime` sandbox, `libloading` cdylib                                                          | (this file)                  |
| **kailash-dataflow**   | Database framework     | `DataFlow`, `QueryDialect`, `MigrationManager`, 11 nodes/model                                   | `skills/02-dataflow/`        |
| **kailash-nexus**      | Multi-channel platform | `NexusEngine`, axum handlers, tower middleware, K8s probes                                       | `skills/03-nexus/`           |
| **kailash-kaizen**     | AI agent SDK           | `BaseAgent`, TAOD loop, `LlmClient`, `CostTracker`                                               | `skills/04-kaizen/`          |
| **kaizen-agents**      | LLM orchestration      | `GovernedSupervisor`, `PlanMonitor`, hydration, CallerEvent streaming, TaodRunner Python binding | `skills/32-kaizen-agents/`   |
| **eatp**               | Trust protocol         | Ed25519 keys, CareChain, delegation, reasoning traces                                            | `skills/26-eatp-reference/`  |
| **trust-plane**        | Trust environment      | `TrustProject`, `StrictEnforcer`, shadow mode                                                    | `skills/29-trust-plane/`     |
| **kailash-governance** | Governance primitives  | `GovernanceEngine`, D/T/R, envelopes, LCA, DelegationBuilder, RBAC matrix                        | `skills/29-pact/`            |
| **kailash-pact**       | PACT governance        | Re-exports governance, adds agent, MCP, YAML, SQLite                                             | `skills/29-pact/`            |
| **kailash-enterprise** | Enterprise features    | RBAC, ABAC, audit, multi-tenancy, human competencies                                             | `skills/05-enterprise/`      |

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

**Node trait**: Single async trait -- `type_name()`, `input_params()`, `output_params()`, `execute()`.

**WorkflowBuilder**: `add_node(type, id, config)` -> `connect(src, out, dst, in)` -> `build(&registry)?` (validation boundary).

**Runtime**: `execute(&workflow, inputs).await` (async) or `execute_sync(&workflow, inputs)` (sync wrapper). Returns `ExecutionResult { results, run_id, metadata }`.

**RuntimeConfig**: `strict_input_validation: bool` (default false).

**Resources**: `PoolRegistry` (global sharing) -> `ResourceRegistry` (LIFO shutdown via `runtime.shutdown().await`).

**AuditLog** (v3.3): Append-only SHA-256 hash chain, `verify_chain()`, retention policies, legal hold.

**EventBus** (v3.3): `DomainEventBus` trait, `InMemoryEventBus` (DashMap), `EventBridge`.

**Telemetry**: Feature-gated `telemetry` -- `init_telemetry()`, `workflow_span()`, `node_span()`.

**EventLoopWatchdog** (`watchdog.rs`): Tokio runtime stall detection. Spawns a background task that measures event loop responsiveness -- WARN at 500ms delta, ERROR at 2s, with a 30s startup grace period. Observation-only (never cancels tasks). `EventLoopWatchdog::spawn(WatchdogConfig::default())` returns a `JoinHandle`.

**ProgressTracker** (`progress.rs`): Milestone-based progress reporting for long-running operations. Emits `ProgressUpdate` (items_processed, percent_complete, elapsed, ETA, errors_count) via an `OnProgress` callback (`Arc<dyn Fn(ProgressUpdate) + Send + Sync>`) at 25/50/75/100% boundaries. `default_progress_handler()` logs via `tracing::info!`. Usage: `ProgressTracker::new(total, Some(callback))` then `.tick()` per item, `.record_error()` on failure, `.finish()` at end.

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
