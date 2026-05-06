# kailash-ml — Classical ML Framework (Rust)

20-crate workspace providing scikit-learn-equivalent algorithms with Rust performance. 90+ estimator types, 62 EstimatorRegistry entries, TransformerRegistry, rayon parallelism. All crates proprietary (`publish = false`).

## Quick Start

```rust
use kailash_ml::core::estimator::Fit;
use kailash_ml::core::fit_opts::FitOpts;
use kailash_ml::linear::ols::LinearRegression;

let lr = LinearRegression::default();
let fitted = lr.fit(x.view(), y.view(), &FitOpts::default())?;
let predictions = fitted.predict(x_test.view())?;
let r2 = fitted.score(x_test.view(), y_test.view())?;
```

## Crate Layout

```
crates/
  kailash-ml/                # Umbrella — re-exports all sub-crates + engine layer (MlEngine, ModelRegistry, ExperimentTracker, AutoMl)
  kailash-ml-core/           # Traits, DataSet, FitOpts, MlError, RandomState, sampling, DynEstimator, EstimatorRegistry
  kailash-ml-linalg/         # SVD/QR/eigendecomposition, distance/kernel functions, solvers (L-BFGS, SAGA, SGD, coord descent)
  kailash-ml-preprocessing/  # StandardScaler, MinMaxScaler, OneHotEncoder, SimpleImputer, KNNImputer, IterativeImputer, Normalizer
  kailash-ml-linear/         # OLS, Ridge, Lasso, ElasticNet, LogisticRegression, SGD, GLMs, Bayesian, Robust (17 registry entries)
  kailash-ml-tree/           # CART splitter+criteria, DecisionTree (Regressor+Classifier)
  kailash-ml-ensemble/       # RandomForest, ExtraTrees, Bagging, AdaBoost, Voting, Stacking, IsolationForest (13 entries)
  kailash-ml-boost/          # GradientBoosting (Reg+Clf), HistGradientBoosting (Reg+Clf), DART, GOSS/EFB, monotone constraints
  kailash-ml-svm/            # SMO solver (WSS-3), SVC/SVR, LinearSVC/LinearSVR, NuSVC/NuSVR, OneClassSVM, kernel cache
  kailash-ml-neighbors/      # KD-tree, BallTree, KNeighbors (Clf+Reg), RadiusNeighbors (Clf+Reg), NearestCentroid
  kailash-ml-cluster/        # KMeans, MiniBatchKMeans, DBSCAN, HDBSCAN, OPTICS, Birch, AgglomerativeClustering, AffinityPropagation, SpectralClustering, MeanShift
  kailash-ml-decomposition/  # PCA, IncrementalPCA, TruncatedSVD, NMF, FactorAnalysis, FastICA, KernelPCA, t-SNE, LDA (topic), SparsePCA, DictionaryLearning, SelectKBest, RFE
  kailash-ml-metrics/        # 60+ metrics: classification, regression, ranking (ROC/AUC), clustering, Scorer
  kailash-ml-selection/      # KFold, StratifiedKFold, GroupKFold, TimeSeriesSplit, cross_val_score, GridSearchCV
  kailash-ml-pipeline/       # Pipeline, ColumnTransformer, FeatureUnion
  kailash-ml-misc/           # GaussianNB, MultinomialNB, BernoulliNB, LDA/QDA, GaussianProcess, MLP (Clf+Reg), CalibratedClassifierCV, IsotonicRegression, OneVsRest/OneVsOne, GaussianMixture, LabelPropagation/Spreading, BernoulliRBM, PLSRegression, CCA
  kailash-ml-text/           # CountVectorizer, TfidfVectorizer, HashingVectorizer
  kailash-ml-explorer/       # DataExplorer: profiling, alerts, HTML reports with scatter plots, KDE, Cramer's V
  kailash-ml-nodes/          # 7 workflow nodes: EstimatorFitNode, PredictNode, MLTransformNode, CrossValidateNode, PipelineNode, MetricNode, ScoreNode
  kailash-ml-python/         # PyO3 bindings: 126 pyclass types + 30 pyfunctions, module at `bindings/kailash-python/src/ml/mod.rs`
```

## Trait System (kailash-ml-core)

```
Layer 1 (Type-State):     Config --fit()--> FittedConfig (compile-time safety)
Layer 2 (Object-Safe):    Box<dyn DynEstimator> / Box<dyn DynTransformer> (Pipeline, GridSearch)
```

