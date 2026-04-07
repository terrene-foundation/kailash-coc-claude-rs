# Framework-First: Use the Highest Abstraction Layer

Default to Engines. Drop to Primitives only when Engines can't express the behavior. Never use Raw.

**Why:** Engines encode hard-won composition patterns (validation, lifecycle, concurrency) that Primitives leave to the developer. Skipping Engines means reimplementing those patterns incorrectly.

## Four-Layer Hierarchy

```
Entrypoints  ->  Applications (aegis, aether), CLI (cli-rs), others (kz-engage)
Engines      ->  DataFlowEngine, NexusEngine, DelegateEngine/SupervisorAgent, GovernanceEngine
Primitives   ->  DataFlow, Nexus, BaseAgent, Signature, envelopes, Fit/Predict traits
Specs        ->  CARE, EATP, CO, COC, PACT (standards/protocols/methodology)
```

Specs define -> Primitives implement building blocks -> Engines compose into opinionated frameworks -> Entrypoints are products users interact with.

| Framework    | Raw (never)         | Primitives                                                                   | Engine (default)                                                                                              | Entrypoints              |
| ------------ | ------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **DataFlow** | Raw SQL, SQLx       | `DataFlow`, models, nodes                                                    | `DataFlowEngine::builder()` (validation, classification, query tracking)                                      | aegis, aether, kz-engage |
| **Nexus**    | Raw Actix/Axum      | `Nexus`, handlers, channels                                                  | `NexusEngine` (middleware stack, auth, K8s)                                                                   | aegis, aether            |
| **Kaizen**   | Raw LLM API calls   | `BaseAgent`, `Signature`                                                     | `DelegateEngine`, `SupervisorAgent`                                                                           | kaizen-cli-rs            |
| **PACT**     | Manual policy       | Envelopes, D/T/R addressing                                                  | `GovernanceEngine` (thread-safe, fail-closed)                                                                 | aegis                    |
| **ML**       | ndarray, faer, rand | `Fit`, `Predict`, `DynEstimator`, `DynTransformer`, kailash-ml-preprocessing | `Pipeline` (kailash-ml-pipeline), `GridSearchCV` (kailash-ml-selection), `DataExplorer` (kailash-ml-explorer) | aegis                    |
| **Align**    | llama-cpp, burn     | `ServingBackend` trait, `AdapterManager`                                     | `InferenceEngine` (kailash-align-serving)                                                                     | aegis                    |

## DO / DO NOT

```rust
// DO: Engine layer (DataFlowEngine for production)
let engine = DataFlowEngine::builder("postgresql://...")
    .slow_query_threshold(Duration::from_secs(1))
    .build()?;

// DO NOT: Raw primitives for what Engine handles
let mut builder = WorkflowBuilder::new();
builder.add_node("UserCreateNode", "create", params);
let runtime = Runtime::new(registry);
let result = runtime.execute(builder.build(&registry)?)?;
```

```rust
// DO: Engine layer (Pipeline for ML composition)
let pipe = Pipeline::new(
    vec![("scaler", Box::new(StandardScaler::default()) as Box<dyn DynTransformer>)],
    Some(Box::new(LogisticRegression::default()) as Box<dyn DynEstimator>),
);

// DO NOT: Manual fit-predict chain when Pipeline handles it
let scaler = StandardScaler::default();
let fitted_scaler = scaler.fit_unsupervised(x.view())?;
let scaled = fitted_scaler.transform(dataset)?;
let lr = LogisticRegression::default();
let fitted_lr = lr.fit(scaled.x().view(), y.view(), &FitOpts::default())?;
```

## When Primitives Are Correct

- Complex multi-step workflows (node wiring, branching, sagas)
- Custom transaction control (savepoints, isolation levels)
- Custom agent execution model (DelegateEngine's loop doesn't fit)
- Performance-critical paths where workflow overhead matters

**Why:** Engines trade flexibility for safety. When the Engine's opinions conflict with the requirement, Primitives are the correct escape hatch -- but consult the framework specialist first.

**Always consult the framework specialist before dropping to Primitives.**

## Raw Is Always Wrong

When a Kailash framework exists for your use case, MUST NOT write raw code that duplicates framework functionality.

**Why:** Raw code bypasses the framework's validation, lifecycle management, and security controls, creating ungoverned paths that accumulate technical debt faster than any single session can repay.
