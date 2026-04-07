# kailash-ml — Classical ML Framework (Rust)

20-crate workspace providing scikit-learn-equivalent algorithms with Rust performance. 90+ estimator types, 51 EstimatorRegistry entries, rayon parallelism. All crates proprietary (`publish = false`).

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
  kailash-ml-nodes/          # 5 workflow nodes: EstimatorFitNode, PredictNode, MLTransformNode, CrossValidateNode, PipelineNode
  kailash-ml-python/         # PyO3 bindings (13 estimators shipped via kailash-enterprise `ml` feature)
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

## Engine Layer (kailash-ml umbrella)

The engine module provides high-level orchestration on top of the algorithm crates.

| Component           | Purpose                                                            |
| ------------------- | ------------------------------------------------------------------ |
| `MlEngine`          | Builder-configured environment binding registry + tracker together |
| `ModelRegistry`     | Version-controlled model storage (InMemory + FileSystem backends)  |
| `ExperimentTracker` | Training run telemetry: params, time-series metrics, SVG charts    |
| `AutoMl`            | Automated model selection (requires `selection` feature)           |

```rust
let engine = MlEngine::builder()
    .with_model_dir("/tmp/models")
    .build()?;

// Track experiments with SVG visualization
let run_id = engine.tracker().start_run("experiment-1")?;
engine.tracker().log_metric(&run_id, "loss", 0.5)?; // step auto-incremented
let svg = engine.tracker().plot_training_history(&run_id)?;
```

## EstimatorRegistry (compile-time, inventory-based)

51 estimators registered via `register_estimator!` macro across algorithm crates. Enables string-based lookup for workflow nodes and dynamic dispatch.

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
- Engine (MlEngine builder): `crates/kailash-ml/src/engine/builder.rs`
- ModelRegistry: `crates/kailash-ml/src/engine/registry.rs`
- ExperimentTracker + SVG: `crates/kailash-ml/src/engine/tracker.rs`
- AutoMl: `crates/kailash-ml/src/engine/automl.rs`
- Workflow nodes: `crates/kailash-ml-nodes/src/nodes/` (estimator_fit, predict, transform, cross_validate, pipeline)
- Solvers: `crates/kailash-ml-linalg/src/solvers.rs` (L-BFGS, Newton-CG, SAGA, SGD, coord descent)
- Randomized SVD: `crates/kailash-ml-linalg/src/extmath.rs`
