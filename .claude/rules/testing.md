---
paths:
  - "tests/**"
  - "**/*test*"
  - "**/*spec*"
  - "conftest.py"
  - "**/.spec-coverage*"
  - "**/.test-results*"
  - "**/02-plans/**"
  - "**/04-validate/**"
---

# Testing Rules (Python bindings to kailash-rs)

This variant serves the kailash-coc-claude-rs USE template — for **Python and Ruby developers writing applications that consume kailash-rs through bindings**. You write Python (or Ruby), not Rust. The bindings give you a Pythonic API that maps to the Rust runtime under the hood, but your code, tests, and tools are all Python.

## Test-Once Protocol (Implementation Mode)

During `/implement`, tests run ONCE per code change, not once per phase.

**Why:** Running the full test suite in every phase wastes 2-5 minutes per cycle, compounding to significant delays across a multi-phase session.

1. `/implement` runs full suite ONCE per todo, writes `.test-results` to workspace
2. Pre-commit runs Tier 1 unit tests as fast safety net
3. CI runs the full matrix as final gate

**Re-run during /implement only when:** commit hash mismatch, infrastructure change, or specific test suspected wrong.

## Audit Mode Rules (Red Team / /redteam)

When auditing test coverage, the rules invert: do NOT trust prior round outputs. Re-derive everything.

### MUST: Re-derive coverage from scratch each audit round

```bash
# DO: re-derive
pytest --collect-only -q tests/

# DO NOT: trust the file
cat .test-results  # BLOCKED in audit mode
```

**Why:** A previous round may have written `.test-results` claiming "5950 tests pass" — true, but those tests covered the OLD code, while new spec modules have zero tests. Without re-derivation, the audit certifies test counts that don't correspond to the new functionality.

### MUST: Verify NEW modules have NEW tests

For every new Python module a spec creates, grep the test directory for an import of that module. Zero importing tests = HIGH finding regardless of "tests pass".

```bash
# DO
grep -rln "from my_app.wrapper_base\|import wrapper_base" tests/
# Empty → HIGH: new module has zero test coverage
```

**Why:** Counting passing tests at the suite level lets new functionality ship with zero coverage as long as legacy tests still pass. Per-module test verification catches this.

### MUST: Verify security mitigations have tests

For every § Security Threats subsection in any spec, grep for a corresponding `test_<threat>` function. Missing = HIGH.

**Why:** Documented threats with no test become "we said we'd handle it" claims that nothing actually verifies. Threats without tests are unmitigated.

See `skills/spec-compliance/SKILL.md` for the full spec compliance verification protocol.

## Regression Testing

Every bug fix MUST include a regression test BEFORE the fix is merged.

**Why:** Without a regression test, the same bug silently re-appears in a future refactor with no signal until a user reports it again.

1. Write test that REPRODUCES the bug (must fail before fix, pass after)
2. Place in `tests/regression/test_issue_*.py` with `@pytest.mark.regression`
3. Regression tests are NEVER deleted

```python
@pytest.mark.regression
def test_issue_42_user_creation_preserves_explicit_id():
    """Regression: #42 — CreateUser silently drops explicit id."""
    assert result["id"] == "custom-id-value"
```

## 3-Tier Testing

### Tier 1 (Unit): Mocking allowed, <1s per test

### Tier 2 (Integration): Real infrastructure recommended

- Real database, real API calls (test server)
- NO mocking (`@patch`, `MagicMock`, `unittest.mock` — BLOCKED)

**Why:** Mocks at the binding boundary hide failures (connection handling, value serialization, lifetime management) that only surface with the real Python bindings exercising the underlying Rust runtime. Mocked binding objects bypass the FFI path entirely, so a passing mock-based test gives no confidence the binding actually works.

### Tier 3 (E2E): Real everything

- Real browser, real database, real bindings
- State persistence verification — every write MUST be verified with a read-back

**Why:** The binding write path crosses the Python/Rust boundary, value serialization, and the database driver. Any layer can silently succeed without persisting, so only a read-back proves the data actually landed.

```
tests/
├── regression/     # Permanent bug reproduction
├── unit/           # Tier 1: Mocking allowed
├── integration/    # Tier 2: Real infrastructure
└── e2e/           # Tier 3: Real everything
```

## Coverage Requirements

