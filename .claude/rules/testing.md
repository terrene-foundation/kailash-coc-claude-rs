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

## Test-Once Protocol (Implementation Mode)

During `/implement`, tests run ONCE per code change, not once per phase. Full suite per todo, pre-commit Tier 1 safety net, CI full matrix as final gate. Re-run only on commit-hash mismatch, infra change, or specific test suspected wrong.

**Why:** Running full suite every phase wastes 2-5 minutes per cycle.

## Probe-Driven Verification (MUST)

Semantic verification of assistant output (recommendations, refusals, compliance, response quality) MUST be probe-driven per `rules/probe-driven-verification.md`. Regex/keyword/substring matching against semantic claims is BLOCKED. Structural assertions (file existence, exit code, fixture-marker presence) keep regex per `probe-driven-verification.md` Rule 3.

See `skills/12-testing-strategies/probe-driven-verification.md` for the operational runbook.

## Audit Mode (/redteam)

In audit mode, MUST (1) re-derive coverage from scratch via `pytest --collect-only -q tests/` (NOT `cat .test-results` — BLOCKED); (2) for every NEW module, grep test directory for import — empty = HIGH; (3) for every spec § Security Threats subsection, grep `test_<threat>` — missing = HIGH.

**Why:** Prior `.test-results` may claim "5950 tests pass" true for OLD code while new modules ship with zero coverage. Documented threats without tests are unmitigated claims. See `skills/spec-compliance/SKILL.md` for full protocol.

## Regression Testing

Every bug fix MUST include a regression test BEFORE merge. Place in `tests/regression/test_issue_*.py` with `@pytest.mark.regression`. NEVER deleted.

**Why:** Without it, same bug re-appears in future refactor, undetected until a user reports.

### MUST: Behavioral Regression Tests Over Source-Grep

Call the function; assert raise/return. Grepping source for literal substrings is BLOCKED as sole assertion.

```python
# DO — behavioral
@pytest.mark.regression
def test_null_byte_rejected():
    with pytest.raises(ValueError, match="null byte"):
        decode_userinfo_or_raise(urlparse("mysql://u:%00x@h/d"))

# DO NOT — source-grep pins implementation
assert "\\x00" in open("src/…/connection.py").read()  # breaks on refactor
```

**Why:** Source-grep breaks when logic moves to a shared helper (the right refactor). Behavioral tests survive refactors and module moves.

### MUST: Verified Numerical Claims In Session Notes

Numerical claims (test counts, file counts, coverage) in session notes MUST be produced by a verifying command at the moment of writing. Hand-typed is BLOCKED.

```bash
# DO     pytest tests/regression/ --collect-only -q 2>&1 | grep -c '::'
# DO NOT hand-recalled round numbers
```

**Why:** "Claim a number, never verify" produces multi-test discrepancies; 2-second command converts memory bug into script.

### MUST: Deferred-Implementation Conformance Vectors Use xfail-Strict, Not Skip

When a conformance vector (canonical fixture, cross-impl spec test, integration receipt) pins a contract the implementation does NOT yet enforce, the test MUST carry a STRICT-xfail marker (`@pytest.mark.xfail(strict=True, reason=...)`) — NOT skip, NOT delete, NOT comment-out. Strict-xfail surfaces an XPASS failure the moment the implementation catches up, forcing the author to remove the marker same-shard.

```python
# DO — strict-xfail; auto-fails (XPASS) when the impl catches up
@pytest.mark.xfail(strict=True, reason="single-shot consumption not yet enforced")
def test_phase_monotonicity(): ...
# DO NOT — skip silently stays skipped after closure; deletion loses the contract pin
@pytest.mark.skip(reason="impl not ready")
```

**Why:** Skip stays green-and-silent after the impl lands, so the deferred contract is never re-verified; deletion loses the pin entirely. Strict-xfail converts honest deferral from a silent ratchet into a self-clearing tripwire. The cross-runtime mapping (Rust `#[ignore]` + a CI job asserting ignored tests STILL fail) is in the companion § xfail-strict.

### MUST: `__all__` / Re-export Symbol Counts Use Structural Enumeration, Not Grep

