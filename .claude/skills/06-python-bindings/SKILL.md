---
name: python-bindings
description: "PyO3 Python bindings for Kailash Rust — maturin, .pyi stubs, Value mapping, register_callback."
---

# Python Bindings — Quick Reference

PyO3-based binding distributed as `pip install kailash-enterprise`. Import as `import kailash`.

## Key Facts

| Item              | Value                                     |
| ----------------- | ----------------------------------------- |
| **Package name**  | `kailash-enterprise` (PyPI)               |
| **Import name**   | `import kailash`                          |
| **Build tool**    | maturin (`maturin develop --release`)     |
| **Rust crate**    | `bindings/kailash-python/`                |
| **Python source** | `bindings/kailash-python/python/kailash/` |
| **Stubs**         | `bindings/kailash-python/kailash.pyi`     |
| **Native module** | `kailash._kailash` (compiled .so/.dylib)  |

## Binding Scale (v3.12.0)

**Total: 667 pyclass types + 27 pyfunctions** across 20+ source files. Expanded from 392 types in v3.11.0.

### New Files (v3.12.0)

| File                    | Types | Purpose                                          |
| ----------------------- | ----- | ------------------------------------------------ |
| `core_types.rs`         | 40+   | Core SDK types (Value, WorkflowBuilder, Runtime) |
| `eatp.rs`               | 40+   | EATP trust protocol types                        |
| `plugin.rs`             | 10+   | Plugin system (WASM, native)                     |
| `kaizen/agent_types.rs` | 8     | Agent configuration, capabilities                |
| `kaizen/core_types.rs`  | 25+   | Kaizen core (Signature, tools, execution)        |
| `kaizen/cost_types.rs`  | 8     | Cost tracking, budget management                 |
| `kaizen/mcp_types.rs`   | 6     | MCP client types                                 |
| `ml.rs`                 | 126   | ML estimators, metrics, data profiling           |

## Registered PyO3 Modules

| Module                  | Purpose             | Key Types                                                                                                        |
| ----------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `kailash` (root)        | Core SDK            | `NodeRegistry`, `WorkflowBuilder`, `Runtime`, `Value`                                                            |
| `kailash.dataflow`      | Database            | `DataFlow`, `ModelDefinition`, `FilterCondition`                                                                 |
| `kailash.enterprise`    | Access control      | `RbacEngine`, `AbacEvaluator`, `AuditLog`, `TenantContext`                                                       |
| `kailash.kaizen`        | AI agents           | `BaseAgent`, `LlmClient`, `AgentConfig`, `CostTracker`                                                           |
| `kailash.nexus`         | Deployment          | `NexusApp`, `NexusConfig`, `SessionStore`                                                                        |
| `kailash.ml`            | Machine learning    | 126 types: all estimators, metrics, `data_profile` (feature-gated `ml`)                                          |
| `kailash.trust_plane`   | Trust               | `TrustProject`, `ConstraintEnvelope`                                                                             |
| `kailash.pact`          | Governance          | 28 types: `PactAddress`, `PactGovernanceEngine`, `PactGovernedAgent`, `PactBridge`, `RbacMatrix` (feature-gated) |
| `kailash.orchestration` | Agent orchestration | 64 types: `OrchGovernedSupervisor`, `OrchPlanMonitor`, `OrchAuditTrail`, `OrchCascadeManager` (feature-gated)    |
| `kailash.align_serving` | LLM serving         | `InferenceEngine`, `SamplingParams`, `InferenceResponse`, `ModelInfo`, `AdapterMetadata`                         |
| `kailash.l3`            | L3 autonomy         | `L3Verdict`, `L3EnforcementPipeline` (feature-gated)                                                             |

## v3.9.0 Binding Modules

### align_serving (1299 lines, feature-gated `align-serving`, enabled by default)

