# /release - SDK Release Command

Standalone SDK release command for the BUILD repo. Not a workspace phase -- runs independently after any number of implement/redteam cycles. Handles crate publishing, Python wheel building (maturin), CLI binary distribution, and CI management for the Kailash Rust SDK.

**IMPORTANT**: This is `/release` (BUILD repo command). `/deploy` is for USE repos only.

## Deployment Config

Read `deploy/deployment-config.md` at the project root. This is the single source of truth for how this SDK publishes releases.

## Mode Detection

### If `deploy/deployment-config.md` does NOT exist -> Onboard Mode

Run the SDK release onboarding process:

1. **Analyze the codebase** -- workspace crates, Cargo.toml structure, CI workflows, binding builds, publish flags
2. **Ask the human** -- crates.io strategy, PyPI wheel strategy, CLI binary targets, source protection policy
3. **Research current best practices** -- web search for current cargo publish, maturin, cross-compilation guidance
4. **Create `deploy/deployment-config.md`** -- document all decisions with rationale, step-by-step runbook, rollback procedure
5. **STOP -- present to human for review**

### If `deploy/deployment-config.md` EXISTS -> Execute Mode

Read the config and execute:

#### Step 0: Release Scope Detection

1. **Diff analysis** -- compare `main` against last release tag per crate:
   ```
   git log <last-tag>..HEAD -- crates/kailash-core/       # Core changes?
   git log <last-tag>..HEAD -- crates/kailash-dataflow/    # DataFlow changes?
   git log <last-tag>..HEAD -- crates/kailash-kaizen/      # Kaizen changes?
   git log <last-tag>..HEAD -- bindings/kailash-python/    # Python binding changes?
   ```
2. **Present release plan** -- which crates/channels, version bump type, dependency updates. **STOP and wait for human approval.**

#### Step 1: Version Bump

Update version in `Cargo.toml` for each affected crate. Workspace crates inherit `version.workspace = true` from root -- update the root `[workspace.package]` version for coordinated releases.

**Source protection check**: Verify all proprietary crates have `publish = false`. Only `kailash-plugin-macros` and `kailash-plugin-guest` may publish to crates.io.

#### Step 2: Build and Test

```bash
cargo build --workspace                    # Full workspace build
cargo test --workspace                     # All tests
cargo clippy --workspace -- -D warnings    # Lint (zero warnings)
cargo fmt --all --check                    # Format check
cargo audit                                # Vulnerability audit
```

#### Step 3: Channel-Specific Publishing

**crates.io** (public crates only):

```bash
cargo publish -p kailash-plugin-macros --dry-run
cargo publish -p kailash-plugin-guest --dry-run
# After dry-run passes:
cargo publish -p kailash-plugin-macros
cargo publish -p kailash-plugin-guest
```

**PyPI** (Python wheels via maturin -- wheel-only, NO sdist):

```bash
cd bindings/kailash-python
maturin build --release
# Verify wheel contents -- NO .rs or Cargo.toml files
twine upload dist/*.whl  # Wheels only, never sdist
```

**CLI binary** (cross-compiled via CI):

- macOS arm64, Linux x86_64, Linux aarch64
- CI workflow: `.github/workflows/release.yml`
- Artifacts uploaded to GitHub Releases

#### Step 4: Git Workflow

Create release branch, PR, merge, tag on main. Tags trigger CI release workflows.

#### Step 5: Post-Release

Verify published artifacts install correctly, update downstream dependency pins, document release.

## Agent Teams

- **release-specialist** -- Git workflow, PR creation, cargo publish, version management
- **security-reviewer** -- Pre-release security audit (MANDATORY)
- **testing-specialist** -- Verify test coverage before release
- **cargo-specialist** -- Workspace config, dependency management, feature flags

## Critical Rules

- NEVER publish proprietary crates to crates.io (source protection)
- NEVER upload sdist (.tar.gz) to PyPI -- wheel-only for bindings
- NEVER include .rs or Cargo.toml in wheel contents
- NEVER publish without full `cargo test --workspace` passing
- NEVER skip `cargo audit` before release
- ALWAYS verify `publish = false` on proprietary crates before release
- ALWAYS publish in dependency order: macros first, then crates, then bindings
- ALWAYS document releases in `deploy/deployments/`
- Research current tool syntax -- do not assume stale knowledge is correct

**Automated enforcement**: `validate-deployment.js` hook blocks commits containing credentials. CI `source-protection-audit` job enforces publish flags.

## Skill References

- `skills/10-deployment-git/release-runbook.md` -- Step-by-step procedures
- `skills/10-deployment-git/deployment-packages.md` -- Package release patterns
- `skills/10-deployment-git/deployment-ci.md` -- CI/CD infrastructure