| Code Type                            | Minimum |
| ------------------------------------ | ------- |
| General                              | 80%     |
| Financial / Auth / Security-critical | 100%    |

## Kailash Binding Patterns

```python
# Use the Python binding API — never reach into the Rust crate directly
import kailash

def test_workflow_execution():
    reg = kailash.NodeRegistry()
    builder = kailash.WorkflowBuilder()
    builder.add_node("NoOpNode", "n1", {})
    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf)
    assert result["results"] is not None
```

## Delegating Primitives Need Direct Coverage

When a binding-layer class exposes paired variants that delegate to a shared core (e.g. `get` / `get_raw`, `post` / `post_raw`, `put` / `put_raw`, `delete` / `delete_raw`), each variant MUST have at least one test that calls it directly through the Python or Ruby binding — not a test that calls only one variant and reaches the other by delegation.

This is a narrow rule about delegating primitive pairs. It is NOT a universal "every binding method has a direct test" mandate.

### MUST: One Direct Test Per Variant Through The Binding

```python
# DO — one test per variant, called through the binding
import kailash

def test_service_client_get_typed_returns_dict(client):
    """Direct exercise of the typed .get() Python binding method."""
    user = client.get("/users/42")
    assert isinstance(user, dict)
    assert user["name"] == "Alice"

def test_service_client_get_raw_returns_response_dict(client):
    """Direct exercise of the raw .get_raw() Python binding method."""
    resp = client.get_raw("/users/42")
    assert isinstance(resp, dict)
    assert resp["status"] == 200
    assert "Alice" in resp["body"]

# DO NOT — exercise only the typed variant and trust delegation
def test_service_client_get_works(client):
    """Only calls client.get(); never touches client.get_raw()."""
    user = client.get("/users/42")
    assert user["name"] == "Alice"
# A refactor that changes get_raw's error mapping ships a silent regression
# because the binding test never exercises that PyO3/Magnus boundary.
```

**Why:** Binding-layer paired variants cross the FFI boundary independently — a refactor that changes the typed variant's PyO3 conversion while leaving the raw variant alone ships a silent FFI regression. Tests that only exercise one variant cannot catch this because the failure mode is *across* the binding boundary, not in the shared Rust core.

**BLOCKED rationalizations:**

- "The typed variant calls the raw variant internally"
- "Both variants share the same Rust execute() core"
- "Integration tests at the Rust layer catch this"
- "PyO3 wrapping is mechanical, it can't drift"

### MUST: Mechanical Enforcement Via Grep

`/redteam` MUST grep the binding test directory for direct call sites of each known raw variant and report any pair where one side has zero matches.

```bash
# DO — check each binding-exposed variant has a direct test in YOUR project's
# test directory. Adjust TEST_DIR for your layout (the default `tests/` works
# for most kailash-enterprise consumer projects).
TEST_DIR="${TEST_DIR:-tests}"
for variant in get_raw post_raw put_raw delete_raw; do
  count=$(grep -rln "client\.$variant(" "$TEST_DIR" | wc -l)
  if [ "$count" -eq 0 ]; then
    echo "MISSING: no test calls client.$variant() through the Python binding"
  fi
done
```

**Why:** Mechanical grep at audit time catches the regression before it reaches a downstream consumer. Manual "I think I tested both" is not auditable across PyO3/Magnus binding refactors.

Origin: BP-046 (kailash-rs ServiceClient binding test coverage, 2026-04-14, commit `d3a14a73`). The Rust `put_raw` and `delete_raw` had wiremock coverage; the Python binding equivalents at `bindings/kailash-python/tests/test_service_client.py` had no direct exercise — every test went through the typed `.put()` / `.delete()` variants. Fixed by adding direct binding-layer tests for each raw variant. The pattern applies to every binding pair that wraps a Rust delegating-primitive.

## Rules

- Test-first development for new features
- Tests MUST be deterministic (no random data without seeds, no time-dependent assertions)
  **Why:** Non-deterministic tests produce intermittent failures that erode trust in the suite, causing real binding regressions to be dismissed as flaky.
- Tests MUST NOT affect other tests (clean setup/teardown, isolated DBs)
  **Why:** Shared state between tests creates order-dependent results that pass locally but fail in CI where execution order differs.
- Naming: `test_[feature]_[scenario]_[expected_result].py`
