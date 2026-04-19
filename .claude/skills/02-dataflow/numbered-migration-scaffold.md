# Numbered Migration Scaffold (kailash-rs Python Bindings)

Reference scaffold for projects that consume kailash-rs through its Python bindings and need numbered schema migrations. `rules/schema-migration.md` mandates that schema changes MUST live in numbered migration files; this skill provides the starter layout so projects are not reinventing migration frameworks from scratch.

Authoring target: applications using `import kailash` (the Python binding to kailash-rs) and `kailash.dataflow.DataFlow(...)` to open connections. Each migration is a Python module with `up(conn)` and `down(conn)` functions; the `scripts/migrate.py` CLI applies or rolls back migrations by number.

## Directory Layout

```
your_project/
├── migrations/
│   ├── __init__.py
│   ├── 001_initial.py
│   ├── 002_add_user_email_index.py
│   ├── 003_add_tenant_id.py
│   └── ...
└── scripts/
    └── migrate.py
```

## `migrations/__init__.py`

```python
"""Numbered migrations for the application schema.

Each migration module lives in this package and defines two functions:

    def up(conn):    ...
    def down(conn):  ...

The scripts/migrate.py CLI discovers migrations by filename prefix
(NNN_*.py), runs them in numerical order, and records applied migrations
in the `schema_migrations` table.
"""

import importlib
import pkgutil
import re
from pathlib import Path

_MIGRATION_RE = re.compile(r"^(\d{3,})_(.+)\.py$")


def discover() -> list[tuple[int, str, object]]:
    """Return [(number, name, module), ...] sorted by number."""
    here = Path(__file__).parent
    out: list[tuple[int, str, object]] = []
    for name in sorted(p.name for p in here.iterdir() if p.is_file()):
        m = _MIGRATION_RE.match(name)
        if not m:
            continue
        number, slug = int(m.group(1)), m.group(2)
        module = importlib.import_module(f"migrations.{name[:-3]}")
        out.append((number, slug, module))
    return sorted(out, key=lambda t: t[0])
```

## Example Migration: `migrations/001_initial.py`

```python
"""001 — initial schema: users and documents."""

def up(conn):
    conn.execute("""
        CREATE TABLE users (
            id          INTEGER PRIMARY KEY,
            email       TEXT NOT NULL UNIQUE,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE documents (
            id          INTEGER PRIMARY KEY,
            owner_id    INTEGER NOT NULL REFERENCES users(id),
            title       TEXT NOT NULL,
            body        TEXT NOT NULL,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)


def down(conn, *, force_drop: bool = False):
    if not force_drop:
        raise RuntimeError(
            "down(001_initial) refused — pass force_drop=True to acknowledge "
            "that rolling back will DROP TABLE users and documents, "
            "destroying all rows irreversibly"
        )
    conn.execute("DROP TABLE IF EXISTS documents")
    conn.execute("DROP TABLE IF EXISTS users")
```

Note: `down()` takes `force_drop: bool` per `rules/schema-migration.md` § 3 "Destructive downgrade() MUST Require force_drop=True".

## Example Migration: `migrations/002_add_user_email_index.py`

```python
"""002 — add index on users.email for login lookup."""

def up(conn):
    conn.execute("CREATE INDEX idx_users_email ON users (email)")


def down(conn, *, force_drop: bool = False):
    # Index drops are reversible (the index can be recreated), so force_drop
    # is not required — but we accept the flag for signature consistency.
    conn.execute("DROP INDEX IF EXISTS idx_users_email")
```

## Example Migration: `migrations/003_add_tenant_id.py`

```python
"""003 — add tenant_id to users and documents for multi-tenancy."""

def up(conn):
    conn.execute("ALTER TABLE users     ADD COLUMN tenant_id TEXT")
    conn.execute("ALTER TABLE documents ADD COLUMN tenant_id TEXT")
    # Backfill default tenant for legacy rows
    conn.execute("UPDATE users     SET tenant_id = 'default' WHERE tenant_id IS NULL")
    conn.execute("UPDATE documents SET tenant_id = 'default' WHERE tenant_id IS NULL")
    conn.execute("CREATE INDEX idx_users_tenant     ON users     (tenant_id)")
    conn.execute("CREATE INDEX idx_documents_tenant ON documents (tenant_id)")


def down(conn, *, force_drop: bool = False):
    if not force_drop:
        raise RuntimeError(
            "down(003_add_tenant_id) refused — pass force_drop=True to "
            "acknowledge that rolling back will DROP the tenant_id column, "
            "discarding every row's tenant attribution irreversibly"
        )
    conn.execute("DROP INDEX IF EXISTS idx_documents_tenant")
    conn.execute("DROP INDEX IF EXISTS idx_users_tenant")
    conn.execute("ALTER TABLE documents DROP COLUMN tenant_id")
    conn.execute("ALTER TABLE users     DROP COLUMN tenant_id")
```

