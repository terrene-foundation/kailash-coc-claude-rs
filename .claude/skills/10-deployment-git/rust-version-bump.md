---
name: rust-version-bump
description: Canonical procedure for bumping the Rust toolchain / MSRV or adding a new CPython target for PyO3 wheel builds in the Kailash Rust SDK. Use when raising the MSRV, dropping an old Rust edition, upgrading PyO3, or adding / dropping a Python version from the wheel release matrix.
---

# Rust Version Bump Procedure

Two independent knobs live in this repo and both are called "version bumps":

1. **Rust toolchain / MSRV** — the minimum rustc version every crate in the workspace compiles against.
2. **CPython target matrix** — the set of Python versions the PyO3 bindings in `bindings/kailash-python/` produce wheels for.

They interact through PyO3: a new CPython release can force a PyO3 bump, which can in turn force an MSRV bump. This skill covers both, in order, with the real files and the real gotchas surfaced by past bumps in this repo.

Cross-reference: the Python-SDK side lives in `terrene-foundation/kailash-coc-claude-py` at `skills/10-deployment-git/python-version-bump.md`. Keep the two in sync — neither SDK is the source of truth for its counterpart's procedure, but they MUST land Python-version additions in lockstep (EATP D6 semantic parity).

Origin: issue #401 + the v3.16.2 Python 3.14 support session (commits `7d0d358b`, `22907ea8`).

## File Inventory

Before making any change, know what gets touched. Grep these files before editing — the one you forgot is the one that breaks CI.

| Concern           | Files                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| Workspace MSRV    | `Cargo.toml` → `[workspace.package] rust-version = "..."`                                                        |
| Per-crate MSRV    | `crates/*/Cargo.toml` → `rust-version.workspace = true` (preferred) OR `rust-version = "..."` (override)         |
| MSRV CI gate      | `.github/workflows/rust.yml` → `toolchain: "X.Y"` step on `dtolnay/rust-toolchain@master`                        |
| Toolchain pinning | `rust-toolchain.toml` (absent by default — only add if you need a repo-wide pin, not per-workflow)               |
| PyO3 crate pin    | `bindings/kailash-python/Cargo.toml` → `pyo3 = { version = "..." }`                                              |
| Python matrix     | `.github/workflows/release.yml` → `--interpreter python3.X python3.Y ...` in every maturin build step            |
| Python matrix     | `.github/workflows/python.yml` → `matrix.python-version` include list                                            |
| Python matrix     | `.github/workflows/release.yml` → `verify-pypi` job matrix (PATH to each python3.X binary)                       |
| Package metadata  | `bindings/kailash-python/pyproject.toml` → `Programming Language :: Python :: 3.X` classifier, `requires-python` |
| Runner docs       | `.claude/rules/ci-runners.md` → Python Versions table + runner `.env` PATH note                                  |
| PyO3 compat flag  | Workflow env block `PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1` (see § PyO3 Forward Compat Flag)                      |

## Procedure A — Raise the Rust MSRV

Use when: a dependency requires a newer rustc, or you want to use a stabilized language feature.

### 1. Decide the new floor

