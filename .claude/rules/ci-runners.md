---
priority: 10
scope: path-scoped
paths:
  - ".github/workflows/**"
  - "**/ci/**"
  - "**/.github/**"
---

# CI Runner Rules

<!-- slot:neutral-body -->


Self-hosted CI runner hygiene for the Rust SDK (macOS self-hosted runners, `<org>/<repo>` repo). Language-agnostic MUSTs apply to every project using GitHub Actions self-hosted runners; §6 and §7 below capture Rust-SDK-specific dispatcher-state remediation with runner hostnames and `launchctl` invocations.

For recovery protocols, service-management commands, and step-by-step troubleshooting, see `skills/10-deployment-git/ci-runner-troubleshooting.md`.

## MUST Rules

> **Operator-local values.** This runbook uses generic placeholders
> (`<org>/<repo>`, `<runner-host>`, `<runner-service-label>`). Operator-specific
> concrete values for THIS deployment live in
> `.claude/variants/rs/rules/ci-runners.operator.local.md` (gitignored, never
> synced — issue #260). Its schema and how to populate it are documented in the
> committed `.claude/variants/rs/rules/ci-runners.operator.local.example.md`.
> When executing a protocol below, substitute the placeholders with the values
> from your operator-local file.

### 1. Every Toolchain-Consuming Job Includes A Toolchain Setup Step

Every job that invokes a language toolchain (`cargo`, `maturin`, `rustc`, `npm`, `pnpm`, `bundle`, etc.) MUST include a dedicated toolchain setup step (e.g. `dtolnay/rust-toolchain@stable`, `actions/setup-node`, `ruby/setup-ruby`) as one of its earliest steps — even if a previous job in the same workflow already installed the toolchain.

```yaml
# DO — every job re-establishes its own toolchain
steps:
  - uses: actions/checkout@v4
  - uses: dtolnay/rust-toolchain@stable
  - name: Build
    run: cargo build --release

# DO NOT — relying on a sibling job's toolchain install
steps:
  - uses: actions/checkout@v4
  - name: Build
    run: cargo build --release # fails if PATH was re-written by an earlier job
```

**Why:** Self-hosted runners do not reset `PATH` between jobs cleanly. A sibling job that reinstalled `rustup` or ran `nvm use` leaves the runner in a state where the proxy binary (`~/.cargo/bin/rustup`, `~/.nvm/...`) may be missing or points to the wrong version. Each job re-establishing its own toolchain is the only structural defense.

### 2. Restart The Runner After Changing Its Environment File

After editing the runner's `.env` file (e.g. `~/actions-runner-*/.env`), the runner MUST be restarted via `launchctl unload && launchctl load` (macOS) or `systemctl restart` (Linux). Running jobs MUST be allowed to complete under the old environment before the restart.

```bash
# DO — explicit unload, wait for in-flight jobs, reload
launchctl unload ~/Library/LaunchAgents/com.github.actions.runner.<name>.plist
# wait for any in-flight job to drain
launchctl load ~/Library/LaunchAgents/com.github.actions.runner.<name>.plist

# DO NOT — edit .env and expect new jobs to pick up changes
vim ~/actions-runner-<name>/.env  # save
# next queued job still reads the old env because the runner process cached it at startup
```

**Why:** The runner daemon reads its `.env` once at process startup. Silent drift between "what operators edited" and "what jobs actually ran with" is invisible until a job fails with a missing variable that the operator can see in the file.

### 3. Post-fmt Cascade Discovery Protocol

When `Format` (or any early short-circuiting gate) transitions from red to green for the first time in a long while, the session MUST expect multiple subsequent failures and budget for multi-wave triage. A red fmt gate short-circuits the pipeline — Clippy, Docs, Deny, Test, MSRV, and Integration Tests are SKIPPED, not failed. Pre-existing failures in those gates accumulate invisibly and surface one-wave-at-a-time once fmt is green.

```yaml
# DO — tight triage loop until all gates green
# push → inspect failing gate → fix root cause → push → repeat
# accept that wave N+1 may reveal a failure wave N masked

# DO NOT — declare victory after fmt goes green
# gh pr checks <N>  # fmt: pass, 6 others: skipped (NOT green)
# git push origin feat/cleanup  # "CI is fixed" — it isn't
```

**BLOCKED rationalizations:**

- "Fmt is green, CI is fixed"
- "The other gates were skipped, so they're passing"
- "We can triage the rest in parallel branches"
- "These failures are pre-existing, not our problem"

**Why:** Short-circuit semantics hide months of accumulated failures behind a single red fmt. Declaring "fixed" after fmt green leaves the downstream backlog to surface on the next unrelated PR, where the failures look like new regressions. Parallel triage branches also break because each wave's fix depends on the previous wave's state.

### 4. Runner Auto-Update Disconnect Recovery

If `gh api repos/<org>/<repo>/actions/runners` returns 0 runners while the runner's stdout log tails show `Connected to GitHub` and `Listening for Jobs`, the runner auto-updated mid-session and its in-flight job is orphaned — the old worker process holds the job in GitHub's state machine but cannot report completion. The session MUST restart the runner service AND trigger a fresh run via an empty commit.

```bash
# DO — re-register the runner and trigger a fresh run
launchctl unload ~/Library/LaunchAgents/com.github.actions.runner.<name>.plist
launchctl load ~/Library/LaunchAgents/com.github.actions.runner.<name>.plist
git commit --allow-empty -m "chore(ci): trigger fresh run post-runner-update"
git push

# DO NOT — rerun the orphaned run; the dead worker still owns the job
gh run rerun <run-id> --failed  # the new worker can't claim the old worker's jobs
```

**BLOCKED rationalizations:**

- "The runner log says Connected, it must be fine"
- "Wait for the hung job to time out on its own"
- "Re-run the failed job, it'll get picked up"

**Why:** The GitHub Actions runner auto-update path renames and replaces the worker binary. Jobs assigned to the dead worker cannot be claimed by the new worker; GitHub's dispatcher needs a new trigger to assign the job. Without the service restart, the "Connected" log is from a fresh worker that never knew about the orphaned job, and the hung run blocks the PR for hours.

### 5. Binding-CI Paths Filter Matches The Core-Lang Pattern

Every binding-channel CI workflow (`python.yml`, `nodejs.yml`, `ruby.yml`, `wasm.yml`, etc.) MUST have a `paths:` filter that covers the transitive dependency graph of the core language, not just the binding directory. Narrow enumerations of specific packages or crates silently stop matching whenever a new transitive dependency is added.

```yaml
# DO — broad filter matches the core-language CI's pattern
on:
  pull_request:
    paths:
      - "bindings/python/**"
      - "crates/**"
      - "Cargo.toml"
      - "Cargo.lock"
      - ".github/workflows/python.yml"

# DO NOT — enumerate specific packages
on:
  pull_request:
    paths:
      - "bindings/python/**"
      - "crates/kailash-capi/**"
      - "crates/kailash-ml*/**" # misses kailash-core, kailash-nexus, etc.
```

**BLOCKED rationalizations:**

- "The binding only depends on these packages today"
- "Broad filter triggers too many unnecessary builds"
- "We'll update the filter when we add new deps"

**Why:** Bindings transitively link most of a workspace. A narrow filter means a fix to a shared dependency triggers the core CI but skips the binding CI, letting the binding ship broken into the next release. When a shared crate change lands and the binding CI reports "no changes", that is the exact failure mode this rule prevents.

### 6. Zombie-Job Cancellation Protocol

When a job on a self-hosted runner (e.g. `<runner-host-1>`, `<runner-host-2>`, `<runner-host-3>`) remains `in_progress` for >2× its normal completion time, it is a zombie — the runner process is stuck (network drop, hung test, maturin/poetry lock) or the worker crashed without reporting to the dispatcher. From the dispatcher's perspective the runner slot stays `busy: true`, blocking every subsequent job queued for that runner's label.

```bash
# DO — diagnose then cancel, kickstart if the worker itself is wedged
# Step 1: enumerate runner state to identify the zombie
gh api orgs/<org>/actions/runners \
  --jq '.runners[] | {name, busy, status}'

# Step 2: cross-reference with the stuck run's jobs
gh api repos/<org>/<repo>/actions/runs/<run-id>/jobs \
  --jq '.jobs[] | {name, status, started_at, runner_name}'

# Step 3: cancel the stuck run to free the runner slot
gh run cancel <run-id>

# Step 4: if cancel is not acknowledged within 2 minutes, the runner
# process itself is deadlocked — kickstart the service agent:
# macOS:
launchctl kickstart -k "gui/$UID/<runner-service-label>.<runner-name>"
# Linux (systemd):
sudo systemctl restart <runner-service-label>.<runner-name>.service

# DO NOT — wait for the zombie to time out on its own
# The default job timeout is 6 hours; the queue stays blocked the entire time.
```

**BLOCKED rationalizations:**

- "The job might still be running, let me wait another 30 minutes"
- "Cancelling will lose the partial results"
- "The runner will self-recover when it notices the disconnect"
- "Restarting the service mid-session risks the other runners"
- "I'll just push a new commit to trigger a fresh run"

**Why:** A zombie job holds the runner's dispatcher-side `busy` flag indefinitely. Every queued job assigned to that runner's label waits behind the zombie until either the 6-hour timeout fires or the job is explicitly cancelled. `gh run cancel` frees the slot immediately; if the runner worker is also deadlocked at the OS level (hung test, lock contention, FFI build lock), `launchctl kickstart -k` / `systemctl restart` respawns the agent. Pushing a new commit does NOT help — the new run queues behind the zombie in the same runner's job list.

Origin: the Rust SDK 2026-04-20 — `<runner-host-1>` had a phantom "Integration Tests" job from 4h 40m prior blocking the entire PR queue; `gh run cancel` cleared it in <10 seconds.

### 7. Idle-But-Not-Accepting Runner Protocol — De-Register, Don't Restart

When a self-hosted runner reports `busy: false` + `status: online` yet refuses to accept queued jobs (queue depth > 0 for > 5 minutes while the runner sits idle with matching labels), the agent is NOT restartable from outside the host. MUST de-register the runner via `gh api -X DELETE` so the dispatcher redistributes pending jobs to the remaining healthy runners.

This is DISTINCT from §6 (zombie-job): a zombie has `busy: true` + a specific `in_progress` run stuck for hours. An idle-not-accepting runner has `busy: false` and NO assigned job, but the dispatcher has decided it's "reserved" for queued work that never dispatches. Both block the queue; the remediations differ.

```bash
# DO — de-register the idle-not-accepting runner
# Step 1: confirm the diagnosis — idle + online + queue depth > 0
gh api orgs/<org>/actions/runners \
  --jq '.runners[] | {name, busy, status, labels: [.labels[].name]}'
# If exactly one runner shows busy=false + status=online AND a PR has
# jobs QUEUED for minutes, you have an idle-not-accepting runner.

# Step 2: confirm queue depth on the affected PR
gh pr view <PR-NUM> --json statusCheckRollup \
  --jq '[.statusCheckRollup[] | select(.conclusion == null or .conclusion == "")] | length'

# Step 3: de-register the idle runner — ID is from step 1's response
RUNNER_ID=$(gh api orgs/<org>/actions/runners \
  --jq '.runners[] | select(.name == "<runner-name>") | .id')
gh api -X DELETE orgs/<org>/actions/runners/$RUNNER_ID

# Step 4: verify — queued jobs should start dispatching to the remaining
# runners within 30-60 seconds
gh pr view <PR-NUM> --json statusCheckRollup \
  --jq '.statusCheckRollup[] | select(.status == "IN_PROGRESS") | .name'

# DO NOT — wait for the runner to self-recover
# A runner in this state is deadlocked at the job-pickup poll; it will
# continue heartbeating "online" indefinitely without accepting work.
```

**BLOCKED rationalizations:**

- "Let me restart the runner agent — that always works"
- "I'll wait another 10 minutes, maybe it'll pick up the next poll cycle"
- "De-registration loses capacity permanently"
- "The runner is online, the dispatcher must be about to dispatch"
- "This is a dispatcher-side bug, not mine to fix"
- "Restarting risks interfering with runs on the other runners"

**Why:** A runner in the idle-not-accepting state has a registered listener process that passes the heartbeat (hence `online`) but whose job-acceptance loop is wedged (hence `busy: false` while queued work exists). Restart requires physical/SSH access to the host, which may be unavailable mid-incident. `gh api -X DELETE` works entirely from the orchestrator side, removes the runner from the dispatcher's label-match pool immediately, and queued jobs re-dispatch to the remaining runners within the next poll cycle (usually <60 seconds). The runner can be re-registered later once the host is reachable; the capacity loss is temporary and recovered without a live-incident SSH session.

**Relationship to §6:** §6 is "job stuck, runner held busy"; §7 is "runner stuck idle, queue held waiting". Together they cover both failure modes of self-hosted dispatcher state. If you can't tell which state you're in, check `busy:` — `true` → §6, `false` with queue depth → §7.

Origin: the Rust SDK 2026-04-20 v3.20.1 release — a runner idled with `busy:false, status:online` while 5 matrix jobs sat queued for 27 minutes; de-registration via `gh api -X DELETE` unblocked redistribution within 3 minutes as the remaining runners absorbed the matrix.

### 8. Tag-Gated Release Jobs Require A Non-Tag `workflow_dispatch` Dry-Run Proxy

Every job inside `release.yml` (or any workflow) whose trigger is `on: push: tags:` MUST have a sibling `workflow_dispatch:` input path that exercises the same build + upload steps on a non-tag ref. Relying on release tags as the first integration test is BLOCKED — tag-time is too late for the error to be cheap to fix.

```yaml
# DO — workflow_dispatch dry-run proxy exercises the same steps
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Build + upload but skip cargo/gem/pypi publish"
        type: boolean
        default: true
      target:
        description: "publish-ruby-gem | publish-pypi-wheels | publish-crates"
        type: choice
        options:
          - publish-ruby-gem
          - publish-pypi-wheels
          - publish-crates

permissions:
  contents: write # needed for gh release upload (§5)

jobs:
  publish-ruby-gem:
    if: |
      startsWith(github.ref, 'refs/tags/v') ||
      (github.event_name == 'workflow_dispatch' &&
       github.event.inputs.target == 'publish-ruby-gem')
    runs-on: <runner-label-arm>
    steps:
      - uses: actions/checkout@v4
      - name: Install Docker (runner base image is minimal)
        run: ...
      - name: Install gh CLI (runner base image is minimal)
        run: ...
      - name: Build gem
        run: bundle exec rake build
      - name: Upload to release
        if: startsWith(github.ref, 'refs/tags/v')
        run: gh release upload "${{ github.ref_name }}" pkg/*.gem
      - name: Dry-run verify (no upload)
        if: github.event.inputs.dry_run == 'true'
        run: ls -la pkg/*.gem && echo "Build OK; skipping publish"

# DO NOT — tag-only trigger with no dispatch proxy
on:
  push:
    tags: ["v*"]
jobs:
  publish-ruby-gem:
    runs-on: <runner-label-arm>
    steps:
      - uses: actions/checkout@v4
      - run: bundle exec rake build
      - run: gh release upload "${{ github.ref_name }}" pkg/*.gem
# First integration test of the runner + Docker + gh install sequence
# happens at tag time, blocking the release on whatever was missing.
```

**BLOCKED rationalizations:**

- "Release.yml is only exercised at release, that's the point"
- "A dispatch input duplicates the tag trigger"
- "We'll fire a manual dry-run when we think something changed"
- "CI already builds on every PR, that's the dry-run"
- "The rescue-workflow pattern covers this"

**Why:** Tag-gated jobs on a self-hosted or GitHub-hosted-larger runner interact with the runner's image, PATH, installed Docker state, `gh` CLI availability, and `contents: write` permission. None of these are exercised on PR CI (which runs on different workflows, different runners, different permissions). The v3.20.3 / v3.20.4 / v3.20.5 release chain shipped three distinct tag-time bugs in succession — missing Docker on `<runner-label-arm>`, missing `gh` CLI on the same runner, missing `contents: write` on the rescue workflow — because the `release.yml` tag-push path was the first time each surface was exercised. A `workflow_dispatch` dry-run path that builds + conditionally uploads to a release on a non-tag ref turns tag-time into a re-run of a known-green dispatch run. The dispatch proxy IS the Layer 2 prevention plan; the rescue-workflow pattern (commits 2026-04-22, PRs #551 / #552) is Layer 3 recovery, not Layer 2 prevention.

**Enforcement grep:** For every workflow with a `tags:` trigger, assert a `workflow_dispatch:` trigger is declared in the same `on:` block, AND every job gated by `startsWith(github.ref, 'refs/tags/v')` has a sibling `github.event_name == 'workflow_dispatch'` branch that exercises the build steps. Mechanical — the rule is grep-auditable per release-cycle codify pass.

Origin: the Rust SDK 2026-04-22 — PR #543 (v3.20.4, rustls-webpki + Docker install-if-missing on `<runner-label-arm>`), PR #545 (v3.20.5, `gh` install-if-missing), PR #551 + #552 (rescue workflow + contents:write follow-up). Three tag-time bugs in three consecutive releases; dispatch-proxy rule codifies Layer 2 of the prevention plan per the session notes' "still unbuilt" observation. Applies to every tag-gated job: `publish-ruby-gem`, `publish-pypi-wheels`, `publish-crates`, and any future release surface.

### 9. Binding-CI `paths-ignore` Covers ALL Doc-Only Surfaces

Every binding-channel CI workflow (`python.yml`, `nodejs.yml`, `ruby.yml`) MUST include a `paths-ignore` filter that excludes ALL doc-only surfaces — not just `**/*.md`. The current `paths-ignore: ['**/*.md']` is necessary but NOT sufficient: edits to `.claude/skills/`, `.claude/agents/`, `.claude/rules/`, `docs/`, `specs/` (all CC artifacts and project docs) still trigger the full binding matrix even though they cannot affect compiled wheels.

```yaml
# DO — comprehensive doc-only exclusion
on:
  pull_request:
    paths:
      - "bindings/kailash-python/**"
      - "crates/**"
      - "Cargo.toml"
      - "Cargo.lock"
      - ".github/workflows/python.yml"
    paths-ignore:
      - "**/*.md"
      - ".claude/**"
      - "docs/**"
      - "specs/**"
      - "workspaces/**"
      - "memory/**"
      - ".github/ISSUE_TEMPLATE/**"
      - ".github/PULL_REQUEST_TEMPLATE.md"

# DO NOT — partial paths-ignore that still fires on .claude/ edits
on:
  pull_request:
    paths-ignore:
      - "**/*.md"
```

**BLOCKED rationalizations:**

- "`**/*.md` already covers most doc files"
- "Catch-all paths-ignore might mask real changes"
- "Adding more excludes is over-optimization"
- "The cost is small per PR"
- "Each doc-only PR only burns 1 minute per workflow"

**Why:** Bindings ship compiled wheels — none of the listed doc-only surfaces can affect what's built. Each non-excluded doc-only PR triggers ALL binding workflows, each billed at 1-minute minimum on `ubuntu-latest` even when they short-circuit. Compounded over 30-50 doc/codify PRs per month, this is ~150-200 min/month of pure overhead. Excluding `.claude/**`, `docs/**`, `specs/**`, `workspaces/**`, `memory/**` recovers all of that for zero correctness cost.

Origin: 2026-04-25 gh-manager CI burn audit — 66 of 580 GHA-billable minutes were doc-only PR triggers on binding workflows. Closing this gap eliminates that recurring class of waste.

### 10. Workflow Crons MUST Have Explicit Cost Footer

Every `.github/workflows/*.yml` with `schedule: cron:` MUST include a comment block at the top of the file stating: (a) the cron cadence in plain English, (b) the worst-case monthly billing footprint at `ubuntu-latest` rates, (c) the failure-mode behavior. Workflows with cadence ≥ once-per-hour AND no fast-exit short-circuit are BLOCKED.

```yaml
# DO — cost-footer documents budget impact upfront
name: CI Queue Monitor
# ─────────────────────────────────────────────────────────────────
# COST FOOTPRINT
#   Cadence:        every 30 minutes (cron: "*/30 * * * *")
#   Monthly worst:  48 runs/day × 30 days × 1 min = 1,440 min/month
#   Fast-exit:      YES — `gh api` no-op returns in <10s.
# ─────────────────────────────────────────────────────────────────
on:
  schedule:
    - cron: "*/30 * * * *"

# DO NOT — uncosted high-frequency cron
on:
  schedule:
    - cron: "*/5 * * * *" # silently consumes ~8,640 min/month
```

**BLOCKED rationalizations:**

- "Cron is cheap, the workflow exits in seconds"
- "GitHub bills exact runtime, not minimum" (FALSE — billing is per-job, 1-min minimum)
- "We can audit cost later when usage pattern stabilizes"
- "The monitor is critical — frequency reflects priority"
- "Higher cadence catches issues faster"

**Why:** GitHub Actions bills a 1-minute minimum per job invocation regardless of actual runtime. A workflow on `*/5 * * * *` consumes a minimum of 8,640 min/month even if every run exits in under 10 seconds. On a 3,000-min/month free tier, a single mis-cadenced cron consumes 280%+ of the budget BEFORE any productive CI runs. The cost footer makes the trade-off explicit at author time and forces an active decision about cadence vs cost.

Origin: 2026-04-25 the Rust SDK gh-manager audit — `ci-queue-monitor.yml` configured at `cron: "*/5 * * * *"` consumed 288 min/day. Cadence MUST drop to `*/30` minimum.

### 11. Release PRs MUST Skip The PR-Gate Suite

Pull requests from a `release/v*` branch contain ONLY version anchors + CHANGELOG updates — zero code surface. Running the full PR-gate suite on them re-exercises code that was already tested on the source-change PRs that the release bundles. Every PR-gate job in every workflow MUST gate its `if:` to also exclude `release/*` head refs.

```yaml
# DO — PR-gate jobs exclude release branches
jobs:
  fmt:
    if: github.event_name == 'pull_request' && !startsWith(github.head_ref, 'release/')
    ...

  build:
    if: ${{ !startsWith(github.head_ref, 'release/') }}
    ...

# DO NOT — PR-gate jobs fire on release/v* PRs
jobs:
  fmt:
    if: github.event_name == 'pull_request'
    # No head_ref exclusion — release/v3.23.0 re-runs the whole suite
    # against a diff that is ONLY Cargo.toml/Cargo.lock/CHANGELOG.md/version anchors.
    ...
```

**BLOCKED rationalizations:**

- "The version bump might have broken something; defense-in-depth"
- "Running CI on release PRs is the standard release gate"
- "We want to verify the Cargo.lock regeneration didn't break compile"
- "Admin-merge with bypass is safer than baking skip into the workflow"
- "Next contributor might add real code changes to a release branch"
- "release.yml's source-protection-audit is a different gate; we still need PR CI"

**Why:** Release PRs under the `release/v*` branch convention (see `git.md` § "Release-Prep PRs MUST Use `release/v*` Branch Convention") are by contract metadata-only. The source changes they bundle were each individually verified on their own PR — re-running the full suite a third time against a pure-metadata diff adds no coverage and wastes ~45 min of runner wall-clock per release cycle. The tag-triggered `release.yml` has its own `source-protection-audit` gate that validates the actual published artifacts — THAT is the release gate, not PR CI. If a contributor smuggles a code change into a `release/v*` branch, the merge-commit push event will still fire integration jobs on main post-merge.

**Contract:** `release/v*` branches are reserved for release-cut commits — version bumps in `Cargo.toml` / `bindings/kailash-python/pyproject.toml`, version-anchor updates in `specs/_index.md` + `specs/release-pipeline.md`, CHANGELOG entries, and Cargo.lock regeneration side effects. Anything else on a `release/v*` branch is a process error.

**Enforcement:** `/redteam` MUST verify every PR-gate job in every workflow includes `!startsWith(github.head_ref, 'release/')` in its `if:` clause:

```bash
for f in .github/workflows/rust.yml .github/workflows/python.yml \
         .github/workflows/ruby.yml .github/workflows/nodejs.yml; do
  pr_gated=$(grep -c "if:.*pull_request\|if:.*!startsWith.*release" "$f")
  jobs_count=$(grep -c "^  [a-z][a-z_-]*:$" "$f")
  real_jobs=$((jobs_count - 1))
  echo "$f: $real_jobs jobs, $pr_gated have release-skip clause"
done
```

Origin: 2026-04-22 the Rust SDK session — release PR #531 (pure version bump, 6 files touched, zero code surface) running the full PR-gate suite for the third time on the same code. Codified as a MUST gate; savings are per-release cycle (~45 min `<runner-host>` + bindings).

### 12. Docker-Based Jobs MUST Run On Linux Runners

Every job that invokes `docker run` / `docker build` / `docker compose` / `docker exec` or depends on a Docker-managed service container MUST set `runs-on:` to a Linux runner (`ubuntu-latest`, the org's `<runner-label-arm>`, or any other Linux self-hosted). Routing Docker workloads to macOS runners is BLOCKED.

```yaml
# DO — Docker workload on Linux
test-integration:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      ...
  steps:
    - run: docker compose up -d redis

# DO NOT — Docker workload on macOS (Docker Desktop adds a Linux VM mid-flight)
test-integration:
  runs-on: [self-hosted, macos, <runner-label>]
  services:
    postgres:
      image: postgres:16
      ...
```

**BLOCKED rationalizations:**

- "Docker Desktop on macOS works fine, the Linux requirement is dogma"
- "We have a fast Mac Studio, ubuntu-latest 2-core is slower"
- "This one job's flake rate is acceptable, codifying is overkill"
- "Native arm64 Mac mini runs Docker fine, only Intel Mac is the problem"
- "We'll route to Linux when we add more services"

**Why:** Docker Desktop on macOS interposes a Linux VM between the job and the container; Postgres / Redis / MySQL startup races flake ~75% of the time on this surface (verified by a Mac runner audit), versus <1% on native Linux. The wall-clock difference between Mac M-series and `ubuntu-latest` 2-core is measured in tens of seconds; the cost of a single flake is a full re-run (tens of minutes plus operator triage). Routing Docker to Linux is a permanent architectural decision, not a per-job judgment call. Mechanical gate: `/redteam` MUST grep every workflow for `docker (run|build|compose|exec)` AND `services:` blocks; any hit on a non-Linux `runs-on:` is a HIGH finding.

Origin: the Rust SDK 2026-04-22 — user restated the principle ("docker one goes to ubuntu-latest please") after a PR #527 revert cycle showed how easily runner routing drifts.

### 13. PR-Gate Jobs MUST Be Event-Gated To `pull_request`; Push-Triggered Jobs MUST Be Main-Only

Under the admin-merge flow (this repo's exclusive merge path), the merge commit's tree equals the PR head's tree. Re-running PR-gate CI on the merge-commit push therefore re-exercises the same surface the PR CI already verified — a 100% redundant ~45 min of runner wall-clock per merge. Every workflow MUST partition jobs into PR-gate (fires only on `pull_request`) and main-only (fires only on `push` to `refs/heads/main`); workflows with no main-only jobs MUST drop the `push:` trigger entirely.

```yaml
# DO — PR-gate jobs explicitly conditioned on pull_request event
fmt:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  ...

clippy:
  if: github.event_name == 'pull_request' && !startsWith(github.head_ref, 'release/')
  runs-on: ubuntu-latest
  ...

# DO — main-only job conditioned on push to main
test-integration:
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  runs-on: ubuntu-latest
  ...

# DO — workflow with zero main-only jobs drops push: trigger entirely
on:
  pull_request:
    paths: ['bindings/python/**']
# (no `push:` block — bindings have no main-only matrix)

# DO NOT — every job fires on every event, doubling runner cost per merge
on:
  push:
    branches: [main]
  pull_request:
jobs:
  fmt:
    runs-on: ubuntu-latest
    # ↑ no `if:`; runs on PR event AND merge-commit push event = 2× cost per merge
```

**BLOCKED rationalizations:**

- "Defense in depth — running it twice catches race conditions"
- "The merge commit's tree might differ from the PR head if rebase happened mid-merge"
- "Disabling push-event jobs makes me nervous"
- "We're paying for the runners anyway, the wall-clock isn't free but it's not blocking"
- "If we ever stop using admin-merge, the partition will need to be reverted"
- "Main-branch CI is the canonical signal; PR CI is convenience"

**Why:** With `cancel-in-progress: true` plus admin-merge flow, the merge commit's tree is identical to the PR head's tree by git construction — re-running every PR-gate job on the push event provides zero additional coverage and burns ~45 min per merge across the matrix. The partition is reversible: if direct-push to main becomes possible (e.g., emergency hotfix protocol), the `if:` clauses convert to `pull_request OR push-to-main`. Mechanical gate: `/redteam` MUST audit every workflow for `on: push:` + `on: pull_request:` pairs and verify every non-main-only job has `if: github.event_name == 'pull_request'` (or the release-skip clause from §11).

Origin: the Rust SDK 2026-04-22 — user observed PR #528 running the full CI matrix twice (PR event then merge-commit push event) and asked "isn't that very wasteful?" Codified the partition; PR #529 implemented it across all workflows. Same root cause as §11 but at the event-gating layer instead of the branch-prefix layer.

## MUST NOT Rules

### 1. Never Commit Registration Tokens

Runner registration tokens expire after 1 hour and become credentials once committed. MUST NOT commit hardcoded tokens to version control. Always use placeholder `RUNNER_TOKEN="REPLACE_WITH_FRESH_TOKEN"` in setup scripts.

**Why:** A token committed to a public branch is harvested by token scanners within minutes and used to register unauthorized runners into the repository's job queue.

### 2. Every `upload-artifact` Step MUST Use `continue-on-error: true`

GitHub Actions artifact storage has a per-account quota that recalculates every 6-12 hours. When exhausted, `upload-artifact` returns `Failed to CreateArtifact: Artifact storage quota has been hit` and fails the job even though the underlying build succeeded. This masks real build success with an infrastructure billing problem.

Every `actions/upload-artifact@v*` step across ALL workflows MUST include `continue-on-error: true`:

```yaml
# DO
- uses: actions/upload-artifact@v7
  continue-on-error: true
  with:
    name: wheel-${{ matrix.python-version.label }}
    path: target/wheels/*.whl

# DO NOT
- uses: actions/upload-artifact@v7
  with:
    name: wheel-${{ matrix.python-version.label }}
    path: target/wheels/*.whl
```

**BLOCKED rationalizations:**

- "The upload failure is a legitimate build failure"
- "Adding continue-on-error hides real problems"
- "We'll fix it when the quota resets"
- "This only affects release.yml"

**Why:** The failure mode re-surfaces every ~12h on PR CI until someone re-discovers the fix. Codify once, apply everywhere.

Origin: the Rust SDK CI cascade waves 6-18 (commits `ecc50c4e..5429928c`, 2026-04-16/17). 12 consecutive waves fixed pre-existing failures hidden by fmt short-circuit. Wave 17 fixup to a shared crate didn't trigger Python/Node/Ruby binding CI because their paths filters excluded the shared-crates tree. Runner auto-update at a trivial commit orphaned one run and required a service restart. Recovery protocols for each MUST rule live in `skills/10-deployment-git/ci-runner-troubleshooting.md`.

<!-- /slot:neutral-body -->
