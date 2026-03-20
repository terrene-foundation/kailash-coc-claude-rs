# No Stubs, TODOs, or Simulated Data

## Scope

These rules apply to ALL production code (non-test modules) in Python and Ruby.

## MUST NOT Rules

### 1. No Stubs or Placeholders

Production code MUST NOT contain:

- `raise NotImplementedError` without implementation plan
- `raise NotImplementedError("TODO")` or similar placeholder exceptions
- `pass` as the sole body of a function that should have logic
- `TODO`, `FIXME`, `HACK`, `STUB`, `XXX` comment markers
- Empty method bodies where real logic is expected

**Detection Patterns (Python):**

```python
# BLOCKED in production code:
raise NotImplementedError
raise NotImplementedError("implement later")
raise NotImplementedError("will do this next sprint")

def get_user(user_id):
    pass  # placeholder!

# TODO: implement this
# FIXME: broken
# HACK: workaround
# STUB: placeholder
```

**Detection Patterns (Ruby):**

```ruby
# BLOCKED in production code:
raise NotImplementedError
raise NotImplementedError, "implement later"
raise "Not yet implemented"

def get_user(user_id)
  # empty method body!
end

# TODO: implement this
# FIXME: broken
# HACK: workaround
# STUB: placeholder
```

### 2. No Simulated or Fake Data

Production code MUST NOT contain:

- Hardcoded mock responses pretending to be real API calls
- `"simulated"`, `"fake"`, `"dummy"` in variable or function names
- Returning hardcoded `{"status": "ok"}` as a placeholder
- Test fixtures used in production paths

**Detection Patterns (Python):**

```python
# BLOCKED:
def get_user(_id):
    return {"name": "fake_user", "email": "fake@example.com"}  # placeholder!
```

**Detection Patterns (Ruby):**

```ruby
# BLOCKED:
def get_user(_id)
  { "name" => "fake_user", "email" => "fake@example.com" }  # placeholder!
end
```

### 3. No Silent Error Swallowing

Production code MUST NOT silently discard errors:

**Detection Patterns (Python):**

```python
# BLOCKED:
try:
    send_notification(user_id)
except Exception:
    pass  # Silently discards error

result = some_operation() or default_value  # Hides error context

try:
    db.execute(query)
except Exception:
    pass  # Lost database error
```

**Detection Patterns (Ruby):**

```ruby
# BLOCKED:
begin
  send_notification(user_id)
rescue => e
  # empty rescue -- silently discards error
end

result = some_operation rescue nil  # Hides error context
```

**Acceptable**: Discarding results in cleanup/shutdown code where failure is expected, with a comment explaining why.

```python
# ACCEPTABLE: with explicit justification comment
try:
    cleanup_temp_file(path)
except OSError:
    pass  # Best-effort cleanup, failure is non-critical
```

```ruby
# ACCEPTABLE: with explicit justification comment
begin
  cleanup_temp_file(path)
rescue Errno::ENOENT
  # Best-effort cleanup, failure is non-critical
end
```

### 4. No Deferred Implementation

When implementing a feature:

- Implement ALL methods fully, not just the happy path
- If an endpoint exists, it must return real data
- If a service is referenced, it must be functional
- Never leave "will implement later" comments
- All conditional branches must have real logic

### 5. No Environment-Gated Stub Escapes

MUST NOT use environment variables or feature flags to conditionally enable stub implementations in production:

```python
# BLOCKED:
if os.environ.get("SKIP_PAYMENTS"):
    def process_payment(amount):
        return {"status": "simulated"}  # Hidden stub in production!
```

```ruby
# BLOCKED:
if ENV["SKIP_PAYMENTS"]
  def process_payment(amount)
    { "status" => "simulated" }  # Hidden stub in production!
  end
end
```

## Enforcement

- **PostToolUse hook**: `validate-workflow.js` **BLOCKS** (exit code 2) stub patterns in production code. This is NOT a warning -- it stops the operation.
- **Linting**: Configure `flake8` (Python) or `rubocop` (Ruby) to flag TODO/FIXME markers
- **CI**: Linters configured to deny stub patterns
- **Red-team agents**: Scan for violations during validation rounds. If a stub is found, the red team MUST fix it -- not report it.

**Recommended linter configuration:**

**Python (flake8 / ruff):**

```ini
# setup.cfg or pyproject.toml
[flake8]
# T201 = print(), T203 = pprint -- consider enabling
# W503 and W504 line break warnings
extend-ignore = W503
```

**Ruby (rubocop):**

```yaml
# .rubocop.yml
Style/FrozenStringLiteralComment:
  Enabled: true
Lint/UnreachableCode:
  Enabled: true
```

## Why This Matters

Stubs and TODOs accumulate silently. Each one is a hidden failure point:

- Users encounter `NotImplementedError` / `raise NotImplementedError` in production
- Silent error drops mask real bugs
- Simulated data gives false confidence in demos
- TODOs never get done without active tracking
- Unhandled exceptions crash the application or corrupt state

## Exceptions

Test files (`tests/`, `test_*.py`, `*_test.py`, `*_spec.rb`, `spec/`) are excluded from stub detection.

**There are NO exceptions for production code.** Previous versions of this rule allowed stubs with "explicit user approval." That exception is REVOKED. If you cannot implement something, ask the user what the behavior should be, then implement it. If the user says "remove it entirely," delete the function -- do NOT leave a stub.

See also: `rules/zero-tolerance.md` (Absolute Rule 2)