Wraps `kailash-align-serving`. 16 PyO3 types (PR #344). Uses `MockServingBackend` by default (llama.cpp backend requires C++ compilation).

| Python class            | Rust type                 | Purpose                                                                          |
| ----------------------- | ------------------------- | -------------------------------------------------------------------------------- |
| `SamplingParams`        | `PySamplingParams`        | Temperature, top_p, top_k, max_tokens, stop sequences, repetition penalty        |
| `ModelInfo`             | `PyModelInfo`             | Model metadata (name, parameters, quantization)                                  |
| `InferenceResponse`     | `PyInferenceResponse`     | Generated text, token count, timing, finish reason                               |
| `AdapterMetadata`       | `PyAdapterMetadata`       | LoRA adapter info (rank, alpha, target modules, training method)                 |
| `InferenceEngine`       | `PyInferenceEngine`       | Main engine: `load_model()`, `generate()`, `generate_stream()`, adapter hot-swap |
| `InferenceRequest`      | `PyInferenceRequest`      | Request builder with prompt, sampling params, adapter selection                  |
| `EngineConfig`          | `PyEngineConfig`          | Engine configuration (max concurrent, queue depth, timeouts)                     |
| `ModelParams`           | `PyModelParams`           | Model loading parameters (path, context length, GPU layers)                      |
| `AdapterId`             | `PyAdapterId`             | Unique adapter identifier (hashable, comparable)                                 |
| `AdapterInfo`           | `PyAdapterInfo`           | Loaded adapter runtime info                                                      |
| `InferenceTiming`       | `PyInferenceTiming`       | Timing breakdown (prompt eval, generation, total)                                |
| `InferenceFinishReason` | `PyInferenceFinishReason` | Generation stop reason (length, stop sequence, end of text)                      |
| `StreamToken`           | `PyStreamToken`           | Single streaming token with timing metadata                                      |
| `TrainingMethod`        | `PyTrainingMethod`        | Fine-tuning method enum (LoRA, QLoRA, full)                                      |
| `DefaultAdapterManager` | `PyDefaultAdapterManager` | Concurrent adapter registry (register, unload, list)                             |
| `InFlightCounter`       | `PyInFlightCounter`       | In-flight request counter for backpressure                                       |

Source: `bindings/kailash-python/src/align_serving.rs`

### pact (2634 lines, feature-gated)

Wraps `kailash-pact` + `kailash-governance`. 28 PyO3 types covering the full PACT governance surface.

**Core**: `PactAddress` (D/T/R parsing), `PactGovernanceEngine` (thread-safe, fail-closed), `PactGovernanceContext` (read-only snapshot), `PactGovernedAgent` (agent with enforcement).

**Envelopes & clearance**: `PactRoleEnvelope`, `PactTaskEnvelope`, `PactEffectiveEnvelopeSnapshot`, `PactClassificationLevel`, `PactRoleClearance`.

**Organization**: `PactCompiledOrg`, `PactOrgNode`, `PactRoleSummary`, `PactVacancyDesignation`, `PactVacancyStatus`.

**Decisions**: `PactGovernanceVerdict`, `PactAccessDecision`, `PactEnforcementMode`, `PactGradientZone`, `PactApprovalState`.

**Bridge & knowledge**: `PactBridge`, `PactKnowledgeItem`, `PactKnowledgeSharePolicy`, `PactBridgeApprovalStatus`.

**RBAC export**: `RbacCell`, `RbacMatrix` (CSV, JSON, Markdown export).

**Held actions**: `PactHeldAction`, `PactMemoryHeldActionStore`.

Source: `bindings/kailash-python/src/pact.rs`

### orchestration (4664 lines, feature-gated)

Wraps `kaizen-agents` orchestration layer. 64 PyO3 types — the largest binding module.

**Supervisor**: `OrchGovernedSupervisor` (main entry), `OrchSupervisorConfig`, `OrchSupervisorResult`.

**Monitor**: `OrchPlanMonitor`, `OrchMonitorConfig`, `OrchMonitorResult`, `OrchGovernanceHooks`.

**Governance**: `OrchAccountabilityTracker`, `OrchAccountabilityRecord`, `OrchClearanceEnforcer`, `OrchDimensionSnapshot`, `OrchGovernanceSnapshot`.

**Budget**: `OrchGovernanceBudgetTracker`, `OrchBudgetSnapshot`, `OrchBudgetEvent`, `OrchBudgetWarning`, `OrchBudgetWarningConfig`, `OrchBudgetWarningZone`, `OrchBudgetEventType`.

**Lifecycle**: `OrchAgentLifecycleManager`, `OrchAgentRecord`, `OrchLifecycleState`.

**Cascade & vacancy**: `OrchCascadeManager`, `OrchCascadeEvent`, `OrchCascadeTrigger`, `OrchVacancyManager`, `OrchVacancyEvent`, `OrchVacancyAction`, `OrchOrphanType`.

**Dereliction & bypass**: `OrchDerelictionDetector`, `OrchDerelictionWarning`, `OrchDerelictionConfig`, `OrchDerelictionSeverity`, `OrchBypassManager`, `OrchBypassRecord`.

**Audit & reasoning**: `OrchAuditTrail`, `OrchAuditRecord`, `OrchAuditEventType`, `OrchReasoningStore`, `OrchReasoningRecord`, `OrchTraceEmitter`.

**Transport**: `OrchMessageTransport`, `OrchTransportEnvelope`, `OrchTransportPayload`.

**History**: `OrchConversationHistory`, `OrchConversationTurn`, `OrchHistoryConfig`, `OrchTurnRole`.

**PACT bridge**: `OrchPactMcpBridge`, `OrchPactEngineConfig`, `OrchMcpVerdict`, `OrchToolPolicy`, `OrchAgentContext`.

**Enums**: `OrchClearanceLevel`, `OrchAccountabilityOutcome`, `OrchDutyType`, `OrchOrchestrationDecision`, `OrchEscalationSeverity`, `OrchRejectionRecord`, `OrchHeldAction`.

Source: `bindings/kailash-python/src/orchestration.rs`

## Value Mapping (Rust <-> Python)

| Rust `Value`        | Python  |
| ------------------- | ------- |
| `Value::Null`       | `None`  |
| `Value::Bool(b)`    | `bool`  |
| `Value::Integer(i)` | `int`   |
| `Value::Float(f)`   | `float` |
| `Value::String(s)`  | `str`   |
| `Value::Array(a)`   | `list`  |
| `Value::Map(m)`     | `dict`  |

## Quick Patterns

### Build and install locally

```bash
cd bindings/kailash-python
cargo clean -p kailash-python   # Prevent stale binary
maturin develop --release
```

### Register a Python callback as a node

```python
import kailash
reg = kailash.NodeRegistry()
reg.register_callback("MyNode", my_func, ["input"], ["output"])
```

### v2 API (current)

```python
reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NoOpNode", "n1", {})
wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf, {})
```

## API Changes (v3.12.0 Convergence)

Breaking changes from the convergence branch that affect binding consumers:

- **`WorkerAgent::new(name, inner)` returns `Result`** — name validation added (`^[a-z][a-z0-9_-]{2,63}$`). Callers must use `?` or `.expect()`.
- **`SupervisorAgent::new()` requires 4 args** — `(name, workers, routing, max_delegation_depth)`. The `routing` arg is `Arc<dyn RoutingStrategy>` (use `RoundRobin::new()` for tests).
- **`with_description()` takes `String` and returns `Result<&mut Self, WorkerError>`** — must split from builder chain into separate statements.
- **`CallerEvent` has new `ToolCallDelta` variant** — all match expressions must be exhaustive.
- **`BudgetExhausted` variant added to `CallerEvent`** — streaming consumers must handle budget termination.
- **Debug output standardized to snake_case** — e.g., `Zone::Active` now prints as `active`.
- **16 new convergence types exported** — `EatpJwtClaims`, `PyTrustPostureLevel`, `PyRoutingStrategy`, `PyAuditEvent`, etc.

### Cross-SDK Test Fixtures (v3.12.0+)

Canonical JSON fixtures at `workspaces/platform-architecture-convergence/01-analysis/test-vectors/`:

- `agent-result-wire-v1.json` — AgentResult wire format (SPEC-09 section 3.3)

Parity tests: `crates/kailash-kaizen/tests/cross_sdk_agent_result.rs`, `crates/eatp/tests/cross_sdk_envelope.rs`, `crates/trust-plane/tests/cross_language.rs`, `crates/kailash-mcp/tests/cross_sdk_jsonrpc.rs`.

## Binding Gotchas (v3.12.0 Red Team Findings)

These patterns were discovered during the 392-to-667 type expansion and validated by red team cycles.

| Issue                                                 | Impact                                                                      | Fix                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Duplicate `#[pyclass(name = "X")]` across files       | Silent runtime shadowing -- second registration wins, first type disappears | Grep all `pyclass(name =` before adding new types; use module-qualified names |
| `__repr__` with `&s[..N]` on UTF-8 strings            | Panics on multibyte chars at byte boundary                                  | Use `s.chars().take(N).collect::<String>()`                                   |
| `EatpKeyPair.__repr__` exposing public key            | Security leak in logs/REPL                                                  | Redact: `"EatpKeyPair(public_key=<redacted>)"`                                |
| `check_gradient_dereliction` with invalid zone string | Silent default to wrong zone                                                | Validate zone strings, return `PyValueError` on unknown                       |
| `align-serving` not in default features               | Types compile but missing from wheel at runtime                             | Add `align-serving` to default features in `Cargo.toml`                       |
| GIL-holding `block_on` for async Rust                 | Acceptable for fast ops (<1ms), deadlocks on I/O                            | Use `py.allow_threads(\|\| ...)` for any network/disk I/O                     |

## ML Python Bindings

126 estimator classes + 30 functions wrapping `kailash-ml`. Feature-gated behind `ml` (enabled by default).

| Item               | Value                                                  |
| ------------------ | ------------------------------------------------------ |
| **Rust source**    | `bindings/kailash-python/src/ml/mod.rs` (11,010 lines) |
| **Python package** | `python/kailash/ml/__init__.py`                        |
| **Import pattern** | `from kailash._kailash import ...`                     |
| **PyO3 module**    | `kailash.ml`                                           |

### Module Coverage

| Submodule         | Category                                              |
| ----------------- | ----------------------------------------------------- |
| `linear_model`    | Linear/logistic regression, ridge, lasso, elastic net |
| `tree`            | Decision trees (classification + regression)          |
| `ensemble`        | Random forest, bagging, extra trees                   |
| `boost`           | Gradient boosting, AdaBoost, XGBoost-style            |
| `svm`             | Support vector machines (classification + regression) |
| `neighbors`       | KNN, radius neighbors                                 |
| `cluster`         | K-means, DBSCAN, agglomerative, spectral              |
| `decomposition`   | PCA, SVD, NMF                                         |
| `preprocessing`   | Scalers, encoders, normalizers, imputers              |
| `naive_bayes`     | Gaussian, multinomial, Bernoulli NB                   |
| `neural`          | MLP classifier/regressor                              |
| `text`            | TF-IDF, count vectorizer, text transformers           |
| `pipeline`        | Pipeline composition, feature unions                  |
| `model_selection` | Cross-validation, train/test split, grid search       |
| `metrics`         | Classification, regression, clustering metrics        |

### Usage

```python
from kailash.ml import LinearRegression, StandardScaler, Pipeline

scaler = StandardScaler()
model = LinearRegression()
pipe = Pipeline([("scaler", scaler), ("model", model)])
```

## Skill Files

| File                                | Content                                                               |
| ----------------------------------- | --------------------------------------------------------------------- |
| `python-v2-quickstart.md`           | v2 API migration guide                                                |
| `python-cheatsheet.md`              | Common patterns                                                       |
| `python-common-mistakes.md`         | Pitfalls and fixes                                                    |
| `python-custom-nodes.md`            | Callback node patterns                                                |
| `python-framework-bindings.md`      | DataFlow/Nexus/Kaizen/Enterprise Python API                           |
| `python-gold-standards.md`          | Binding quality rules                                                 |
| `python-migration-guide.md`         | v1 to v2 migration                                                    |
| `python-available-nodes.md`         | Node list for Python                                                  |
| `annotation-resolution-fallback.md` | annotationlib fallback for `typing.get_type_hints` NameError on 3.14+ |
| `async-bridging.md`                 | Async Rust <-> Python bridging                                        |

## Related

- **python-binding** agent — PyO3 implementation specialist
- **python-pattern-expert** agent — Debugging PyO3 errors
- `rules/release.md` — Wheel build and PyPI publishing rules
