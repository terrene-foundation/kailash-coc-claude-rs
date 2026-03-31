---
description: "L3 Agent Autonomy binding patterns across 7 languages. Wire compatibility rules, type mapping, NaN validation requirements, and per-language architecture decisions."
---

# L3 Binding Parity Patterns (v3.2.0)

## Python L3 Baseline — 25 Types (Canonical)

| Category  | Types                                                                                                                                           | Count |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| Envelope  | PlanGradient, DimensionGradient, CostEntry, BudgetRemaining, DimensionUsage, ReclaimResult, EnvelopeTracker, AllocationRequest, EnvelopeVerdict | 9     |
| Context   | ScopeProjection, ContextScope, MergeResult                                                                                                      | 3     |
| Messaging | Priority, EscalationSeverity, ResourceSnapshot, MessageEnvelope                                                                                 | 4     |
| Factory   | AgentSpec, AgentInstance                                                                                                                        | 2     |
| Plan      | Plan, PlanNode, PlanEdge, PlanNodeOutput, GradientClassification                                                                                | 5     |
| State     | AgentState, PlanState                                                                                                                           | 2     |

Plus 2 free functions: `split_envelope`, `validate_split`.

## Per-Language Architecture

### Direct FFI Bindings (wrap Rust types)

| Language    | Technology | Prefix        | Pattern                                           |
| ----------- | ---------- | ------------- | ------------------------------------------------- |
| **Python**  | PyO3       | `Py*`         | `#[pyclass]` wrapping `inner: RustType`           |
| **Ruby**    | Magnus     | `Rb*`         | `#[magnus::wrap]` with `Mutex` for mutable state  |
| **Node.js** | napi-rs    | `Js*` / `L3*` | `#[napi]` with JSON interchange for complex types |

### Standalone Reimplementations (wire-compatible via JSON)

| Language | Technology   | Prefix  | Pattern                                       |
| -------- | ------------ | ------- | --------------------------------------------- |
| **WASM** | wasm-bindgen | `Wasm*` | Standalone structs, NO tokio/async, sync-only |

### JSON Data Exchange (via C ABI)

| Language  | Technology   | Pattern                                                             |
| --------- | ------------ | ------------------------------------------------------------------- |
| **C ABI** | `extern "C"` | Opaque pointers for stateful types, JSON strings for data           |
| **Go**    | CGo          | Go structs with `json:"field"` tags + CGo wrappers for stateful ops |
| **Java**  | JNA          | POJOs + JNA interface to C ABI functions                            |

## Wire Compatibility Rules (CRITICAL)

Go and Java data structs MUST have JSON field names that exactly match Rust serde output.

### Known Field Name Mapping

| Rust Type         | Rust Field           | Serde Name             | Notes                                   |
| ----------------- | -------------------- | ---------------------- | --------------------------------------- |
| `MessageEnvelope` | `sent_at`            | `"sent_at"`            | NOT `created_at`                        |
| `AgentSpec`       | `tool_ids`           | `"tool_ids"`           | NOT `tools`                             |
| `AgentInstance`   | `parent_instance_id` | `"parent_instance_id"` | NOT `parent_id`                         |
| `AgentInstance`   | `agent_card_name`    | `"agent_card_name"`    | NOT `spec_id` (instance uses card name) |

### Validation Rule

When adding new Go/Java data types, always check the Rust source for the exact serde field names:

```bash
grep -n 'pub ' crates/kailash-kaizen/src/l3/core/<module>/<file>.rs
```

If a Rust field has `#[serde(rename = "...")]` or `#[serde(default)]`, honor those in Go/Java.

## NaN/Inf Validation (PACT Rule 6 + 12)

ALL `f64` values entering the binding API boundary that will be converted to `u64` microdollars MUST be validated:

```rust
// REQUIRED before any f64 → u64 conversion
if !value.is_finite() || value < 0.0 {
    return Err("must be a finite non-negative number");
}
let microdollars = (value * 1_000_000.0) as u64;
```

Also required before `Duration::from_secs_f64(value)` — panics on NaN/negative/Inf.

### Where validation is needed

