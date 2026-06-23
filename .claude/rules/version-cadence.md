---
priority: 10
scope: path-scoped
paths:
  - "Cargo.toml"
  - "**/Cargo.toml"
  - "CHANGELOG.md"
  - "bindings/kailash-python/pyproject.toml"
  - "bindings/kailash-node/package.json"
  - "bindings/kailash-ruby/kailash.gemspec"
  - "bindings/kailash-ruby/lib/kailash/version.rb"
  - "bindings/kailash-dotnet/Directory.Build.props"
  - "bindings/kailash-dotnet/**/*.csproj"
  - "bindings/kailash-rails/kailash-rails.gemspec"
  - "bindings/kailash-rails/lib/kailash/rails/version.rb"
  - "ffi/kailash-java/pom.xml"
  - "ffi/kailash-java/build.gradle.kts"
  - "scripts/check-version-sync.sh"
  - "deploy/deployment-config.md"
  - ".github/workflows/release*.yml"
  - ".github/workflows/specs-gate.yml"
---

# Version Cadence Discipline — Consumer-Visible Or Parity-Closing Triggers

## Origin

2026-05-13 to 2026-05-16 — five days of version churn (v3.20.5 → v3.21 → ... → v3.29.1 → **v4.0.0** → an agent proposing **v5.0.0** within 72 hours of v4.0.0). User intervention: "we should have kept to v3. I don't see why v4 is required. Major version churn just reeks of poor planning." v4.0.0's content was a single deprecated-trait-shim removal (`From<bool> for AutoMigrate`, PR #692) — strict-semver-by-reflex on a change no consumer of any binding could observe. The strict-semver-by-reflex pattern is the failure mode this rule still blocks.

**Policy reversal (2026-06-01, journal/0149).** This rule was authored under the "one real consumer = Python; bindings are deferrable" stance. That stance is SUPERSEDED. The all-binding parity directive (`memory/feedback_python_only_bindings.md`) makes every binding (python, node, ruby, dotnet, rails, go, java, wasm) a REQUIRED parity target to 100% of its platform-reachable ceiling. The "binding-internal = no release" carve-out is REMOVED for parity-closing work — that carve-out is exactly what forced the #1151 `rebuild_ruby_gems` dispatch hack. Python-first ORDERING is retained (explicitly allowed by the co-owner); Python-ONLY weighting is removed.

**Major-bump strengthening (2026-06-20, `workspaces/version-major-bump-strictness/`).** Co-owner directive, verbatim: _"caution must be exercised when bumping major versioning, we went from v0 to v4 in a few months. We need to be stricter on what constitutes major version bump."_ MUST Rule 2 was strengthened from "major requires a consumer-observable break" to require ALL THREE of (a) a consumer-observable break, (b) pre-deprecation for ≥1 minor cycle, and (c) explicit human authorization — plus two MUST NOT clauses (never-deprecated-break-as-major; semver-reflex-as-authority). Evidence (verified this session via `git tag`): the live tag train carries THREE majors — `v2.0.0` (2026-03-01), `v3.0.0` (2026-03-22), `v4.0.0` (2026-05-13); there is no `v1.0.0` (earliest tag `v0.1.0`) — three major bumps in ~2.5 months, exactly the v0→v4 churn the directive flags. The most recent, `v4.0.0`, removed `From<bool> for AutoMigrate` — a Rust-INTERNAL break no binding consumer could observe, so it failed condition (a); it WAS properly deprecated first (documentation-driven, 3.25.0 → 4.0.0 per `zero-tolerance.md` Rule 6a, since Rust forbids `#[deprecated]` on trait impls), so the gap v4.0.0 exposes is the (a) consumer-observable test — NOT (b). The prior rule (authored around v4.0.0) reserved majors for consumer-observable breaks and blocked the follow-on `v5.0.0`-within-72h proposal, but did not make deprecate-first (b) or a human gate (c) HARD requirements — leaving open the future case of a consumer-observable break cut as a major WITHOUT the deprecation cycle this repo currently runs by discipline. `v4.0.0 → v4.9.0` since has been all minors (the reserve held post-v4); (b)+(c) make the existing discipline structural so the next major cannot fire reflexively on an un-warned break. Length: the rule body crosses the `rule-authoring.md` 200-line guidance — named rationale: **major-bump-gate completeness**, the (a)/(b)/(c) conditions + paired MUST NOT clauses + Trust-Posture Wiring are non-decomposable for a release-time reference rule (path-scoped, zero baseline cost); sibling precedent `multi-operator-coordination.md` Origin.