| Trait             | Purpose                                             | Used By                                     |
| ----------------- | --------------------------------------------------- | ------------------------------------------- |
| `Fit`             | Supervised fitting: `fit(x, y, opts) -> Fitted`     | All regressors/classifiers                  |
| `FitUnsupervised` | Unsupervised: `fit(x) -> Fitted`                    | KMeans, PCA, DBSCAN, NMF, GMM               |
| `Predict`         | `predict(x) -> Array1`                              | All fitted models                           |
| `PredictProba`    | `predict_proba(x) -> Array2`                        | Classifiers                                 |
| `Transform`       | `transform(dataset) -> DataSet`                     | Preprocessors, PCA                          |
| `FitTransform`    | Combined fit+transform                              | Preprocessors, KNNImputer, IterativeImputer |
| `Score`           | `score(x, y) -> f64`                                | R2 (regression), accuracy (classification)  |
| `BaseEstimator`   | `get_params/set_params/estimator_type`              | All algorithms                              |
| `DynEstimator`    | Object-safe estimator (blanket impl from Fit+Clone) | GridSearchCV, cross_val_score               |
| `DynTransformer`  | Object-safe transformer (blanket from FitTransform) | Pipeline steps                              |

**Key invariant**: Every algorithm implementing `Fit` + `Predict` + `Clone` gets `DynEstimator` via blanket impl. IsolationForest and OneClassSVM implement `Fit` (wrapping `FitUnsupervised`, ignoring `y`) to enable DynEstimator blanket and EstimatorRegistry participation.

## Engine Layer (kailash-ml umbrella) -- COMPLETE (10 modules)

The engine module (`crates/kailash-ml/src/engine/`) provides high-level orchestration on top of the algorithm crates. All 10 modules are fully implemented.

| Component           | Key Types                                                        | Purpose                                                                                         |
| ------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `MlEngine`          | `MlEngine`, `MlWorkflowBuilder`, `MlWorkflow`                    | Builder-configured environment: registry + tracker + fluent workflow API                        |
| `ModelRegistry`     | `ModelRegistry`, `FileSystemRegistry`, `InMemoryRegistry`        | Version-controlled model storage with stage lifecycle (Dev->Staging->Prod->Archived)            |
| `ExperimentTracker` | `ExperimentTracker`, `LocalTrackerBackend`                       | Training run telemetry: params, time-series metrics, SVG charts, JSON persistence               |
| `AutoMl`            | `AutoMl`, `AutoMlConfig`, `TaskType`                             | Automated model selection with time budget + trial limits (`selection` feature)                 |
| `InferenceServer`   | `InferenceServer`, `InferenceConfig`, `ModelInfo`                | TTL cache, latency percentiles (p50/p95/p99), ModelRegistry integration, DashMap-backed         |
| `DriftMonitor`      | `DriftMonitor`, `DriftConfig`, `DriftReport`                     | PSI + KS two-sample test, prediction monitoring, bounded history, per-feature drift             |
| `FeatureStore`      | `FeatureStore`, `FileSystemFeatureStore`, `InMemoryFeatureStore` | Versioned feature sets with lineage tracking, `FeatureStoreBackend` trait                       |
| `OnnxBridge`        | `OnnxBridge`, `OnnxModel`, `OnnxGraph`                           | Linear + tree model export to ONNX-compatible JSON serialization                                |
| `ModelVisualizer`   | `ModelVisualizer`, `ConfusionMatrix`, `RocCurve`                 | Confusion matrix, ROC/AUC, feature importance, classification report, learning curve, residuals |
| `FeatureEngineer`   | `FeatureEngineer`, `FeatureEngineerBuilder`                      | Polynomial features, scalers (Standard/MinMax/Robust), encoders, feature selection              |