Counts of `__all__` entries (Python) or re-exports (Rust `pub use ...`) used in spec authority, docstrings, audit findings, or CHANGELOG claims MUST be produced by structural enumeration of the language's parser AST — NOT `grep -c` / `wc -l`. See guide for canonical Python (`ast.parse()`) and Rust (`syn::parse_file` / `cargo doc --document-private-items`) snippets.

```python
# DO — Python: walk ast.Assign for __all__, len(value.elts)
# DO NOT — grep '^\s*"' (counts comments + blank lines + line continuations as entries)
```

**BLOCKED:** see companion § `__all__` Structural-Enumeration.

**Why:** Grep cannot distinguish `# Group N — comment` from `"Group_N",` when both contain quotes; structural parsing parses the language, not text. See companion § `__all__` Structural-Enumeration for Wave 6 evidence (three incompatible counts: docstring 41, grep 48, AST 49).

## Test Resource Cleanup

Warnings during `pytest` are real bugs that will surface as production incidents. See guide § "PR #466 — 63-Warning Sweep" for full evidence per category below.

### MUST: Fixtures Yield + Cleanup, Never Return

```python
# DO    yield channel; channel.close()
# DO NOT return without cleanup → resource leaks until GC
```

**BLOCKED:** see companion § Test Resource Cleanup — BLOCKED Corpora.

**Why:** Resource classes emitting `ResourceWarning` from `__del__` flood the runner hiding real signals. See guide for PR #466 (36 unclosed channels).

### MUST: AsyncMock Replaced By Mock When `side_effect` Is `async def`

```python
# DO    patch(..., new_callable=Mock); m.side_effect = fake_open  # async def
# DO NOT default AsyncMock double-wraps the coroutine; never awaited; RuntimeWarning at GC
```

**Why:** Default `AsyncMock` wraps the side_effect coroutine again; the wrapper is never awaited; `RuntimeWarning` surfaces at GC, hours later.

### MUST: Helper Classes Use Stub/Helper/Fake Suffix; JWT Test Secrets ≥ 32 Bytes

`class NameStub:` (NOT `class TestName:` with `__init__` — pytest collects `Test*`, triggers `PytestCollectionWarning`, class silently dropped). `JWT_TEST_SECRET = "test-secret-key-minimum-32-bytes!"` (NOT short — `InsecureKeyLengthWarning` per RFC 7518 §3.2).

**Why:** Pytest's `Test*` collection silently drops `__init__`-bearing helper classes, hiding real test logic. Short HMAC keys teach contributors that 10 bytes is acceptable when 32 is the floor.

### MUST: Pytest Plugin + Marker Declaration Pair

Any test using `@pytest.mark.<X>` or `<X>` fixture from a plugin MUST declare the plugin in the owning sub-package's `[dev]` extras AND register the marker in pytest config SAME commit.

```toml
# DO    dev = ["pytest-benchmark>=4.0.0"]
#       [tool.pytest.ini_options]
#       markers = ["benchmark: Performance tests"]
# DO NOT either layer missing → collection fails, whole sub-package blocked
```

**BLOCKED:** see companion § Test Resource Cleanup — BLOCKED Corpora.

**Why:** Missing any layer breaks collection with an unhelpful error. See guide for 2026-04-20 11,917-test block.

## MUST: Serialize Env-Var-Mutating Tests Via Module Lock

Any two tests mutating SAME env var MUST serialize through a module-scope `threading.Lock` held across read-then-mutate; tests take `(monkeypatch, _env_serialized)`. See guide for full fixture pattern.

**BLOCKED:** see companion § Env-Var Lock Discipline.

**Why:** `monkeypatch.setenv` restores at fixture teardown — AFTER the test body — so sibling tests observe either value depending on xdist scheduling. Classic "passes locally, fails CI".

### MUST: One Lock Domain Per Env Surface Per Test Binary

