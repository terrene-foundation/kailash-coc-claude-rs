# /release — COC Authorization + Optional SDK Publish

Final COC authorization gate. Runs after `/codify` and before `/deploy` (USE apps) or PyPI publish (BUILD/SDK repos). Not a workspace phase — runs independently after any number of implement/redteam cycles.

`/release` behavior is **repo-type-aware**. Step 0 below detects the repo type and routes to the right path; the COC authorization shape and the SDK publish shape are different commands sharing one entry point.

## Step 0: Repo Type Detection

1. Read `.claude/VERSION::type` (case-sensitive). Valid values: `coc-source`, `coc-build`, `coc-use-template`, `coc-project`.
2. Read `deploy/deployment-config.md` first-line frontmatter `type:` field (if file exists). Valid: `application`, `sdk`, `library`.
3. Route:
   - **USE application repo** = `.claude/VERSION::type ∈ {coc-project, coc-use-template}` AND `deploy/deployment-config.md::type == application` → **Authorization Mode** (this command's USE-app branch).
   - **BUILD/SDK repo** = `.claude/VERSION::type == coc-build` OR `deploy/deployment-config.md::type ∈ {sdk, library}` OR `.claude/VERSION` missing AND `pyproject.toml`/`Cargo.toml` declares a published package → **SDK Publish Mode** (the legacy /release flow below).
   - **Unknown** → STOP and surface to the user: "repo type undetected; specify whether this is a USE application or an SDK/BUILD repo."

The detection MUST happen before any release-specific work begins. Misrouting a USE app through SDK Publish (or vice versa) is the failure mode this rule prevents.

---

## Authorization Mode (USE application repos)

`/release` here is the **sixth COC phase** — the authorization gate confirming the application is ready to deploy. It does NOT publish packages. `/deploy` performs the actual application deployment after `/release` authorizes.

### Authorization checklist

Run these checks; halt on any failure:

1. **`/redteam` convergence**: most recent redteam round in the active workspace reports zero CRITICAL + zero HIGH × 2 consecutive rounds per spec v6 §12.3.
2. **`/codify` complete**: most recent codify cycle landed; no pending knowledge proposals (`.claude/.proposals/latest.yaml::status != distributed` is BLOCKED).
3. **Test suite green**: `pytest` / `cargo test` / `npm test` per the project's test runner exits 0; no skipped tests without explicit `xfail` rationale.
4. **Security review green**: `security-reviewer` agent confirms no unaddressed CRITICAL/HIGH findings against the current diff vs deploy baseline.
5. **Deployment-config readiness**: `deploy/deployment-config.md` exists, target environment + rollback procedure documented.
6. **Branch / tag hygiene**: no uncommitted changes; current `main` matches `origin/main`.
7. **Version + changelog updated**: project version anchor (`pyproject.toml::version`, `Cargo.toml::version`, `package.json::version`, or whichever the project's `deploy/deployment-config.md` declares as canonical) has been incremented since the last `/deploy`; `CHANGELOG.md` (or the project's equivalent release-note file) carries an entry for the new deploy. Traceability requirement — deploy-time runbooks and rollback procedures depend on the version anchor matching the deployed artifact.

### On success

Surface the authorization summary to the user:

```
## /release Authorization — <project> ready for /deploy

✓ redteam: <round-history>
✓ codify: <proposal-sha>
✓ tests: <pass-count> / <skip-count>
✓ security: <last-audit-sha>
✓ deploy-config: <target-environment>
✓ branch: <branch>@<sha>

→ Next: run `/deploy` to ship to <target-environment>.
```

The user authorizes by running `/deploy`. `/release` itself does not deploy.

### Agent teams (USE app authorization)

- **release-specialist** — run the authorization checklist
- **security-reviewer** — MANDATORY pre-authorization audit (any unaddressed CRITICAL/HIGH blocks)
- **testing-specialist** — verify test posture
- **reviewer** — verify documentation references, code examples

---

## SDK Publish Mode (BUILD / SDK repos: kailash-py, kailash-rs, etc.)

`/release` here is the **SDK publishing command** — bumps versions, tags, publishes to PyPI / crates.io. Inapplicable to USE app repos.

### Deployment Config

Read `deploy/deployment-config.md` at the project root. This is the single source of truth for how this SDK publishes releases.

### If `deploy/deployment-config.md` does NOT exist → Onboard Mode

Run the SDK release onboarding process:

1. **Analyze the codebase** — packages, build system, CI workflows, docs setup, test infrastructure, multi-package structure
2. **Ask the human** — PyPI strategy, token setup, docs hosting, CI system, versioning strategy, changelog format, release cadence
3. **Research current best practices** — web search for current PyPI/CI/build tool guidance. Do NOT rely on encoded knowledge.
4. **Create `deploy/deployment-config.md`** — document all decisions with rationale, step-by-step runbook, rollback procedure, release checklist
5. **STOP — present to human for review**

### If `deploy/deployment-config.md` EXISTS → Execute Mode

Read the config and execute:

#### Step 0: Release Scope Detection

1. **Diff analysis** — compare `main` against last release tag per package:
   ```
   git log <last-tag>..HEAD -- kailash/           # Core SDK changes?
   git log <last-tag>..HEAD -- kailash-dataflow/   # DataFlow changes?
   git log <last-tag>..HEAD -- kailash-kaizen/     # Kaizen changes?
   git log <last-tag>..HEAD -- kailash-nexus/      # Nexus changes?
   ```
2. **Present release plan** — which packages, version bump type, dependency updates. **STOP and wait for human approval.**

#### Steps 1-7

Version bump → consistency verification → pre-release prep → build/validate on TestPyPI → git workflow → publish to PyPI → post-release. See `skills/10-deployment-git/release-runbook.md` for the full step-by-step procedure, version locations, and verification commands.

### Agent teams (SDK publish)

- **release-specialist** — codebase analysis, onboarding, SDK release execution
- **release-specialist** — Git workflow, PR creation, version management
- **security-reviewer** — Pre-release security audit (MANDATORY)
- **testing-specialist** — Verify test coverage before release
- **reviewer** — Verify documentation builds and code examples

### Critical Rules (SDK publish)

- NEVER publish without full test suite passing
- NEVER skip TestPyPI for major/minor releases
- NEVER commit PyPI tokens — use `~/.pypirc` or CI secrets
- NEVER skip security review before publishing
- NEVER release a framework without updating its `kailash>=` dependency
- ALWAYS update version in BOTH locations (`pyproject.toml` AND `__init__.py`)
- ALWAYS verify published package installs in clean venv
- ALWAYS publish in dependency order: core SDK first, then frameworks
- ALWAYS document releases in `deploy/deployments/`
- ALWAYS update COC template repo dependency pins after publishing
- Research current tool syntax — do not assume stale knowledge is correct

**Automated enforcement**: `validate-deployment.js` hook blocks commits containing credentials in deployment files.

## Skill References

- `skills/10-deployment-git/release-runbook.md` — Version tables, step-by-step procedures, verification commands (SDK publish)
- `skills/10-deployment-git/deployment-packages.md` — Package release patterns
- `skills/10-deployment-git/deployment-ci.md` — CI/CD infrastructure