- `record_consumption` / `record_cost` (cost_dollars)
- `can_afford` (estimated_cost_dollars)
- `reclaim` (child_consumed_dollars)
- `allocate_to_child_dollars` (dollars)
- `set_resolution_timeout_secs` (secs)
- Any `Duration::from_secs_f64` call

## WASM Architecture Decision (D7)

WASM gets `l3::core` types ONLY. No runtime types (MessageChannel, Router, Factory, PlanExecutor) because they require tokio. WASM types are standalone reimplementations that must be wire-compatible: JSON produced by native types must deserialize into WASM types and vice versa.

Use `f64` for all integer types in WASM — `wasm-bindgen` does not support `u64`.

## Context Types — Full Parity (v3.2.0)

All 7 languages now have full context type coverage:

| Type            | Python | Ruby | Node.js | WASM | Go  | Java | C ABI |
| --------------- | :----: | :--: | :-----: | :--: | :-: | :--: | :---: |
| ScopeProjection |   Y    |  Y   |    Y    |  Y   |  Y  |  Y   |  N/A  |
| ContextScope    |   Y    |  Y   |    Y    |  Y   |  Y  |  Y   |  N/A  |
| MergeResult     |   Y    |  Y   |    Y    |  Y   |  Y  |  Y   |  N/A  |

Context types are pure data — no C ABI opaque pointers needed. Go/Java use JSON-tagged structs directly.

### ContextScope Default Values (CRITICAL)

Root scope constructors MUST match Rust `ContextScope::root()` defaults:

- `effective_clearance`: `"TopSecret"` (NOT `"Unclassified"`)
- `default_classification`: `"Internal"` (NOT `"Unclassified"`)
- `scope_id`: Auto-generated UUID v4
- Read/write projections: Unrestricted (`["**"]`)

### Deadlock Prevention (Ruby)

When a Magnus-wrapped method takes two `Mutex<T>` arguments that could be the same Ruby object:

```rust
// WRONG — deadlocks when self == other
fn compare(&self, other: &RbFoo) -> bool {
    self.inner.lock().compare(&other.inner.lock())
}

// CORRECT — clone first, then lock
fn compare(&self, other: &RbFoo) -> bool {
    let other_val = other.inner.lock().clone();
    self.inner.lock().compare(&other_val)
}
```

Applied to: `is_subset_of`, `merge_child_results`, `create_child`.

### Go UUID Generation (No External Deps)

Go binding generates UUID v4 without external dependencies:

```go
func newUUID() string {
    var buf [16]byte
    _, _ = rand.Read(buf[:])        // crypto/rand
    buf[6] = (buf[6] & 0x0f) | 0x40 // version 4
    buf[8] = (buf[8] & 0x3f) | 0x80 // variant 1
    return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
        buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16])
}
```

### Java camelCase Convention

ALL Java L3 types use camelCase field names without `@JsonProperty` annotations. Consumers must configure ObjectMapper for snake_case mapping:

```java
ObjectMapper mapper = new ObjectMapper();
mapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
```

## Wire Roundtrip Tests

Canonical JSON shapes are defined in `crates/kailash-kaizen/tests/l3_wire_roundtrip.rs` (12 tests). All bindings MUST produce and consume JSON matching these shapes. Go data type tests in `ffi/kailash-go/l3_types_test.go` (10+ tests).

## Test Patterns

- **NO MOCKING** in any binding tests — use real Rust types
- All bindings test via `#[cfg(test)]` modules within the binding source file
- Go tests are in separate `_test.go` files (Go convention)
- Java POJOs verified by compilation only (no JUnit without native lib)
- Wire roundtrip tests: `crates/kailash-kaizen/tests/l3_wire_roundtrip.rs`

## References

- Python L3 source: `bindings/kailash-python/src/l3/`
- Ruby L3 source: `bindings/kailash-ruby/ext/kailash/src/l3/mod.rs`
- Node.js L3 source: `bindings/kailash-node/src/l3.rs`
- WASM L3 source: `bindings/kailash-wasm/src/l3.rs`
- C ABI L3 source: `crates/kailash-capi/src/l3.rs`
- Go L3 source: `ffi/kailash-go/l3.go`
- Java L3 source: `ffi/kailash-java/src/main/java/com/kailash/l3/`
- Rust L3 core: `crates/kailash-kaizen/src/l3/core/`
