# DataFlow Aggregation Patterns

Grouped aggregation queries via `DataFlowExpress` -- COUNT, SUM, AVG, MIN, MAX with GROUP BY support.

## AggregateOp Enum

```python
from kailash.dataflow import AggregateOp, AggregateSpec

# Static constructors (no arguments)
op_count = AggregateOp.count()
op_sum   = AggregateOp.sum()
op_avg   = AggregateOp.avg()
op_min   = AggregateOp.min()
op_max   = AggregateOp.max()
```

`AggregateOp` is a fixed enum -- aggregate function names are never accepted from user input. This prevents SQL injection at the type level.

## Three Query Methods

### count_by -- Group and count rows

```python
import kailash

df = kailash.DataFlow("sqlite::memory:")
model = kailash.ModelDefinition("Order", "orders")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("category", kailash.FieldType.text(), required=True)
model.field("status", kailash.FieldType.text(), required=True)
model.field("amount", kailash.FieldType.real())
model.auto_timestamps()
df.register_model(model)

express = df.express()

# Group by a single column
results = express.count_by("Order", group_by="status")
# => [{"status": "pending", "count": 5}, {"status": "shipped", "count": 3}]

# With filter
results = express.count_by("Order", group_by="category", filters={"status": "active"})
```

### sum_by -- Group and sum a numeric field

```python
results = express.sum_by("Order", field="amount", group_by="category")
# => [{"category": "electronics", "sum": 1500.0}, {"category": "books", "sum": 230.0}]

# With filter
results = express.sum_by("Order", field="amount", group_by="category", filters={"status": "completed"})
```

### aggregate -- Multi-operation grouped query

```python
from kailash.dataflow import AggregateOp, AggregateSpec

specs = [
    AggregateSpec(AggregateOp.count(), "*", alias="cnt"),
    AggregateSpec(AggregateOp.sum(), "amount", alias="total_amount"),
    AggregateSpec(AggregateOp.avg(), "amount", alias="avg_amount"),
]

results = express.aggregate("Order", specs=specs, group_by=["category"])
# => [{"category": "electronics", "cnt": 10, "total_amount": 1500.0, "avg_amount": 150.0}]
```

Global aggregation (no grouping):

```python
specs = [
    AggregateSpec(AggregateOp.count(), "*", alias="total_count"),
    AggregateSpec(AggregateOp.min(), "amount", alias="min_amt"),
    AggregateSpec(AggregateOp.max(), "amount", alias="max_amt"),
]

results = express.aggregate("Order", specs=specs, group_by=[])
# => [{"total_count": 42, "min_amt": 5.0, "max_amt": 999.0}]
```

Dict-based specs (alternative to AggregateSpec objects):

```python
specs = [
    {"op": "count", "field": "*"},
    {"op": "sum", "field": "amount"},
]
results = express.aggregate("Order", specs=specs, group_by=[])
```

## AggregateSpec API

```python
from kailash.dataflow import AggregateOp, AggregateSpec

spec = AggregateSpec(AggregateOp.sum(), "amount", alias="total")
print(spec.op)     # AggregateOp.sum
print(spec.field)  # "amount"
print(spec.alias)  # "total"
```

| Parameter | Type          | Required | Description                               |
| --------- | ------------- | -------- | ----------------------------------------- |
| `op`      | `AggregateOp` | Yes      | The aggregate operation                   |
| `field`   | `str`         | Yes      | Column name, or `"*"` for `COUNT(*)`      |
| `alias`   | `str`         | No       | Output column name (auto-generated if omitted) |

## Safety Conventions

1. **Field validation** -- Column names are checked against the model's registered columns. Invalid column names raise `RuntimeError`.
2. **Soft-delete awareness** -- `WHERE deleted_at IS NULL` is auto-added when the model uses soft delete.
3. **Tenant filtering** -- `QueryInterceptor` adds tenant WHERE clause before GROUP BY.
4. **Parameterized filters** -- Filter values use placeholders, never string interpolation.
5. **Quoted identifiers** -- Column names are wrapped in double quotes.

## Cross-Dialect Notes

- COUNT, SUM, AVG, MIN, MAX are SQL-standard across SQLite, PostgreSQL, and MySQL.
- SQLite returns integer for AVG on integer columns (this is documented behavior, not a bug).

## Error Handling

```python
# Invalid column name
try:
    express.count_by("Order", group_by="nonexistent_column")
except RuntimeError as e:
    print(e)  # "count_by failed: column not found..."

# Unregistered model
try:
    express.count_by("Unknown", group_by="category")
except RuntimeError as e:
    print(e)  # "count_by failed: model not registered..."

# Empty specs
try:
    express.aggregate("Order", specs=[], group_by=[])
except RuntimeError as e:
    print(e)  # "aggregate requires at least one AggregateSpec"
```

## References

- **Specialist**: `.claude/agents/frameworks/dataflow-specialist.md`
- **Related**: [dataflow-queries](dataflow-queries.md) for general query patterns
- **Related**: [dataflow-multi-tenancy](dataflow-multi-tenancy.md) for tenant-scoped aggregation
