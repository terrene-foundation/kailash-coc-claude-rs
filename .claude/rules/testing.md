---
priority: 10
scope: path-scoped
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

# Testing Rules

See `.claude/guides/rule-extracts/testing.md` for full evidence, the kailash-ml W33b post-mortem, the test-skip triage decision tree, the test-resource-cleanup post-mortems (PR #466 63-warning sweep, 11,917-test block, env-var race), and protocol blocks.

<!-- slot:neutral-body -->


This variant serves the rs USE templates — for **Python and Ruby developers writing applications that consume kailash-rs through bindings**. You write Python (or Ruby), not Rust. The bindings give you a Pythonic API that maps to the Rust runtime under the hood, but your code, tests, and tools are all Python.

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

### MUST: `__all__` / Re-export Symbol Counts Use Structural Enumeration, Not Grep

Counts of `__all__` entries (Python binding) or `pub use` re-exports (Rust crate) used in spec authority, docstrings, audit findings, or CHANGELOG claims MUST be produced by structural enumeration of the language's parser AST — NOT `grep -c '"'` / `wc -l` on the assignment block. Grep counts comments, blank lines, and line continuations as elements; structural parsers count list items.

```python
# DO — Python binding: AST-derived count
import ast, pathlib
tree = ast.parse(pathlib.Path("bindings/kailash-python/python/kailash/__init__.py").read_text())
for n in ast.walk(tree):
    if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "__all__" for t in n.targets):
        if isinstance(n.value, ast.List):
            print(len(n.value.elts))  # canonical count
```

```rust
// DO — Rust crate: structural enumeration via syn::parse_file
let src = std::fs::read_to_string("crates/kailash/src/lib.rs")?;
let file = syn::parse_file(&src)?;
let pub_use_count = file.items.iter().filter(|i| matches!(i, syn::Item::Use(u)
    if matches!(u.vis, syn::Visibility::Public(_)))).count();
println!("{}", pub_use_count);

// Alternative: cargo doc --document-private-items JSON output
// $ cargo doc --no-deps --document-private-items --output-format=json 2>/dev/null
// Then parse target/doc/*.json for re-export entries.
```

```bash
# DO NOT — grep-based count (counts comments + blank lines + continuations)
grep -c '^\s*"' bindings/kailash-python/python/kailash/__init__.py
grep -c '^pub use' crates/kailash/src/lib.rs   # misses items inside pub mod blocks
```

**BLOCKED rationalizations:** "Grep is faster" / "I'll subtract the comment lines manually" / "The count is approximate anyway" / "AST is overkill for a docstring number".

**Why:** Grep cannot distinguish `# Group N — comment` from `"Group_N",` when both contain quotes; for Rust, grep cannot follow `pub use module::*` glob expansions or items nested inside `pub mod { ... }` blocks. Structural parsing is canonical because it parses the language, not text. See guide for Wave 6 evidence (Python: three incompatible counts — docstring 41, grep 48, AST 49) and the cross-SDK applicability via `syn::parse_file` for Rust binding consumers who audit the underlying crate.

Origin: kailash-py W6 /redteam Round 3 (2026-04-27) — `kailash_ml/__init__.py:627` docstring claimed 41, grep reported 48, AST said 49. Cross-language port: Rust uses `syn::parse_file` or `cargo doc --document-private-items`; the structural-enumeration principle is language-neutral.

### MUST: Rust `pub use` Result-Type Coverage Pinned By Literal-Identifier Wiring Tests

When a Rust crate `pub use`-exports a result type (struct / enum / trait), the per-symbol coverage sweep (`tools/sweep-redteam.py --json`) reports a HIGH coverage gap unless at least one test file binds the type to a `let var: <Type> = ...` declaration. Inline `#[cfg(test)]` tests in the same module that exercise the API surface but never name the type literally are NOT sufficient — the sweep tool greps for `<Type>` as an identifier; `let result = build()` binds nothing the tool can see, so the type's contract is uncovered from the tool's view AND from any future refactor's view.

Coverage MUST be pinned in a dedicated `tests/test_<module>_wiring.rs` file that:

1. Imports the type by name from the crate's public surface (e.g. `use kailash_ml::engine::{DriftReport, FeatureDriftResult};`).
2. Constructs a value via the canonical public-API entry (e.g. `DriftMonitor::from_reference().check()` returns `DriftReport`).
3. Binds the value to `let var: <Type> = ...` so the type appears as a literal identifier on the LHS.
4. Asserts every public field individually (`assert_eq!(var.field_a, ...)`, `assert!(var.field_b.is_finite())`).
5. For trait wiring, casts a concrete impl to `&dyn TraitName` so the trait surface compiles only if every used method exists (`let backend: &dyn FeatureStoreBackend = &store;`).

```rust
// DO — wiring test binds the type literally; sweep tool sees it
use kailash_ml::engine::{DriftMonitor, DriftConfig, DriftReport, FeatureDriftResult};

#[test]
fn drift_report_full_field_assertions() {
    let mut monitor = DriftMonitor::from_reference(&data, &names, DriftConfig::default()).unwrap();
    let report: DriftReport = monitor.check(&current).unwrap();   // ← literal type binding
    assert!(!report.features.is_empty());
    assert!(report.overall_drifted);
    let f0: &FeatureDriftResult = &report.features["f0"];          // ← literal type binding
    assert_eq!(f0.feature_name, "f0");
}

// DO NOT — inline test exercises the API but never names the type literally
#[cfg(test)]
mod tests {
    #[test]
    fn check_works() {
        let result = DriftMonitor::from_reference(&d, &n, DriftConfig::default())
            .unwrap()
            .check(&c)
            .unwrap();              // ← `result` shadows the type; sweep tool sees nothing
        assert!(result.overall_drifted);
    }
}
```

**BLOCKED rationalizations:**

- "The inline `#[cfg(test)]` tests already exercise the API; adding a wiring test is duplication"
- "Field-by-field assertions are brittle; one assertion that the API works is enough"
- "The type is `pub use`-exported, that proves it's reachable"
- "If a refactor breaks the type, integration tests will catch it"
- "The sweep tool is the wrong tool; we shouldn't author tests for its quirks"
- "I'll add a wiring test if and when the sweep flags the type"

**Why:** A `pub use`-exported type with no literal-identifier binding in any test corpus is structurally indistinguishable from a removed type — the sweep tool reports a HIGH coverage gap because there's no syntactic anchor. The 2026-05-06 sweep flagged 22 HIGH gaps in kailash-ml and bindings precisely because inline tests never bound the result types literally. Wiring tests close two gaps simultaneously: they make the type discoverable to the per-symbol scan, AND they pin every public field's shape so a downstream refactor that drops a field fails one specific assertion (rather than silently passing because no test reads the field). The trait-cast pattern (`&dyn TraitName`) extends the same defense to trait surfaces: removing a trait method breaks the test at compile time.

#### Same-Shard Accessor For Orphaned `pub use` Types

When a wiring test cannot construct or observe a `pub use`-exported type because the type has NO public constructor AND NO public accessor on any owning facade, the disposition per `rules/autonomous-execution.md` Rule 4 is to add the missing accessor IN THE SAME SHARD as the wiring test — typically a one-line `pub fn <field>(&self) -> &<Type> { &self.<field> }` mirroring the existing accessor pattern (e.g. `history()`, `config()`, `feature_names()` on the same struct). Removing the type from `pub use` is also acceptable; leaving it `pub use`-exported but unreachable is BLOCKED.

```rust
// DO — same-shard accessor closes the unreachability gap
impl DriftMonitor {
    pub fn history(&self) -> &[DriftReport] { &self.history }       // existing
    pub fn config(&self) -> &DriftConfig { &self.config }            // existing
    pub fn reference_snapshot(&self) -> &DriftSnapshot {             // ← new in same shard
        &self.reference
    }
}

// DO NOT — pub use exposed; no constructor; no accessor; type is structurally orphaned
pub use drift::{DriftSnapshot, ...};
pub struct DriftMonitor {
    reference: DriftSnapshot,    // private field; no accessor; users cannot observe
}
```

**Why:** A `pub use`-exported type with no public construction or observation path is the orphan failure mode at the type-export level: downstream consumers see the type in the API surface, build mental models against it, and find no way to reach it at runtime. The same-shard accessor sweep is bounded by `rules/autonomous-execution.md` Rule 4's shard budget (≤500 LOC load-bearing logic, ≤5–10 invariants) — typically a 5-line accessor fits trivially. Origin: 2026-05-06 RT-2 (PR #817) — `DriftSnapshot` was `pub use`-exported but had no public accessor on `DriftMonitor`; same-shard fix added `reference_snapshot()` mirroring the existing `history()` accessor pattern.

Origin: 2026-05-06 RT-1 / RT-2 / RT-3 cycle (PRs #816, #817, #818) — three consecutive `/implement` shards established the wiring-test reference shape after `tools/sweep-redteam.py` flagged 22 HIGH coverage gaps in kailash-ml whose underlying types DID have inline-test exercise but no literal-identifier binding. RT-2 surfaced the orphan-accessor variant. The pattern generalizes to any Rust crate with `pub use` re-exports — kailash-dl-diagnostics, kailash-nexus, kailash-dataflow — and to language-axis siblings via the same literal-identifier scan extended for `js_name = "X"` / `name = "X"` aliases (NAPI / PyO3) noted in `workspaces/binding-parity/journal/0070-GAP-redteam-2026-05-06-coverage-findings.md` §3.

## Trust Posture Wiring (this rule)

- **Severity**: `halt-and-report` (lexical regex against `let result = ` followed by no typed binding cannot ship `block` per `hook-output-discipline.md` MUST-2; structural AST walk is required to upgrade to `block`).
- **Grace period**: 7 days from 2026-05-06 → 2026-05-13.
- **Cumulative threshold**: 3× same-rule violations in 30 days → posture drop per `trust-posture.md` §4.
- **Regression-within-grace**: emergency L5→L4 downgrade per `trust-posture.md` §4.
- **Receipt requirement**: none (rule fires only on tests/\* paths; no SessionStart ack required).
- **Detection mechanism**: `tools/sweep-redteam.py --json` HIGH gap on `pub use`-exported type with zero literal-identifier hits; OR `find crates/*/tests/ -name 'test_*_wiring.rs' | xargs grep -L "let .*: <Type>"` returning the file as missing the binding.
- **First violation**: none recorded yet (rule lands fresh in this codify cycle).
- **Origin**: 2026-05-06 RT-1/2/3 cycle (PRs #816, #817, #818).

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

## Env-Var Test Isolation

Process-level environment variables are shared across every test running in the same process. When two tests both mutate the same env var (`monkeypatch.setenv`, `os.environ[...] = ...`), the test runner's scheduling order becomes a silent input to each test's observable result. In isolation and in serial, both tests pass; parallel scheduling on CI (pytest-xdist) produces flaky failures that look like real regressions.

### MUST: Serialize Env-Var-Mutating Tests Via Test-Module Lock

Any two tests that both mutate the SAME env var MUST serialize through a shared lock at test-module scope. The lock MUST be held for the entire read-then-mutate window, not just the mutate call.

```python
# DO — pytest-xdist-safe: function-scoped monkeypatch + module-scoped lock
import threading
import pytest

_ENV_LOCK = threading.Lock()

@pytest.fixture(autouse=False)
def _env_serialized():
    with _ENV_LOCK:
        yield

def test_reads_max_connections_from_env(monkeypatch, _env_serialized):
    monkeypatch.setenv("KAILASH_MAX_CONNECTIONS", "7")
    client = kailash.ServiceClient()
    assert client.max_connections == 7

def test_defaults_to_99_when_env_unset(monkeypatch, _env_serialized):
    monkeypatch.delenv("KAILASH_MAX_CONNECTIONS", raising=False)
    client = kailash.ServiceClient()
    assert client.max_connections == 99

# DO NOT — no serialization, parallel xdist worker re-orders the mutations
def test_reads_max_connections_from_env(monkeypatch):
    monkeypatch.setenv("KAILASH_MAX_CONNECTIONS", "7")
    # if the sibling test runs between setenv and client init, this sees 99
    client = kailash.ServiceClient()
    assert client.max_connections == 7  # FLAKY on CI, green locally
```

**Alternatives that also satisfy this rule:**

- `pytest-forked` (run each test in a fresh subprocess — hard isolation, highest cost)
- `monkeypatch` with `scope="function"` (default) AND the module-scoped lock above (cheap, sufficient for most cases)
- `pytest.MonkeyPatch.context()` inside the test body combined with the lock

**BLOCKED rationalizations:**

- "The tests pass in isolation, CI scheduling is the bug"
- "Adding a lock is overkill for two tests"
- "pytest defaults to one-test-per-worker anyway"
- "We can mark the tests `@pytest.mark.serial` instead" (only if the marker is actually honored by the runner — xdist does not enforce it without `--dist=loadgroup` + group assignment)
- "monkeypatch auto-restores, so serialization is redundant"

**Why:** Env vars are the textbook example of shared process state. `monkeypatch.setenv` restores at fixture teardown — which is AFTER the test body runs — so the sibling test can observe either the mutated value or the original depending on xdist worker scheduling. The flakiness surfaces intermittently on CI where test scheduling depends on runner load, producing a class of "passes locally, fails on CI" bugs that waste a full CI cycle per iteration. For binding consumer projects, env-var-driven config feeds through to the underlying Rust runtime via PyO3/Magnus — a flaky env race in the Python test suite produces non-deterministic binding behavior that looks like an FFI bug.

Origin: Cross-SDK from kailash-rs PR #435 (2026-04-20) — `DATAFLOW_MAX_CONNECTIONS` env-var race produced a flaky CI failure (expected=7, actual=99). Python variant uses `monkeypatch` + `threading.Lock`; Rust variant uses `tokio::sync::Mutex` (see kailash-rs BUILD-repo testing.md).

### Shared-Resource Test Isolation (Rust SDK)

The env-var race above is one instance of a broader failure pattern: two tests mutating the same process-level shared resource race on parallel scheduling. The rule generalizes to any shared external state that Rust integration tests touch — a Docker Postgres container, a Redis instance, a shared cache, a file-system lockfile. Same contract: serialize across the read-then-mutate window via a test-module-scope Mutex.

### MUST: Use `tokio::sync::Mutex` For Async Guards That Cross `.await`

Any two integration tests that mutate the SAME shared external resource (real-PG container, real-Redis, shared cache, lockfile) MUST serialize through a `tokio::sync::Mutex` at test-module scope. The `std::sync::Mutex` form is BLOCKED when the guard crosses an `.await` point — it trips `clippy::await_holding_lock` AND risks deadlock if the tokio runtime moves the task to a different thread mid-await.

```rust
// DO — tokio::sync::Mutex, guard survives .await safely
use tokio::sync::Mutex;
use once_cell::sync::Lazy;

static PG_INTEGRATION_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[tokio::test]
async fn test_real_pg_round_trip() {
    let _guard = PG_INTEGRATION_LOCK.lock().await;
    let pool = connect_real_pg().await;       // .await under tokio::sync guard — OK
    let rows = pool.fetch_all("...").await;
    assert_eq!(rows.len(), 3);
}

#[tokio::test]
async fn test_real_pg_migration_applies_idempotently() {
    let _guard = PG_INTEGRATION_LOCK.lock().await;
    let pool = connect_real_pg().await;
    migrate(&pool).await.unwrap();
    migrate(&pool).await.unwrap();             // second apply MUST be a no-op
}

// DO NOT — std::sync::Mutex across .await
static PG_INTEGRATION_LOCK: Lazy<std::sync::Mutex<()>> =
    Lazy::new(|| std::sync::Mutex::new(()));

#[tokio::test]
async fn test_real_pg_round_trip() {
    let _guard = PG_INTEGRATION_LOCK.lock().unwrap();   // BLOCKED
    let pool = connect_real_pg().await;                  // held across .await
    // clippy::await_holding_lock + deadlock risk if the task re-schedules
}
```

**BLOCKED rationalizations:**

- "The tests pass in isolation, CI scheduling is the bug"
- "Docker is slow enough that the tests don't actually overlap"
- "`cargo nextest` already isolates per-test processes" (only when configured with `test-threads = 1` OR per-test process isolation; not the default)
- "std::sync::Mutex is faster and the guard is brief"
- "`#[serial]` from the `serial_test` crate is simpler"
- "We'll migrate to tokio::sync::Mutex later"

**Why:** `cargo nextest` and `cargo test` default to thread-level parallelism. Two `#[tokio::test]` functions that both `connect_real_pg().await` against the SAME Docker container race on startup: the first test's `migrate()` may see the second test's schema state, the first test's `fetch_all` may see the second test's inserted rows. The flakiness is intermittent and scales with runner load — exactly the "passes locally, fails on CI under Mac-runner load" failure mode that wastes a full CI cycle per iteration. `tokio::sync::Mutex` is the only async-safe primitive; `std::sync::Mutex` deadlocks when the tokio runtime re-schedules the task mid-await; `#[serial]` works but has worse error messages on lock poisoning and doesn't compose with nested serialization domains (e.g. PG-lock + Redis-lock in the same test). The test-module-scope Lazy guarantees one Mutex instance per resource per test-module — adding a second shared resource adds a second lock, not a second test-module.

Origin: kailash-rs commit b4ed4cb5 (2026-04-22) — serialize real-PG integration tests via `tokio::sync::Mutex`, fixing a 75% flake rate on Mac runners caused by Docker Postgres container startup race (per `specs/ci-infrastructure.md §5.4`). Generalizes the Env-Var pattern above from "shared env var" to any "shared external state" — the Mutex is the same structural defense either way.

## MUST: Pytest Plugin + Marker Declaration Pair

Any test file that uses `@pytest.mark.<X>` or the `<X>` fixture from a pytest plugin MUST declare the plugin in the owning sub-package's `[dev]` extras AND register the marker in that sub-package's pytest `markers` config in the SAME commit. Using a plugin without declaring it OR using a marker without registering it is BLOCKED — collection fails with `"'<X>' not found in markers configuration option"` or `ModuleNotFoundError` and no test in that sub-package can run.

```toml
# DO — plugin declared in [dev] extras AND marker registered in same pyproject
[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-benchmark>=4.0.0",  # declared
]

[tool.pytest.ini_options]
markers = [
    "benchmark: Performance benchmark tests (pytest-benchmark)",  # registered
]
```

```python
# DO — test uses the plugin AFTER declaration + registration landed
@pytest.mark.benchmark
def test_binding_read_performance(benchmark, client):
    benchmark(lambda: client.get("/health"))

# DO NOT — test uses plugin with neither declaration nor marker registration
@pytest.mark.benchmark   # marker unregistered → collection fails
def test_binding_read_performance(benchmark):   # benchmark fixture unavailable → ModuleNotFoundError
    ...
```

**BLOCKED rationalizations:**

- "The plugin is in CI so local works fine"
- "pytest accepts unknown markers by default"
- "We'll register the marker in a follow-up commit"
- "The fixture is imported lazily so it doesn't matter"
- "It works in the sub-package venv, root venv is a separate concern"

**Why:** Pytest plugins form a hidden middle layer: declared in sub-package `[dev]` extras, registered in pytest `markers` config, invoked via decorator or fixture. Any one layer missing breaks collection with an unhelpful error and blocks the entire sub-package's test suite. For binding consumer projects that split tests across the root project and bindings/ sub-packages, missing plugin declarations silently break the whole sub-package.

Origin: Cross-SDK from kailash-py 2026-04-20 /redteam collection-gate sweep — a test file in a sub-package used `@pytest.mark.benchmark` + `benchmark` fixture without declaring `pytest-benchmark`; blocked 11,917 tests from collection. Same failure shape in binding consumer projects.

## Test-Skip Triage Decision Tree

Every test that is skipped, xfailed, or deleted MUST be classified into exactly one of the three tiers below. Silent skips, unbounded `@pytest.mark.skip`, or empty test bodies pretending to be tests are BLOCKED.

| Tier           | When                                                           | Action                                                                                                             |
| -------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **ACCEPTABLE** | Missing dep / infra unavailable / platform constraint          | Keep skip; reason MUST name the constraint (`@pytest.mark.skipif(not REDIS_AVAILABLE, reason="redis required")`)   |
| **BORDERLINE** | Real library limitation; documenting a known-failing edge case | Convert to `@pytest.mark.xfail(strict=False, reason="...")` — preserves test body, flips green when fixed upstream |
| **BLOCKED**    | "TODO", "needs refactoring", "flaky", "times out", empty body  | DELETE the test (and any abandoned fixtures it owned); if the underlying bug matters, file an issue                |

```python
# DO — ACCEPTABLE: infra-conditional skip
@pytest.mark.skipif(
    os.environ.get("POSTGRES_TEST_URL") is None,
    reason="requires POSTGRES_TEST_URL env var",
)
def test_real_postgres_round_trip(): ...

# DO — BORDERLINE: convert to xfail with full reason
@pytest.mark.xfail(
    strict=False,
    reason="kailash-rs bindings do not yet surface this edge case via PyO3",
)
def test_binding_edge_case(): ...

# DO NOT — BLOCKED: TODO-style silent skip
@pytest.mark.skip(reason="TODO")
def test_something(): ...

# DO NOT — BLOCKED: empty body pretending to be a test
def test_binding_works():
    pass  # implementation pending
```

**BLOCKED rationalizations:**

- "It's only one skipped test"
- "I'll fix the test when I have time"
- "The test was passing before but now flakes — let me skip it for now"
- "TODO comments in the skip reason are documentation"

**Why:** Silent skips and empty test bodies inflate the green-test count without exercising any code. The next session reads "5950 tests pass" and concludes the suite is healthy when the actually-tested surface has shrunk. For binding consumer projects, the failure mode is amplified — a skipped binding test hides a broken FFI path that only surfaces when the binding is called in production. Deletion is the only honest disposition for a test that does not run; xfail is the only honest disposition for a test that documents a real limitation.

Origin: Cross-SDK from kailash-py gh #512 / PR #518 (2026-04-19) — applied this triage to convert 1 test to xfail, delete 2 TODO-style tests, and delete 6 abandoned test files. Binding consumer projects face the same triage.

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

**Why:** Binding-layer paired variants cross the FFI boundary independently — a refactor that changes the typed variant's PyO3 conversion while leaving the raw variant alone ships a silent FFI regression. Tests that only exercise one variant cannot catch this because the failure mode is _across_ the binding boundary, not in the shared Rust core.

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

<!-- /slot:neutral-body -->
