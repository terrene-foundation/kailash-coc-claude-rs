---
name: dataflow-installation
description: "DataFlow installation and setup guide. Use when asking 'install dataflow', 'dataflow setup', or 'dataflow requirements'."
---

# DataFlow Installation Guide

> **Skill Metadata**
> Category: `dataflow`
> Priority: `HIGH`
> Related Skills: [`dataflow-specialist`](dataflow-specialist.md), [`dataflow-quickstart`](dataflow-quickstart.md)

## Installation

```bash
# Install Kailash (DataFlow included)
pip install kailash-enterprise
```

## Requirements

- Python 3.9+
- **SQL Databases**: SQLite (included), PostgreSQL 12+, MySQL 5.7+/8.0+
- **Document Database**: MongoDB 4.4+ (optional, for MongoDB support)
- **Vector Search**: PostgreSQL with pgvector extension (optional, for semantic search)

## Quick Setup

```python
import kailash

# SQLite (default, zero-config)
df = kailash.DataFlow("sqlite:///my_app.db")

# PostgreSQL (production recommended)
df = kailash.DataFlow("postgresql://user:pass@localhost/mydb")

# MySQL (web hosting)
df = kailash.DataFlow("mysql://user:pass@localhost/mydb")

# Initialize schema
df.initialize_schema()
```

## Verification

```python
# Test connection
print(db.connection_string)

# Verify models are loaded
print(db.list_models())
```

<!-- Trigger Keywords: install dataflow, dataflow setup, dataflow requirements, dataflow installation -->
