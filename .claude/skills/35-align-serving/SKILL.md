---
name: align-serving
description: "GGUF LLM serving with LoRA hot-swap, batch inference, Nexus HTTP — direct llama.cpp use BLOCKED."
---

# Align Serving -- Quick Reference

`kailash-align-serving` provides backend-agnostic LLM inference with LoRA adapter hot-swapping, batch inference, and Nexus HTTP integration.

## Key Facts

| Item                | Value                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| **Crate**           | `crates/kailash-align-serving/`                                                          |
| **Status**          | M0-M7 complete                                                                           |
| **Feature flags**   | `nexus` (HTTP handlers), `mcp` (MCP tool), `llama-cpp` (GGUF backend)                    |
| **Python bindings** | 16 types in `kailash.align_serving` (PR #344, feature-gated `align-serving`, default on) |

## Architecture

```
Callers (Nexus handlers, CLI, tests, direct API)
    |
    v
ServingBackend trait
  load_model / load_adapter / generate / generate_stream / unload
    |
    +--- MockServingBackend (default, no C++ deps)
    +--- llama.cpp backend (feature-gated `llama-cpp`, requires GGUF model file)
    +--- candle backend (planned)
```

## Core Types

| Type                     | Purpose                                                                   |
| ------------------------ | ------------------------------------------------------------------------- |
| `InferenceEngine`        | Main engine: model loading, generation, adapter hot-swap, batch           |
| `ServingBackend` (trait) | Backend abstraction (mock, llama.cpp, candle)                             |
| `InferenceRequest`       | Request builder (prompt, sampling, adapter)                               |
| `InferenceResponse`      | Generated text, token counts, timing, finish reason                       |
| `SamplingParams`         | Temperature, top_p, top_k, max_tokens, repetition penalty, stop sequences |
| `ModelParams`            | Model loading config (path, context length, GPU layers)                   |
| `AdapterMetadata`        | LoRA adapter info (rank, alpha, target modules, training method)          |
| `DefaultAdapterManager`  | Concurrent adapter registry (register, unload, list)                      |
| `EngineConfig`           | Max concurrent requests, queue depth, timeouts                            |

Source modules: `engine.rs`, `inference/`, `model/`, `adapter/`, `backend/`, `error.rs`

## Nexus Integration (feature: `nexus`)

OpenAI-compatible HTTP API with SSE streaming.

| Method   | Path               | Description                     |
| -------- | ------------------ | ------------------------------- |
| `POST`   | `/v1/completions`  | Text generation (SSE streaming) |
| `GET`    | `/v1/models`       | List loaded models              |
| `GET`    | `/v1/adapters`     | List loaded adapters            |
| `POST`   | `/v1/adapters`     | Register and load an adapter    |
| `DELETE` | `/v1/adapters/:id` | Unload an adapter               |
| `GET`    | `/v1/health`       | Health and readiness probe      |

Source: `crates/kailash-align-serving/src/serving/mod.rs`

## MCP Integration (feature: `mcp`)

Registers an `llm_inference` MCP tool for AI agent clients. Parameters: `prompt` (required), `max_tokens`, `temperature`.

Source: `crates/kailash-align-serving/src/mcp.rs`

## Quick Start (Rust)

```rust
use kailash_align_serving::inference::{InferenceRequest, SamplingParams};
use kailash_align_serving::adapter::{AdapterMetadata, DefaultAdapterManager};

let request = InferenceRequest::new("Explain LoRA in one sentence.")
    .with_sampling(SamplingParams {
        temperature: 0.8,
        max_tokens: 128,
        ..Default::default()
    });

let manager = DefaultAdapterManager::new();
let meta = AdapterMetadata {
    name: "finance-lora".into(),
    rank: 16,
    ..Default::default()
};
let adapter_id = manager.register_from_metadata_unchecked(meta);
```

## Quick Start (Python)

```python
from kailash.align_serving import InferenceEngine, SamplingParams, AdapterMetadata

engine = InferenceEngine()  # MockServingBackend by default
engine.load_model("test-model")
response = engine.generate("Hello, world!", SamplingParams(temperature=0.8))
print(response.text, response.total_tokens)
```

## Benchmarks (M7)

Criterion benchmarks in `crates/kailash-align-serving/benches/serving_bench.rs`. Run with `cargo bench -p kailash-align-serving`.

| Benchmark Group  | Scenarios                                             | Purpose                                           |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------- |
| Token throughput | 16, 64, 256, 512 tokens                               | Measure generation speed at varying output length |
| Engine overhead  | Raw `MockServingBackend` vs `InferenceEngine` wrapper | Quantify RwLock + bookkeeping cost                |
| Hot-swap latency | Baseline + under 0, 1, 4, 8 concurrent requests       | Adapter swap time under load                      |
| Batch inference  | Scaling across batch sizes                            | Parallel generation throughput                    |

Uses `MockServingBackend` with zero delays to isolate framework overhead from backend latency.

## API Documentation (M7)

`#![warn(missing_docs)]` enforced crate-wide. Key documentation highlights:

- **`SamplingParams`**: Mathematical notation for temperature scaling (`p_i = exp(logit_i / T) / sum`), nucleus (top-p) sampling, and top-k filtering.
- **`InferenceEngine`**: Doc examples showing model loading, generation, and adapter hot-swap lifecycle.
- **`DefaultAdapterManager`**: Doc examples for concurrent adapter registration and unloading.

## Examples (M7)

| File                              | Feature gate | Description                                           |
| --------------------------------- | ------------ | ----------------------------------------------------- |
| `examples/align_serving.rs`       | (none)       | Full demo with `MockServingBackend` -- no model files |
| `examples/align_serving_llama.rs` | `llama-cpp`  | Real inference with GGUF model file via llama.cpp     |

Run mock example: `cargo run -p kailash-align-serving --example align_serving`
Run llama example: `cargo run -p kailash-align-serving --features llama-cpp --example align_serving_llama`

## Milestone Status

| Milestone | Scope                          | Status   |
| --------- | ------------------------------ | -------- |
| M0        | Core traits and types          | Complete |
| M1        | InferenceEngine + MockBackend  | Complete |
| M2        | Adapter hot-swap               | Complete |
| M3        | Batch inference                | Complete |
| M4        | Nexus HTTP integration         | Complete |
| M5        | MCP tool integration           | Complete |
| M6        | Python bindings (16 types)     | Complete |
| M7        | Benchmarks, API docs, examples | Complete |

## Related

- **align-specialist** agent -- LLM fine-tuning, LoRA, model serving
- `skills/06-python-bindings/SKILL.md` -- Python binding type list
- `rules/framework-first.md` -- Align row in framework hierarchy
