---
name: error-dataflow-template-syntax
description: "Fix DataFlow parameter and type errors in the Kailash Rust SDK. Use when encountering DataFlow model field type mismatches, 'InvalidInput' on generated nodes, or parameter validation errors with DataFlow-generated nodes."
---

# Error: DataFlow Parameter and Type Errors

Fix parameter type errors with DataFlow-generated nodes -- passing wrong `Value` types to generated CRUD nodes in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `cross-cutting` (error-resolution)
> Priority: `HIGH`
> Related Skills: [`dataflow-quickstart`](../../02-dataflow/dataflow-quickstart.md), [`connection-patterns`](../../01-core-sdk/connection-patterns.md)

## The Error

### Common Error Messages

```
NodeError::InvalidInput { name: "customer_id", expected: "integer", got: "string" }
// Display: "invalid input 'customer_id': expected integer, got string"

NodeError::MissingInput { name: "id" }
// Display: "missing required input: id"
```

### Root Cause

DataFlow's `#[dataflow::model]` proc-macro generates 11 node types per model. These generated nodes expect **specific `Value` types** matching the model fields. Passing a `Value::String` where the model field is `i64` causes an `InvalidInput` error.

## Quick Fix

### :x: WRONG: String Where Integer Expected

```rust
// Model defines customer_id as i64
// #[dataflow::model]
// struct Order {
//     customer_id: i64,
//     total: f64,
// }

let mut builder = WorkflowBuilder::new();
builder.add_node("OrderCreateNode", "create", ValueMap::from([
    ("customer_id".into(), Value::String("123".into())),  // WRONG: String, not Integer
    ("total".into(), Value::Float(100.0)),
]));

// RuntimeError: NodeError::InvalidInput {
//     name: "customer_id", expected: "integer", got: "string"
// }
```

### :white_check_mark: FIX: Use Correct Value Types

```rust
builder.add_node("OrderCreateNode", "create", ValueMap::from([
    ("customer_id".into(), Value::Integer(123)),   // Correct: Integer for i64
    ("total".into(), Value::Float(100.0)),         // Correct: Float for f64
]));
```

## DataFlow Type Mapping

| Rust Model Type | Value Variant                   | Example                         |
| --------------- | ------------------------------- | ------------------------------- |
| `i64`, `i32`    | `Value::Integer(n)`             | `Value::Integer(42)`            |
| `f64`, `f32`    | `Value::Float(n)`               | `Value::Float(99.99)`           |
| `String`        | `Value::String(s)`              | `Value::String("alice".into())` |
| `bool`          | `Value::Bool(b)`                | `Value::Bool(true)`             |
| `Option<T>`     | `Value::Null` or the inner type | `Value::Null` for None          |
| `Vec<T>`        | `Value::Array(vec)`             | `Value::Array(vec![...])`       |

## Using Connections Instead of Hardcoded Values

For dynamic values flowing from other nodes, use connections to preserve type safety:

### :x: Wrong: Hardcoding Dynamic Values

```rust
// Don't hardcode values that should come from other nodes
builder.add_node("OrderCreateNode", "create", ValueMap::from([
    ("customer_id".into(), Value::Integer(0)),  // Placeholder -- wrong approach
    ("total".into(), Value::Float(0.0)),
]));
```

### :white_check_mark: Correct: Use Connections for Dynamic Values

```rust
let mut builder = WorkflowBuilder::new();

// Source node that produces the customer
builder.add_node("CustomerReadNode", "customer", ValueMap::from([
    ("id".into(), Value::Integer(123)),
]));

// Source node that computes the total
builder.add_node("JSONTransformNode", "cart", ValueMap::from([
    ("expression".into(), Value::String("@.total".into())),
]));

// Target DataFlow node -- gets values from connections
builder.add_node("OrderCreateNode", "create", ValueMap::new());

// Connect dynamic values with proper types
builder.connect("customer", "id", "create", "customer_id");
builder.connect("cart", "result", "create", "total");
```

