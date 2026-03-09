---
name: workflow-pattern-etl
description: "ETL pipeline patterns (Extract, Transform, Load). Use when asking 'ETL', 'data pipeline', 'extract transform load', 'data migration', or 'data integration'."
---

# ETL Pipeline Patterns

Comprehensive patterns for Extract, Transform, Load workflows.

> **Skill Metadata**
> Category: `workflow-patterns`
> Priority: `HIGH`
> Related Skills: [`workflow-pattern-data`](workflow-pattern-data.md), [`dataflow-specialist`](../../02-dataflow/dataflow-specialist.md)
> Related Subagents: `dataflow-specialist` (database ETL), `pattern-expert` (ETL workflows)

## Quick Reference

ETL patterns enable:

- **Data extraction** - CSV, JSON, databases, APIs
- **Transformation** - Clean, normalize, enrich, aggregate
- **Loading** - Write to databases, files, APIs
- **Error handling** - Validation, retries, dead letter queues

## Pattern 1: CSV to Database ETL

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. EXTRACT: Read CSV
builder.add_node("CSVProcessorNode", "extract", {
    "action": "read",
    "source_path": "data/customers.csv",
    "delimiter": ",",
    "encoding": "utf-8"
})

# 2. TRANSFORM: Validate data
builder.add_node("SchemaValidatorNode", "validate", {
    "schema": {
        "email": "email",
        "age": "integer",
        "name": "string"
    }
})

# 3. TRANSFORM: Clean data
builder.add_node("EmbeddedPythonNode", "clean", {
    "code": """
for row in data:
    row['email'] = row['email'].lower()
    row['name'] = row['name'].strip()
    row['phone'] = normalize_phone(row['phone'])
cleaned = data
    """,
    "output_vars": ["cleaned"]
})

# 4. TRANSFORM: Enrich data
builder.add_node("HTTPRequestNode", "enrich_location", {
    "url": "https://api.example.com/geocode",
    "method": "POST",
})
# Data flows via connect(): builder.connect("clean", "outputs", "enrich_location", "body")

# 5. LOAD: Insert to database
builder.add_node("SQLQueryNode", "load", {
    "query": """
        INSERT INTO customers (name, email, age, location)
        VALUES (?, ?, ?, ?)
        ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            age = EXCLUDED.age,
            location = EXCLUDED.location
    """,
    "params": "{{enrich_location.body}}"
})

# 6. Error handling: Log invalid rows
builder.add_node("FileWriterNode", "log_errors", {
    "path": "logs/invalid_rows.csv"
})

# Connect nodes
builder.connect("extract", "rows", "validate", "data")
builder.connect("validate", "valid", "clean", "inputs")
builder.connect("clean", "outputs", "enrich_location", "body")
builder.connect("enrich_location", "body", "load", "body")
builder.connect("validate", "errors", "log_errors", "content")

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

## Pattern 3: Database to Database Migration

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. EXTRACT: Read from source DB
builder.add_node("SQLQueryNode", "extract_source", {
    "pool": "source_db",
    "query": """
        SELECT id, name, email, created_at
        FROM legacy_users
        WHERE migrated = FALSE
        LIMIT 1000
    """
})

# 2. TRANSFORM: Data mapping
builder.add_node("EmbeddedPythonNode", "transform_schema", {
    "code": """
mapped = []
for row in data:
    mapped.append({
        'legacy_id': str(row['id']),
        'full_name': str(row['name']),
        'email_address': row['email'].lower(),
        'registration_date': row['created_at'],
    })
    """,
    "output_vars": ["mapped"]
})

# 3. TRANSFORM: Validate business rules
builder.add_node("SchemaValidatorNode", "validate_rules", {
    "schema": {
        "email_address": "email",
        "full_name": "string",
        "registration_date": "date"
    }
})

# 4. LOAD: Insert to target DB
builder.add_node("SQLQueryNode", "load_target", {
    "pool": "target_db",
    "query": """
        INSERT INTO users (legacy_id, full_name, email_address, registration_date)
        VALUES (?, ?, ?, ?)
    """,
    "params": "{{validate_rules.valid}}"
})