Check the stabilized-in version of every feature you need: `cargo +stable -Z unstable-features` is **not** how you check this. Look at [releases.rs](https://releases.rs) or the dependency's own `rust-version` field. Pick the _oldest_ rustc version that supports everything you depend on. Going any higher than necessary is pure cost — downstream consumers lose compatibility for no benefit.

### 2. Update the workspace floor

```toml
# Cargo.toml
[workspace.package]
rust-version = "1.93"   # was 1.91
```

### 3. Audit per-crate overrides

```bash
grep -rn 'rust-version' Cargo.toml crates/*/Cargo.toml bindings/*/Cargo.toml
```

Every crate should use `rust-version.workspace = true`. Overrides like `crates/eatp/Cargo.toml` → `rust-version = "1.75"` are **drift** and MUST be resolved to either (a) matching the workspace value or (b) an explicit comment explaining why this crate is pinned lower (e.g., "published to crates.io, broader compat than internal crates").

**DO NOT** leave silent MSRV divergences — they produce cryptic cargo warnings only when the divergent crate is built in isolation.

### 4. Update the MSRV CI gate

```yaml
# .github/workflows/rust.yml
- uses: dtolnay/rust-toolchain@master
  with:
    toolchain: "1.93" # was 1.91 — match Cargo.toml workspace.package.rust-version
- run: cargo check --workspace --all-features
```

The MSRV job's sole purpose is to fail fast if someone accidentally uses a post-floor API. Update it in the same commit as the `Cargo.toml` bump.

### 5. Run the MSRV check locally

```bash
rustup install 1.93
cargo +1.93 check --workspace --all-features 2>&1 | tail -30
```

Any compile error here is a "you accidentally used a post-1.93 feature" problem. Fix at the call site, not by raising the floor further.

### 6. Commit

```
chore(msrv): bump Rust MSRV to 1.93

Why: <dependency X> requires `feature Y` stabilized in 1.93.
Drops support for rustc 1.91-1.92. Downstream build logs may show
"package requires rustc 1.93" on systems still on older toolchains.

Files touched:
- Cargo.toml (workspace.package.rust-version)
- .github/workflows/rust.yml (MSRV gate)
- (list of any per-crate Cargo.toml overrides resolved)
```

### MSRV Drop — the reverse direction

Lowering the MSRV is rare. When you do it:

1. **Audit use of stabilized APIs**: grep `cargo doc --open` stabilized list for APIs you call that stabilized _above_ the new floor. These become compile errors.
2. **Check `#[cfg(...)]` feature gates**: any gate that depended on "available since 1.X" logic for 1.X > new floor is now load-bearing for correctness, not just compatibility.
3. **Backport changes**: the commit that drops the floor MUST include whatever call-site rewrites were needed to build on the lower toolchain.

## Procedure B — Add a New Python Version (CPython → PyO3 wheels)

Use when: a new CPython minor (3.14, 3.15, ...) has shipped and you want pre-built wheels on PyPI for it.

### 1. Verify the Python is installed on every CI runner

```bash
ls /opt/homebrew/bin/python3.14    # macOS (homebrew)
ls ~/.pyenv/versions/ | grep 3.14  # pyenv fallback
```

If the interpreter is not on the runner, nothing in this procedure helps — maturin cannot target an interpreter that does not exist. Update `.env` / `PATH` and restart the runner service first (see `.claude/rules/ci-runners.md`).

### 2. Check PyO3 support for the new Python

```bash
cargo info pyo3 | grep -A2 "python_version\|supported"
# or read bindings/kailash-python/Cargo.toml for the current pinned PyO3
```

- **If PyO3 officially supports the new Python** (usually within 2–4 weeks of the CPython release) → bump `bindings/kailash-python/Cargo.toml` → `pyo3 = { version = "..." }` to the supporting minor, and skip to step 4.
- **If PyO3 is still behind** (which is the common case because PyO3 is fast but not instant) → use the `PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1` escape hatch. Skip to step 3.

### 3. PyO3 Forward Compat Flag (when PyO3 lags CPython)

PyO3 < 0.27 refuses to build against a Python interpreter newer than 3.13 with:

```
error: the configured Python interpreter version (3.X) is newer than
       PyO3's maximum supported version (3.13)
  = help: set PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 to suppress this
          check and build anyway using the stable ABI
```

Set the flag at **workflow-env level** in both build workflows so every maturin job inherits it:

```yaml
# .github/workflows/release.yml and .github/workflows/python.yml
env:
  # PyO3 0.24 caps at Python 3.13; the stable ABI is forward-compatible
  # with newer minors. Drop this flag once pyo3 is bumped to >= 0.27.
  PYO3_USE_ABI3_FORWARD_COMPATIBILITY: "1"
```

**DO NOT** set it only on the release workflow — `python.yml` (PR CI) gates the 3.14 matrix entry and needs the same flag. This is exactly the gap that broke the v3.16.2 first run (commit `22907ea8` fixed it).

**BLOCKED rationalizations:**

- "PR CI doesn't test the new Python, only release does" — then PRs can silently regress 3.14 between releases.
- "We'll bump PyO3 later as a separate PR" — always acceptable, but don't ship wheels for an unsupported Python without the flag set in the meantime.

**Drop condition:** once PyO3 is at a version that officially supports the Python you target, delete the env var from both workflows _in the same commit_ as the PyO3 bump. Leaving it in is a lie that future contributors will cargo-cult.

### 4. Update the three maturin `--interpreter` lines

```yaml
# .github/workflows/release.yml — three places (macOS arm64, Linux x86_64, Linux aarch64)
args: >-
  --release --out dist
  --interpreter python3.10 python3.11 python3.12 python3.13 python3.14  # <-- added
```

All three MUST match. A single forgotten line means you ship wheels for N Python versions on two platforms and N-1 on the third — broken install resolution for the missing combo.

### 5. Extend the `verify-pypi` matrix

```yaml
# .github/workflows/release.yml verify-pypi.strategy.matrix
- python: "/opt/homebrew/bin/python3.14"
  label: "3.14"
```

Use the interpreter path that exists on the CI runner. The verify job installs the freshly-published wheel and runs a smoke test — it's the last gate before the release is considered "done".

### 6. Extend the PR CI matrix in `python.yml`

```yaml
# .github/workflows/python.yml — matrix.python-version
- path: "/opt/homebrew/bin/python3.14"
  label: "3.14"
```

Same interpreter path. This is the PR gate — without it, a PR that breaks 3.14 won't surface until the next release tag fires.

### 7. Use `PyO3/maturin-action@v1`, not bare `maturin build`

The runner's PATH-resolved `maturin` can be older than the one maturin-action downloads. Bare `maturin build` in `python.yml` broke 3.14 because the shim's maturin 1.12.x didn't know 3.14 as a cross-compile target; maturin-action pulled 1.13.x and worked.

```yaml
# DO
- name: Build wheel
  uses: PyO3/maturin-action@v1
  with:
    working-directory: bindings/kailash-python
    args: --release -i ${{ matrix.python-version.path }}

# DO NOT
- name: Build wheel
  working-directory: bindings/kailash-python
  run: maturin build --release -i ${{ matrix.python-version.path }}
  # ↑ relies on whatever maturin happens to be on PATH — broken for
  # any Python version newer than the shim's cached maturin.
```

### 8. Add the `pyproject.toml` classifier

```toml
# bindings/kailash-python/pyproject.toml
classifiers = [
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Programming Language :: Python :: 3.13",
    "Programming Language :: Python :: 3.14",  # <-- added
]
```

Classifiers are discovery metadata for PyPI search, not load-bearing for install resolution — but missing them makes `pip install` stop showing the package when users filter by Python version.

Also check `requires-python = ">=3.X"`: only update this when dropping support for the old floor, never when adding a new ceiling.

### 9. Update the runner docs

```markdown
# .claude/rules/ci-runners.md — Python Versions table

| 3.14.x | homebrew | `/opt/homebrew/bin/python3.14` |
```

Plus a short note if the procedure needed the forward-compat flag (so the next person who bumps sees the history immediately).

### 10. Verify locally before pushing

```bash
# 1. Create a venv with the new interpreter
/opt/homebrew/bin/python3.14 -m venv /tmp/verify-3.14 --clear

# 2. Activate and build the wheel (VIRTUAL_ENV must be set — maturin
#    develop uses the venv's python, and it uses the shell's venv state
#    to find it, NOT the --interpreter flag).
source /tmp/verify-3.14/bin/activate
/tmp/verify-3.14/bin/pip install maturin pytest

# 3. Build + install the wheel
cd bindings/kailash-python
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 maturin develop --release

# 4. Smoke test + run the binding suite
python -c "import kailash; print(kailash.__version__)"
python -m pytest tests/test_service_client.py tests/test_basic.py -q
```

If step 3 builds a `cp3XX` wheel where XX ≠ your target Python version, you forgot to activate the venv and maturin picked up a pyenv shim pointing at a different interpreter. Deactivate, re-activate, re-run.

### 11. Commit and push

```
feat(release): support Python 3.14 wheels + bump to vX.Y.Z

Test results:
- cargo check -p kailash-python against python3.14 + forward compat flag → clean
- maturin develop on 3.14 venv → built cp314 wheel
- pytest tests/test_service_client.py tests/test_basic.py on 3.14 → N/N pass
- PyPI release pipeline confirmed ...
```

## Procedure C — Drop an Old Python Version

Use only _after_ upstream CPython security support has ended for that version (check https://devguide.python.org/versions/). Dropping a supported version breaks users on enterprise LTS distros.

1. Remove the interpreter from every `--interpreter` line in `release.yml`.
2. Remove the matrix entries from `verify-pypi` and `python.yml`.
3. Remove the `Programming Language :: Python :: 3.X` classifier.
4. Bump `requires-python = ">=3.(X+1)"` in `pyproject.toml`.
5. Update the runner docs to match.
6. Commit as `chore(release): drop Python 3.X (upstream EOL <date>)`.

A wheel already on PyPI for the dropped version does not disappear — it stays installable. You're only preventing future releases from including it.

## PyO3 Bump Audit

When you do bump PyO3 (which should be a separate PR from a Python-version addition), run this audit:

```bash
# 1. What breaks at compile time
cargo check -p kailash-python 2>&1 | tail -50

# 2. Bound / Python / PyResult API changes
grep -rn "use pyo3::" bindings/kailash-python/src | wc -l
grep -rn "Bound<'_," bindings/kailash-python/src | wc -l

# 3. Macro API changes
grep -rn "#\[pyclass\|#\[pymethods\|#\[pymodule" bindings/kailash-python/src | wc -l

# 4. create_exception macro — signature changed between 0.24 and 0.25
grep -rn "pyo3::create_exception" bindings/kailash-python/src
```

PyO3 does **not** guarantee minor-version API stability — expect breaking changes between 0.X and 0.(X+1). Budget real time for a PyO3 bump.

## Cross-Reference

- `rules/ci-runners.md` — runner interpreter table and `.env` PATH requirements.
- `rules/env-models.md` — Python version / API key / model pairings (separate from this procedure but often bumped together).
- `skills/06-python-bindings/` — PyO3 binding patterns including the typed-exception hierarchy and layered truncation.
- Cross-SDK counterpart: `terrene-foundation/kailash-coc-claude-py` → `skills/10-deployment-git/python-version-bump.md` (Python SDK's procedure for the same concern).