```rust
// MlEngine: fluent workflow API with auto-tracking
let engine = MlEngine::builder()
    .with_model_dir("/tmp/models")
    .build()?;

let result = engine.workflow()
    .data(x_train.view(), y_train.view())
    .grid_search("RandomForestClassifier", &param_grid)
    .cross_validate(5)
    .build_and_run()?;

// InferenceServer: cached predictions with latency tracking
let server = InferenceServer::new(InferenceConfig { ttl_secs: 300, ..Default::default() });
server.register_model("rf-v1", model_artifact, engine.registry())?;
let predictions = server.predict("rf-v1", &input)?;
let metrics: InferenceMetricsSnapshot = server.metrics("rf-v1")?; // p50, p95, p99

// DriftMonitor: detect data/prediction drift
let monitor = DriftMonitor::new(DriftConfig::default());
monitor.set_reference(reference_data.view())?;
let report: DriftReport = monitor.check(production_data.view())?;
// report.features contains per-feature PSI + KS p-value

// FeatureStore: versioned feature management
let store = FeatureStore::new(FileSystemFeatureStore::new("/tmp/features")?);
store.register("user_features", feature_array.view(), metadata)?;
let features = store.get("user_features", Some("v2"))?;

// FeatureEngineer: preprocessing pipeline
let eng = FeatureEngineer::builder()
    .polynomial_features(2)
    .scaler(ScalerType::Standard)
    .select_k_best(10, SelectionMethod::FScore)
    .build()?;
let transformed = eng.fit_transform(x.view(), Some(y.view()))?;
```

## EstimatorRegistry (compile-time, inventory-based)

62 estimators registered via `register_estimator!` macro across algorithm crates. Enables string-based lookup for workflow nodes and dynamic dispatch. See also TransformerRegistry (P3) for transformer-specific lookup.

```rust
let est = EstimatorRegistry::get("RandomForestClassifier")?;
let est = EstimatorRegistry::get_with_params("Ridge", &params)?;
let names = EstimatorRegistry::list();
let classifiers = EstimatorRegistry::list_by_type(EstimatorType::Classifier);
```

## Feature Flags (kailash-ml umbrella)

```toml
[features]
default = ["linear", "tree", "ensemble", "preprocessing", "metrics", "pipeline", "selection"]
full = ["default", "boost", "svm", "neighbors", "cluster", "decomposition", "text", "misc", "explorer"]
blas = ["kailash-ml-linalg/blas"]  # Optional BLAS acceleration
```

## Performance Patterns

**Parallel (rayon):** RandomForest/ExtraTrees/Bagging training + prediction, KMeans n_init, cross_val_score folds, GridSearchCV params, ColumnTransformer columns, FeatureUnion, HistGB prediction, DBSCAN distances.

**Vectorized:** KMeans distances (ndarray dot products, zero per-sample allocs), euclidean_distances via BLAS trick.

**Algorithmic:** Randomized SVD for PCA (Halko 2011), HistGB histogram subtraction, L-BFGS two-loop recursion, WSS-3 SMO, Barnes-Hut t-SNE, Kahan compensated summation.

**Memory:** HistGB BinnedDataset column-major u8 (8x less than f64), KD-tree leaf_size=30, BallTree for high-dimensional neighbors.

## Pipeline Composition

```rust
use kailash_ml_preprocessing::scalers::StandardScaler;
use kailash_ml_linear::logistic::LogisticRegression;
use kailash_ml_pipeline::{Pipeline, Step};

// Preprocessors implement FitTransform -> DynTransformer blanket impl
// KNNImputer and IterativeImputer also implement FitTransform for Pipeline use
let pipe = Pipeline::new(
    vec![Step::transformer("scaler", Box::new(StandardScaler::default()))],
    Some(Step::estimator("lr", Box::new(LogisticRegression::default()))),
);
```

## Python Bindings (v3.12.0+)

126 pyclass types + 10 pyfunctions in `bindings/kailash-python/src/ml.rs`. Feature-gated behind `ml` (default-enabled in kailash-enterprise wheel).

**API**: sklearn-compatible — `fit(X, y)`, `predict(X)`, `score(X, y)`, `transform(X)`, `fit_transform(X, y)`, `get_params()`, `set_params(**kwargs)`. Data interchange via `numpy` arrays (`pyo3-numpy`).

**Estimator patterns**: Two internal strategies —

- `SupervisedState`: wraps `Box<dyn DynEstimator>` for all supervised models (regressors, classifiers, SVMs, ensembles). Uniform fit/predict/score.
- Inline config+fitted: used for unsupervised models (KMeans, PCA, StandardScaler) that have their own fit paths.

**Metric functions**: `accuracy_score`, `precision_score`, `recall_score`, `f1_score`, `r2_score`, `mean_squared_error`, `mean_absolute_error`.

**Utility functions**: `list_estimators()`, `estimator_count()`, `data_profile(X)` (statistical profiling via kailash-ml-explorer).

