# Kailash RS Crate Structure

## Workspace Layout (~46 crates)

```
<workspace-root>/
├── crates/
│   ├── kailash-core/          ← Node system, workflow builder, runtime, EventBus, AuditLog
│   ├── kailash-dataflow/      ← Database ORM, models, CRUD, query engine, classification
│   ├── kailash-nexus/         ← Multi-channel deployment (API + CLI + MCP), Tower middleware
│   ├── kailash-kaizen/        ← AI agents, LLM client, signatures, tools
│   ├── kailash-enterprise/    ← RBAC, ABAC, tenant isolation, licensing
│   ├── kailash-trust-plane/   ← EATP constraint envelopes, budget tracking
│   ├── kailash-pact/          ← D/T/R governance, clearance FSM, operating envelopes
│   ├── kailash-orchestration/ ← Multi-agent coordination, A2A, pipeline routing
│   ├── kailash-ml-core/       ← Fit/Predict/Transform traits, DataSet, DynEstimator
│   ├── kailash-ml-linear/     ← Ridge, Lasso, LogisticRegression, SGD, GLMs
│   ├── kailash-ml-tree/       ← DecisionTree, ExtraTree, CART splitter
│   ├── kailash-ml-ensemble/   ← RandomForest, AdaBoost, Voting, Stacking
│   ├── kailash-ml-boost/      ← GradientBoosting, HistGradientBoosting
│   ├── kailash-ml-svm/        ← SVC, SVR, LinearSVC, SMO solver
│   ├── kailash-ml-neighbors/  ← KNN, KD-tree, Ball-tree
│   ├── kailash-ml-cluster/    ← KMeans, DBSCAN, Agglomerative
│   ├── kailash-ml-decomposition/ ← PCA, NMF, FastICA, KernelPCA
│   ├── kailash-ml-preprocessing/ ← Scalers, encoders, imputers
│   ├── kailash-ml-pipeline/   ← Pipeline, ColumnTransformer, FeatureUnion
│   ├── kailash-ml-selection/  ← GridSearchCV, cross-validation
│   ├── kailash-ml-metrics/    ← Classification, regression, clustering metrics
│   ├── kailash-ml-linalg/     ← SVD, QR, Cholesky (faer primary, BLAS optional)
│   ├── kailash-ml-misc/       ← NaiveBayes, LDA, MLP, GMM
│   ├── kailash-ml-explorer/   ← DataExplorer, profiling
│   ├── kailash-ml-text/       ← CountVectorizer, TfidfVectorizer
│   ├── kailash-ml-nodes/      ← Kailash workflow node adapters
│   ├── kailash-ml/            ← Umbrella re-export crate
│   └── kailash-align-serving/ ← LLM inference, LoRA hot-swap, serving backends
├── bindings/
│   └── kailash-python/        ← PyO3 bindings → builds kailash-enterprise wheel
│       ├── src/               ← Rust PyO3 module registration
│       └── python/kailash/    ← Pure Python wrappers
└── Cargo.toml                 ← Workspace root
```

## Adding a New Crate

1. Create `crates/kailash-{name}/Cargo.toml` with:

   ```toml
   [package]
   name = "kailash-{name}"
   version.workspace = true
   edition.workspace = true
   license = "LicenseRef-Proprietary"
   publish = false  # ALL crates are proprietary

   [dependencies]
   kailash-core = { path = "../kailash-core" }
   ```

2. Add to workspace `Cargo.toml`:

   ```toml
   [workspace]
   members = ["crates/kailash-{name}"]
   ```

3. If it needs Python bindings, add to `bindings/kailash-python/Cargo.toml`:

   ```toml
   kailash-{name} = { path = "../../crates/kailash-{name}" }
   ```

4. Run: `cargo check -p kailash-{name}` then `cargo test -p kailash-{name}`

## Source Protection

All crates: `publish = false`, `LicenseRef-Proprietary`. Distribution is binary-only via PyPI wheels (`kailash-enterprise`). No crates.io, no RubyGems, no source distributions.

## Key Conventions

- **Versioning**: Single workspace version in root `Cargo.toml` (currently 3.x)
- **Error types**: Each crate defines its own error enum, maps to `kailash_core::Error` at boundaries
- **Feature flags**: Use cargo features for optional heavy deps (e.g., `ort` for ONNX)
- **Testing**: `cargo test --workspace` runs everything; Criterion benchmarks in `benches/`
- **Formatting**: `rustup run nightly cargo fmt --all`
- **Linting**: `cargo clippy --workspace -- -D warnings`