## Principle

Two distinct things must not be confused. **Parity-closing and consumer-visible work IS release-worthy value** — adding a whole framework to a binding, expanding the C-ABI surface, fixing a bug any binding's consumer can observe, or breaking any binding's public API. **Strict-semver-by-reflex on changes no binding consumer can observe is NOT** — a Rust-internal trait-shim removal, an internal struct rename, a refactor that never reaches any binding's surface.

**The version anchor is a contract with the consumer.** All bindings ship lock-step on the workspace version anchor (`scripts/check-version-sync.sh` enforces `Cargo.toml` == every binding manifest). A version bump signals "a consumer of some binding should look"; the discipline is to make sure there is actually something for them to look at, and to reserve the major-bump signal for real breaks.

## MUST Rules

### 1. Version Bump Triggers Are Consumer-Visible OR Parity-Closing

A new release tag (`vX.Y.Z`) MUST be cut ONLY when the diff since the prior tag contains at least one of:

- **Any-binding public-API change** — added / removed / renamed symbol on ANY binding's public surface (python, node, ruby, go, java, dotnet, rails, wasm); a signature change on an already-exposed method; a new capability surfaced through PyO3 / napi-rs / Magnus / the C-ABI.
- **Parity-closing change** — a binding gains a whole framework it lacked (e.g. Ruby gains ML), OR the `kailash-capi` C-ABI surface expands (the keystone that unblocks the FFI bindings). Parity-closing work IS consumer value now; it is no longer carved out.
- **Any-binding bug fix** — a consumer of any binding would observe a behavior change (return value, raised exception, performance) on existing code.
- **Dependency change** — added / removed / version-pinned a runtime dependency declared in any binding manifest.
- **Security fix** — vulnerability in any consumer-reachable code path (Rust crate or transitive dependency), regardless of public-API impact.

If the diff since the prior tag matches NONE of the above (it is purely an internal Rust refactor no binding surface reflects), the diff MUST stay on main without a version bump. The CHANGELOG MAY record it under `### Internal (no consumer-visible surface)` that does NOT roll into a version cut.

```markdown
# DO — minor bump because a binding gained a framework (parity-closing)

## [4.4.0] — 2026-06-01

### Added (parity-closing)

- C-ABI gains 18 ML entry points (`kailash_ml_*`) — unblocks go/java/dotnet ML parity.
- Ruby gem gains the `Kailash::ML` module (was absent; now at kailash-ruby's ceiling).

# DO NOT — major bump because an internal Rust shim was deleted

## [5.0.0]

### Breaking changes

- `impl From<bool> for AutoMigrate` shim removed. (Observed by NO binding consumer.)
```

**BLOCKED rationalizations:**

- "Semver says any breaking change → major" (only consumer-observable breaks count)
- "It's binding-internal so it doesn't trigger a release" (parity-closing work is NOT carved out anymore)
- "Only Python consumers matter, skip the Node change" (all bindings are parity targets now)
- "Mixed version trains are confusing"
- "The internal refactor is technically breaking at the Rust level"

**Why:** Under the all-binding policy every binding has a real-or-imminent consumer, so a public-API or parity-closing change on ANY binding is release-worthy. But the churn lesson still holds at the other end: a Rust-internal change no binding surface reflects is not a consumer contract change, and spending a version increment on it is the v3.x→v4.x→v5.x churn the user corrected.

### 2. Major Bumps Are Human-Gated, Pre-Deprecated, And Reserved For Consumer-Observable Breaks

Going from `X.0.0` to `(X+1).0.0` MUST satisfy ALL THREE conditions:

