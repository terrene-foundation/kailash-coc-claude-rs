# DataFlow Skills Index

Skills for `kailash-dataflow` -- the database framework built on kailash-core and sqlx.

Source: `crates/kailash-dataflow/src/`

---

## Skill Files

| File                          | Description                                                                                | Use When                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `dataflow-quickstart.md`      | 5-minute introduction: DataFlow::new(), ModelDefinition, register_nodes, DataFlowExpress   | Getting started, first-time setup                                       |
| `dataflow-models.md`          | ModelDefinition builder API, FieldType, FieldBuilder, field constraints, validation        | Defining models, field configuration, understanding generated nodes     |
| `dataflow-crud-patterns.md`   | All 11 CRUD + bulk node input/output shapes, filter operators, workflow integration        | Building queries, understanding input ValueMap structure, filter syntax |
| `dataflow-transactions.md`    | DataFlowTransaction, begin/commit/rollback, RAII auto-rollback, SqlConnection, pool config | Transaction management, connection pooling, begin_immediate for SQLite  |
| `dataflow-multi-tenancy.md`   | QueryInterceptor, TenantContext, TenantContextMiddleware, tenant propagation               | Row-level tenant isolation, per-tenant queries, admin bypass            |
| `dataflow-gotchas.md`         | 15 common pitfalls: PK naming, timestamp auto-management, Create vs Update params          | Debugging errors, understanding validation failures, avoiding mistakes  |
| `dataflow-pool-prevention.md` | Pool auto-scaling, monitoring, leak detection, query cache, lightweight pool, shared pools | Pool exhaustion, connection management, health checks, pool sizing      |
| `dataflow-sync-express.md`    | DataFlowExpressSync: blocking CRUD for CLI/scripts/FFI, block_on pattern, transaction sync | Sync/blocking DataFlow, non-async contexts, C ABI, Go, Java, Ruby FFI   |

## SQL Safety (v3.12+)

`sql_safety::quote_identifier()` validates and quotes dynamic identifiers for DDL. All 3 dialects supported:

- PostgreSQL/SQLite: double-quotes (`"identifier"`)
- MySQL: backticks (`` `identifier` ``)

Validation: `^[a-zA-Z_][a-zA-Z0-9_]*$`, max 63 chars, reject-don't-escape. Construction-time panics in `ModelDefinition::new`, `FieldDef::new`, `TenantContext::new`. See `rules/dataflow-identifier-safety.md`.

**Multi-tenant cache isolation (v3.12+):** `CacheKey` includes optional `tenant_id` field. Multi-tenant models MUST use `get_tenant()`/`put_tenant()` — the single-tenant methods silently share cache slots across tenants. See `rules/tenant-isolation.md`.

**TenantRequired enforcement (v3.12+):** `ModelDefinition::multi_tenant()` marks a model as requiring tenant context. `model.require_tenant(tenant_id)` returns `DataFlowError::TenantRequired` when `tenant_id` is `None` for multi-tenant models. Use at express/query layer before cache access.

**WHERE clause quoting (v3.12+):** `build_where_clause()` and `soft_delete_where()` now route all column names through `quote_identifier()` (defense-in-depth). `build_select_by_id()` and `build_delete()` return `Result` and quote PK/soft-delete columns. Callers must handle `?` propagation.

## Quick Navigation

- **"How do I create a model?"** -> `dataflow-models.md` or `dataflow-quickstart.md`
- **"What inputs does CreateUser expect?"** -> `dataflow-crud-patterns.md`
- **"How do I filter with $gt, $in, $like?"** -> `dataflow-crud-patterns.md`
- **"How do I do CRUD without workflows?"** -> `dataflow-quickstart.md` (DataFlowExpress section)
- **"How do I use transactions?"** -> `dataflow-transactions.md`
- **"How do I add multi-tenancy?"** -> `dataflow-multi-tenancy.md`
- **"Why is my create/update failing?"** -> `dataflow-gotchas.md`
- **"What's the difference between Create and Update inputs?"** -> `dataflow-gotchas.md` (gotcha #3)
- **"How do I configure the connection pool?"** -> `dataflow-pool-prevention.md`
- **"Pool exhaustion / connection timeout"** -> `dataflow-pool-prevention.md`
- **"How do I monitor pool utilization?"** -> `dataflow-pool-prevention.md`
- **"How do I share a pool across DataFlow instances?"** -> `dataflow-pool-prevention.md`
- **"How do I use a health check pool?"** -> `dataflow-pool-prevention.md`
- **"How do I detect connection leaks?"** -> `dataflow-pool-prevention.md`
- **"What SQL dialect differences exist?"** -> `dataflow-gotchas.md` (gotcha #11)
- **"How do bulk operations work?"** -> `dataflow-crud-patterns.md`
- **"How do I inspect the database schema at runtime?"** -> `dataflow-quickstart.md` (Inspector section)
- **"How do I use DataFlow from Python?"** -> `dataflow-quickstart.md` (Python binding section)
- **"How do I use DataFlow without async/tokio?"** -> `dataflow-sync-express.md`
- **"How do I use DataFlow from CLI tools or scripts?"** -> `dataflow-sync-express.md`
- **"How do I use DataFlow from C/Go/Java/Ruby?"** -> `dataflow-sync-express.md` (FFI section)

## Key Concepts

- **DataFlow is NOT an ORM** -- it generates workflow nodes that wrap sqlx queries
- **11 nodes per model**: Create, Read, Update, Delete, List, Upsert, Count, BulkCreate, BulkUpdate, BulkDelete, BulkUpsert
- **Runtime builder API**: `ModelDefinition::new()` with fluent `.field()` calls (not a proc-macro)
- **Value-based I/O**: All inputs and outputs use `BTreeMap<Arc<str>, Value>` (ValueMap)
- **Auto dialect detection**: SQLite, PostgreSQL, MySQL from connection URL via `QueryDialect::from_url()`
- **Two usage modes**: Node-based (via WorkflowBuilder) or direct CRUD (via DataFlowExpress)
- **Multi-database**: sqlx Any driver with dialect-aware query generation
