# Cross-SDK Feature Parity

## Feature Classification

Features are classified by which SDK leads implementation:

### Rust-First (implemented in kailash-rs, Python bindings follow)

| Feature              | Rust Crate              | Python Binding          | Status                        |
| -------------------- | ----------------------- | ----------------------- | ----------------------------- |
| Core node system     | `kailash-core`          | `kailash._kailash`      | Done                          |
| DataFlow ORM         | `kailash-dataflow`      | `kailash.dataflow`      | Done                          |
| Nexus deployment     | `kailash-nexus`         | `kailash.nexus`         | Done                          |
| Kaizen agents        | `kailash-kaizen`        | `kailash.kaizen`        | Done                          |
| Enterprise RBAC/ABAC | `kailash-enterprise`    | `kailash.enterprise`    | Done                          |
| Trust plane          | `kailash-trust-plane`   | `kailash.trust_plane`   | Done                          |
| PACT governance      | `kailash-pact`          | `kailash.pact`          | Done                          |
| Orchestration        | `kailash-orchestration` | `kailash.orchestration` | Done                          |
| ML algorithms (40+)  | `kailash-ml-*`          | `kailash.ml`            | Crates done, bindings pending |
| Align serving        | `kailash-align-serving` | `kailash.align_serving` | Done                          |

### Python-First (implemented in kailash-py, no Rust equivalent)

| Feature                | Python Package   | Reason                                               |
| ---------------------- | ---------------- | ---------------------------------------------------- |
| kailash-ml engines     | `kailash-ml`     | High-level orchestration (AutoML, ExperimentTracker) |
| kailash-align training | `kailash-align`  | TRL/PEFT/HuggingFace ecosystem                       |
| ML RL module           | `kailash-ml[rl]` | SB3 + Gymnasium ecosystem                            |
| ML DL module           | `kailash-ml[dl]` | PyTorch Lightning ecosystem                          |
| MCP platform server    | `kailash`        | FastMCP Python-native                                |

### Python-Only (will never have Rust equivalent)

| Feature                     | Reason                                   |
| --------------------------- | ---------------------------------------- |
| PyTorch/Lightning training  | GPU CUDA kernels — same speed regardless |
| SB3 RL (PPO, SAC, etc.)     | Neural network training                  |
| TRL fine-tuning (DPO, LoRA) | HuggingFace ecosystem                    |
| Plotly visualization        | Browser rendering                        |
| MLflow import/export        | Interop format                           |
| Gymnasium environments      | Python ecosystem standard                |

### Simultaneous (designed together, language-native implementations)

| Feature          | Notes                                                 |
| ---------------- | ----------------------------------------------------- |
| Node type system | Same 140+ node types, language-native implementations |
| Workflow builder | Same builder pattern, same runtime semantics          |
| Connection model | Same parameter passing, same edge types               |

## Version Mapping

| Python Package              | Rust Workspace                | Relationship                                             |
| --------------------------- | ----------------------------- | -------------------------------------------------------- |
| `kailash` (PyPI)            | `kailash-core` + 5 crates     | Rust implements, Python wraps                            |
| `kailash-enterprise` (PyPI) | Full workspace (binary wheel) | All Rust crates bundled                                  |
| `kailash-ml` (PyPI)         | N/A (pure Python)             | Standalone; optionally accelerated by kailash-enterprise |
| `kailash-align` (PyPI)      | N/A (pure Python)             | Standalone; kailash-align-serving is Rust                |
| `kailash-dataflow` (PyPI)   | `kailash-dataflow`            | Rust implements, Python wraps                            |
| `kailash-nexus` (PyPI)      | `kailash-nexus`               | Rust implements, Python wraps                            |
| `kailash-kaizen` (PyPI)     | `kailash-kaizen`              | Rust implements, Python wraps                            |
| `kailash-pact` (PyPI)       | `kailash-pact`                | Rust implements, Python wraps                            |

## Parity Rules

1. **API contract**: Python API is the contract. Rust implementations must produce identical results.
2. **Feature flags**: Use cargo features for heavy optional deps, not separate crates.
3. **Error semantics**: Same error categories across SDKs (NotFitted, ValidationError, etc.).
4. **Naming**: Python names use snake_case of the Rust PascalCase type (e.g., `RandomForestClassifier` → `random_forest_classifier`).
