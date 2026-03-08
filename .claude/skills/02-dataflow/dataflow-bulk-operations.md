---
name: dataflow-bulk-operations
description: "High-performance bulk operations for DataFlow with MongoDB-style operators. Use when bulk operations, batch insert, BulkCreate{Model}, BulkUpdate{Model}, mass data import, $in operators, or high-throughput processing."
---

# DataFlow Bulk Operations

High-performance bulk nodes for processing thousands of records efficiently with automatic optimization and MongoDB-style query operators.

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`dataflow-crud-operations`](#), [`dataflow-models`](#), [`dataflow-queries`](#)
> Related Subagents: `dataflow-specialist` (performance optimization, troubleshooting)
>
> **⚡ New Feature**: MongoDB-style operators ($eq, $ne, $gt, $gte, $lt, $lte, $in, $like, $null) for bulk UPDATE and DELETE

## Quick Reference

- **4 Bulk Nodes**: BulkCreate, BulkUpdate, BulkDelete, BulkUpsert
- **Performance**: 1,000-100,000 records/sec depending on operation
- **Auto-Optimization**: Database-specific optimizations (PostgreSQL COPY, etc.)
- **Pattern**: Use for >100 records
- **Datetime Auto-Conversion**: ISO 8601 strings → datetime objects

```python
# Bulk create
builder.add_node("BulkCreateProduct", "import", {
    "data": products_list,
    "batch_size": 1000
})

# Bulk update
builder.add_node("BulkUpdateProduct", "update_prices", {
    "filter": {"category": "electronics"},
    "fields": {"price": {"$multiply": 0.9}}
})

# Bulk delete
builder.add_node("BulkDeleteProduct", "cleanup", {
    "filter": {"active": False},
    "soft_delete": True
})

# Bulk upsert
builder.add_node("BulkUpsertProduct", "sync", {
    "data": products_list,
    "conflict_resolution": "update"  # "update" or "skip"/"ignore"
})
```

## Core Pattern

```python
import kailash

reg = kailash.NodeRegistry()

df = kailash.DataFlow(os.environ["DATABASE_URL"])

@db.model
class Product:
    name: str
    price: float
    category: str
    stock: int

# Prepare bulk data
products = [
    {"name": f"Product {i}", "price": i * 10.0, "category": "electronics", "stock": 100}
    for i in range(1, 1001)  # 1000 products
]

builder = kailash.WorkflowBuilder()

# Bulk create (high performance)
builder.add_node("BulkCreateProduct", "import_products", {
    "data": products,
    "batch_size": 1000,           # Process 1000 at a time
    "conflict_resolution": "skip"  # Skip duplicates
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# Check results -- BulkCreate returns "records" and "count"
bulk_result = result["results"]["import_products"]
print(f"Imported {bulk_result['count']} products")
print(f"Records: {len(bulk_result['records'])}")
```

## Common Use Cases

- **Data Import**: CSV/Excel imports, API data sync
- **Price Updates**: Mass price changes, discounts
- **Inventory Management**: Stock updates, reordering
- **Data Migration**: Moving data between systems
- **Cleanup Operations**: Archiving, deletion of old data

## Bulk Node Reference

| Node                  | Throughput | Use Case        | Key Parameters                              |
| --------------------- | ---------- | --------------- | ------------------------------------------- |
| **BulkCreate{Model}** | 10k+/sec   | Data import     | `data`, `batch_size`, `conflict_resolution` |
| **BulkUpdate{Model}** | 50k+/sec   | Mass updates    | `filter`, `updates`, `batch_size`           |
| **BulkDelete{Model}** | 100k+/sec  | Cleanup         | `filter`, `soft_delete`, `batch_size`       |
| **BulkUpsert{Model}** | 3k+/sec    | Sync operations | `data`, `conflict_resolution`, `batch_size` |

## Key Parameters / Options

### BulkCreate{Model}

```python
builder.add_node("BulkCreateProduct", "import", {
    # Required
    "data": products_list,  # List of dicts

    # Performance
    "batch_size": 1000,              # Records per batch
    "parallel_batches": 4,           # Concurrent batches
    "use_copy": True,                # PostgreSQL COPY (faster)

    # Conflict resolution
    "conflict_resolution": "skip",   # skip, error, update
    "conflict_fields": ["sku"],      # Fields to check

    # Error handling
    "error_strategy": "continue",    # continue, stop
    "max_errors": 100,               # Stop if too many errors

    # Validation
    "validate_data": True,
    "skip_invalid": False
})
```

### BulkUpdate{Model}

```python
builder.add_node("BulkUpdateProduct", "update", {
    # Filter (which records to update)
    "filter": {
        "category": "electronics",
        "active": True
    },

    # Updates to apply
    "fields": {
        "price": {"$multiply": 0.9},  # 10% discount
        "updated_at": ":current_timestamp"
    },

    # Performance
    "batch_size": 2000,
    "return_updated": True  # Return updated records
})
```

### BulkDelete{Model}

```python
builder.add_node("BulkDeleteProduct", "cleanup", {
    # Filter (which records to delete) - MongoDB-style operators supported
    "filter": {
        "active": False,
        "created_at": {"$lt": "2022-01-01"}
    },

    # Delete mode
    "soft_delete": True,            # Preserve data
    "hard_delete": False,           # Permanent deletion

    # Safety
    "max_delete_count": 10000,      # Safety limit
    "dry_run": False,               # Preview mode

    # Performance
    "batch_size": 1000
})
```

### ⚡ MongoDB-Style Operators

**NEW**: Bulk UPDATE and DELETE operations support MongoDB-style query operators for intuitive filtering.

**Supported Operators:**
| Operator | SQL | Description | Example |
|----------|-----|-------------|---------|
| `$eq` | `=` | Equal (or direct value match) | `{"status": "active"}` |
| `$ne` | `!=` | Not equal | `{"status": {"$ne": "deleted"}}` |
| `$gt` | `>` | Greater than | `{"price": {"$gt": 100.00}}` |
| `$gte` | `>=` | Greater than or equal | `{"stock": {"$gte": 10}}` |
| `$lt` | `<` | Less than | `{"views": {"$lt": 1000}}` |
| `$lte` | `<=` | Less than or equal | `{"age": {"$lte": 18}}` |
| `$in` | `IN` | Match any value in list | `{"status": {"$in": ["active", "pending"]}}` |
| `$like` | `LIKE` | Pattern match | `{"name": {"$like": "%test%"}}` |
| `$null` | `IS NULL` | Null check | `{"deleted_at": {"$null": True}}` |

**Examples:**

```python
# $in operator - Delete multiple statuses
builder.add_node("BulkDeleteOrder", "cleanup", {
    "filter": {"status": {"$in": ["cancelled", "expired", "failed"]}}
})

# $ne operator - Delete non-completed orders
builder.add_node("BulkDeleteOrder", "cleanup_pending", {
    "filter": {"status": {"$ne": "completed"}}
})

# Comparison operators - Update based on numeric comparison
builder.add_node("BulkUpdateProduct", "restock", {
    "filter": {"stock": {"$lt": 10}},  # Stock less than 10
    "fields": {"needs_restock": True}
})

# Combined operators - Complex filtering
builder.add_node("BulkUpdateUser", "flag_inactive", {
    "filter": {
        "last_login": {"$lt": "2024-01-01"},
        "account_type": {"$in": ["free", "trial"]},
        "status": {"$ne": "suspended"}
    },
    "fields": {"inactive": True}
})

# Multiple IDs - Common pattern
builder.add_node("BulkDeleteProduct", "delete_specific", {
    "filter": {"id": {"$in": ["prod_1", "prod_2", "prod_3"]}}
})
```

**Edge Cases Handled:**

- ✅ Empty lists: `{"id": {"$in": []}}` → Matches nothing (0 records)
- ✅ Single value: `{"id": {"$in": ["prod_1"]}}` → Works correctly
- ✅ Duplicates: `{"id": {"$in": ["prod_1", "prod_1"]}}` → Deduped automatically
- ✅ Mixed operators: Multiple operators in same filter work correctly

### BulkUpsert{Model}

```python
builder.add_node("BulkUpsertProduct", "sync", {
    # Required: Data to upsert (must include 'id' field)
    "data": products_list,

    # Conflict resolution strategy
    "conflict_resolution": "update",  # "update" (default) or "skip"/"ignore"

    # Performance
    "batch_size": 2000
})
```

**Key Points:**

- **Conflict Column**: Always `id` (DataFlow standard, auto-inferred)
- **conflict_resolution**:
  - `"update"` (default): Update existing records on conflict
  - `"skip"` or `"ignore"`: Skip existing records, insert only new ones
- **No unique_fields parameter**: Conflict detection always uses `id` field
- **Data Structure**: Each record in `data` must include an `id` field

**Example: Update Conflicts**

```python
# Update existing products, insert new ones
products = [
    {"id": "prod-001", "name": "Widget A", "price": 19.99, "stock": 100},
    {"id": "prod-002", "name": "Widget B", "price": 29.99, "stock": 50},
]

builder.add_node("BulkUpsertProduct", "upsert_products", {
    "data": products,
    "conflict_resolution": "update",  # Update if id exists
    "batch_size": 1000
})
```

**Example: Skip Conflicts (Insert Only New)**

```python
# Insert only new products, skip existing ones
builder.add_node("BulkUpsertProduct", "insert_new_products", {
    "data": products,
    "conflict_resolution": "skip",  # Skip if id exists
    "batch_size": 1000
})
```

## Common Mistakes

### Mistake 1: Using Single Operations for Bulk

```python
# Wrong - very slow for 1000+ records
for product in products:
    builder.add_node("CreateProduct", f"create_{product['sku']}", product)
```

**Fix: Use Bulk Operations**

```python
# Correct - 10-100x faster
builder.add_node("BulkCreateProduct", "import_products", {
    "data": products,
    "batch_size": 1000
})
```

### Mistake 2: Batch Size Too Small

```python
# Wrong - overhead dominates
builder.add_node("BulkCreateProduct", "import", {
    "data": products,
    "batch_size": 10  # Too small!
})
```

**Fix: Use Appropriate Batch Size**

```python
# Correct - optimal performance
builder.add_node("BulkCreateProduct", "import", {
    "data": products,
    "batch_size": 1000  # 1000-5000 typical
})
```

### Mistake 3: Not Handling Errors

```python
# Wrong - stops on first error
builder.add_node("BulkCreateProduct", "import", {
    "data": products,
    "error_strategy": "stop"  # Fails entire batch
})
```

**Fix: Continue on Errors**

```python
# Correct - resilient import
builder.add_node("BulkCreateProduct", "import", {
    "data": products,
    "error_strategy": "continue",
    "max_errors": 1000,
    "failed_records_file": "/tmp/failed.json"
})
```

## Automatic Datetime Conversion in Bulk Operations

DataFlow automatically converts ISO 8601 datetime strings to Python datetime objects in ALL bulk operations. This is especially powerful for data imports from external sources.

### Supported ISO 8601 Formats

- **Basic**: `2024-01-01T12:00:00`
- **With microseconds**: `2024-01-01T12:00:00.123456`
- **With timezone Z**: `2024-01-01T12:00:00Z`
- **With timezone offset**: `2024-01-01T12:00:00+05:30`

### Example: BulkCreate{Model} with EmbeddedPythonNode

```python
import kailash

reg = kailash.NodeRegistry()

builder = kailash.WorkflowBuilder()

# EmbeddedPythonNode generates bulk data with ISO strings
builder.add_node("EmbeddedPythonNode", "generate_bulk_data", {
    "code": """
from datetime import datetime, timedelta

users = []
for i in range(1000):
    users.append({
        "name": f"User {i}",
        "email": f"user{i}@example.com",
        "registered_at": (datetime.now() - timedelta(days=i)).isoformat(),
        "last_login": datetime.now().isoformat()
    })

result = {"users": users}
    """,
    "output_vars": ["result"]
})

# BulkCreate{Model} automatically converts all ISO strings to datetime
builder.add_node("BulkCreateUser", "bulk_import", {
    "data": "{{generate_bulk_data.users}}",  # All ISO strings → datetime
    "batch_size": 1000
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# All datetime fields stored as proper datetime types
# BulkCreate returns "records" and "count"
bulk_result = result["results"]["bulk_import"]
print(f"Imported {bulk_result['count']} users with converted timestamps")
```

### Example: BulkUpdate{Model} with Datetime

```python
# Update last_login timestamps in bulk
builder.add_node("EmbeddedPythonNode", "generate_timestamps", {
    "code": """
from datetime import datetime

updates = []
for user_id in range(1, 101):
    updates.append({
        "id": user_id,
        "last_login": datetime.now().isoformat(),
        "output_vars": ["updates"]
    })

result = {"updates": updates}
    """
})

# BulkUpdate{Model} auto-converts ISO strings
builder.add_node("BulkUpdateUser", "update_logins", {
    "fields": "{{generate_timestamps.updates}}",  # ISO strings → datetime
    "batch_size": 100
})
```

### Example: BulkUpsert{Model} with Datetime

```python
# Sync external data with timestamps
builder.add_node("EmbeddedPythonNode", "fetch_external_data", {
    "code": """
import requests
from datetime import datetime

# Fetch from external API
response = requests.get("https://api.example.com/products")
products = response.json()

# Add sync timestamp and ensure 'id' field exists
for product in products:
    product["id"] = product.get("id") or product.get("external_id")
    product["last_synced"] = datetime.now().isoformat()

result = {"products": products}
    """,
    "output_vars": ["result"]
})

# BulkUpsert{Model} converts all datetime strings
builder.add_node("BulkUpsertProduct", "sync_products", {
    "data": "{{fetch_external_data.products}}",  # ISO strings → datetime
    "conflict_resolution": "update",  # Update existing products
    "batch_size": 500
})
```

### Example: CSV Import with Datetime Conversion

```python
# Import CSV with date columns
builder.add_node("EmbeddedPythonNode", "parse_csv_with_dates", {
    "code": """
import csv
from datetime import datetime

products = []
with open('products.csv') as f:
    for row in csv.DictReader(f):
        products.append({
            "name": row["name"],
            "price": float(row["price"]),
            "created_at": datetime.fromisoformat(row["created_date"]).isoformat(),
            "updated_at": datetime.fromisoformat(row["updated_date"]).isoformat(),
            "output_vars": ["products"]
        })

result = {"products": products}
    """
})

# BulkCreate{Model} handles datetime conversion
builder.add_node("BulkCreateProduct", "import_csv", {
    "data": "{{parse_csv_with_dates.products}}",  # All timestamps auto-converted
    "batch_size": 5000
})
```

### Backward Compatibility

Existing code with datetime objects continues to work:

```python
from datetime import datetime

# Direct datetime objects still work
products = [
    {
        "name": "Product 1",
        "price": 19.99,
        "created_at": datetime.now()  # Direct datetime object
    },
    {
        "name": "Product 2",
        "price": 29.99,
        "created_at": "2024-01-15T10:30:00"  # ISO string also works
    }
]

builder.add_node("BulkCreateProduct", "import", {
    "data": products,
    "batch_size": 1000
})
```

### Applies To All Bulk Nodes

Datetime auto-conversion works on:

- ✅ `BulkCreateProduct` - Bulk inserts
- ✅ `BulkUpdateProduct` - Bulk updates
- ✅ `BulkUpsertProduct` - Bulk upserts
- ✅ `BulkDeleteProduct` - Bulk deletes (for timestamp filters)

### Common Use Cases

**API Data Synchronization:**

```python
# External API returns ISO timestamps
builder.add_node("EmbeddedPythonNode", "sync_api", {
    "code": """
import requests
response = requests.get("https://api.partner.com/inventory")
inventory_data = response.json()

# Ensure each record has 'id' field (required for upsert)
for item in inventory_data:
    item["id"] = item.get("id") or item.get("sku")

result = {"inventory": inventory_data}  # Contains ISO datetime strings
    """,
    "output_vars": ["result"]
})

builder.add_node("BulkUpsertInventory", "sync", {
    "data": "{{sync_api.inventory}}",  # Timestamps auto-converted
    "conflict_resolution": "update",  # Update existing inventory
    "batch_size": 1000
})
```

**Historical Data Import:**

```python
# Import historical records with date ranges
builder.add_node("EmbeddedPythonNode", "generate_historical", {
    "code": """
from datetime import datetime, timedelta

records = []
start_date = datetime(2020, 1, 1)
for i in range(1000):
    records.append({
        "date": (start_date + timedelta(days=i)).isoformat(),
        "value": i * 10.0,
        "output_vars": ["start_date"]
    })

result = {"records": records}
    """
})

builder.add_node("BulkCreateRecord", "import_historical", {
    "data": "{{generate_historical.records}}",  # All dates converted
    "batch_size": 5000,
    "use_copy": True  # PostgreSQL optimization
})
```

**Real-Time Event Processing:**

```python
# Process events with timestamps
builder.add_node("EmbeddedPythonNode", "process_events", {
    "code": """
from datetime import datetime

events = []
for event in incoming_events:
    events.append({
        "user_id": event["user_id"],
        "action": event["action"],
        "timestamp": datetime.now().isoformat(),
        "output_vars": ["result"]
    })

result = {"events": events}
    """
})

builder.add_node("BulkCreateEvent", "log_events", {
    "data": "{{process_events.events}}",  # Timestamps auto-converted
    "batch_size": 100
})
```

## Related Patterns

- **For single operations**: See [`dataflow-crud-operations`](#)
- **For queries**: See [`dataflow-queries`](#)
- **For performance**: See [`dataflow-performance`](#)

## When to Escalate to Subagent

Use `dataflow-specialist` subagent when:

- Optimizing bulk operations for millions of records
- Troubleshooting performance bottlenecks
- Implementing custom batch strategies
- Working with very large datasets (>1M records)
- Setting up parallel processing pipelines

## Examples

### Example 1: CSV Data Import

```python
import csv
from decimal import Decimal

# Read CSV data
products = []
with open('products.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        products.append({
            "sku": row["SKU"],
            "name": row["Name"],
            "price": Decimal(row["Price"]),
            "stock": int(row["Stock"]),
            "category": row["Category"]
        })

# Bulk import
builder = kailash.WorkflowBuilder()
builder.add_node("BulkCreateProduct", "import_csv", {
    "data": products,
    "batch_size": 5000,
    "use_copy": True,                # PostgreSQL optimization
    "conflict_resolution": "skip",   # Skip duplicates
    "error_strategy": "continue",
    "failed_records_file": "/tmp/failed_imports.json"
})

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### Example 2: Mass Price Update

```python
# 10% discount on all electronics
builder.add_node("BulkUpdateProduct", "discount_electronics", {
    "filter": {
        "category": "electronics",
        "active": True
    },
    "fields": {
        "price": {"$multiply": 0.9},  # 10% off
        "discount_applied": True,
        "updated_at": ":current_timestamp"
    },
    "batch_size": 2000,
    "return_updated": True
})

result = rt.execute(builder.build(reg))
# BulkUpdate returns "updated_count"
print(f"Updated {result['results']['discount_electronics']['updated_count']} products")
```

### Example 3: Data Synchronization

```python
# Sync products from external API
external_products = fetch_from_api()  # Get external data

# Ensure all records have 'id' field (required for upsert)
for product in external_products:
    product["id"] = product.get("id") or product.get("external_id")

builder = kailash.WorkflowBuilder()
builder.add_node("BulkUpsertProduct", "sync_products", {
    "data": external_products,
    "conflict_resolution": "update",  # Update existing, insert new
    "batch_size": 3000
})

result = rt.execute(builder.build(reg))
# BulkUpsert returns "records", "created_count", "updated_count"
sync_result = result["results"]["sync_products"]
print(f"Created: {sync_result['created_count']}, Updated: {sync_result['updated_count']}")
print(f"Records: {len(sync_result['records'])}")
```

## Troubleshooting

| Issue                | Cause                       | Solution                           |
| -------------------- | --------------------------- | ---------------------------------- |
| `MemoryError`        | Dataset too large           | Reduce batch_size or use streaming |
| Slow performance     | Small batch_size            | Increase to 1000-5000              |
| Duplicate key errors | conflict_resolution="error" | Use "skip" or "update"             |
| Transaction timeout  | Batch too large             | Reduce batch_size                  |

## Quick Tips

- Use 1000-5000 for batch_size (optimal)
- Enable `use_copy=True` for PostgreSQL
- Use `error_strategy="continue"` for resilient imports
- Monitor memory usage for very large datasets
- Use upsert for synchronization tasks
- Soft delete preserves audit trails
- Test with small dataset first

## Keywords for Auto-Trigger

<!-- Trigger Keywords: bulk operations, batch insert, BulkCreate{Model}, BulkUpdate{Model}, BulkDelete{Model}, BulkUpsert{Model}, mass data import, high-throughput, bulk create, bulk update, bulk delete, batch operations, data import, mass updates -->
