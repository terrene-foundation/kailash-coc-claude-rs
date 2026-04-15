---
name: annotation-resolution-fallback
description: "When `typing.get_type_hints(cls)` raises a bare `NameError` on a `@db.model`-decorated class, fall back to `annotationlib.get_annotations(cls, format=Format.FORWARDREF)` on Python 3.14+ to produce a per-field diagnostic. Use when any PyO3 binding or Python wrapper reads class type hints via `typing.get_type_hints` and needs actionable errors for unresolvable forward refs, TYPE_CHECKING-guarded imports, or circular imports."
priority: HIGH
tags: [pyo3, python-binding, dataflow, type-hints, python-314, pep-749, diagnostics]
paths:
  - "bindings/kailash-python/**"
---

# Annotation Resolution Fallback For `typing.get_type_hints` Failures

When a Python binding reads class type hints via `typing.get_type_hints(cls)` — the PEP-749-compliant API — and any single field references a name that is not resolvable at decoration time, the call raises a bare `NameError: name 'Foo' is not defined`. The three causes that produce this error in practice are (1) an import hidden behind `if TYPE_CHECKING:`, (2) a forward reference to a class not yet defined at decoration time, and (3) a circular import between the model's module and its field types' module.

The raw `NameError` is the worst possible UX: there is no indication that DataFlow (or Kaizen, or any binding layer) was the caller, no hint about which field is broken, and no guidance about which of the three causes applies. The user sees `NameError` at import time, does not connect it to `@db.model`, and starts grepping for `Foo` in their codebase.

The fix is a two-tier fallback. On Python 3.14+, `annotationlib.get_annotations(cls, format=Format.FORWARDREF)` returns unresolvable names as plain strings instead of raising — so we can identify exactly which fields are broken and emit a `RuntimeError` naming the `@db.model` class, the offending fields, and the three causes with concrete remediation for each. On Python <3.14 we cannot list the broken fields, but we can still raise a clearer `RuntimeError` that names the class and the causes rather than surfacing the raw `NameError`.

This pattern applies to any kailash-rs Python binding that reads class type hints via `typing.get_type_hints`. Currently only DataFlow `@db.model` does this; Kaizen `Signature` uses attribute-value inspection (`dir(cls)` + `getattr` + `isinstance`) and is architecturally immune. The pattern is Rust-SDK-specific because `kailash-py`'s pure-Python decorators have different hint-resolution paths.

## When To Use

| Binding reads class hints via…                               | Use this pattern? |
| ------------------------------------------------------------ | ----------------- |
| `typing.get_type_hints(cls)`                                 | **Yes**           |
| `cls.__annotations__` (raw, no resolution)                   | No — no NameError possible, strings are fine |
| Attribute-value inspection (`dir` + `getattr` + `isinstance`) | No — immune, values are already materialised |
| `inspect.signature(cls)` for dataclass fields                | Yes (same failure mode) |

## The Pattern

### Step 1: Wrap `typing.get_type_hints` In `try/except NameError`

The happy path stays on `typing.get_type_hints(cls)`. Nothing changes for callers whose annotations resolve cleanly — the call returns exactly what it returned before.

```python
import sys
import typing


try:
    annotations = typing.get_type_hints(cls)
except NameError as e:
    # ...see Step 2 and Step 3...
```

### Step 2: On Python 3.14+, Use `annotationlib` For Per-Field Diagnostics

`annotationlib` ships in the stdlib on Python 3.14+ (PEP 749) and does not require a try/except import guard. `Format.FORWARDREF` returns a dict where resolvable annotations are their actual types and unresolvable names come back as plain `str` values.

```python
if sys.version_info >= (3, 14):  # pyright: ignore[reportUnnecessaryComparison]
    import annotationlib  # pyright: ignore[reportMissingImports, reportUnreachable]

    raw = annotationlib.get_annotations(
        cls,
        format=annotationlib.Format.FORWARDREF,
    )
    unresolved = {
        name: value for name, value in raw.items() if isinstance(value, str)
    }
    if unresolved:
        field_list = ", ".join(
            f"{name!r}→{value!r}" for name, value in unresolved.items()
        )
        raise RuntimeError(
            f"@db.model(cls={cls.__name__}) has unresolvable "
            f"type annotations on {len(unresolved)} field(s): "
            f"{field_list}. Common causes:\n"
            f"  1. TYPE_CHECKING-guarded imports — move the import "
            f"out of `if TYPE_CHECKING:` for any type referenced "
            f"in a @db.model field.\n"
            f"  2. Forward references to types not yet defined "
            f"at decoration time.\n"
            f"  3. Circular imports — refactor so the model class's "
            f"module can import its field types eagerly.\n"
            f"DataFlow needs every field type resolved at decoration "
            f"time to build the SQL schema."
        ) from e
```

