---
paths:
  - "**/dataflow/**"
  - "**/db/**"
  - "**/*bind*.rs"
  - "**/*query*.rs"
  - "**/*execute*.rs"
---

# DataFlow NULL Typing Rules (sqlx `Any` driver)

SQL parameter binding requires a logical type for NULL, not just the NULL marker. The sqlx `Any` driver caches prepared statements by SQL text + inferred parameter types; binding every NULL as `None::<String>` (the "default" on kailash-rs prior to #424) silently coerces every NULL parameter to a TEXT slot in the cached statement. The NEXT query that reuses that cached statement against a BYTEA / REAL / DOUBLE PRECISION column path sees a TEXT-typed NULL in the parameter descriptor and corrupts the driver's internal state — the observable signal is `invalid byte sequence for encoding "UTF8": 0xc7 0x0a` emitted on a query hundreds of operations downstream of the NULL bind. The poisoning statement and the failing statement can be far apart; reproducing requires trace-bind-bytes instrumentation.

This rule mandates typed NULL binding via a `SqlTypeHint`-driven helper on every path that constructs a parameter list for `DataFlow`-mediated execution. Violation is a `zero-tolerance.md` Rule 4 failure (workaround for SDK bug = BLOCKED; the fix lives in the helper).

## MUST Rules

### 1. Every `Value::Null` Binding Routes Through A Type-Aware Helper

Any `Value::Null` bound to a non-TEXT column path MUST route through a type-aware helper that binds `None::<T>` for the column's logical type. Hardcoded `bind(None::<String>)` for every NULL is BLOCKED.

```rust
// DO — type-aware helper, logical-type-correct NULL
use crate::query::bind_null_typed;

let hint = SqlTypeHint::from_cast(cast_str);   // SQL-parser path
// OR
let hint = SqlTypeHint::from_field_type(ft);   // FieldType-metadata path
let q = bind_null_typed(q, hint);

// DO NOT — hardcoded TEXT NULL, poisons the sqlx Any statement cache
let q = q.bind(None::<String>);
// ↑ reused statement binds TEXT NULL to a BYTEA/REAL/DOUBLE column slot
//   → UTF-8 0xc7 0x0a corruption on the NEXT query to hit the cache
```

**BLOCKED rationalizations:**

- "NULL is NULL, the type doesn't matter"
- "sqlx will coerce it correctly"
- "`None::<String>` is the default, it has always worked"
- "The corruption only happens with the `Any` driver, we can ignore it"
- "Only a few columns are non-TEXT, the risk is low"

**Why:** The sqlx `Any` driver caches prepared statements keyed by inferred parameter types; a TEXT-typed NULL gets stamped into the cached descriptor and poisons every subsequent reuse against a non-TEXT column. The failure surfaces on a different query than the one that bound the NULL, so the symptom looks like a random UTF-8 error rather than a type-confusion bug. Evidence: kailash-rs#424 — astra reported `invalid byte sequence for encoding "UTF8": 0xc7 0x0a` on a NEXT-query boundary; trace-bind-bytes wheel on `debug/424-trace-bind-bytes` captured the exact mechanism; fixed in PR #435 (SQL-cast path) + PR #437 (FieldType path).

### 2. sqlx 0.8.6 Real/Double NULL-Type Swap Bug Is Documented Inline At Every Compensation Site

sqlx 0.8.6 has a known bug where `None::<f32>` binds as `::double precision` and `None::<f64>` binds as `::real` (swapped). Every site that compensates for the swap (binding `None::<f32>` for a `::double precision` column OR `None::<f64>` for a `::real` column) MUST carry an inline comment linking to the upstream issue AND naming the expected fix cadence. When the upstream bug is fixed, a single regression test MUST break loudly rather than the fix silently flipping behavior.

```rust
// DO — inline comment documents the compensation
// sqlx 0.8.6 bug: None::<f32> binds as ::double precision (swapped).
// Track: https://github.com/launchbadge/sqlx/issues/<NNN>.
// When fixed upstream, tests/regression/test_null_float_bind.rs will
// fail loudly — swap the type here at that moment.
let q = q.bind(None::<f32>);  // FOR a ::double precision column path

// DO NOT — silent compensation, no trail when upstream fixes the swap
let q = q.bind(None::<f32>);  // (no comment; future reader assumes this is correct)
```

**BLOCKED rationalizations:**

- "The swap is obvious from the type signature"
- "A comment will get stale — we'll update when we upgrade sqlx"
- "The regression test is enough — no comment needed"

**Why:** Compensation for an upstream bug is correct today and a bug tomorrow. Without an inline comment AND a regression test, the next developer reading the code cannot tell whether the compensation is still needed or whether sqlx has fixed the swap and the compensation is now the bug. The inline comment is the trail back to the upstream issue; the regression test is the alarm when upstream changes behavior.

### 3. SQL-Cast Path + FieldType Path Share One `SqlTypeHint` Enum

Two parallel parameter-binding paths exist in kailash-rs — one parses SQL casts (`$1::integer`, `$2::bytea`) for `execute_raw`-style calls, one reads FieldType metadata for `DataFlowExpress` CRUD. Both MUST derive their NULL type hints from the SAME `SqlTypeHint` enum, and the helper that consumes `SqlTypeHint` MUST be the single point where `bind(None::<T>)` is called.

```rust
// DO — single enum, two adapter functions, one helper
pub enum SqlTypeHint {
    Text, Integer, BigInt, Real, Double, Bool, Bytea, Json, /* ... */
}

impl SqlTypeHint {
    pub fn from_cast(cast: &str) -> Self { /* ... */ }           // path A
    pub fn from_field_type(ft: &FieldType) -> Self { /* ... */ } // path B
}

pub fn bind_null_typed<'q>(q: Query<'q>, hint: SqlTypeHint) -> Query<'q> {
    match hint {
        SqlTypeHint::Text => q.bind(None::<String>),
        SqlTypeHint::Integer => q.bind(None::<i32>),
        // ... exactly one match arm per variant; both paths call here
    }
}

// DO NOT — two divergent binding functions, one per path
fn bind_null_from_cast(q, cast) { /* inlines bind() calls */ }
fn bind_null_from_field_type(q, ft) { /* inlines bind() calls */ }
// ↑ drift is inevitable — path B adds a new type variant, path A forgets
```

**BLOCKED rationalizations:**

- "The two paths have different metadata shapes anyway"
- "A single helper is over-engineering for two call sites"
- "We can keep them in sync manually"

**Why:** Divergence between two binding paths is the exact failure shape #436 filed against: PR #435 fixed the SQL-cast path but left 40+ model-aware `bind_value` sites in the FieldType path with the `None::<String>` hardcode. A single `SqlTypeHint` enum + helper means every future type variant lands in exactly one place, and every path picks up the fix automatically.

### 4. User-SQL Parsers That Index By `$N` Clamp At `MAX_PARAMS = 65535`

Any parser that processes user-supplied SQL and indexes parameters by `$N` MUST clamp `N` at `MAX_PARAMS = 65535` (the PostgreSQL int16 protocol limit) BEFORE calling `Vec::resize` or equivalent allocation. Unclamped resize is a DoS vector — a malicious SQL string containing `$999999999` causes 4GB of allocation.

```rust
// DO — clamp before resize
const MAX_PARAMS: usize = 65_535;  // PostgreSQL int16 wire protocol limit
let idx: usize = parse_param_index(fragment)?;
if idx > MAX_PARAMS {
    return Err(Error::ParamIndexExceedsLimit { idx, max: MAX_PARAMS });
}
params.resize(idx, Value::Null);

// DO NOT — trust the parsed index
let idx: usize = parse_param_index(fragment)?;
params.resize(idx, Value::Null);  // $999999999 → 4GB allocation
```

**BLOCKED rationalizations:**

- "The input is from trusted callers, no attacker reaches this parser"
- "PostgreSQL will reject the query anyway when it sees >65535 params"
- "The allocation is lazy, it won't actually materialize"

**Why:** `Vec::resize` materializes the allocation immediately; the PostgreSQL protocol-level rejection comes much later, after the OOM has already happened. The int16 limit is a server-side reality — clamping at the parser level turns a DoS vector into a typed error with zero performance cost on the happy path.

## MUST NOT

- Inline `q.bind(None::<String>)` anywhere in DataFlow's execution path

**Why:** Every inlined `None::<String>` is one site away from the shared-pool statement-cache poisoning described in Rule 1. The only safe pattern is `bind_null_typed(q, hint)`.

- Add a new parameter-binding path that bypasses `SqlTypeHint`

**Why:** Rule 3's "two paths, one enum" is the structural defense against drift. A third path is permitted only if it ALSO derives from `SqlTypeHint` and ALSO calls `bind_null_typed`.

- Silently compensate for sqlx bugs without an inline comment AND regression test

**Why:** Compensation without a trail is a time bomb — fixes on the upstream side silently flip behavior, and the next code reader cannot tell compensation from bug.

## Relationship to Other Rules

- `rules/zero-tolerance.md` Rule 4 — this rule is the sqlx-specific form of "no workarounds for SDK bugs." The helper IS the SDK fix; inlining raw `bind(None::<String>)` IS the workaround.
- `rules/infrastructure-sql.md` — companion rule for VALUES-path parameter binding (sanitizer contract, parameterized queries).
- `rules/dataflow-identifier-safety.md` — companion rule for identifier interpolation (DDL path).

Origin: kailash-rs#424 (reporter astra, 2026-04-20) — `invalid byte sequence for encoding "UTF8": 0xc7 0x0a` emitted on a NEXT query after a NULL bind, trace-bind-bytes wheel on `debug/424-trace-bind-bytes` captured the mechanism. Fixed in PR #435 (SQL-cast-parsing path) + PR #437 (FieldType-metadata path, 40+ model-aware bind sites). Both PRs merged v3.20.0.
