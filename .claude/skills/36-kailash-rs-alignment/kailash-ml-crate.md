# Kailash ML Crate Architecture

## Design Decisions

| #   | Decision               | Details                                                                         |
| --- | ---------------------- | ------------------------------------------------------------------------------- |
| D1  | Separate ML from nodes | `kailash-ml` = standalone ML; `kailash-ml-nodes` = Kailash workflow integration |
| D2  | Type-state traits      | 3-layer: generic typed → object-safe erasure (`DynEstimator`) → Python binding  |
| D3  | DataSet enum           | `Dense(Array2)`, `Sparse(CsMat)`, `Tabular(DataFrame)`                          |
| D4  | FitOpts struct         | `FitOpts + PartialFit + FitMultiOutput` traits for incremental/multi-output     |
| D5  | Native Pipeline        | Zero serialization, ownership transfer between steps                            |
| D6  | Multi-crate workspace  | 20 specialized crates (see `crate-structure.md`)                                |
| D7  | faer primary           | faer for linalg, BLAS optional via feature flag                                 |
| D8  | Option C packaging     | ML ships inside `kailash-enterprise` wheel, not separate package                |

## Core Trait System (`kailash-ml-core`)

```rust
/// Type-state: generic over input/output types
pub trait Fit<X, Y> {
    type Fitted;
    fn fit(&self, x: &X, y: &Y) -> Result<Self::Fitted, MlError>;
}

pub trait Predict<X> {
    type Output;
    fn predict(&self, x: &X) -> Result<Self::Output, MlError>;
}

pub trait Transform<X> {
    type Output;
    fn transform(&self, x: &X) -> Result<Self::Output, MlError>;
}

/// Object-safe erasure layer for dynamic dispatch
pub trait DynEstimator: Send + Sync {
    fn fit_dyn(&mut self, dataset: &DataSet) -> Result<(), MlError>;
    fn predict_dyn(&self, dataset: &DataSet) -> Result<DataSet, MlError>;
    fn clone_box(&self) -> Box<dyn DynEstimator>;
}
```

## DataSet

```rust
pub enum DataSet {
    Dense(Array2<f64>),           // ndarray dense matrix
    Sparse(CsMat<f64>),           // sprs CSR sparse matrix
    Tabular(polars::DataFrame),   // polars DataFrame (categorical + numeric)
}
```

Conversion: `DataSet::to_dense()`, `DataSet::to_sparse()`, `DataSet::to_tabular()`. Zero-copy when types already match.

## Pipeline

```rust
let pipeline = Pipeline::new()
    .push(StandardScaler::default())
    .push(PCA::new(10))
    .push(RandomForestClassifier::new(100));

let fitted = pipeline.fit(&train_x, &train_y)?;
let predictions = fitted.predict(&test_x)?;
```

Ownership transfers between steps — no serialization, no cloning.

## What Stays Python

| Component                   | Reason                                          |
| --------------------------- | ----------------------------------------------- |
| Lightning/PyTorch training  | GPU CUDA kernels — same speed in Python or Rust |
| SB3 RL (PPO, SAC, DQN)      | Neural network training, PyTorch ecosystem      |
| TRL fine-tuning (DPO, LoRA) | HuggingFace ecosystem                           |
| Plotly visualization        | Browser rendering                               |
| MLflow import/export        | Interop format                                  |

## What Moves to Rust

All 40+ classical ML algorithms (sklearn replacement), LightGBM-equivalent gradient boosting, all preprocessing, all metrics, pipeline orchestration, cross-validation, hyperparameter search, ONNX inference via `ort` crate.

## Performance Targets

| Metric                        | V1 Target        |
| ----------------------------- | ---------------- |
| Gradient boosting vs LightGBM | 0.5-0.7x         |
| Inference latency (100-tree)  | < 10μs           |
| Accuracy vs sklearn reference | AUC within 0.001 |
