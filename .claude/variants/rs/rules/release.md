---
paths:
  - "Cargo.toml"
  - "**/pyproject.toml"
  - ".github/workflows/release*"
---

# Release Rules (Rust + Python-wheel Pipeline)

## Scope

These rules apply to Rust projects whose release pipeline builds Python wheels via maturin (typically kailash-rs and projects consuming it). Principles generalize to any multi-platform wheel pipeline built on GitHub Actions.

## MUST: NEVER Round-Trip Wheels Through `actions/upload-artifact` In The Release Workflow

Every `.github/workflows/release.yml` job that builds a wheel MUST audit + publish that wheel within the SAME job. Uploading the wheel as a GitHub Actions artifact and downloading it in a later fan-in job is BLOCKED. Parallelization across platforms is fine — EACH platform job MUST do its own `audit → twine upload --skip-existing`.

```yaml
# DO — parallel wheel jobs each publish their own output, zero artifact round-trip
build-wheels-macos-arm64:
  steps:
    - name: Build macOS arm64 wheels
      run: maturin build --release --out dist/
    - name: Audit wheel contents for source leakage
      run: scripts/audit-wheel.sh dist/*.whl
    - name: Publish to PyPI
      run: twine upload --skip-existing dist/*.whl
      env: { TWINE_USERNAME: __token__, TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }} }

build-wheels-linux-x86_64:
  steps: # (same shape: build → audit → publish in-job)

# DO NOT — fan-out/fan-in with artifact round-trip
build-wheels-macos-arm64:
  steps:
    - run: maturin build --release --out dist/
    - uses: actions/upload-artifact@v4   # ← BLOCKED
      with: { name: wheels-macos-arm64, path: dist/*.whl }

audit-and-publish:
  needs: [build-wheels-macos-arm64, ...]
  steps:
    - uses: actions/download-artifact@v4   # ← BLOCKED
      with: { name: wheels-macos-arm64, path: dist/ }
    - run: twine upload --skip-existing dist/*.whl
```

**BLOCKED rationalizations:**

- "Artifact round-trip centralizes the audit step"
- "upload-artifact@v4 is stable and reliable"
- "Quota is fine — we're well under the limit"
- "The fan-in job is simpler to reason about"
- "Only the audit job has the PYPI_TOKEN, so artifacts are required"
- "We can add `retention-days: 1` and the quota won't fill"

**Why:** GitHub Actions artifact storage is a quota-limited shared resource across every workflow run on the org. The quota is opaque, usage is recalculated every 6-12 hours, and a full quota rejects every `CreateArtifact` call with `Failed to CreateArtifact: Artifact storage quota has been hit`. When that happens the release workflow silently "builds 5 files" but uploads zero, and every `download-artifact` in the fan-in job fails with `Artifact not found`. Result: the release tag is pushed, the GitHub release is created, any sibling publish jobs complete, BUT PyPI is never published. Consumers running `uv pip install <package>==X.Y.Z` get "version not found". Keeping audit + publish in the same job as the build is the only structural defense — no artifact, no quota, no failure mode.

**Layered defense for parallelization:** `twine upload --skip-existing` is idempotent across concurrent jobs. The audit step (`.rs` / `Cargo.toml` content check) is deterministic on the wheel bytes, so running it once per platform job is equivalent to running it once centrally. The GitHub Release creation step (`softprops/action-gh-release` or equivalent) is the only genuine fan-in — it takes no wheel input, just the git tag + release notes.

Origin: Commit `669e7cfb fix(ci): publish PyPI directly from wheel build, no artifact round-trip` established the invariant to avoid PyPI-token fan-in fragility. Commit `a4d648d4 ci(release): parallelize wheel phase (3 platforms -> fan-out/fan-in)` regressed it under the guise of parallelization — 2026-04-20 v3.20.0 release failed with `Failed to CreateArtifact: Artifact storage quota has been hit`. Parallelization and no-artifact-roundtrip are NOT mutually exclusive; the regression was an unnecessary trade-off.