- **(a) Consumer-observable break** — a public-API break on ≥1 binding that forces existing consumer code to change (a removed public symbol, an incompatible signature change, a removed consumer-callable capability). A Rust-internal deprecated-trait removal, an internal `Js*` / `Py*` struct rename, or any refactor no binding surfaces does NOT qualify.
- **(b) Pre-deprecated for ≥1 minor cycle** — every symbol/signature the major BREAKS MUST have already shipped, in a PRIOR minor release, a deprecation cycle per `rules/zero-tolerance.md` Rule 6a: a `#[deprecated]` annotation (Rust, where the language permits it) / `DeprecationWarning` (Python·Ruby·Node binding surface) PLUS a CHANGELOG migration entry — OR, where `#[deprecated]` is mechanically unavailable (Rust forbids it on trait-impl blocks and trait-impl methods), a **documentation-driven** cycle: a CHANGELOG `### Deprecated` entry + doc-comment flags on the surface + every internal callsite migrated. (Documentation-driven IS the mechanism v4.0.0's `From<bool> for AutoMigrate` removal actually used — deprecated 3.25.0, removed 4.0.0, see CHANGELOG.) The major only REMOVES already-deprecated surface; it MUST NOT introduce a never-warned break. The sole exception is a break that genuinely cannot be shimmed (e.g. a security fix that must change a signature) — which MUST state that reason in the CHANGELOG entry AND the major-bump recommendation, AND the un-shimmable claim is itself subject to the (c) human gate: the agent recommends the exception with the technical reason it cannot be shimmed, and the human ratifies the EXCEPTION, not merely the version number (an agent MUST NOT self-certify un-shimmability past the gate).
- **(c) Human-authorized** — the major-bump decision is a STRUCTURAL gate, same class as release authorization (`rules/trust-posture.md` L5: "release tags → human gate"). The agent recommends a major ONLY with the accumulated-deprecation evidence and MUST NOT autonomously cut one. When a diff contains a break, the agent's DEFAULT disposition MUST be "ship the deprecation shim in a minor", never "cut a major".

```markdown
# DO — major removes a PRE-DEPRECATED break, batched + human-ratified

## [5.0.0]

### Breaking changes

- Removed `DataFlow.execute_raw(sql, params)` → `execute_raw(sql, *, params)`.
  Deprecated since 4.6.0 (`#[deprecated]` + DeprecationWarning + CHANGELOG [4.6.0]
  migration entry). Python AND node consumers update call sites.

# DO NOT — major on a fresh, never-deprecated break (or an internal-only change)

## [5.0.0]

- `impl From<bool> for AutoMigrate` removed. (v4.0.0 — no binding consumer could call it.)
- `execute_raw` made keyword-only with NO prior deprecation cycle. (Ship the shim in a minor first.)
```

**Why:** Major bumps signal "the contract changed, audit your code" — a finite institutional resource. Spending it on internal cleanup no consumer can observe (v4.0.0's `From<bool> for AutoMigrate` removal) OR on a break that landed with no prior warning trains consumers to dismiss majors as routine churn — the v0→v4-in-months pattern the co-owner flagged. Deprecate-first telegraphs every break through a minor BEFORE the major removes it; the human gate stops a reflexive agent re-firing the v5.0.0-within-72h proposal the prior rule already blocked once.

### 3. All Bindings Share The Workspace Version Anchor (Lock-Step)

Every binding ships lock-step on the workspace version: all binding manifests MUST equal `Cargo.toml::workspace.package.version` AT release time. Two enforcement tiers exist, and the distinction matters:

- **Script-enforced anchors** (the version-anchor-atomicity gate hard-blocks drift): `Cargo.toml::workspace.package.version`, `bindings/kailash-python/pyproject.toml::version`, `bindings/kailash-node/package.json::version` (+ its `@kailash/core-*` `optionalDependencies`) — checked by `scripts/check-version-sync.sh`; plus the spec anchors (`specs/_index.md:7`, `specs/release-pipeline.md:8`) — checked by the Specs-Gate `version-anchor` job (`.github/workflows/specs-gate.yml`).
- **Rule-MUST anchors (NOT yet script-gated)**: the Ruby gemspec/`version.rb`, the .NET `Directory.Build.props`/`*.csproj`, the Java `pom.xml`/`build.gradle.kts`. These MUST equal the workspace version by THIS rule, but `check-version-sync.sh` does not yet check them — that script-coverage gap is the value-anchored follow-on for the all-binding parity program (it is what allowed the `#1151 rebuild_ruby_gems` hack). Rails (`bindings/kailash-rails`) is scoped to the kailash-ruby gem's surface, NOT the workspace anchor, per the named ceiling in `memory/feedback_python_only_bindings.md`; it is exempt from lock-step.

