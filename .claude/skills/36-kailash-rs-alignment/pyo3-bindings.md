# PyO3 Binding Patterns for ML

## Option C: ML Bindings in kailash-enterprise

ML bindings live in `bindings/kailash-python/src/ml/`. They register as `kailash._kailash.ml` submodule inside the existing kailash-enterprise wheel. No separate package.

```rust
// bindings/kailash-python/src/ml/mod.rs
use pyo3::prelude::*;

pub fn register_ml_module(py: Python, parent: &Bound<'_, PyModule>) -> PyResult<()> {
    let ml = PyModule::new(py, "ml")?;
    ml.add_class::<PyLinearRegression>()?;
    ml.add_class::<PyRandomForestClassifier>()?;
    ml.add_class::<PyPipeline>()?;
    // ... all estimators
    parent.add_submodule(&ml)?;
    Ok(())
}
```

Python import: `from kailash.ml.linear_model import LinearRegression`

## Arrow Zero-Copy Data Interchange

```
Python polars DataFrame
  → .to_arrow()           (zero-copy: polars → Arrow IPC)
  → Rust arrow::RecordBatch  (zero-copy: Arrow IPC → Rust Arrow)
  → ndarray::Array2       (Arrow → ndarray for algorithm input)
  → [Rust compute]
  → arrow::RecordBatch    (results as Arrow)
  → pl.from_arrow()       (zero-copy: Arrow → Python polars)
```

Key properties:

- **polars↔polars**: Same Arrow memory format on both sides
- **numpy↔ndarray**: C-contiguous float64, zero-copy
- **scipy.sparse↔CsMat**: CSR format, requires copy (different sparse layouts)

## Estimator Wrapper Macro

```rust
/// Generate PyO3 class wrapper for a Rust estimator
macro_rules! py_estimator {
    ($py_name:ident, $rust_type:ty, classifier) => {
        #[pyclass(name = stringify!($py_name))]
        struct $py_name {
            inner: Option<$rust_type>,
            fitted: Option<<$rust_type as Fit<Array2<f64>, Array1<f64>>>::Fitted>,
        }

        #[pymethods]
        impl $py_name {
            #[new]
            fn new(/* params */) -> Self { /* ... */ }

            fn fit(&mut self, x: PyReadonlyArray2<f64>, y: PyReadonlyArray1<f64>) -> PyResult<()> {
                let fitted = self.inner.as_ref().unwrap().fit(&x.as_array(), &y.as_array())?;
                self.fitted = Some(fitted);
                Ok(())
            }

            fn predict(&self, x: PyReadonlyArray2<f64>) -> PyResult<Py<PyArray1<f64>>> {
                let fitted = self.fitted.as_ref().ok_or(not_fitted_error())?;
                let result = fitted.predict(&x.as_array())?;
                Ok(result.into_pyarray(py).to_owned())
            }

            fn predict_proba(&self, x: PyReadonlyArray2<f64>) -> PyResult<Py<PyArray2<f64>>> {
                /* classifier-specific */
            }
        }
    };
}
```

## Async Bridging

```rust
// PyO3 binding calls Rust async via block_on
// GIL released during compute for parallelism
fn predict(&self, py: Python, data: PyObject) -> PyResult<PyObject> {
    py.allow_threads(|| {
        let rt = tokio::runtime::Runtime::new()?;
        rt.block_on(self.inner.predict_async(data))
    })
}
```

## Pickle/Joblib Serialization

Estimators implement `__getstate__`/`__setstate__` via Rust `bincode` serialization:

```rust
#[pymethods]
impl PyRandomForestClassifier {
    fn __getstate__(&self) -> PyResult<Vec<u8>> {
        bincode::serialize(&self.fitted).map_err(|e| PyValueError::new_err(e.to_string()))
    }

    fn __setstate__(&mut self, state: Vec<u8>) -> PyResult<()> {
        self.fitted = Some(bincode::deserialize(&state)?);
        Ok(())
    }
}
```

## Backend Detection (kailash-py side)

kailash-py's `kailash_ml/_backend.py` checks for `kailash._kailash.ml`:

```python
try:
    from kailash import _kailash
    _native = _kailash.ml
    _BACKEND = "rust"
except (ImportError, AttributeError):
    _BACKEND = "python"
```

Override: `KAILASH_ML_BACKEND=python|rust|auto`