```python
from kailash.ml import LinearRegression, accuracy_score, data_profile

lr = LinearRegression()
lr.fit(X_train, y_train)
preds = lr.predict(X_test)
r2 = lr.score(X_test, y_test)
print(lr.get_params())  # {"fit_intercept": True}
```

**Coverage**: All 14 sub-crates exposed — linear (17), tree (2), ensemble (13), boost (5), svm (8), neighbors (6), cluster (10), decomposition (13), preprocessing (7), misc (20+), text (3), pipeline (3), selection (5), metrics (7 functions). Explorer via `data_profile()`.

## M11 Text Features (v3.12.2, `text` feature flag)

6 vectorizers in `kailash-ml-text/`:

| Vectorizer          | Purpose                                 | Sparse Output |
| ------------------- | --------------------------------------- | ------------- |
| `CountVectorizer`   | Token counts (bag-of-words)             | Yes           |
| `TfidfTransformer`  | IDF weighting on count matrix           | Yes           |
| `TfidfVectorizer`   | Count + IDF in one step                 | Yes           |
| `HashingVectorizer` | Stateless hashing trick (no vocabulary) | Yes           |
| `FeatureHasher`     | Hashes arbitrary feature dicts          | Yes           |
| `DictVectorizer`    | Dict-of-features to sparse matrix       | Yes           |

All implement `Fit` / `Transform` / `FitTransform` + `BaseEstimator`. Pipeline-compatible via `DynTransformer` blanket.

```rust
use kailash_ml_text::tfidf::TfidfVectorizer;

let corpus = vec!["the cat sat", "the dog ran"];
let vectorizer = TfidfVectorizer::default();
let fitted = vectorizer.fit_transform(&corpus)?;
// fitted: sparse CSR matrix, shape (2, vocab_size)
```

**Pipeline integration**: Chain vectorizers with classifiers in `Pipeline`. Integration tests use realistic multi-document corpora.

## M13 Workflow Nodes (kailash-ml-nodes)

7 workflow nodes in `crates/kailash-ml-nodes/src/nodes/` that integrate ML into the Kailash workflow engine. Generic dispatch by name -- one node type dispatches to any registered estimator/transformer/metric at runtime via `EstimatorRegistry` / `get_scorer()`. 32 tests.

| Node                | Purpose                                              | Registry Dispatch                        |
| ------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `EstimatorFitNode`  | Fit any registered estimator by name                 | `EstimatorRegistry::get_with_params()`   |
| `PredictNode`       | Predict using a fitted model from workflow context   | Via fitted model                         |
| `MLTransformNode`   | Apply any transformer by name (scalers, encoders)    | `EstimatorRegistry` (transformer subset) |
| `CrossValidateNode` | K-fold cross-validation with configurable scorer     | `EstimatorRegistry` + `get_scorer()`     |
| `PipelineNode`      | Build and run multi-step Pipeline from config        | `EstimatorRegistry` per step             |
| `MetricNode`        | Compute any metric by name on predictions vs targets | `get_scorer()`                           |
| `ScoreNode`         | Score a fitted model using its built-in `.score()`   | Via fitted model                         |

```rust
// EstimatorFitNode dispatches to any registered estimator
let node = EstimatorFitNode::from_config(&ValueMap::from([
    ("estimator_name".into(), "RandomForestClassifier".into()),
    ("n_estimators".into(), 100.into()),
]));
// At runtime: EstimatorRegistry::get_with_params("RandomForestClassifier", &params)
```

## M14 Python Bindings Restructure

126 estimator PyO3 classes + 30 functions covering all algorithm families. Module restructured from single `ml.rs` to `ml/mod.rs` for maintainability.

**Module layout:**

- Rust: `bindings/kailash-python/src/ml/mod.rs`
- Python subpackage: `bindings/kailash-python/python/kailash/ml/__init__.py` (explicit `__all__` re-exports)

**Import pattern:**

```python
# Correct — through the Python subpackage
from kailash.ml import LinearRegression, RandomForestClassifier, accuracy_score

# Internal binding path (used by __init__.py, not end users)
from kailash._kailash import PyLinearRegression  # NOT bare `from _kailash`
```

**Coverage by family:**