# 5. Update source DB (mark as migrated)
builder.add_node("SQLQueryNode", "mark_migrated", {
    "pool": "source_db",
    "query": """
        UPDATE legacy_users
        SET migrated = TRUE, migrated_at = NOW()
        WHERE id IN (SELECT id FROM legacy_users WHERE migrated = FALSE LIMIT 1000)
    """
})

# 6. Handle failures
builder.add_node("SQLQueryNode", "log_failures", {
    "pool": "source_db",
    "query": """
        INSERT INTO migration_failures (legacy_id, error, data)
        VALUES (?, ?, ?)
    """,
    "params": "{{validate_rules.errors}}"
})

builder.connect("extract_source", "rows", "transform_schema", "inputs")
builder.connect("transform_schema", "outputs", "validate_rules", "data")
builder.connect("validate_rules", "valid", "load_target", "body")
builder.connect("load_target", "row_count", "mark_migrated", "body")
builder.connect("validate_rules", "errors", "log_failures", "body")
```

## Pattern 4: Real-Time Streaming ETL

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. EXTRACT: Stream from Kafka
builder.add_node("KafkaConsumerNode", "extract_stream", {
    "broker": "localhost:9092",
    "topic": "user_events",
    "batch_size": 50
})

# 2. TRANSFORM: Parse events
builder.add_node("EmbeddedPythonNode", "parse_events", {
    "code": """
import json
result = []
for msg in messages:
    event = json.loads(msg) if isinstance(msg, str) else msg
    result.append({
        'user_id': event['user_id'],
        'event_type': event['event_type'],
        'timestamp': event['timestamp'],
        'data': event.get('data', {})
    })
    """,
    "output_vars": ["result"]
})

# 3. TRANSFORM: Aggregate metrics
builder.add_node("EmbeddedPythonNode", "calculate_metrics", {
    "code": """
from collections import defaultdict
groups = defaultdict(lambda: {'count': 0, 'total_duration': 0, 'last_seen': ''})
for event in events:
    key = (event['user_id'], event['event_type'])
    groups[key]['count'] += 1
    groups[key]['total_duration'] += event.get('data', {}).get('duration', 0)
    groups[key]['last_seen'] = max(groups[key]['last_seen'], event['timestamp'])
aggregated = [{'user_id': k[0], 'event_type': k[1], **v} for k, v in groups.items()]
    """,
    "output_vars": ["aggregated"]
})

# 4. LOAD: Write to time-series DB
builder.add_node("SQLQueryNode", "load_metrics", {
    "pool": "timescaledb",
    "query": """
        INSERT INTO user_metrics (user_id, event_type, count, avg_duration, last_seen, window_start)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
})
# Data flows via connect(): builder.connect("calculate_metrics", "outputs", "load_metrics", "params")

builder.connect("extract_stream", "messages", "parse_events", "inputs")
builder.connect("parse_events", "outputs", "calculate_metrics", "inputs")
builder.connect("calculate_metrics", "outputs", "load_metrics", "body")
```

## Best Practices

1. **Batch processing** - Process in chunks (100-1000 records)
2. **Idempotent operations** - Use UPSERT/ON CONFLICT
3. **Error isolation** - Collect invalid data separately
4. **Transaction boundaries** - Commit per batch
5. **Progress tracking** - Mark processed records
6. **Data validation** - Validate at each stage
7. **Logging** - Track successes, failures, timing

## Common Pitfalls

- **No error handling** - Lost data on failures
- **Memory overload** - Loading entire datasets
- **Missing validation** - Invalid data in target
- **No rollback strategy** - Can't recover from failures
- **Poor performance** - Not using batch operations

## Related Skills

- **DataFlow Framework**: [`dataflow-specialist`](../../02-dataflow/dataflow-specialist.md)
- **Data Patterns**: [`workflow-pattern-data`](workflow-pattern-data.md)
- **Database Nodes**: [`nodes-database-reference`](../08-nodes-reference/nodes-database-reference.md)

<!-- Trigger Keywords: ETL, data pipeline, extract transform load, data migration, data integration, batch processing -->
