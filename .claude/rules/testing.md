---
paths:
  - "tests/**"
  - "**/*test*"
  - "**/*spec*"
  - "conftest.py"
  - "spec/**"
  - "spec_helper.rb"
---

# Testing Rules

## Scope

These rules apply to all test files and test-related code.

## MUST Rules

### 0. Regression Testing (MANDATORY)

Every bug fix MUST include a regression test BEFORE the fix is merged or released.

**The Rule:**

1. When a bug is reported, the FIRST step is writing a test that REPRODUCES the bug
2. The test MUST fail before the fix and pass after
3. Regression test location depends on language:
   - Rust: `tests/regression_*.rs` in the affected crate
   - Python: `tests/regression/test_issue_*.py`
   - Ruby: `spec/regression/issue_*_spec.rb`
4. The test name includes the issue number (e.g., `issue_42_user_creation_drops_pk`)
5. Regression tests are NEVER deleted — they are permanent guards

**Why:**

- Without regression tests, teams forget past bugs and re-introduce them (Amnesia fault line)
- Without regression tests, the "shortest path" fix skips verification (Security Blindness fault line)
- A fix verified only by code review is not verified at all

**Python Pattern:**

```python
# tests/regression/test_issue_42.py

def test_issue_42_user_creation_preserves_explicit_id():
    """Regression: #42 — CreateUser silently drops explicit id.

    The bug: when auto_increment is enabled on the model, passing an
    explicit id value was silently ignored.
    Fixed in: commit abc1234
    """
    # Reproduce the exact bug from the issue
    # ...
    assert result["id"] == "custom-id-value"
```

**Ruby Pattern:**

```ruby
# spec/regression/issue_42_spec.rb

RSpec.describe "Issue #42: user creation preserves explicit id" do
  it "does not silently drop the explicit id" do
    # Reproduce the exact bug from the issue
    # ...
    expect(result["id"]).to eq("custom-id-value")
  end
end
```

**Enforcement:**

- Pre-merge: regression test suite must pass
- Pre-release: regression suite is a mandatory checklist item
- Code review: reviewer must verify a regression test exists for every bug fix

**Applies to**: All bug fixes
**Violation**: BLOCK merge — a fix without a regression test is not a fix

### 1. Test-First Development

Tests MUST be written before implementation for new features.

**Process**:

1. Write failing test that describes expected behavior
2. Implement minimum code to pass test
3. Refactor while keeping tests green

**Applies to**: New features, bug fixes
**Enforced by**: tdd-implementer agent
**Violation**: Code review flag

### 2. Coverage Requirements

Code changes MUST maintain or improve test coverage.

| Code Type         | Minimum Coverage |
| ----------------- | ---------------- |
| General           | 80%              |
| Financial         | 100%             |
| Authentication    | 100%             |
| Security-critical | 100%             |

**Enforced by**: CI coverage check
**Violation**: BLOCK merge

### 3. Real Infrastructure in Tiers 2-3

Integration and E2E tests MUST use real infrastructure.

**Tier 1 (Unit Tests)**:

- Mocking ALLOWED
- Test isolated functions
- Fast execution (<1s per test)

**Tier 2 (Integration Tests)**:

- NO MOCKING - use real database
- Test component interactions
- Real API calls (use test server)

**Tier 3 (E2E Tests)**:

- NO MOCKING - real everything
- Test full user journeys
- Real browser, real database

**Enforced by**: validate-workflow hook
**Violation**: Test invalid

## MUST NOT Rules (CRITICAL)

### 1. NO MOCKING in Tier 2-3

MUST NOT use mocking in integration or E2E tests.

**Detection Patterns (Python)**:

```python
❌ @patch('module.function')
❌ MagicMock()
❌ unittest.mock
❌ from mock import Mock
❌ mocker.patch()
```

**Detection Patterns (Ruby)**:

```ruby
❌ allow(obj).to receive(:method)
❌ expect(obj).to receive(:method)
❌ double("name")
❌ instance_double(Class)
❌ class_double(Class)
```

**Why This Matters**:

- Mocks hide real integration issues
- Mocks don't catch API contract changes
- Mocks give false confidence
- Bugs slip through to production

**Enforced by**: validate-workflow hook
**Consequence**: Test invalid, must rewrite

### 2. No Test Pollution

Tests MUST NOT affect other tests.

**Required**:

- Clean setup/teardown
- Isolated test databases
- No shared mutable state

### 3. No Flaky Tests

Tests MUST be deterministic.

**Prohibited**:

- Random data without seeds
- Time-dependent assertions
- Network calls to external services (Tier 1)

## Test Organization

### Directory Structure

```
tests/
├── regression/     # Tier 0: Permanent bug reproduction tests
├── unit/           # Tier 1: Mocking allowed
├── integration/    # Tier 2: NO MOCKING
└── e2e/           # Tier 3: NO MOCKING
```

### Naming Convention

**Python**:

```
test_[feature]_[scenario]_[expected_result].py
```

Example: `test_user_login_with_valid_credentials_succeeds.py`

**Ruby**:

```
[feature]_[scenario]_spec.rb
```

Example: `user_login_with_valid_credentials_spec.rb`

## Kailash-Specific Testing

### DataFlow Testing

```python
# Tier 2: Use real database
@pytest.fixture
def db():
    db = DataFlow("sqlite:///:memory:")  # Real SQLite
    yield db
    db.close()

def test_user_creation(db):
    # NO MOCKING - real database operations
    result = db.execute(CreateUser(name="test"))
    assert result.id is not None
```

### Workflow Testing

**Python**:

```python
# Tier 2: Use real runtime
import kailash

def test_workflow_execution():
    reg = kailash.NodeRegistry()
    builder = build_workflow()  # returns a WorkflowBuilder
    wf = builder.build(reg)
    rt = kailash.Runtime(reg)
    result = rt.execute(wf)
    assert result["results"] is not None
```

**Ruby**:

```ruby
# Tier 2: Use real runtime
require "kailash"

RSpec.describe "Workflow execution" do
  let(:registry) { Kailash::Registry.new }
  after { registry.close unless registry.closed? }

  it "executes successfully" do
    builder = Kailash::WorkflowBuilder.new
    builder.add_node("NoOpNode", "n", {})
    wf = builder.build(registry)
    Kailash::Runtime.open(registry) do |rt|
      result = rt.execute(wf, {})
      expect(result.results).to have_key("n")
    end
    wf.close
  end
end
```

## Exceptions

Testing exceptions require:

1. Written justification explaining why real infrastructure impossible
2. Approval from testing-specialist
3. Documentation in test file
4. Plan for removing exception
