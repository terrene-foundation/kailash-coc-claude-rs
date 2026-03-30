# Release Workflow Skill

Trigger, monitor, and debug the kailash release CI pipeline. Enforces source protection at every step.

## Source Protection Policy (READ FIRST)

**Authoritative docs**: `docs/00-authority/10-source-protection.md`, `.claude/rules/release.md`

### What gets published

| Artifact                   | Registry  | Source Visible                         |
| -------------------------- | --------- | -------------------------------------- |
| `kailash-plugin-macros`    | crates.io | Yes (proc-macros only, no engine code) |
| `kailash-plugin-guest`     | crates.io | Yes (WASM ABI contract only)           |
| `kailash-enterprise` wheel | PyPI      | No (compiled `.so`/`.dylib`)           |

### What NEVER gets published

All other crates (`kailash-value`, `kailash-core`, `kailash-macros`, `kailash-nodes`, `kailash-plugin`, `kailash-capi`, `kailash-cli`, `kailash-dataflow`, `kailash-nexus`, `kailash-kaizen`, `kailash-enterprise`, `kailash-marketplace`) have `publish = false` and MUST NEVER appear on crates.io.

---

## Usage

`/release [preflight|bump|tag|status|debug|audit]`

---

## 1. Pre-Flight Source Protection Audit

**MANDATORY before every release. No exceptions.**

```bash
# Check publish settings on all proprietary crates
for crate in kailash-value kailash-core kailash-macros kailash-nodes kailash-plugin kailash-capi kailash-cli kailash-dataflow kailash-nexus kailash-kaizen kailash-enterprise kailash-marketplace; do
  PUB=$(grep '^publish' "crates/$crate/Cargo.toml" | head -1)
  if echo "$PUB" | grep -q 'true'; then
    echo "CRITICAL: $crate has publish = true!"
    exit 1
  fi
done
echo "OK: All proprietary crates have publish = false"

# Build and inspect wheel for source leakage
cd bindings/kailash-python && maturin build --release --out /tmp/wheel-audit
for whl in /tmp/wheel-audit/*.whl; do
  RS=$(unzip -l "$whl" 2>/dev/null | grep -c '\.rs$' || true)
  CARGO=$(unzip -l "$whl" 2>/dev/null | grep -c 'Cargo\.toml' || true)
  if [ "$RS" -gt 0 ] || [ "$CARGO" -gt 0 ]; then
    echo "CRITICAL: Source files in wheel $(basename $whl)!"
    exit 1
  fi
done
echo "OK: No source leakage in wheels"

# Check no sdist
ls /tmp/wheel-audit/*.tar.gz 2>/dev/null && echo "CRITICAL: sdist found!" || echo "OK: no sdist"
```

## 2. Full Test Suite

```bash
cargo test --workspace
cargo clippy --workspace -- -D warnings
cargo fmt --all --check
cargo audit
```

## 3. Version Bump

```bash
# Edit workspace version
# Cargo.toml [workspace.package] version = "X.Y.Z"
# bindings/kailash-python/pyproject.toml version = "X.Y.Z"

git add Cargo.toml Cargo.lock bindings/kailash-python/pyproject.toml
git commit -m "chore(workspace): bump version to X.Y.Z"
```

## 4. Tag and Push (Triggers Release Pipeline)

```bash
git tag vX.Y.Z
git push && git push --tags
```

## 5. Monitor Release Pipeline

```bash
# Watch the run
gh run list --repo esperie/kailash --workflow release.yml --limit 3
gh run watch  # follow latest run

# Check specific job
gh run view RUN_ID --repo esperie/kailash
```

## 6. Post-Release Verification

```bash
# Verify PyPI
python3 -m venv /tmp/verify-release --clear
/tmp/verify-release/bin/pip install kailash-enterprise==X.Y.Z
/tmp/verify-release/bin/python -c "
import kailash
reg = kailash.NodeRegistry()
print(f'kailash-enterprise {kailash.__version__} OK')
"

# Verify crates.io (only plugin SDK)
cargo search kailash-plugin-guest
cargo search kailash-plugin-macros
# VERIFY: no other kailash-* crates appear
```

## 7. Dry Run (Test Without Publishing)

```bash
gh workflow run release.yml --repo esperie/kailash --field dry_run=true
```

---

## CI Pipeline Overview

```
build-binaries ──────────────────────────────────┐
build-python-wheels → source-protection-audit ───┤
                             │                   ├→ create-release → publish-plugin-sdk
                             └───────────────────┴→ publish-pypi → verify-pypi
```

### Jobs (all run on `self-hosted` runner)

| Job                            | Produces                   |
| ------------------------------ | -------------------------- |
| `Build (aarch64-apple-darwin)` | Binary tar.gz              |
| `Python Wheel (linux-x86_64)`  | manylinux wheels           |
| `Python Wheel (linux-aarch64)` | manylinux wheels           |
| `Python Wheel (macos-arm64)`   | macOS wheels (py310-313)   |
| `Source Protection Audit`      | PASS/FAIL gate             |
| `Create GitHub Release`        | Release with all artifacts |
| `Publish Plugin SDK`           | 2 crates to crates.io      |
| `Publish to PyPI`              | `.whl` files only          |
| `Verify PyPI install`          | Smoke test py310-313       |

---

## Common Fixes

### "Unable to locate executable file: rustc"

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
launchctl unload ~/Library/LaunchAgents/com.github.actions.runner.kailash.plist
launchctl load ~/Library/LaunchAgents/com.github.actions.runner.kailash.plist
```

### Runner offline

```bash
launchctl list com.github.actions.runner.kailash
gh api repos/esperie/kailash/actions/runners --jq '.runners[] | {name, status}'
```

### Missing Python versions

```bash
pyenv install 3.10.16 && pyenv install 3.11.11 && pyenv install 3.12.9
brew install python@3.13
```

---

## Secrets

| Secret            | Purpose               | Set Command                                            |
| ----------------- | --------------------- | ------------------------------------------------------ |
| `PYPI_TOKEN`      | Upload wheels to PyPI | `gh secret set PYPI_TOKEN --repo esperie/kailash`      |
| `CRATES_IO_TOKEN` | Publish plugin SDK    | `gh secret set CRATES_IO_TOKEN --repo esperie/kailash` |

---

## Key Files

| File                                           | Purpose                  |
| ---------------------------------------------- | ------------------------ |
| `.github/workflows/release.yml`                | CI release pipeline      |
| `docs/00-authority/10-source-protection.md`    | Source protection policy |
| `.claude/rules/release.md`                     | Release rules for agents |
| `.claude/agents/management/release-manager.md` | Release manager agent    |
| `bindings/kailash-python/pyproject.toml`       | Python package config    |
| `Cargo.toml`                                   | Workspace version        |

## Agents

| Agent               | Role                                             |
| ------------------- | ------------------------------------------------ |
| `release-manager`   | Orchestrates release, enforces source protection |
| `security-reviewer` | Mandatory pre-release security audit             |
