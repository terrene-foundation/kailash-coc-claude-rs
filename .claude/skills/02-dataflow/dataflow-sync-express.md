---
name: dataflow-sync-express
description: "Synchronous DataFlowExpress wrapper for CLI, scripts, FFI. Use when asking 'sync DataFlow', 'blocking CRUD', 'non-async DataFlow', 'DataFlowExpressSync', 'C ABI DataFlow', 'Go DataFlow', 'Java DataFlow'."
---

# DataFlowExpressSync — Blocking CRUD for Non-Async Contexts

Source: `crates/kailash-dataflow/src/express_sync.rs`

## When to Use

| Context                               | Use                                   |
| ------------------------------------- | ------------------------------------- |
| `#[tokio::main]` or async runtime     | `DataFlowExpress` (async)             |
| Plain `fn main()`, CLI tools, scripts | **`DataFlowExpressSync`** (this)      |
| C ABI / Go / Java / Ruby FFI          | **`DataFlowExpressSync`** (via C ABI) |
| Node.js / WASM                        | `DataFlowExpress` (async only)        |

## Quick Start

```rust
use kailash_dataflow::express_sync::DataFlowExpressSync;
use kailash_dataflow::model::{ModelDefinition, FieldType};
use kailash_value::value_map;

fn main() -> Result<(), kailash_dataflow::error::DataFlowError> {
    let mut express = DataFlowExpressSync::new("sqlite::memory:", true)?;

    let model = ModelDefinition::new("User", "users")
        .field("id", FieldType::Integer, |f| f.primary_key())
        .field("name", FieldType::Text, |f| f.required());

    express.register_model(model)?;
    express.create_tables()?;

    let created = express.create("User", value_map! { "name" => "Alice" })?;
    let users = express.list("User", None)?;
    let count = express.count("User", None)?;
    express.close();
    Ok(())
}
```

## API Surface

All methods mirror `DataFlowExpress` 1:1 as blocking calls.

### Constructors

| Method          | Signature                                         | Notes                        |
| --------------- | ------------------------------------------------- | ---------------------------- |
| `new`           | `(url: &str, auto_migrate: bool) -> Result<Self>` | Creates runtime + connection |
| `from_config`   | `(config: DataFlowConfig) -> Result<Self>`        | From config struct           |
| `from_dataflow` | `(df: DataFlow) -> Self`                          | Wraps existing connection    |

### CRUD (5)

`create`, `read`, `update`, `delete`, `upsert` — identical signatures to async versions.

### Query (2)

`list`, `count` — with optional `&[FilterCondition]`.

### Bulk (1)

`bulk_create` — batch INSERT.

### Aggregation (3)

`count_by`, `sum_by`, `aggregate` — with `AggregateSpec` and `GROUP BY`.

### Transaction

```rust
let mut txn = express.transaction()?;
txn.execute_raw("INSERT INTO ...")?;
txn.commit()?; // or txn.rollback()? or let Drop auto-rollback
```

`DataFlowTransactionSync` owns `Arc<Runtime>` — Drop-based rollback works even outside tokio.

### Accessors

| Method             | Returns            | Notes                      |
| ------------------ | ------------------ | -------------------------- |
| `as_async()`       | `&DataFlowExpress` | Access the inner async API |
| `dataflow()`       | `&DataFlow`        | Access the connection pool |
| `register_model()` | `Result<()>`       | Already sync (passthrough) |

## Runtime Bridge Pattern

```rust
fn block_on<F: Future>(&self, future: F) -> F::Output {
    match tokio::runtime::Handle::try_current() {
        Ok(handle) if handle.runtime_flavor() == RuntimeFlavor::MultiThread => {
            tokio::task::block_in_place(|| handle.block_on(future))
        }
        _ => self.rt.block_on(future),  // owned single-thread runtime
    }
}
```

**Same pattern as `SqlitePactStore`** (`kailash-pact/src/stores/sqlite.rs:136-145`).

## FFI Bindings

| Language    | Type                       | Pattern                                                                                                                         |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **C ABI**   | `KailashDataFlow` (opaque) | Uses `DataFlowExpressSync` internally; 8 CRUD functions: `kailash_df_{create,read,update,delete,list,count,upsert,bulk_create}` |
| **Python**  | `PyDataFlowExpressSync`    | Direct sync calls (no `allow_threads` runtime dance)                                                                            |
| **Ruby**    | `RbDataFlowExpressSync`    | Magnus class, sync-first                                                                                                        |
| **Go**      | `DataFlow.Create()` etc.   | CGo wrappers for C ABI CRUD functions                                                                                           |
| **Java**    | `DataFlow.create()` etc.   | JNA wrappers for C ABI CRUD functions                                                                                           |
| **Node.js** | Excluded                   | Async-only environment; use `JsDataFlowExpress`                                                                                 |
| **WASM**    | Excluded                   | No `block_on` on `wasm32`; use async APIs                                                                                       |

## Gotchas

1. **Pool starvation**: Under concurrent sync calls from an async context, `block_in_place` holds a worker thread + pool connection. Max concurrency = pool size.
2. **In-memory SQLite**: Pool must stay on the same runtime. `DataFlowExpressSync` handles this via `Arc<Runtime>` ownership — don't create the `DataFlowExpress` on one runtime and wrap it with a different runtime's `DataFlowExpressSync`.
3. **Transaction Drop**: `DataFlowTransactionSync::drop()` uses the owned runtime for rollback. If you `std::mem::forget` the transaction, the connection leaks.