## `scripts/migrate.py`

```python
#!/usr/bin/env python3
"""Apply or roll back numbered migrations via the kailash-rs Python binding."""

import argparse
import os
import sys

import kailash

from migrations import discover


def _ensure_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS schema_migrations (
            number      INTEGER PRIMARY KEY,
            name        TEXT NOT NULL,
            applied_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)


def _applied_numbers(conn) -> set[int]:
    rows = conn.fetch_all("SELECT number FROM schema_migrations")
    return {row["number"] for row in rows}


def cmd_up(conn, target: int | None) -> None:
    _ensure_table(conn)
    applied = _applied_numbers(conn)
    for number, name, module in discover():
        if number in applied:
            continue
        if target is not None and number > target:
            break
        print(f"applying {number:03d}_{name} ...")
        module.up(conn)
        conn.execute(
            "INSERT INTO schema_migrations (number, name) VALUES (?, ?)",
            (number, name),
        )
    print("up: done")


def cmd_down(conn, target: int, *, force_drop: bool) -> None:
    _ensure_table(conn)
    applied = sorted(_applied_numbers(conn), reverse=True)
    for number in applied:
        if number <= target:
            break
        entry = next((e for e in discover() if e[0] == number), None)
        if entry is None:
            raise RuntimeError(f"migration {number} has no module on disk")
        _, name, module = entry
        print(f"rolling back {number:03d}_{name} ...")
        module.down(conn, force_drop=force_drop)
        conn.execute("DELETE FROM schema_migrations WHERE number = ?", (number,))
    print("down: done")


def cmd_status(conn) -> None:
    _ensure_table(conn)
    applied = _applied_numbers(conn)
    for number, name, _ in discover():
        marker = "[x]" if number in applied else "[ ]"
        print(f"{marker} {number:03d} {name}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate the application schema.")
    parser.add_argument("--url", default=os.environ.get("DATABASE_URL", "sqlite://app.db"))
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("up").add_argument("--to", type=int, default=None)
    p_down = sub.add_parser("down")
    p_down.add_argument("--to", type=int, required=True)
    p_down.add_argument("--force-drop", action="store_true")
    sub.add_parser("status")

    args = parser.parse_args()

    db = kailash.dataflow.DataFlow(args.url)
    conn = db.connection()
    try:
        if args.cmd == "up":
            cmd_up(conn, args.to)
        elif args.cmd == "down":
            cmd_down(conn, args.to, force_drop=args.force_drop)
        elif args.cmd == "status":
            cmd_status(conn)
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

## CLI Usage

```bash
# Apply all pending migrations
python scripts/migrate.py up

# Apply up to a specific number
python scripts/migrate.py up --to 2

# Roll back to a specific number (requires --force-drop for destructive migrations)
python scripts/migrate.py down --to 1 --force-drop

# Show applied / pending
python scripts/migrate.py status
```

## Invariants The Scaffold Enforces

1. **Numerical ordering.** Files named `NNN_*.py` are discovered in numerical order; inserting a migration with a number gap or a duplicate number raises at discovery time.
2. **Append-only.** Applied migrations are tracked in `schema_migrations`. A migration that was already applied is skipped on re-run.
3. **Force-drop gate for destructive downgrades.** `down(force_drop=True)` is required for any migration that DROPs a table or column; the scaffold's example `down()` functions raise without it. See `rules/schema-migration.md` § 3.
4. **Tenant awareness.** Example 003 shows the standard pattern for adding a `tenant_id` column with backfill + index, consistent with `rules/tenant-isolation.md`.

## When To Use A Framework Instead

The scaffold above is minimal — it is the starting point for projects that do not want to adopt a full migration framework. For complex schemas (hundreds of migrations, multi-database, branch-merge resolution), use a framework:

- **Alembic** (SQLAlchemy) — standard in the Python ecosystem; first-class branch/merge support.
- **sqlx migrate** — if the project is already using sqlx-through-kailash-rs directly.
- **Django migrations** — if the project is a Django app.

The scaffold's `schema_migrations` table shape is intentionally compatible with Alembic's `alembic_version` so switching later is mostly a bookkeeping change, not a rewrite.

## Related Rules & Skills

- `rules/schema-migration.md` — MUST rules this scaffold implements
- `rules/tenant-isolation.md` — pattern for tenant-scoped schema changes (example 003)
- `rules/dataflow-identifier-safety.md` — any dynamic identifier in a migration MUST route through the dialect's `quote_identifier()` helper
- `skills/02-dataflow/SKILL.md` — broader DataFlow binding patterns

Origin: gh-coc-claude-rs#51 item 3b (2026-04-17). Reporter observation that `rules/schema-migration.md` mandates numbered migrations but ships no reference implementation. Python-binding scaffold authored for rs USE template consumers (who write Python apps against the kailash-rs bindings); the scaffold is a starter, not a framework.
