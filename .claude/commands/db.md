# /db - DataFlow Quick Reference

## Purpose

Load the DataFlow skill for zero-config database operations with automatic model-to-node generation.

## Step 0: Verify Project Uses Kailash DataFlow

Before loading DataFlow patterns, check that this project uses Kailash DataFlow:

- Python: Look for `kailash-enterprise` in `requirements.txt`, `pyproject.toml`, `setup.py`; `import kailash` in source files
- Ruby: Look for `kailash` in `Gemfile` or `*.gemspec`; `require "kailash"` / `Kailash::DataFlow` in source files

If not found, inform the user: "This project doesn't appear to use Kailash DataFlow. These patterns may not apply. Continue anyway?"

## Quick Reference

| Command     | Action                                     |
| ----------- | ------------------------------------------ |
| `/db`       | Load DataFlow patterns and database basics |
| `/db model` | Show @db.model decorator patterns          |
| `/db crud`  | Show CRUD operation patterns               |
| `/db bulk`  | Show bulk operation patterns               |

## What You Get

- @db.model decorator patterns
- Auto-generated nodes (11 per SQL model, 8 for MongoDB)
- CRUD, bulk operations, transactions
- Multi-tenancy and multi-instance patterns
- PostgreSQL, SQLite, MongoDB support

## Quick Pattern

**Python** (`import kailash`):

```python
import kailash

df = kailash.DataFlow("sqlite:///app.db")
model = kailash.ModelDefinition("User", "users")
model.field("id", kailash.FieldType.integer(), primary_key=True)
model.field("name", kailash.FieldType.text())
model.field("email", kailash.FieldType.text())
filter = kailash.FilterCondition("name", "eq", "Alice")
```

**Ruby** (`require "kailash"`):

```ruby
require "kailash"

config = Kailash::DataFlow::Config.new("sqlite::memory:")
model = Kailash::DataFlow::ModelDefinition.new("User", "users")
model.add_field("id", "integer", primary_key: true)
model.add_field("name", "text", required: true)
model.add_field("email", "text", nullable: true)
filter = Kailash::DataFlow::FilterCondition.new("name", "eq", "Alice")
```

## Critical Gotchas

| Rule                                         | Why                               |
| -------------------------------------------- | --------------------------------- |
| Primary key MUST be named `id`               | DataFlow convention requirement   |
| NEVER manually set `created_at`/`updated_at` | Auto-managed fields               |
| CreateNode uses FLAT params                  | Not nested under `data`           |
| UpdateNode uses `filter` + `fields`          | Different from CreateNode pattern |
| DataFlow is NOT an ORM                       | It generates workflow nodes       |

## Agent Teams

When working with DataFlow, deploy:

- **dataflow-specialist** — Database operations, auto-generated nodes, bulk operations
- **testing-specialist** — Real database test fixtures (NO MOCKING)

## Related Commands

- `/sdk` - Core SDK patterns
- `/api` - Nexus multi-channel deployment
- `/ai` - Kaizen AI agents
- `/test` - Testing strategies
- `/validate` - Project compliance checks

## Skill Reference

This command loads: `.claude/skills/02-dataflow/SKILL.md`
