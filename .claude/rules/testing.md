---
paths:
  - "tests/**"
  - "**/*test*"
  - "**/*spec*"
  - "conftest.py"
---

# Testing Rules (Rust SDK + Python Bindings)

## Test-Once Protocol

Tests run ONCE per code change, not once per phase.

1. `/implement` runs full suite ONCE per todo, writes `.test-results` to workspace
2. `/redteam` READS `.test-results` — does NOT re-run existing tests
3. `/redteam` runs only NEW tests it creates (E2E, Playwright, Marionette)
4. Pre-commit runs Tier 1 unit tests as fast safety net
5. CI runs the full matrix as final gate

**Re-run only when:** commit hash mismatch, infrastructure change, or specific test suspected wrong.

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

**Why:** Mocks hide real FFI boundary failures between Python and the Rust runtime — connection handling, serde mismatches, and lifetime errors only surface with real infrastructure.

### Tier 3 (E2E): Real everything

- Real browser, real database
- State persistence verification — every write MUST be verified with a read-back

**Why:** The Rust SDK's write path crosses FFI, serde, and the database driver; any layer can silently succeed without persisting, so only a read-back proves the data actually landed.

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

## Kailash-Specific

```python
# Workflow: Use real runtime (Rust SDK API)
import kailash

def test_workflow_execution():
    reg = kailash.NodeRegistry()
    builder = build_workflow()
    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf)
    assert result["results"] is not None
```

## Rules

- Test-first development for new features
- Tests MUST be deterministic (no random data without seeds, no time-dependent assertions)
  **Why:** Non-deterministic tests produce intermittent failures that erode trust in the suite, causing real Rust runtime regressions to be dismissed as flaky.
- Tests MUST NOT affect other tests (clean setup/teardown, isolated DBs)
  **Why:** Shared state between tests creates order-dependent results — Rust's default parallel test runner amplifies this into data races that pass locally but fail in CI.
- Naming: `test_[feature]_[scenario]_[expected_result].py`