A bump that advances one script-enforced anchor without the others is BLOCKED (it merges past the gate only via admin override and accumulates drift — the v3.26.0 / v4.3.2 / v4.3.3 recurrence).

```bash
# DO — every anchor advances in the SAME release-prep commit
git grep -l '4\.3\.3' Cargo.toml specs/ bindings/*/pyproject.toml bindings/*/package.json
bash scripts/check-version-sync.sh   # exit 0 before tagging

# DO NOT — bump Cargo.toml only, admin-merge past the red anchor gate
# (specs + node manifest drift to a stale version; next release inherits the drift)
```

**Why:** Per the all-binding reversal, bindings are first-class parity targets shipping together — a divergent version anchor lies to whichever binding's consumer reads it (e.g. a published `@kailash/core@4.3.3` whose `optionalDependencies` point at non-existent `4.3.0` platform packages fails to install). Lock-step is the truthful and gate-enforced model; per-binding independent `0.x` tracks (this rule's prior stance) are SUPERSEDED. Named functional ceilings (WASM ~5%, FFI bounded by the C-ABI, Rails bounded by kailash-ruby) are documented in the CHANGELOG / specs, NOT encoded as version divergence.

### 4. CHANGELOG Documents Per-Binding Changes; Internal-Only Content Does Not Drive A Bump

Per Rule 1, work that ships MUST be documented — silently dropping institutional knowledge is its own failure mode. The CHANGELOG records consumer-facing and parity-closing changes per binding (`### Added (parity-closing)`, `### Fixed (Python binding)`, `### Changed (Node binding)`, etc.) AND a separate `### Internal (no consumer-visible surface)` section for pure Rust-internal refactors. A release cycle whose CHANGELOG body is ENTIRELY under `### Internal` is BLOCKED — there is nothing for any consumer to look at, so the version cut is noise.

```markdown
# DO — release justified by parity-closing + consumer-visible work

## [4.4.0] — 2026-06-01

### Added (parity-closing)

- C-ABI gains 18 ML entry points (unblocks go/java/dotnet ML).

### Internal (no consumer-visible surface)

- Refactored `scheduler.rs` lock acquisition (no binding surface change).

# DO NOT — version cut with only internal content

## [4.4.0]

### Internal

- Refactored scheduler lock acquisition. (No consumer-visible change → no bump.)
```

**Why:** Releasing a version whose entire body is internal refactor is the originating churn failure mode. Bundling internal documentation UNDER a consumer-justified version cut converts churn into a legitimate "here's what changed for you + what happened underneath" disclosure.

## MUST NOT

- Cut a release whose only content is internal Rust refactor no binding surface reflects

**Why:** Originating failure mode. A version cut signals "a consumer should look"; if nothing reached any binding's surface, the signal is noise.

- Treat parity-closing binding work as "binding-internal, no release"

**Why:** The all-binding reversal removed that carve-out. Parity-closing work is the consumer value the program exists to deliver; carving it out is what forced the #1151 `rebuild_ruby_gems` hack.

- Bump major on internal Rust refactors / deprecated-shim removals no binding consumer can observe

**Why:** These do not reach any consumer surface. v4.0.0's `From<bool> for AutoMigrate` removal is the canonical example: the major bump was institutional accounting, not a consumer contract change.

- Cut OR autonomously propose a major bump on a break that never shipped as a deprecation shim in a prior minor

**Why:** A never-warned break in a major hard-breaks every consumer on first upgrade with no migration runway; the deprecation cycle IS the runway (`rules/zero-tolerance.md` Rule 6a) and the major is only the removal of already-warned surface.

- Treat "semver says any breaking change → major" as authority to skip the deprecation cycle OR the human gate

**Why:** Strict-semver-by-reflex on a single small break is the v0→v4-in-months churn itself; the discipline is deprecate-then-batch-then-human-ratify, not firing a major on the first break.

- Advance one version anchor without the others in the same commit

**Why:** Divergent anchors merge past the gate only via admin override and accumulate drift (v3.26.0 / v4.3.2 / v4.3.3). A published binding whose manifest points at non-existent sibling-package versions fails to install.