Serialization only works when every env-mutating test sharing one env surface holds the SAME lock. Two locking mechanisms over one surface — a module-local `threading.Lock` and a pytest-xdist group lock (`@pytest.mark.xdist_group`) — do NOT exclude each other: a test holding one interleaves with a test holding only the other, racing on the shared vars exactly as if neither were locked. When a suite adopts one lock domain for an env surface, EVERY env-mutating test touching that surface MUST join that SAME domain; introducing a second mechanism is BLOCKED. (Rust sibling: a module-local `static ENV_MUTEX: Mutex<()>` and `#[file_serial(<key>)]` over one env surface are non-interlocking — unify on one domain.)

```python
# DO — every env-mutating test on this surface joins ONE module-scope lock
with _LLM_ENV_LOCK: monkeypatch.setenv("OPENAI_API_KEY", "k")
# DO NOT — a second, non-interlocking mechanism (@pytest.mark.xdist_group) in a sibling module races it
```

**BLOCKED:** see companion § Env-Var Lock Discipline.

**Why:** Lock domains don't compose — mutual exclusion holds only among holders of the SAME lock. The failure is probabilistic and module-boundary-shaped, so it looks like a flaky single test rather than a structural race. Evidence: Rust SDK PR #1283 (a `file_serial` test racing a module-local mutex on the same env surface); full post-mortem in companion § Env-Var Lock Discipline.

### MUST: Complexity Bounds Use Self-Normalizing Ratios, Not Absolute Wall-Clock Thresholds

A stress test asserting algorithmic behavior MUST measure an in-process baseline at 1/N scale in the same run and assert the N-scale cost as a RATIO of that baseline (linear ≈ N×, quadratic ≈ N²× — pick the bound between them) — NOT an absolute wall-clock threshold. Bumping an absolute threshold in response to a stress-test "flake" is BLOCKED until the ratio has been checked: a threshold bump on a super-linear ratio is burying a complexity-class regression, not fixing a flake.

```python
# DO — self-normalizing ratio (machine- and load-independent), same run
ratio = timeit(lambda: validate(graph(10_000))) / timeit(lambda: validate(graph(1_000)))
assert ratio < 40, f"scaled {ratio:.0f}x for 10x nodes (linear ~10x, quadratic ~100x)"
# DO NOT — absolute bound; ratchets upward under load until it masks O(n^2)
assert big < 60.0    # was 30s, bumped once already
```

**BLOCKED:** see companion § Complexity-Bound Ratios.

**Why:** Absolute bounds ratchet — each load-driven bump widens the window an algorithmic regression hides in, and the bump itself is the institutional tell. The ratio assert is a pure function of the algorithm, not the machine. Evidence: Rust SDK journal 0177 (an O(n²) loop surfaced after a 30s→60s "flake" bump); full post-mortem in companion § Complexity-Bound Ratios.

## 3-Tier Testing

- **Tier 1 (Unit)**: Mocking allowed, <1s per test
- **Tier 2 (Integration)**: Real infrastructure. NO mocking (`@patch`, `MagicMock`, `unittest.mock` — BLOCKED)
- **Tier 3 (E2E)**: Real everything; every write verified with read-back

**Why:** Mocks in Tier 2/3 hide real failures (connection handling, schema mismatches, transactions) that only surface against real infra. Exception — Protocol-Satisfying Deterministic Adapters: a class satisfying a `typing.Protocol` at runtime with deterministic output is NOT a mock. See guide § "Protocol Adapters" for full example.

## Tier-1 Conftest Stub for Newly-Side-Effecting Internal Methods (Advisory)

When an internal method that was previously deterministic becomes side-effecting (e.g., an LLM call, a DB lookup, a network fetch) WITHOUT changing its return-shape contract, the canonical Tier-1 sweep is one autouse fixture in the _deepest applicable_ conftest:

```python
# tests/unit/conftest.py
@pytest.fixture(autouse=True)
def _stub_<method_name>(monkeypatch):
    from <pkg>.<module> import <Class>
    monkeypatch.setattr(
        <Class>, "<method_name>", lambda self, *a, **kw: <fixed_return>
    )
```

Pytest's conftest-scope rules guarantee the stub does NOT leak to Tier-2 / Tier-3 (sibling `tests/integration/` and `tests/e2e/` directories don't inherit `tests/unit/conftest.py`).

**When to use:**

