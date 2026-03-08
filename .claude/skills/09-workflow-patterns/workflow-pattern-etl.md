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
builder.add_node("DataValidationNode", "validate", {
    "input": "{{extract.data}}",
    "schema": {
        "email": "email",
        "age": "integer",
        "name": "string"
    },
    "on_error": "collect"  # Collect invalid rows
})

# 3. TRANSFORM: Clean data
builder.add_node("TransformNode", "clean", {
    "input": "{{validate.valid_data}}",
    "transformations": [
        {"field": "email", "operation": "lowercase"},
        {"field": "name", "operation": "trim"},
        {"field": "phone", "operation": "normalize_phone"}
    ]
})

# 4. TRANSFORM: Enrich data
builder.add_node("HTTPRequestNode", "enrich_location", {
    "url": "https://api.example.com/geocode",
    "method": "POST",
    "body": "{{clean.data}}"
})

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
    "parameters": "{{enrich_location.enriched_data}}"
})

# 6. Error handling: Log invalid rows
builder.add_node("FileWriterNode", "log_errors", {
    "path": "logs/invalid_rows.csv",
    "data": "{{validate.invalid_data}}",
    "headers": ["row", "error", "data"]
})

# Connect nodes
builder.connect("extract", "rows", "validate", "input")
builder.connect("validate", "valid_data", "clean", "input")
builder.connect("clean", "data", "enrich_location", "body")
builder.connect("enrich_location", "enriched_data", "load", "parameters")
builder.connect("validate", "invalid_data", "log_errors", "data")

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
    "connection": "source_db",
    "query": """
        SELECT id, name, email, created_at
        FROM legacy_users
        WHERE migrated = FALSE
        LIMIT 1000
    """
})

# 2. TRANSFORM: Data mapping
builder.add_node("TransformNode", "transform_schema", {
    "input": "{{extract_source.results}}",
    "transformations": [
        {"source": "id", "target": "legacy_id", "type": "string"},
        {"source": "name", "target": "full_name", "type": "string"},
        {"source": "email", "target": "email_address", "type": "lowercase"},
        {"source": "created_at", "target": "registration_date", "type": "datetime"}
    ]
})

# 3. TRANSFORM: Validate business rules
builder.add_node("DataValidationNode", "validate_rules", {
    "input": "{{transform_schema.data}}",
    "rules": [
        {"field": "email_address", "validation": "email_format"},
        {"field": "full_name", "validation": "not_empty"},
        {"field": "registration_date", "validation": "valid_date"}
    ]
})

# 4. LOAD: Insert to target DB
builder.add_node("SQLQueryNode", "load_target", {
    "connection": "target_db",
    "query": """
        INSERT INTO users (legacy_id, full_name, email_address, registration_date)
        VALUES (?, ?, ?, ?)
    """,
    "batch": True,
    "parameters": "{{validate_rules.valid_data}}"
})

# 5. Update source DB (mark as migrated)
builder.add_node("SQLQueryNode", "mark_migrated", {
    "connection": "source_db",
    "query": """
        UPDATE legacy_users
        SET migrated = TRUE, migrated_at = NOW()
        WHERE id IN ({{load_target.inserted_ids}})
    """
})

# 6. Handle failures
builder.add_node("SQLQueryNode", "log_failures", {
    "connection": "source_db",
    "query": """
        INSERT INTO migration_failures (legacy_id, error, data)
        VALUES (?, ?, ?)
    """,
    "parameters": "{{validate_rules.invalid_data}}"
})

builder.connect("extract_source", "results", "transform_schema", "input")
builder.connect("transform_schema", "data", "validate_rules", "input")
builder.connect("validate_rules", "valid_data", "load_target", "parameters")
builder.connect("load_target", "inserted_ids", "mark_migrated", "ids")
builder.connect("validate_rules", "invalid_data", "log_failures", "parameters")
```

## Pattern 4: Real-Time Streaming ETL

```python
import kailash

builder = kailash.WorkflowBuilder()

# 1. EXTRACT: Stream from message queue
builder.add_node("MessageQueueConsumerNode", "extract_stream", {
    "queue_url": "kafka://localhost:9092/events",
    "topic": "user_events",
    "batch_size": 50
})

# 2. TRANSFORM: Parse events
builder.add_node("TransformNode", "parse_events", {
    "input": "{{extract_stream.messages}}",
    "parsing": {
        "format": "json",
        "flatten": True,
        "extract_fields": ["user_id", "event_type", "timestamp", "data"]
    }
})

# 3. TRANSFORM: Aggregate metrics
builder.add_node("AggregateNode", "calculate_metrics", {
    "input": "{{parse_events.events}}",
    "group_by": ["user_id", "event_type"],
    "aggregations": {
        "count": "COUNT(*)",
        "avg_duration": "AVG(data.duration)",
        "last_seen": "MAX(timestamp)"
    },
    "window": "5m"  # 5-minute window
})

# 4. LOAD: Write to time-series DB
builder.add_node("SQLQueryNode", "load_metrics", {
    "connection": "timescaledb",
    "query": """
        INSERT INTO user_metrics (user_id, event_type, count, avg_duration, last_seen, window_start)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
    "parameters": "{{calculate_metrics.aggregated}}"
})

# 5. Acknowledge messages
builder.add_node("MessageQueueAckNode", "ack_messages", {
    "message_ids": "{{extract_stream.message_ids}}"
})

builder.connect("extract_stream", "messages", "parse_events", "input")
builder.connect("parse_events", "events", "calculate_metrics", "input")
builder.connect("calculate_metrics", "aggregated", "load_metrics", "parameters")
builder.connect("load_metrics", "result", "ack_messages", "message_ids")
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
- **Database Nodes**: [`nodes-database-reference`](../nodes/nodes-database-reference.md)

<!-- Trigger Keywords: ETL, data pipeline, extract transform load, data migration, data integration, batch processing -->