- Defer "should we bump" decisions to `/release` time

**Why:** By `/release` time the version-bump reflex drives the answer. Decide BEFORE invoking `/release` by checking the diff against Rule 1's trigger list.

## Relationship To Other Rules

- **`rules/build-repo-release-discipline.md` Rule 1** — "every merge triggers a release cycle." This rule narrows the trigger to "consumer-visible OR parity-closing diff"; pure-internal-refactor work stays on main without a release cycle (same shape as Rule 1a's test-only / docs-only carve-out).
- **`rules/zero-tolerance.md` Rule 5 + `scripts/check-version-sync.sh`** — mandate atomic version updates across `Cargo.toml`, every binding manifest, and the spec anchors AT release time. This rule narrows WHEN a release happens; Rule 3 above restates the atomicity requirement and names the live gate.
- **`memory/feedback_python_only_bindings.md` (REVERSED 2026-06-01)** — the all-binding parity directive this rule now reflects. Python ships first; all bindings then follow to 100% of each platform's ceiling.
- **`memory/feedback_python_release_priority.md`** — Python-first ORDERING (retained); this rule supplies the version-anchor consequence: lock-step across all bindings, Python cut first.

## Trust Posture Wiring

- **Severity:** `halt-and-report` at gate-review (reviewer / release-specialist surface the violation at `/release` validation); `advisory` at the hook layer (lexical detection of an unjustified version bump in a CHANGELOG header is regex-based and per `hook-output-discipline.md` MUST-2 cannot carry block severity).
- **Grace period:** 7 days from landing — original rewrite 2026-06-01 → 2026-06-08; the MUST-2 (b) pre-deprecation + (c) human-gate strengthening 2026-06-20 → 2026-06-27.
- **Cumulative posture impact:** same-class violations (a version cut whose body fails the Rule 1 trigger test, OR a divergent-anchor bump) contribute to `trust-posture.md` MUST Rule 4 cumulative-window math (3× same-rule / 5× total in 30d → drop 1 posture).
- **Regression-within-grace:** any version cut whose `[X.Y.Z]` body fails the Rule 1 trigger test, any divergent-anchor bump, OR (from 2026-06-20) any MAJOR bump cut without the Rule 2 (b) pre-deprecation evidence or (c) human authorization, within the relevant grace window triggers `version_cadence_unjustified_bump` per `trust-posture.md` MUST Rule 4 — emergency downgrade L5 → L4 (1× = drop 1 posture). NOTE: `version_cadence_unjustified_bump` is referenced here but not yet registered in `trust-posture.md`'s emergency-trigger list; this BUILD→loom proposal flags loom to register it (trust-posture.md is a loom-synced baseline rule, so the key MUST be added upstream, not in this BUILD copy).
- **Receipt requirement:** SessionStart MUST require `[ack: version-cadence]` in the agent's first response IF `posture.json::pending_verification` includes this rule_id (set at land-time, cleared after grace). Soft-gate.
- **Detection mechanism:** at `/release`-prep PR review, a mechanical sweep on the `CHANGELOG.md` diff for the new `[X.Y.Z]` header confirms (1) ≥1 bullet appears under a consumer-facing or `### Added (parity-closing)` section; OR (2) the bump explicitly references a Rule-1 trigger in the PR body. PLUS `bash scripts/check-version-sync.sh` exit 0 (Rule 3 anchor atomicity). For a MAJOR bump (`X.0.0 → (X+1).0.0`) specifically, the reviewer ADDITIONALLY confirms each `### Breaking changes` bullet cites the prior minor that shipped its deprecation shim (`#[deprecated]` / `DeprecationWarning` + CHANGELOG migration entry) OR states the cannot-be-shimmed reason (Rule 2b), AND that the cut carries explicit human authorization (Rule 2c) — a major lacking either is BLOCKED. Failing any → flag for human disposition.
- **Violation scope:** MUST 1 (trigger test) + MUST 2 (major-bump: consumer-break + pre-deprecation + human-gate reserve) + MUST 3 (anchor atomicity) + MUST 4 (internal-only release). Every `violations.jsonl` row records which MUST clause fired.
- **Origin:** See § Origin (churn 2026-05-13 + all-binding reversal 2026-06-01, journal/0149 + major-bump strengthening 2026-06-20).