## DataFlow Generated Node Types (11 per Model)

For a model named `Order`, DataFlow generates:

| Node Type             | Purpose           | Required Params               |
| --------------------- | ----------------- | ----------------------------- |
| `OrderCreateNode`     | Create record     | All non-optional model fields |
| `OrderReadNode`       | Read by ID        | `id`                          |
| `OrderUpdateNode`     | Update record     | `id` + fields to update       |
| `OrderDeleteNode`     | Delete by ID      | `id`                          |
| `OrderListNode`       | List with filters | Optional filter params        |
| `OrderCountNode`      | Count records     | Optional filter params        |
| `OrderBulkCreateNode` | Batch insert      | `items` (array)               |
| `OrderBulkUpdateNode` | Batch update      | `items` (array)               |
| `OrderBulkDeleteNode` | Batch delete      | `ids` (array)                 |
| `OrderUpsertNode`     | Insert or update  | All fields + conflict key     |
| `OrderSearchNode`     | Full-text search  | `query`                       |

### Key DataFlow Rules

1. **Primary key must be named `id`** -- all models use `id` as the primary key
2. **Never manually set `created_at`/`updated_at`** -- auto-managed by DataFlow
3. **`CreateNode` uses flat params** -- field values directly in the ValueMap
4. **`UpdateNode` uses `id` + fields** -- `id` identifies the record, other fields are updates
5. **`soft_delete` only affects DELETE** -- queries still return soft-deleted records unless filtered

## Complete Example

### :x: Wrong Code (Type Mismatch)

```rust
let mut builder = WorkflowBuilder::new();

builder.add_node("OrderCreateNode", "create", ValueMap::from([
    ("customer_id".into(), Value::String("42".into())),     // WRONG: should be Integer
    ("total".into(), Value::String("150.50".into())),       // WRONG: should be Float
    ("created_at".into(), Value::String("now".into())),     // WRONG: auto-managed
]));
```

### :white_check_mark: Correct Code

```rust
let mut builder = WorkflowBuilder::new();

builder.add_node("OrderCreateNode", "create", ValueMap::from([
    ("customer_id".into(), Value::Integer(42)),     // Correct: Integer for i64
    ("total".into(), Value::Float(150.50)),          // Correct: Float for f64
    // created_at: NOT provided -- auto-managed by DataFlow
]));
```

## Compile-Time Query Safety

DataFlow uses `sqlx` for compile-time query verification. The generated nodes enforce type safety at the `Value` level, but the underlying queries are verified against the actual database schema at compile time via `sqlx::query!` and `sqlx::query_as!`.

This means:

- **Schema mismatches** are caught at compile time (if `DATABASE_URL` is set)
- **Value type mismatches** are caught at runtime when the node validates its inputs
- **SQL injection** is impossible -- all queries use parameterized bindings

## Related Patterns

- **DataFlow framework**: See `crates/kailash-dataflow/` for model generation and connection patterns
- **Value types**: See `crates/kailash-value/src/value.rs` for `Value` enum variants
- **Connection patterns**: [`error-connection-params`](error-connection-params.md)
- **CLAUDE.md**: DataFlow gotchas section for key rules

## Quick Tips

- :bulb: **Match model types**: `i64` -> `Value::Integer`, `f64` -> `Value::Float`, `String` -> `Value::String`
- :bulb: **Connections preserve types**: Use `builder.connect()` for dynamic values from other nodes
- :bulb: **Never set timestamps**: `created_at` and `updated_at` are auto-managed
- :bulb: **Primary key is `id`**: All DataFlow models use `id` as the primary key name
- :bulb: **Check generated nodes**: Each model generates 11 node types -- check which one you need

<!-- Trigger Keywords: DataFlow type error, InvalidInput DataFlow, invalid literal, DataFlow parameter error, DataFlow type mismatch, model field type, Value type wrong, DataFlow create node, generated node error -->