### Step 3: On Python <3.14 (Or If annotationlib Drops Through), Raise A Clearer RuntimeError

The pre-3.14 path cannot list the broken fields (no `annotationlib` to interrogate), but can still convert a bare `NameError` into a `RuntimeError` that names the class and lists the causes. This is strictly better UX than the raw `NameError`.

```python
raise RuntimeError(
    f"@db.model(cls={cls.__name__}) could not resolve a type "
    f"annotation. Original error: {e}. Common causes: a "
    f"TYPE_CHECKING-guarded import, a forward reference to a type "
    f"not yet defined, or a circular import. DataFlow needs every "
    f"field type resolved at decoration time to build the SQL schema."
) from e
```

Chain the original `NameError` via `raise ... from e` so the traceback preserves the original diagnostic for anyone who needs it.

### Step 4: What The User Sees

Before the fallback pattern, the user saw:

```
NameError: name 'Foo' is not defined
```

After, on Python 3.14+:

```
RuntimeError: @db.model(cls=Bad) has unresolvable type annotations on
1 field(s): 'y'→'Undefined'. Common causes:
  1. TYPE_CHECKING-guarded imports — move the import out of
     `if TYPE_CHECKING:` for any type referenced in a @db.model field.
  2. Forward references to types not yet defined at decoration time.
  3. Circular imports — refactor so the model class's module can
     import its field types eagerly.
DataFlow needs every field type resolved at decoration time to build
the SQL schema.
```

The user now knows (a) DataFlow is the caller, (b) which class is broken, (c) which field is broken and what name could not be resolved, and (d) the three concrete fixes.

## DO / DO NOT

```python
# DO — wrap the get_type_hints call, fall back with per-field diagnostic
try:
    annotations = typing.get_type_hints(cls)
except NameError as e:
    if sys.version_info >= (3, 14):
        import annotationlib
        raw = annotationlib.get_annotations(cls, format=annotationlib.Format.FORWARDREF)
        unresolved = {n: v for n, v in raw.items() if isinstance(v, str)}
        if unresolved:
            raise RuntimeError(f"@db.model(cls={cls.__name__}) has unresolvable ...") from e
    raise RuntimeError(f"@db.model(cls={cls.__name__}) could not resolve ...") from e

# DO NOT — let the raw NameError propagate
annotations = typing.get_type_hints(cls)   # BLOCKED: user sees `NameError: name 'Foo' is not defined`
                                            # with no connection to DataFlow and no remediation

# DO NOT — try annotationlib FIRST and skip typing.get_type_hints
import annotationlib
raw = annotationlib.get_annotations(cls, format=annotationlib.Format.FORWARDREF)
# BLOCKED: with `from __future__ import annotations` in the user's module,
# annotationlib returns ALL annotations as strings even in FORWARDREF format,
# so every model looks "broken". typing.get_type_hints MUST be the first
# attempt; annotationlib is only reached via the NameError branch.
```

## Gotchas (non-obvious bits a future engineer will re-discover without this skill)

- **`typing.get_type_hints(cls)` IS PEP 749-compliant on Python 3.14.** Verified at runtime on 3.14.3. There is no need to switch to `annotationlib` as the primary API — resolvable annotations still work through `typing.get_type_hints`. `annotationlib` is only useful as the fallback for *unresolvable* names.

- **`annotationlib.get_annotations(cls, format=Format.FORWARDREF)` returns plain `str`, not `ForwardRef`.** Despite the `FORWARDREF` name, unresolvable names come back as `str` values in the dict. The `isinstance(value, str)` check is what isolates the broken fields. `ForwardRef` objects are not involved.

- **`from __future__ import annotations` poisons annotationlib FORWARDREF mode.** When the user's module uses PEP 563 string annotations, `annotationlib.get_annotations(..., format=FORWARDREF)` returns *every* annotation as a string — even ones that would resolve cleanly. Callers MUST try `typing.get_type_hints` first and fall back to `annotationlib` only on `NameError`. Starting with `annotationlib` would flag every field as "unresolved" on any module that uses PEP 563.

- **Pyright flags `if sys.version_info >= (3, 14):` as "Code is unreachable"** when statically checking against a Python version older than 3.14. This is a Pyright limitation (single-target static analysis), not a code bug. The package supports Python 3.10+ so the runtime guard is necessary. Suppress with `# pyright: ignore[reportUnnecessaryComparison]` on the `if`, and `# pyright: ignore[reportMissingImports, reportUnreachable]` on the `import annotationlib` inside the branch.

## MUST Rules

