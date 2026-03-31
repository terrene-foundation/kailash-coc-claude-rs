# Scoped Context

Hierarchical key-value stores with projection-based filtering and classification gates.

## Source Files

- `crates/kailash-kaizen/src/l3/core/context/scope.rs` -- `ContextScope`, `ContextAuditEmitter`, `ConflictResolution`, `MergeConflict`, `MergeResult`
- `crates/kailash-kaizen/src/l3/core/context/projection.rs` -- `ScopeProjection`
- `crates/kailash-kaizen/src/l3/core/context/classification.rs` -- `ContextValue`, `eatp_to_pact()`, `pact_to_eatp()`
- `crates/kailash-kaizen/src/l3/core/context/mod.rs` -- `ContextError`, re-exports

## ContextScope Hierarchy

Scopes form a parent-child tree. Each child has read/write projections that are subsets of its parent's (monotonic tightening).

### Key Operations

| Operation                                                                  | Behavior                                                                |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ContextScope::root(owner_id)`                                             | Creates a root scope with TopSecret clearance, unrestricted projections |
| `scope.create_child(owner, read_proj, write_proj, clearance, default_cls)` | Derives a child with tighter projections/clearance                      |
| `scope.get(key)`                                                           | Traverses parent chain, filtered by read projection + clearance         |
| `scope.set(key, value, classification)`                                    | Local-only write, checked against write projection and clearance        |
| `scope.remove(key)`                                                        | Local-only removal; subsequent `get()` may find parent's value          |
| `scope.merge_child_results(child)`                                         | Merges child's writes back into parent with conflict resolution         |

### Read Path

1. Check read projection -- if key denied, return `None`
2. Look up key in local data
3. If not found locally, walk up parent chain
4. For each found value, check classification against effective clearance
5. Values above clearance are invisible even if projection permits

### Write Path

1. Check write projection -- if key denied, return `WriteProjectionViolation` error
2. Check value classification against effective clearance -- if exceeds, return `ClassificationExceedsClearance` error
3. Store locally with provenance metadata (`written_by`, `updated_at`, `classification`)

## ScopeProjection

Glob-based key filtering using `globset`:

- `new(allow_patterns, deny_patterns)` -- deny takes precedence over allow
- `unrestricted()` -- permits all keys (`**` pattern)
- `permits(key)` -- returns `true` if key matches allow AND not deny
- `is_subset_of(parent)` -- conservative subset check for monotonic tightening

**Pattern syntax**: `**` (everything), `user.*` (user namespace), `secret.*` (deny secrets)

**Subset semantics**: Conservative approximation. May over-reject (child uses different but narrower patterns) but never under-reject. Parent with `**` always permits any child.

## DataClassification

5-level hierarchy from EATP (`eatp::constraints::data_access::DataClassification`):

```
Public < Internal < Confidential < Restricted < TopSecret
```

Bidirectional mapping to PACT `ClassificationLevel`:

| EATP         | PACT         | Numeric |
| ------------ | ------------ | ------- |
| Public       | Public       | 0       |
| Internal     | Restricted   | 1       |
| Confidential | Confidential | 2       |
| Restricted   | Secret       | 3       |
| TopSecret    | TopSecret    | 4       |

Conversion functions: `eatp_to_pact()`, `pact_to_eatp()` (free functions, not `From` impls -- orphan rule).

## ContextValue

Wraps a `serde_json::Value` with provenance:

- `value: serde_json::Value` -- the actual data
- `written_by: Uuid` -- immutable author ID
- `updated_at: DateTime<Utc>` -- refreshed on each overwrite
- `classification: DataClassification` -- sensitivity level

## ContextAuditEmitter

Optional trait for EATP audit record generation:

- `emit_delegation()` -- on `create_child()` success
- `emit_constraint_envelope()` -- on explicit clearance setting
- `emit_barrier_enforced()` -- on `get()`/`set()` denial
- `emit_context_merged()` -- on `merge_child_results()` completion

## Key Invariants

| ID    | Description                                     | Enforcement Location                                 |
| ----- | ----------------------------------------------- | ---------------------------------------------------- |
| INV-1 | Child read projection subset of parent          | `ContextScope::create_child()`                       |
| INV-2 | Read projection checked before returning values | `ContextScope::get()`                                |
| INV-4 | Classification clearance gate                   | `ContextScope::get()` (second gate after projection) |
| INV-7 | Parent chain traversal for missing keys         | `ContextScope::get()` (walks up to root)             |
