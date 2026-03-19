# /deploy - Deployment Command

Standalone deployment command. Not a workspace phase — runs independently after any number of implement/redteam cycles.

## What This Phase Does (present to user)

Get the project live — whether that's publishing a software package, deploying to the cloud, or both. If this is your first deployment, we'll walk through setup questions. Nothing goes live without your explicit approval at every step.

## Your Role (communicate to user)

Answer setup questions about where and how to deploy (we'll explain each option and its implications), and approve each step before it happens. You'll always know what's about to happen before it does.

## Deployment Config

Read `deploy/deployment-config.md` at the project root. This is the single source of truth for how this project deploys.

## Mode Detection

### If `deploy/deployment-config.md` does NOT exist → Onboard Mode

Run the deployment onboarding process:

1. **Analyze the codebase**
   - What type of project? (package, web app, API service, CLI tool, multi-service)
   - What build system? (setuptools, hatch, poetry, maturin)
   - Existing deployment artifacts? (Dockerfile, docker-compose, k8s manifests, terraform, CI workflows)
   - What services does it depend on? (databases, caches, queues, external APIs)

2. **Ask the human (explain implications of each choice)**

   For each question, explain what the options mean and recommend based on context:

   - **How should we release this?** Explain: "A package release means other developers can install your software. A cloud deployment means users access it via a website or app. You might need both."
   - **Where should we host it?** Don't just list "AWS, Azure, GCP" — explain: "AWS is the most widely used with the broadest services. Azure works well if your organization already uses Microsoft tools. GCP is strong for data and AI workloads. All three are fine — do you have a preference or existing accounts?"
   - **What about costs?** Provide estimates where possible: "A basic cloud setup typically costs $X-Y/month. The main costs are [explain]. Want me to look at budget-friendly options?"
   - **Domain and security**: Explain in practical terms: "Do you have a website address (domain name) for this? If not, we can set one up. We'll automatically set up secure connections (HTTPS) so your users' data is protected."
   - **Monitoring**: "Should we set up alerts so you're notified if the app goes down or has problems? I'd recommend this for anything user-facing."

3. **Research current best practices**
   - Use web search for current provider-specific guidance
   - Use CLI help for current command syntax
   - Do NOT rely on encoded knowledge — providers change constantly

4. **Create `deploy/deployment-config.md`**
   - Document all decisions with rationale
   - Include step-by-step deployment runbook
   - Include rollback procedure
   - Include production checklist

5. **STOP — present to human for review**

### If `deploy/deployment-config.md` EXISTS → Execute Mode

Read the config and execute the appropriate track:

#### Step 0: Package Freshness (ALL tracks — MANDATORY)

Before ANY deployment, verify SDK packages are current:

```bash
# Check installed vs latest
pip install --upgrade kailash-enterprise  # For Rust SDK users
# OR
pip install --upgrade kailash kailash-dataflow kailash-nexus kailash-kaizen  # For Python SDK users
```

If the deployment target (server, container, etc.) has stale packages, update them BEFORE deploying application code. **This is the #1 cause of "my fix isn't working on the server" issues.**

Also verify COC sync is current — check `.claude/.coc-sync-marker` if it exists.

**BLOCKED:** Deploying with outdated SDK packages. See `rules/zero-tolerance.md` Rule 5.

#### Package Release Track

1. **Pre-release prep**
   - Update README.md and CHANGELOG.md
   - Build docs (sphinx/mkdocs if configured)
   - Run full test suite
   - Security review

2. **Git workflow**
   - Stage all changes
   - Commit with conventional message: `chore: release vX.Y.Z`
   - Push (or create PR if protected branch)
   - Watch CI, merge when green

3. **Publish**
   - GitHub Release with tag
   - PyPI publish (if configured): `python -m build && twine upload dist/*.whl`
   - Verify: `pip install package==X.Y.Z` in clean venv

#### Cloud Deployment Track

1. **Pre-deploy**
   - Run full test suite
   - Security review
   - Build artifacts (Docker image, etc.)

2. **Authenticate**
   - CLI SSO login (aws sso login / az login / gcloud auth login)
   - Verify correct account and region

3. **Deploy**
   - Follow the runbook in deployment-config.md
   - Use CLI commands — research current syntax if unsure
   - Human approval gate before each destructive operation

4. **Verify**
   - Health checks pass
   - SSL working
   - Monitoring receiving data
   - Run smoke tests against production

5. **Report**
   - Document deployment in `deploy/deployments/YYYY-MM-DD-vX.Y.Z.md`
   - Note any issues encountered

## Agent Teams

- **deployment-specialist** — Analyze codebase, run onboarding, guide deployment
- **git-release-specialist** — Git workflow, PR creation, version management
- **security-reviewer** — Pre-deployment security audit (MANDATORY)
- **testing-specialist** — Verify test coverage before deploy

## Critical Rules

- NEVER hardcode cloud credentials — use CLI SSO only
- NEVER deploy without running tests first
- NEVER skip security review before deploy
- NEVER create or modify `.github/workflows/` files without explicit human approval (see CI/CD rule below)
- ALWAYS get human approval before destructive cloud operations
- ALWAYS document deployments in `deploy/deployments/`
- Research current CLI syntax — do not assume stale knowledge is correct

### CI/CD GitHub Actions — ALWAYS ASK FIRST

**Do NOT automatically create GitHub Actions workflow files.** GitHub Actions minutes are a finite, paid resource. A misconfigured workflow can burn through an entire monthly allocation in a single run.

Before touching anything in `.github/workflows/`, you MUST:

1. **Ask the user** whether they want CI/CD automation at all
2. **Present the options with cost implications**:
   - **No CI/CD**: Run tests locally. Zero cost. Good for solo projects or early-stage work.
   - **Minimal CI**: Test on push to main only (no PR triggers, single version, single OS). Low cost (~5-10 min/run).
   - **Standard CI**: Test matrix on PR + push (multiple versions, single OS). Moderate cost (~15-30 min/run).
   - **Full CI**: Multi-OS matrix, wheel/gem builds, docs deploy, package publish. High cost (~60+ min/run per trigger).
3. **Explain the billing impact**: "GitHub Free gives 2,000 minutes/month. A full matrix with 3 versions x 3 OS = 9 jobs per push. If each takes 5 min, that's 45 min per push. Push 10 times a week = 1,800 min/month — nearly your entire budget."
4. **Wait for explicit approval** before creating any workflow file
5. **Never enable `on: push` to all branches** — always scope to `main` or specific branches

**Automated enforcement**: `validate-deployment.js` hook automatically blocks commits containing cloud credentials (AWS keys, Azure secrets, GCP service account JSON, private keys, GitHub/PyPI/Docker tokens) in deployment files.