| Family        | Classes | Functions |
| ------------- | ------- | --------- |
| Linear        | 17      | --        |
| Tree          | 2       | --        |
| Ensemble      | 13      | --        |
| Boost         | 5       | --        |
| SVM           | 8       | --        |
| Neighbors     | 6       | --        |
| Cluster       | 10      | --        |
| Decomposition | 13      | --        |
| Preprocessing | 7       | --        |
| Misc          | 20+     | --        |
| Text          | 3       | --        |
| Pipeline      | 3       | --        |
| Selection     | 5       | --        |
| Metrics       | --      | 7         |
| Explorer      | --      | 1         |
| Utilities     | --      | 2         |

## M15 Benchmarks

43 Criterion benchmarks in `crates/kailash-ml/benches/ml_bench.rs` across 16 groups. Used for regression detection and performance characterization.

**Benchmark groups:** linear, tree, ensemble, gradient boosting, SVM, KNN, clustering, PCA, preprocessing, pipeline, scaling (plus additional algorithmic groups).

**Synthetic data helpers** (in the bench file):

- `make_classification(n_samples, n_features)` -- generates labeled classification data
- `make_regression(n_samples, n_features)` -- generates continuous regression data
- `classification_target(n_samples)` -- generates binary class labels

```bash
# Run all ML benchmarks
cargo bench -p kailash-ml

# Run a single group
cargo bench -p kailash-ml -- linear
```

## M16 API Documentation

`#![warn(missing_docs)]` enforced on all 20 ML crates via dual mechanism:

1. `Cargo.toml` `[lints.rust]` section: `missing_docs = "warn"`
2. `lib.rs` attribute: `#![warn(missing_docs)]`

Enriched module-level documentation for P0 crates:

- **kailash-ml-core** -- trait hierarchy, EstimatorRegistry, DataSet, FitOpts, error types
- **kailash-ml** (umbrella) -- engine layer overview, feature flags, re-export index
- **kailash-ml-preprocessing** -- scaler/encoder/imputer contracts, pipeline integration
- **kailash-ml-linear** -- regression/classification families, solver selection, regularization
- **kailash-ml-tree** -- CART splitter, criteria (gini/entropy/mse), pruning
- **kailash-ml-linalg** -- SVD/QR/eigendecomposition, solver inventory, BLAS acceleration

## P2-P4 Registry Integration (v3.13.0)

Post-milestone phases that added remaining algorithms and completed registry coverage across all algorithm families.

### New Algorithms

- **PLSCanonical** (canonical PLS, symmetric deflation) in kailash-ml-misc — completes the cross-decomposition family alongside PLSRegression and CCA

### Registry Integration

Algorithms that existed but lacked `register_estimator!` / `register_transformer!` macro invocations were integrated into the compile-time registries:

**EstimatorRegistry (`register_estimator!`):**

| Family              | Algorithms                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Clustering          | SpectralClustering, MeanShift, MiniBatchKMeans, OPTICS, Birch, AffinityPropagation (Fit+Predict) |
| Semi-supervised     | LabelPropagation, LabelSpreading                                                                 |
| Cross-decomposition | PLSRegression, PLSCanonical, CCA                                                                 |

**TransformerRegistry (`register_transformer!`):**

| Family        | Algorithms                                                           |
| ------------- | -------------------------------------------------------------------- |
| Kernel approx | RBFSampler, Nystroem                                                 |
| Decomposition | SparsePCA, DictionaryLearning                                        |
| Pipeline      | BernoulliRBM (FitTransform + DynTransformer)                         |
| Text          | CountVectorizer, TfidfVectorizer, HashingVectorizer (DynTransformer) |

**Note:** TfidfTransformer implements FitTransform but is not registered as a standalone transformer — it is used internally by TfidfVectorizer.

### New Infrastructure

- **TransformerRegistry** + `register_transformer!` macro in kailash-ml-core — parallel to EstimatorRegistry, enables string-based lookup for transformer types in workflow nodes and dynamic dispatch
- **`ParamDistribution::sample_n()`** — batch sampling for hyperparameter search (avoids per-sample overhead in GridSearchCV/RandomSearchCV)

### New Visualization

- **`scatter_plot_svg()`** standalone function in kailash-ml-explorer — generates scatter plot SVGs without requiring a full DataExplorer instance
- **`training_curve_svg()` / `training_curves_svg()`** on ExperimentTracker — render training metric time-series as SVG charts directly from tracked experiment data

## Milestone Status

All milestones M0-M16 and phases P1-P4 complete:

