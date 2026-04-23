---
priority: 0
scope: baseline
---

# Zero-Tolerance Rules


<!-- slot:neutral-body -->


## Scope

ALL sessions, ALL agents, ALL code, ALL phases. ABSOLUTE and NON-NEGOTIABLE.

## Rule 1: Pre-Existing Failures MUST Be Fixed

If you found it, you own it. Period.

**Why:** Deferred failures in the Rust SDK compound across the FFI boundary -- a single unfixed bug becomes a silent data-corruption path that downstream Python users cannot diagnose or work around.

1. Diagnose root cause
2. Implement the fix
3. Write a regression test
4. Verify with `pytest`
5. Include in current or dedicated commit

**BLOCKED responses:**

- "Pre-existing issue, not introduced in this session"
- "Outside the scope of this change"
- "Known issue for future resolution"
- ANY acknowledgement without fix

**Exception:** User explicitly says "skip this issue."

## Rule 2: No Stubs, Placeholders, or Deferred Implementation

Production code MUST NOT contain: `TODO`, `FIXME`, `HACK`, `STUB`, `XXX`, `raise NotImplementedError`, `pass # placeholder`, empty function bodies, simulated/fake data.

**Why:** Stubs in the Rust SDK compile and link successfully but panic at runtime when called through PyO3 bindings, giving Python users an unrecoverable crash with no actionable error message.

**Extended examples (DataFlow 2.0 Phase 5 audit):** these patterns passed prior audits but were caught by the Phase 5 wiring sweep. They are equally BLOCKED: fake encryption (stores key, never encrypts), fake transaction (context manager with no BEGIN/COMMIT), fake health (always returns 200), fake classification (decorator that never enforces on read), fake tenant isolation (multi_tenant=True with no tenant dimension in cache key), fake metrics (no-op counters when prometheus_client missing). See the global `zero-tolerance.md` for full code examples.

## Rule 3: No Silent Fallbacks or Error Hiding

- `except: pass` (bare except with pass) — BLOCKED
- `catch(e) {}` (empty catch) — BLOCKED
- `except Exception: return None` without logging — BLOCKED

**Why:** Silent error suppression around Rust FFI calls hides panics and segfaults, turning a diagnosable crash into an invisible data loss that only surfaces hours later.

**Acceptable:** `except: pass` in hooks/cleanup where failure is expected.

## Rule 4: No Workarounds for Core SDK Issues

File a GitHub issue on the SDK repository (`esperie-enterprise/kailash-rs`) with a minimal reproduction. Use a supported alternative pattern if one exists.

**Why:** Workarounds that re-implement Rust SDK logic in Python bypass the optimized native code path, introducing subtle behavioral divergence and doubling the maintenance surface.

**BLOCKED:** Naive re-implementations, post-processing, downgrading.

## Rule 5: Version Consistency on Release

ALL version locations updated atomically:

**Why:** A version mismatch between `pyproject.toml` and `__init__.py` causes pip to install one version while runtime reports another, making bug reports unreproducible.

1. `pyproject.toml` → `version = "X.Y.Z"`
2. `src/{package}/__init__.py` → `__version__ = "X.Y.Z"`

## Rule 6: Implement Fully

- ALL methods, not just the happy path
- If an endpoint exists, it returns real data
- If a service is referenced, it is functional
- Never leave "will implement later" comments

**Why:** Partially implemented Rust types expose uninitialized or default-valued fields through PyO3, causing downstream Python code to silently operate on zero/empty values instead of failing fast.

**Test files excluded:** `test_*`, `*_test.*`, `*.test.*`, `*.spec.*`, `__tests__/`

<!-- /slot:neutral-body -->