- Method has many Tier-1 call sites (~10+); editing each costs more than the stub.
- Tier-1 tests don't depend on the method's actual content, only its return shape.
- The new side-effect is the side-effect (LLM, DB, network); Tier-1 must remain offline + fast per the 3-Tier contract.

**When NOT to use:**

- The method's actual content is tested in Tier-1 (e.g., a regression test for the keyword classifier itself). Rewrite those tests to shape-only or move them to Tier-2.
- Only 1-3 call sites are affected — explicit args are clearer.

**Why:** A monkey-patch fixture keeps Tier-1 deterministic and offline without touching N test files. Future test additions pick up the stub automatically. The pattern collapsed a 36-call-site sweep to 1 file in the kailash-kaizen 2.20.0 release cycle (2026-05-06, issue #829).

## Coverage Requirements

| Code Type                            | Minimum |
| ------------------------------------ | ------- |
| General                              | 80%     |
| Financial / Auth / Security-critical | 100%    |

## MUST: End-to-End Pipeline Regression Above Unit + Integration

Every canonical pipeline the docs teach (README Quick Start, tutorial, 3-line example) MUST have a Tier-2+ regression test executing DOCS-EXACT code against real infra, asserting the final user-visible outcome. Lives in `tests/regression/` with `@pytest.mark.regression`; name includes "quickstart"/"readme"/tutorial-name (grep-able). See guide for full example.

```python
@pytest.mark.regression
async def test_readme_quickstart_executes_end_to_end():
    result = await km.train(df, target="churned")
    assert result.trainable is not None  # handoff field MUST survive
```

**BLOCKED:** see companion § E2E Pipeline Regression — BLOCKED Corpus.

**Why:** Unit tests per primitive construct fixtures with exactly the fields THAT primitive needs — they cannot observe a field MISSING from the A→B handoff. Only DOCS-EXACT chain exercises the handoff contract. See guide for kailash-ml W33b evidence + `zero-tolerance.md` §2 "Fake integration via missing field".

## State Persistence Verification (Tiers 2-3)

Every write MUST be verified with a read-back: call create/update, then call get/list, assert the value.

```python
# DO    result = api.create_company(name="Acme"); assert api.get_company(result.id).name == "Acme"
# DO NOT assert result.status == 200  # DataFlow may silently ignore params
```

**Why:** DataFlow `UpdateNode` silently ignores unknown parameter names — API returns success but zero bytes written.

## MUST: One Direct Test Per Variant In Every Delegating Pair

When a module exposes paired variants delegating to a shared core (`get`/`get_raw`, `post`/`post_raw`, `insert`/`insert_batch`, `read`/`read_typed`), each variant MUST have a direct-call test — not reaching the other by delegation.

```python
# DO — direct per-variant tests
def test_get_typed_success(client): user = client.get("/u/42"); assert user["name"] == "Alice"
def test_get_raw_success(client):   resp = client.get_raw("/u/42"); assert resp["status"] == 200
# DO NOT — only typed variant; refactor of get_raw error-mapping ships silent regression
```

**BLOCKED rationalizations:** "typed calls raw internally, one test covers both" / "shared core" / "integration catches this" / "raw is just less-useful typed".

**Why:** Convergent delegation paths look like one path until they diverge under refactor pressure. `/redteam` MUST mechanically grep each variant pair; any pair with zero direct call site is a finding.

## MUST: FFI Handle Wrappers Ship A Concurrent-Close Stress Test

Every FFI handle wrapper that exposes `Close`/`free` (or a GC finalizer/Cleaner backstop) ALONGSIDE methods that pass the raw handle into native code MUST ship a stress test that races method calls against `Close()` under concurrency (including the finalizer path where the runtime has one). A flag-gated close (a "closed" boolean checked before the native call) is NOT deref-safe — the pointer read and the native call are separated by a window `Close` can free into; only a per-handle mutex serializing the entire read-pointer → native-call → free window closes it, and only the concurrent stress test makes the use-after-free non-silent. Cross-binding depth + per-runtime fix shapes (Go/Java/.NET/Ruby/Python/Node) live in the FFI-handle-lifecycle project skill shipped with the rs all-bindings template.

```text
# DO — stress test races method calls vs Close (+ force GC for the finalizer racer)
spawn N concurrent method-call goroutines/threads; concurrently call Close(); force GC
# DO NOT — flag-gated close validated only by sequential unit tests
if closed: return ErrClosed   # check
native_call(ptr)              # Close can free into this window → UAF
```

**Why:** The check-then-use UAF only crashes under a concurrent closer (often the GC finalizer), so unit tests pass forever while production segfaults under GC pressure. Evidence: Rust SDK journals 0174 + 0178 (a Go `Subscription` UAF crashing 8/8 under stress, recurring on `AlignEngine` one wave later); full post-mortem in companion § FFI Handle Concurrent-Close.

## Rules

- Test-first development for new features
- Deterministic: no random data without seeds, no time-dependent assertions
- Isolated: clean setup/teardown, isolated DBs, tests MUST NOT affect each other
- Naming: `test_[feature]_[scenario]_[expected_result].py`

**Why:** Intermittent failures erode trust; shared state → order-dependent results that pass individually but fail in CI where order differs.

Origin: warnings sweep + test-skip triage + paired-variant coverage + env-var race + E2E regression + 2026-04-27 AST-counts review. See guide for full session evidence.

<!-- /slot:neutral-body -->

<!-- slot:lang-testing-extensions -->


## rs USE-template testing — binding-consumer context

This variant serves the rs USE templates — **Python and Ruby developers writing applications that consume the Rust SDK through bindings**. You write Python (or Ruby), not Rust. The bindings give you a Pythonic API that maps to the Rust runtime under the hood, but your code, tests, and tools are all Python (or Ruby).

Everything in the universal testing rules above (Probe-Driven Verification, Audit Mode, Regression Testing, Test Resource Cleanup, 3-Tier, Coverage, env-var serialization, plugin/marker pairing, E2E pipeline regression, state-persistence read-back) applies unchanged. The sections below ADD the binding-consumer specializations — they do not replace the universal rules.

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

## MUST: One Direct Test Per Variant Through The Binding

The universal "One Direct Test Per Variant In Every Delegating Pair" rule above applies at the binding boundary specifically. When a binding-layer class exposes paired variants delegating to a shared Rust core (`get`/`get_raw`, `post`/`post_raw`, `put`/`put_raw`, `delete`/`delete_raw`), each variant MUST have at least one test that calls it directly **through the Python or Ruby binding** — not a test that calls one variant and reaches the other by delegation.

```python
# DO — one test per variant, called through the binding
def test_service_client_get_typed_returns_dict(client):
    user = client.get("/users/42"); assert user["name"] == "Alice"
def test_service_client_get_raw_returns_response_dict(client):
    resp = client.get_raw("/users/42"); assert resp["status"] == 200

# DO NOT — exercise only the typed variant and trust delegation
def test_service_client_get_works(client):
    user = client.get("/users/42"); assert user["name"] == "Alice"
# refactor of get_raw's PyO3/Magnus error mapping ships a silent FFI regression
```

**Why:** Binding-layer paired variants cross the FFI boundary independently — a refactor that changes the typed variant's PyO3 conversion while leaving the raw variant alone ships a silent FFI regression. Tests that only exercise one variant cannot catch this because the failure mode is _across_ the binding boundary, not in the shared Rust core.

**BLOCKED rationalizations:** "The typed variant calls the raw variant internally" / "Both variants share the same Rust execute() core" / "Integration tests at the Rust layer catch this" / "PyO3 wrapping is mechanical, it can't drift".

### MUST: Mechanical Enforcement Via Grep

`/redteam` MUST grep the binding test directory for direct call sites of each known raw variant and report any pair where one side has zero matches.

```bash
TEST_DIR="${TEST_DIR:-tests}"
for variant in get_raw post_raw put_raw delete_raw; do
  count=$(grep -rln "client\.$variant(" "$TEST_DIR" | wc -l)
  [ "$count" -eq 0 ] && echo "MISSING: no test calls client.$variant() through the binding"
done
```

**Why:** Mechanical grep at audit time catches the regression before it reaches a downstream consumer. Manual "I think I tested both" is not auditable across PyO3/Magnus binding refactors.

Origin: BP-046 (the Rust SDK ServiceClient binding test coverage, 2026-04-14, commit `d3a14a73`) — Rust `put_raw`/`delete_raw` had wiremock coverage; the Python binding equivalents had none.

## MUST: Rust `pub use` Result-Type Coverage Pinned By Literal-Identifier Wiring Tests

When the underlying Rust crate `pub use`-exports a result type (struct / enum / trait), the per-symbol coverage sweep (`tools/sweep-redteam.py --json`) reports a HIGH gap unless at least one test file binds the type to a `let var: <Type> = ...` declaration. Inline `#[cfg(test)]` tests that exercise the API but never name the type literally are NOT sufficient — the sweep greps for `<Type>` as an identifier; `let result = build()` binds nothing the tool can see.

Pin coverage in a dedicated `tests/test_<module>_wiring.rs` that: (1) imports the type by name from the crate's public surface; (2) constructs a value via the canonical public-API entry; (3) binds it to `let var: <Type> = ...`; (4) asserts every public field individually; (5) for trait wiring, casts a concrete impl to `&dyn TraitName`.

```rust
// DO — wiring test binds the type literally; sweep tool sees it
use kailash_ml::engine::{DriftMonitor, DriftConfig, DriftReport, FeatureDriftResult};

#[test]
fn drift_report_full_field_assertions() {
    let mut monitor = DriftMonitor::from_reference(&data, &names, DriftConfig::default()).unwrap();
    let report: DriftReport = monitor.check(&current).unwrap();   // ← literal type binding
    assert!(!report.features.is_empty());
    let f0: &FeatureDriftResult = &report.features["f0"];          // ← literal type binding
    assert_eq!(f0.feature_name, "f0");
}

// DO NOT — inline test exercises the API but never names the type literally
let result = DriftMonitor::from_reference(&d,&n,DriftConfig::default()).unwrap().check(&c).unwrap();
// `result` shadows the type; sweep tool sees nothing
```

**BLOCKED rationalizations:** "The inline `#[cfg(test)]` tests already exercise the API; a wiring test is duplication" / "Field-by-field assertions are brittle" / "The type is `pub use`-exported, that proves it's reachable" / "Integration tests will catch a refactor" / "We shouldn't author tests for the sweep tool's quirks" / "I'll add a wiring test when the sweep flags it".

**Why:** A `pub use`-exported type with no literal-identifier binding in any test corpus is structurally indistinguishable from a removed type — the sweep reports a HIGH gap because there's no syntactic anchor. Wiring tests make the type discoverable to the per-symbol scan AND pin every public field's shape so a downstream refactor that drops a field fails one specific assertion. The trait-cast pattern (`&dyn TraitName`) extends the same defense to trait surfaces.

### Same-Shard Accessor For Orphaned `pub use` Types

When a wiring test cannot construct or observe a `pub use`-exported type because it has NO public constructor AND NO public accessor on any owning facade, the disposition per `rules/autonomous-execution.md` Rule 4 is to add the missing accessor IN THE SAME SHARD — typically a one-line `pub fn <field>(&self) -> &<Type> { &self.<field> }` mirroring the existing accessor pattern. Removing the type from `pub use` is also acceptable; leaving it `pub use`-exported but unreachable is BLOCKED.

**Why:** A `pub use`-exported type with no public construction/observation path is the orphan failure mode at the type-export level. Origin: 2026-05-06 RT-1/2/3 (PRs #816/#817/#818) — `tools/sweep-redteam.py` flagged 22 HIGH gaps whose types had inline-test exercise but no literal-identifier binding; RT-2 surfaced the orphan-accessor variant (`DriftSnapshot` `pub use`-exported, no accessor; same-shard `reference_snapshot()` added).

**Sequencing corollary (2026-05-26, the Rust SDK PRs #1114/#1115/#1116).** The E2E happy-path regression test that closes a workstream's load-bearing acceptance criterion does NOT obviate the per-symbol Tier-2 wiring this rule mandates — the E2E test exercises ONE happy-path composition; the per-`pub use`-type contract surface the wiring tests pin is a STRICT SUPERSET. After a workstream's load-bearing shard lands, the structural defense is to invoke `tools/sweep-redteam.py <workspace>/specs/*.md` against the workspace's own specs — the gap count is the institutional measurement of how much per-symbol contract surface remains uncovered. Sequencing pattern: (i) implement the load-bearing shard with its E2E test, (ii) merge, (iii) sweep the workspace specs, (iv) shard gap-closure by crate boundary (one shard per crate), (v) /redteam at parallel-wave convergence — NOT (i) implement + E2E + declare done. Evidence: a 2026-05-26 sweep against a converged workstream's 15 specs surfaced 38–39 per-symbol coverage gaps the E2E test alone left open — production types with 6–10 hits in src/ but zero literal-identifier references in any test; 3 parallel worktree shards (PRs #1114/#1115/#1116) landed 74 wiring tests closing all gaps to 0 in one /redteam round (0 CRIT/HIGH/MED, 0 FORWARDED).

**Trust Posture Wiring (this section):** `halt-and-report` (lexical regex against `let result = ` with no typed binding cannot ship `block` per `hook-output-discipline.md` MUST-2; structural AST walk required to upgrade). Grace 7d. Cumulative 3×/30d → posture drop per `trust-posture.md` §4. Detection: `tools/sweep-redteam.py --json` HIGH gap on `pub use`-exported type with zero literal-identifier hits, OR `find crates/*/tests/ -name 'test_*_wiring.rs' | xargs grep -L "let .*: <Type>"`.

## Shared-Resource Test Isolation (Rust SDK)

The universal "Serialize Env-Var-Mutating Tests Via Module Lock" rule generalizes to any shared external state Rust integration tests touch — a Docker Postgres container, Redis, a shared cache, a file-system lockfile.

### MUST: Use `tokio::sync::Mutex` For Async Guards That Cross `.await`

Any two integration tests that mutate the SAME shared external resource MUST serialize through a `tokio::sync::Mutex` at test-module scope. The `std::sync::Mutex` form is BLOCKED when the guard crosses an `.await` — it trips `clippy::await_holding_lock` AND risks deadlock if the tokio runtime moves the task to a different thread mid-await.

```rust
// DO — tokio::sync::Mutex, guard survives .await safely
use tokio::sync::Mutex;
use once_cell::sync::Lazy;
static PG_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[tokio::test]
async fn test_real_pg_round_trip() {
    let _g = PG_LOCK.lock().await;
    let pool = connect_real_pg().await;        // .await under tokio::sync guard — OK
    assert_eq!(pool.fetch_all("...").await.len(), 3);
}

// DO NOT — std::sync::Mutex across .await
static PG_LOCK: Lazy<std::sync::Mutex<()>> = Lazy::new(|| std::sync::Mutex::new(()));
#[tokio::test]
async fn test_real_pg_round_trip() {
    let _g = PG_LOCK.lock().unwrap();          // BLOCKED — held across .await
    let pool = connect_real_pg().await;        // clippy::await_holding_lock + deadlock risk
}
```

**BLOCKED rationalizations:** "Tests pass in isolation, CI scheduling is the bug" / "Docker is slow enough that tests don't overlap" / "`cargo nextest` already isolates per-test processes" (only with `test-threads = 1`) / "std::sync::Mutex is faster and the guard is brief" / "`#[serial]` from serial_test is simpler" / "We'll migrate later".

**Why:** `cargo nextest`/`cargo test` default to thread-level parallelism. Two `#[tokio::test]` functions that both `connect_real_pg().await` against the SAME container race on startup; `tokio::sync::Mutex` is the only async-safe primitive; `std::sync::Mutex` deadlocks when the runtime re-schedules the task mid-await; `#[serial]` has worse poisoning errors and doesn't compose with nested serialization domains. Origin: the Rust SDK commit `b4ed4cb5` (2026-04-22) — fixed a 75% Mac-runner flake from a Docker Postgres startup race (`specs/ci-infrastructure.md §5.4`).

## Test-Skip Triage Decision Tree (binding-consumer)

Every skipped / xfailed / deleted test MUST be classified into exactly one tier. Silent skips, unbounded `@pytest.mark.skip`, or empty bodies pretending to be tests are BLOCKED.

| Tier           | When                                                           | Action                                                                                               |
| -------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **ACCEPTABLE** | Missing dep / infra unavailable / platform constraint          | Keep skip; reason names the constraint (`@pytest.mark.skipif(not REDIS, reason="redis required")`)   |
| **BORDERLINE** | Real library limitation; documenting a known-failing edge      | Convert to `@pytest.mark.xfail(strict=False, reason="...")` — preserves body, flips green when fixed |
| **BLOCKED**    | "TODO" / "needs refactor" / "flaky" / "times out" / empty body | DELETE the test (and abandoned fixtures); if the bug matters, file an issue                          |

```python
# DO — ACCEPTABLE: infra-conditional skip
@pytest.mark.skipif(os.environ.get("POSTGRES_TEST_URL") is None, reason="requires POSTGRES_TEST_URL")
def test_real_postgres_round_trip(): ...
# DO — BORDERLINE: xfail with full reason
@pytest.mark.xfail(strict=False, reason="Rust SDK bindings do not yet surface this edge via PyO3")
def test_binding_edge_case(): ...
# DO NOT — BLOCKED: TODO-style silent skip / empty body
@pytest.mark.skip(reason="TODO")
def test_something(): ...
```

**BLOCKED rationalizations:** "It's only one skipped test" / "I'll fix it when I have time" / "It flakes — skip it for now" / "TODO comments in the skip reason are documentation".

**Why:** Silent skips inflate the green count without exercising code; for binding consumers a skipped binding test hides a broken FFI path that only surfaces in production. Deletion is the only honest disposition for a test that does not run; xfail the only honest disposition for a documented real limitation. Origin: cross-SDK from kailash-py gh #512 / PR #518 (2026-04-19).

## Binding-boundary Tier rationale

The universal 3-Tier contract applies; the binding boundary sharpens the Tier 2/3 "why":

- **Tier 2 (Integration), NO mocking:** mocks at the binding boundary bypass the FFI path entirely (connection handling, value serialization, lifetime management) — a passing mock-based test gives zero confidence the binding actually works.
- **Tier 3 (E2E), read-back MANDATORY:** the binding write path crosses the Python/Ruby→Rust boundary, value serialization, and the DB driver. Any layer can silently succeed without persisting; only a read-back proves the data landed.

## MUST (audit mode): Every Test-Only / Canary Export Greps To A CI Invocation (Rust FFI surface)

When auditing the Rust SDK crate surface the binding sits on, for every `*_test_only` / panic-canary export (`#[no_mangle] pub extern "C" fn *_panic_inject_*_test_only`, feature-gated test surfaces) and every capi `tests/*.rs` file, the audit MUST verify a matching invocation exists in the CI workflow (`grep -- '--test <file>' .github/workflows/rust.yml`, or an unfiltered run whose feature set enables it). An export or test file that compiles clean but is never invoked by ANY CI job advertises coverage that has never executed — orphan-detection at the FFI-export level. Missing invocation = HIGH.

```bash
# DO — every canary export / capi test file maps to a CI invocation
grep -l 'panic_inject.*test_only' crates/kailash-capi/src/*.rs    # exports
grep -- '--test align_panic_canaries' .github/workflows/rust.yml  # invocation exists

# DO NOT — export compiles, no CI job ever runs it
# crates/kailash-capi/tests/ml_pipeline_canary.rs exists;
# grep -- '--test ml_pipeline_canary' .github/workflows/rust.yml → no match (HIGH)
```

**BLOCKED rationalizations:** "it compiles, so it's covered" / "the catch-all job runs everything" (not under per-`--test`-filtered, feature-gated CI) / "we'll wire it when the next test lands".

**Why:** The `capi-test-canary`-gated, per-`--test`-filtered CI pattern makes every new test file a hand-wiring obligation; forgetting it is silent (compiles, never runs). The detection grep is rs-specific; the principle (an export with no CI invocation advertises unexecuted coverage) is global. Evidence: the Rust SDK journals 0165 + 0169 (2026-06-08) — 5 capi ML test files plus an `ml_pipeline` canary export had zero CI invocations while appearing covered; recurred 3× across one wave.

<!-- /slot:lang-testing-extensions -->