| Milestone | Description                          | Status   |
| --------- | ------------------------------------ | -------- |
| M0        | Core traits + DataSet                | Complete |
| M1        | Linear models                        | Complete |
| M2        | Tree models                          | Complete |
| M3        | Ensemble models                      | Complete |
| M4        | Gradient boosting                    | Complete |
| M5        | SVM                                  | Complete |
| M6        | Neighbors                            | Complete |
| M7        | Clustering + Decomposition           | Complete |
| M8        | Metrics + Selection + Pipeline       | Complete |
| M9        | Miscellaneous algorithms             | Complete |
| M10       | Engine layer (10 modules)            | Complete |
| M11       | Text features                        | Complete |
| M12       | Explorer (DataExplorer)              | Complete |
| M13       | Workflow nodes (7 nodes, 32 tests)   | Complete |
| M14       | Python bindings (126 classes)        | Complete |
| M15       | Benchmarks (43 Criterion benches)    | Complete |
| M16       | API docs (missing_docs on 20 crates) | Complete |
| P1        | Clippy + test hardening              | Complete |
| P2        | Estimator registry completion        | Complete |
| P3        | Transformer registry + new infra     | Complete |
| P4        | Visualization + PLSCanonical         | Complete |

## Dependencies

Core: `ndarray` 0.16, `sprs` 0.11, `rayon` 1.10, `rand` 0.8/`rand_chacha` 0.3, `serde`, `bincode`, `inventory`. No external ML libraries -- all algorithms implemented from scratch.

## Gotchas

- `FitOpts` carries `sample_weight`, `class_weight`, `eval_set` -- always pass even if default. `RandomState` is a separate type in `kailash_ml_core::random`
- `DataSet` is an enum (`Dense`/`Sparse`) carrying data matrix with optional feature names -- `Target` is a separate enum for supervised labels
- `MlError::NotFitted` if you call fitted methods on unfitted state (runtime check for dyn dispatch)
- Sparse matrices (`sprs::CsMat`) supported in core but not all algorithms accept them yet
- Histogram subtraction in HistGB requires sorted bin indices -- do not shuffle binned data
- `rand` 0.8 API (NOT 0.9+): use `thread_rng()`, not `rng()`
- When `faer` is in scope, provide explicit type annotations to avoid inference ambiguity

## Key Files

- Trait definitions + EstimatorRegistry: `crates/kailash-ml-core/src/estimator.rs`
- DataSet type: `crates/kailash-ml-core/src/dataset.rs`
- Engine module index: `crates/kailash-ml/src/engine/mod.rs`
- Engine (MlEngine + MlWorkflowBuilder): `crates/kailash-ml/src/engine/builder.rs`
- ModelRegistry (stage lifecycle): `crates/kailash-ml/src/engine/registry.rs`
- ExperimentTracker (JSON persistence + SVG): `crates/kailash-ml/src/engine/tracker.rs`
- AutoMl (time budget + trials): `crates/kailash-ml/src/engine/automl.rs`
- InferenceServer (TTL cache + latency): `crates/kailash-ml/src/engine/inference.rs`
- DriftMonitor (PSI + KS test): `crates/kailash-ml/src/engine/drift.rs`
- FeatureStore (versioning + lineage): `crates/kailash-ml/src/engine/feature_store.rs`
- OnnxBridge (linear + tree export): `crates/kailash-ml/src/engine/onnx.rs`
- ModelVisualizer (confusion, ROC, etc.): `crates/kailash-ml/src/engine/visualizer.rs`
- FeatureEngineer (polynomial, scalers): `crates/kailash-ml/src/engine/feature_eng.rs`
- Workflow nodes: `crates/kailash-ml-nodes/src/nodes/` (estimator_fit, predict, transform, cross_validate, pipeline, metric, score)
- Python bindings: `bindings/kailash-python/src/ml/mod.rs` (126 classes + 30 functions)
- Python subpackage: `bindings/kailash-python/python/kailash/ml/__init__.py` (re-exports with `__all__`)
- Benchmarks: `crates/kailash-ml/benches/ml_bench.rs` (43 Criterion benchmarks, 16 groups)
- Solvers: `crates/kailash-ml-linalg/src/solvers.rs` (L-BFGS, Newton-CG, SAGA, SGD, coord descent)
- Randomized SVD: `crates/kailash-ml-linalg/src/extmath.rs`