### 1. `typing.get_type_hints` Is The Primary API, annotationlib Is The Fallback

`typing.get_type_hints(cls)` MUST be the first call. `annotationlib.get_annotations(cls, format=Format.FORWARDREF)` MUST only be reached on the `NameError` branch.

**Why:** PEP 563 (`from __future__ import annotations`) turns every annotation into a string at compile time. `annotationlib.FORWARDREF` does not re-resolve these strings — it returns them as-is. Starting with annotationlib on a PEP-563 module classifies every field as "unresolved" and fires a spurious diagnostic on code that was never broken.

### 2. Chain The Original Exception With `raise ... from e`

Both `RuntimeError` paths (3.14+ and <3.14) MUST chain the original `NameError` via `raise RuntimeError(...) from e`.

**Why:** The per-field diagnostic names the broken field but not the full Python traceback context. `raise ... from e` preserves the original `NameError` traceback as the `__cause__`, so anyone who needs the raw location (a line number inside a complex dataclass field type, for example) can still reach it via the chained traceback.

### 3. Pre-3.14 Path Is A RuntimeError, Not A Re-Raise

The Python <3.14 path MUST convert the `NameError` into a `RuntimeError` that names the `@db.model` class. Silently re-raising the original `NameError` is BLOCKED.

```python
# DO — convert on <3.14 as well
raise RuntimeError(
    f"@db.model(cls={cls.__name__}) could not resolve a type annotation. ..."
) from e

# DO NOT — re-raise the bare NameError
raise   # BLOCKED: user is back to `NameError: name 'Foo' is not defined` with no context
```

**Why:** Pre-3.14 users do not get per-field diagnostics (no annotationlib), but they MUST still be told DataFlow was the caller and what the three common causes are. A re-raised `NameError` abandons the entire point of the fallback on the older Python versions.

### 4. Error Message Includes All Three Causes

Every `RuntimeError` message raised by this pattern MUST list the three common causes (TYPE_CHECKING-guarded imports, forward references, circular imports) with concrete remediation for each.

**Why:** Without the three causes enumerated, the user sees "could not resolve a type annotation" and has no starting point for the fix. Listing the three causes converts a bug report into a self-service fix.

## MUST NOT

- Start with `annotationlib` as the primary hint-resolution API

**Why:** Poisoned by `from __future__ import annotations` (PEP 563) — every annotation comes back as a string, so every model looks broken. `typing.get_type_hints` is the only API that distinguishes resolvable from unresolvable in a PEP-563-aware way.

- Drop the `sys.version_info >= (3, 14)` guard because "the CI only runs on 3.14"

**Why:** The package supports Python 3.10+. Removing the guard either hard-imports `annotationlib` on 3.10–3.13 (ImportError) or assumes the branch always runs (incorrect). The guard is load-bearing for cross-version support.

- Suppress the Pyright "unreachable" warning by deleting the version guard

**Why:** The warning is a Pyright limitation when statically typing against a single Python version; the guard is necessary at runtime for the 3.10+ support matrix. The correct response is `# pyright: ignore[reportUnnecessaryComparison]`, not removing the guard.

## Scope

This pattern applies to any kailash-rs Python binding that reads class type hints via `typing.get_type_hints`. Currently the known surface is:

- **DataFlow `@db.model`** (`bindings/kailash-python/python/kailash/dataflow/model.py`) — uses `typing.get_type_hints(cls)` to build SQL schemas from Python class annotations. Fixed in commit `5f405574`.

- **Kaizen `Signature`** — uses attribute-value inspection (`dir(cls)` + `getattr` + `isinstance`), NOT `__annotations__`. Architecturally immune; no action needed.

- **kailash-py equivalents** — pure-Python decorators with different hint-resolution paths; the cross-SDK inspection that surfaced this issue confirmed kailash-py does not have the same failure mode. This skill is Rust-SDK-specific.

When a new binding is added that reads class type hints, the author MUST apply this pattern or document why the binding is immune (attribute-value inspection, raw `__annotations__`, etc.).

## Related Skills

- `skills/06-python-bindings/typed-exception-hierarchy.md` — when the `RuntimeError` raised by this pattern is further wrapped into a typed PyO3 exception, use the typed-hierarchy pattern so callers can `except DataFlowAnnotationError` specifically
- `skills/06-python-bindings/layered-truncation.md` — unrelated but the closest precedent for "Python-binding-specific diagnostic pattern that improves UX at the FFI boundary"
- `skills/06-python-bindings/SKILL.md` — overview of Python binding patterns

Origin: kailash-rs commit 5f405574 (2026-04-15) — DataFlow @db.model per-field diagnostic for unresolvable type hints.
