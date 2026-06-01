# Ruby Binding Schema & Data Migration Idioms

ActiveRecord / Sequel migration idioms for a Ruby project built on the kailash gem. These are the Ruby-ecosystem migration patterns — numbered reversible migrations, the `schema_migrations` ground-truth table, irreversible-migration handling, production-adapter testing — with no Python/Rust analogue.

Same principles apply to Sequel projects: substitute `Sequel.migration` blocks and `sequel -m db/migrate` for the equivalent ActiveRecord patterns shown here.

## All Schema Changes Through Numbered Migrations

Every DDL change — `CREATE TABLE`, `ADD COLUMN`, `DROP TABLE`, indexes — lives in a timestamp-numbered migration file (`db/migrate/YYYYMMDDHHMMSS_*.rb`). DDL string literals in models, services, controllers, or rake tasks run once on whichever environment touches them and never on the others, drifting the schema.

```ruby
# DO — schema lives in a numbered migration
# db/migrate/20260601120000_add_email_index_to_users.rb
class AddEmailIndexToUsers < ActiveRecord::Migration[7.1]
  def change
    add_index :users, :email, unique: true
  end
end

# DO NOT — DDL in application code
class UserService
  def ensure_index
    ActiveRecord::Base.connection.execute("CREATE INDEX idx_users_email ON users(email)")
  end
end
```

## Data Fixes Are Migrations, Not Console Commands

Backfills, reclassifications, and dedup runs are numbered migrations with the same review and rollback discipline as schema changes. An ad-hoc `User.where(...).update_all(...)` in `rails console` has no record, no rollback, and no audit trail — the next environment never gets the same fix.

```ruby
# DO — backfill as a numbered migration with up/down
# db/migrate/20260601130000_backfill_user_signup_source.rb
class BackfillUserSignupSource < ActiveRecord::Migration[7.1]
  def up
    User.where(signup_source: nil).update_all(signup_source: "organic")
  end

  def down
    User.where(signup_source: "organic").update_all(signup_source: nil)
  end
end

# DO NOT — hotfix in rails console
# rails console> User.where(signup_source: nil).update_all(signup_source: "organic")
```

## Reversible Migrations + Irreversible Handling

Use `change` for migrations Rails can auto-invert; use explicit `up`/`down` when the inverse is non-trivial. A migration whose `down` cannot restore the prior state MUST raise `ActiveRecord::IrreversibleMigration` inside `def down` so a rollback fails loudly instead of silently leaving the schema mid-state.

```ruby
# DO — change auto-reverses
class AddTierToUsers < ActiveRecord::Migration[7.1]
  def change
    add_column :users, :tier, :string, default: "free"
  end
end

# DO — explicit up/down for a non-trivial reverse
class RenameUserStatusToState < ActiveRecord::Migration[7.1]
  def up
    rename_column :users, :status, :state
  end

  def down
    rename_column :users, :state, :status
  end
end

# DO — declare irreversibility explicitly (data cannot be reconstructed)
class DropArchivedEvents < ActiveRecord::Migration[7.1]
  def up
    drop_table :archived_events
  end

  def down
    raise ActiveRecord::IrreversibleMigration,
          "archived_events data is unrecoverable; restore from backup"
  end
end

# DO NOT — silent irreversibility via change (drop with no warning, no down)
class DropArchivedEventsBad < ActiveRecord::Migration[7.1]
  def change
    drop_table :archived_events   # data gone, rollback impossible, no signal
  end
end
```

`disable_ddl_transaction!` is a SEPARATE flag for non-transactional DDL (e.g. `add_index ..., algorithm: :concurrently` on PostgreSQL) — it is NOT the marker for irreversibility. Don't conflate the two.

## Migration Files Are Append-Only

Once a migration is committed to a shared branch it MUST NOT be edited. Environments that already ran it have a different schema than environments running the edited version, and `schema_migrations` (the framework's tracking table) lies. Correct a mistake by adding a NEW migration that supersedes or reverses the prior one.

```ruby
# DO — committed migration was wrong; ADD a corrective migration
# db/migrate/20260601140000_fix_users_email_index.rb
class FixUsersEmailIndex < ActiveRecord::Migration[7.1]
  def change
    remove_index :users, :email
    add_index :users, :email, unique: true, where: "deleted_at IS NULL"
  end
end

# DO NOT — edit the already-committed 20260601120000_add_email_index_to_users.rb
```

## Test Migrations Against the Production Adapter

Migration tests MUST run against the same database adapter as production. SQLite is NOT acceptable validation when production runs PostgreSQL — the two accept different DDL (`BIGSERIAL` vs `INTEGER PRIMARY KEY AUTOINCREMENT`, different index/constraint syntax), so a migration that passes against SQLite can syntax-error on the first production deploy.

```yaml
# config/database.yml — test adapter matches production
test:
  adapter: postgresql # NOT sqlite3 when production is postgresql
  database: myapp_test
  host: <%= ENV.fetch("TEST_DB_HOST", "localhost") %>
```

## Production Schema Sync Is a Deploy Gate

Before publishing a new bundle, verify zero pending migrations — code that assumes a column the database does not yet have throws on first request while the deploy command still returns 0.

```bash
# Deploy gate — STOP the deploy if any migration is pending
rails db:migrate:status | grep -q "^\s*down" && {
  echo "pending migrations — deploy BLOCKED"; exit 1; }

# Apply, then re-verify
rails db:migrate
rails db:migrate:status   # every row reads "up"
```

`rails db:migrate:status` lists each migration as `up` (applied) or `down` (pending) against the `schema_migrations` table — the only ground truth for what has run.

## MUST NOT

- **No "I'll write the migration later" data fixes** — change runtime data and write the migration in the SAME commit. "Later" means a different session and a high chance "later" never arrives.
- **No raw SQL in models/services as a workaround for a missing schema column** — add a migration instead. `find_by_sql` hacks calcify into "the way it works" and the column never gets added.
- **No `drop_table` / `remove_column` without a preserved-data plan** — back the data up to a parking table within the same migration, or mark the migration irreversible-with-acknowledgement. Dropped data is unrecoverable.
- **No bypassing migrations via `psql` / `mysql` shells against production** — all DDL goes through `rails db:migrate`. Manual DDL leaves `schema_migrations` out of sync, so the next automated run re-applies or skips changes incorrectly.
