---
priority: 10
scope: path-scoped
paths:
  - "docs/canon-tracking/**"
  - "tools/canon-sync.mjs"
  - ".claude/rules/canon-incorporation.md"
  - ".claude/skills/37-canon-incorporation/**"
  - ".claude/commands/canon-incorporate.md"
  - ".claude/commands/canon-sync.md"
audience: engineer
---

# Canon Incorporation — How A Fork Tracks Canonical kailash-rs

This rule governs how a **fork** of kailash-rs incorporates updates from **canonical kailash-rs** (a **loose reference feed** the fork selectively incorporates at its own discretion). Canon is a reference, not a master; a fork's divergences are the normal posture and are preserved.

**Role-awareness (fork-active, canon-noop — Contract C1).** Authored in CANON so a fork cloning this repo inherits the mechanism intact. Role source of truth is `docs/canon-tracking/canon-sync-version.json` → `repo_role.role`; `tools/canon-sync.mjs::resolveRole` resolves it and `assertRoleForVerb` gates the verbs. In **canon** (`role: "canon"`) the mechanism is INERT — `check` / `coc-delta` / `set-coc-anchor` / `/canon-incorporate` clean-no-op exit 0 (canon has no upstream; it runs the ORIGINATING flow build → codify → loom). In a **fork** every MUST below is ACTIVE. An **undeclared** role hard-errors (unsafe). Canon ships an EMPTY preserve-set register (§ Preserve-Set Register); a fork POPULATES its own on first `/canon-incorporate`.

The mechanism (provider- and SDK-neutral) rests on ONE fact — the **canon-base SHA** the fork is rebased onto (`merge_base.sha`): drift is the commit range past it (MUST-1), preserve-set impact is canon's changed-file set intersected with the register globs (MUST-2/4), and incorporation rebases the delta in, re-applies the register, gates, and advances the anchor (MUST-2/6).

## MUST Rules (fork-active; canon-noop)

### 1. Versioning Checks Are SHA/Ancestry-Anchored — Version Strings Are BLOCKED

Any "how current are we / is there an update" check MUST be computed from the canon-base SHA + git ancestry (`git merge-base --is-ancestor`, `git rev-list <base>..<canon-HEAD>`), NEVER from comparing version strings — the two lines may both re-use `v4.x` after a split, so canon and fork versions are NOT comparable numbers. `<canon-HEAD>` MUST resolve as the remote's default branch (`origin/HEAD` → `origin/main`), NEVER `FETCH_HEAD` (a bare fetch sets `FETCH_HEAD` to whatever ref was last fetched — a stray dependabot/feature branch — silently measuring drift against the WRONG line). The drift answer MUST be cross-checked against `origin/main` directly.

```bash
# DO — ancestry + commit-range, resolved against the remote default branch
ref=$(git -C "$CANON" rev-parse --abbrev-ref origin/HEAD || echo origin/main)   # origin/main
git merge-base --is-ancestor "$(git -C "$CANON" rev-parse "$ref")" HEAD && echo "AT PARITY"
git rev-list --count "$CANON_BASE_SHA".."$ref"     # exact un-incorporated canon delta

# DO NOT — version-string comparison OR FETCH_HEAD
[ "$(canon_version)" \> "$(fork_version)" ] && echo "behind"   # meaningless; BLOCKED
git -C "$CANON" fetch origin && git -C "$CANON" rev-parse FETCH_HEAD   # WRONG tip; BLOCKED
```

**BLOCKED rationalizations:** "version strings are close enough to tell drift" / "FETCH_HEAD is fine for a quick check" / "cross-checking origin/main directly is overkill".

**Why:** Version strings across the two lines are not ordered; the ancestry-contains-`<canon_base_sha>` property is a cryptographic proof of exactly what canon content the fork holds — the only sound anchor. `resolveCanonTip` in `tools/canon-sync.mjs` implements the origin/HEAD→origin/main resolution; trusting `FETCH_HEAD` silently corrupts every downstream drift + preserve-set computation.

### 2. Incorporate By Rebase-And-Re-Apply, Not Cherry-Pick

A canon update MUST be incorporated by taking the new canon commit as the base and re-applying the fork delta on top (merge-not-replace), NOT by cherry-picking individual canon commits into the fork.

```bash
# DO — new canon commit is the base; the register is re-applied on top
git worktree add -b canon-rebase/<ver> <wt> <NEW_CANON_SHA>   # then walk the register
# DO NOT — cherry-pick canon features into the current fork line
git cherry-pick <canon-feature-sha>   # ancestry never contains a canon base → MUST-1 anchor gone
```

**BLOCKED rationalizations:** "cherry-picking this one feature is faster" / "a full rebase is overkill for a small canon change" / "we'll rebase properly next time".

**Why:** Cherry-picking leaves the fork's ancestry NOT containing a canon base, so MUST-1's ancestry anchor is unavailable and every future sync re-derives the whole surface by hand.

### 3. Every Shared File Is Merge-Not-Replace

For any file canon AND the fork both evolved (a preserve-set "shared" file), incorporation MUST 3-way merge (`base = pre-update canon-base`, `ours = fork`, `theirs = new canon`) so BOTH canon's evolution AND the fork additions survive. Wholesale-taking either side is BLOCKED. A textually-clean auto-merge is NOT sufficient evidence — a clean merge can silently drop one side's evolution or duplicate an independently-added definition; the crate MUST compile + test to confirm.

```bash
# DO — 3-way merge; both sides survive; compile + test confirms
git merge-file <F> <pre-update-base:F> <fork:F>   # canon current + fork additions grafted
# DO NOT — take one side wholesale on a shared file
git checkout <canon>:<F>   # drops the fork hardening; the mirror drops canon's evolution
```

**BLOCKED rationalizations:** "the auto-merge was clean, so it's correct" / "just take canon's version, it's newer" / "just keep the fork's, it works" / "0 conflicts means 0 problems".

**Why:** The fork's value is the delta ON TOP of canon; replacing a shared file with canon's drops the fork hardening, replacing with the fork's drops canon's evolution. The 0-conflict-but-broken duplicate-merge is the specific failure mode this MUST blocks.

### 4. The Preserve-Set Is An Enumerated Register; Every Update Re-Applies + Verifies Each Item

The fork delta MUST be maintained as the enumerated § Preserve-Set Register below — each item carries its file globs AND a disposition (`fork-only-copy` / `merge-3way` / `keep-fork` / `converge-to-canon`). Each canon incorporation MUST walk the FULL register and, per item, re-apply or verify per its disposition, then run a closure-parity check. A freeform "we preserved the fork stuff" claim without the per-item register walk is BLOCKED. New divergences MUST be added as a new numbered register entry in the SAME change that introduces them.

```markdown
# DO — walk the FULL register; per-item disposition; closure-parity after

for item in register: reapply(item, item.disposition); assert closure_parity(item)

# DO NOT — a freeform "we kept the fork stuff" claim with no per-item walk

"re-applied the fork delta" # which items? verified how? BLOCKED
```

**BLOCKED rationalizations:** "we preserved the fork stuff" / "the important files are there" / "I'll enumerate the register if something breaks" / "the diff looks right".

**Why:** A freeform preserve-set decays across `/clear` boundaries and canon updates — the next session cannot mechanically verify "did all of it survive?". The enumerated register makes MUST-2's preserve-set-impact check and the post-rebase closure-parity check mechanical.

### 5. Cutover Is Held-Local + Human-Gated

An incorporation lands on a fork line branch and is HELD LOCAL — no push/PR to the fork's remote until the user authorizes. The cutover that makes an incorporated line THE fork (retiring the prior line) is a STRUCTURAL gate the agent MUST NOT cross autonomously (it is hard to reverse); the agent presents the gated state + recommendation and STOPS. The prior fork line MUST be preserved as a labeled fallback until the incoming update is verified on the new line.

```text
# DO — land on a fork-line branch, held local; present gated state; STOP
# DO NOT — auto-retire the prior fork line OR push without the user's authorization
```

**BLOCKED rationalizations:** "the gate is green, just cut over" / "the fallback is redundant, delete it" / "pushing is fine, it's just the fork".

**Why:** The cutover replaces the working fork; it is outward-facing and hard to reverse. Per `rules/autonomous-execution.md` § Structural vs Execution Gates, release/envelope changes are human-required. The preserved fallback is the recovery path.

### 6. Advance The Anchor Only After Gate + Closure-Parity + Redteam Converge

`merge_base.sha` MUST be advanced to the new canon HEAD only AFTER: (a) compile gate green, (b) tests green under the pinned toolchain, (c) closure-parity confirms every preserve-set item survived (MUST-4), (d) a holistic redteam (merge-correctness + security + closure-parity) converged with zero CRIT/HIGH/MED. Advancing the anchor on a red or un-verified state is BLOCKED — the anchor is the fork's claim of "we soundly hold canon up to here".

```bash
# DO — advance the anchor only after gate + closure-parity + redteam converge
[ "$gate" = green ] && [ "$redteam" = converged ] && advance_anchor "$NEW_CANON_SHA"
# DO NOT — advance the anchor on a red or un-verified state
advance_anchor "$NEW_CANON_SHA"   # before tests/redteam → corrupts every future drift check
```

**BLOCKED rationalizations:** "tests are probably fine" / "advance now, verify later" / "the anchor is just bookkeeping".

**Why:** The anchor is load-bearing for every future drift check; advancing it prematurely corrupts the one fact the whole mechanism rests on.

## The COC-artifact plane (MUST-7..10)

A canon kailash-rs commit carries TWO planes: the **CODE plane** (`crates/**`, `bindings/**`, governed by MUST-1..6 + the Preserve-Set Register) AND the **COC-artifact plane** (`.claude/**`). Both transfer into the fork by MERGE — the fork BUILD repo is the domain expert that resolves conflicts. The orchestrating command is `/canon-incorporate`.

### 7. COC Artifacts Transfer By Merge At The Fork Build, Never Via A Loom Mirror-Pull

Canon's `.claude/` artifact changes (`.claude/**` EXCLUDING `.claude/.proposals/`) MUST be incorporated by MERGING them into the fork build during `/canon-incorporate`, with the fork build resolving every conflict as the domain expert (keep fork-specific content, take canon's genuine improvements). Routing canon's COC artifacts through a loom-to-loom mirror-pull instead of the direct build→build merge is BLOCKED — the loom is an orchestrator/distributor, NOT the domain build expert. Taking canon's code but NOT its artifacts is equally BLOCKED — the fork then lags canon with zero audit surface.

```text
# DO — fork build merges canon's .claude/ artifacts; domain-expert conflict resolution
git merge <canon>   # then resolve .claude/**-minus-.proposals conflicts by hand, keeping BOTH intents
# DO NOT — route COC artifacts through a loom mirror-pull (loom can't do the domain merge)
# DO NOT — merge code only, skip .claude/ artifacts (fork lags canon, no audit trail)
```

**BLOCKED rationalizations:** "the loom mirror-pull is the clean COC path" / "the fork loom will supply the artifacts via sync-to-build" (it can't — they never went through its Gate-1) / "skip the artifacts, just take the code" / "a 0-conflict auto-merge is correct" (compile + test).

**Why:** The fork build is the only party with the domain knowledge to merge a canon build-artifact against a fork-specific one; the loom only orchestrates. Skipping the artifact merge leaves the fork behind canon with no record of what it holds.

### 8. Proposal Lifecycle State Is Fenced — Canon's Marks Are NEVER Inherited

`.claude/.proposals/**` is TWO-PARTY lifecycle state between the fork build and the **fork loom** (which writes `status: reviewed`/`distributed` + `distributed_date` + resolves the work-item back into it). On a `/canon-incorporate` merge the fork's proposal file MUST be kept and canon's dropped (`.gitattributes merge=ours` + an explicit post-merge `git restore --source=<fork-HEAD> -- .claude/.proposals/`). Inheriting canon's proposal marks / `distributed_date` / work-item ids is BLOCKED.

```text
# DO — keep the fork's proposal; canon's marks never cross the boundary
git restore --source=HEAD --staged --worktree -- .claude/.proposals/
# DO NOT — let canon's `status: distributed` merge in
# → fork-loom mis-reads it as fork-work-done, SKIPS distributing the merged artifacts,
#   and the fork's own pending proposal is archived-as-done and lost
```

**BLOCKED rationalizations:** "the proposal marks are just metadata" / "canon's distributed mark means it's done" (done in canon-loom, NOT fork-loom) / "3-way-merge the two proposal files" (interleaves lineages → corrupt).

**Why:** Canon's marks describe canon-loom's pipeline. If they land in the fork's proposal, fork-loom either skips distributing artifacts it must distribute (a `distributed` it never wrote) or the fork's own un-distributed work is silently lost. The fence keeps the fork's proposal state fork-loom-lineage.

### 9. A Post-Merge /codify Re-Originates The Incorporated Artifacts As A Fresh Fork Proposal

Every `/canon-incorporate` that merges a non-empty `.claude/` artifact delta MUST run `/codify` after the merge to enumerate that delta into a FRESH fork proposal (`origin: build`, `status: pending_review`, an `incorporated-from-canon: <canon-SHA>` provenance line per incorporated change). The codify MUST ingest canon's proposal CONTENT (its `reason` / `classification_hint` / `cascade_to_loom` reasoning) as classification INPUT but STRIPPED of canon's marks / `distributed_date` / work-item ids. Skipping the re-codify is BLOCKED.

```text
# DO — codify re-originates the delta as fork-lineage pending work, canon reasoning ingested, marks stripped
node tools/canon-sync.mjs coc-delta   # the delta to enumerate
/codify                                # → fresh fork proposal, incorporated-from-canon @<SHA>
# DO NOT — merge canon artifacts and stop (fork-loom never sees them; they never reach the USE templates)
```

**BLOCKED rationalizations:** "the artifacts are merged, that's enough" / "codify is overhead, the files are already there" / "canon already codified this to canon-loom" (canon-loom ≠ fork-loom).

**Why:** The merged artifacts sit in the fork build tree but fork-loom's registry knows nothing about them until a fork proposal enumerates them; the re-codify gives them a fork-loom lifecycle + audit trail (provenance-preserving — the `incorporated-from-canon` line records canon origin).

### 10. The COC Anchor Advances Only After The Re-Codify Lands

`canon_coc_incorporated_through.sha` MUST be advanced (via `node tools/canon-sync.mjs set-coc-anchor <sha>`) only AFTER the Step-9 fork proposal lands (in addition to the MUST-6 gate + closure-parity + redteam convergence). It is the sibling of the CODE anchor and bounds the `.claude/` artifact delta each future `/canon-incorporate` evaluates. Advancing it while the incorporated delta has not been re-codified is BLOCKED — a future cycle would then skip artifacts that never got a fork-loom lifecycle.

```text
# DO — advance the coc anchor only after the re-codify proposal lands
[ "$recodify" = landed ] && node tools/canon-sync.mjs set-coc-anchor "$NEW_CANON_SHA" "$VER"
# DO NOT — advance it right after the merge, before /codify (the next cycle silently skips the gap)
```

**BLOCKED rationalizations:** "the merge is done, advance the anchor" / "the anchor is just bookkeeping" / "codify can happen later, advance now".

**Why:** The coc anchor is the fork's claim of "canon's `.claude/` delta through here has a fork-loom lifecycle." Advancing it before the re-codify makes that claim false, and the next cycle's `coc-delta` silently excludes artifacts that were merged but never proposed to fork-loom.

## Preserve-Set Register

**Canon ships an EMPTY register.** Canon has no upstream divergences to preserve — it IS the source. `preserve_set_paths` in the state file is `[]` and this section carries no numbered entries. A **fork** POPULATES its own register here on its first `/canon-incorporate`: one numbered entry per divergence, each with its file globs + a disposition — `fork-only-copy` (canon lacks; copy verbatim), `merge-3way` (both evolved; graft fork onto canon), `keep-fork` (canon has a competing version; the fork's is required for security/correctness), `converge-to-canon` (canon's is a superset; take canon, do NOT re-apply the fork's). The fork MUST mirror each entry's path prefixes into `preserve_set_paths` so `canon-sync check`'s preserve-set-impact intersection (MUST-2) stays mechanical.

## Trust Posture Wiring

- **Severity:** `halt-and-report` at gate-review (reviewer at `/implement`, cc-architect at `/codify`); `advisory` at the hook layer (a canon-drift banner is heuristic, not a structural gate, per `rules/hook-output-discipline.md` MUST-2). In canon the rule is INERT (every verb no-ops), so no violation is reachable until a fork flips `repo_role.role`.
- **Grace period:** 7 days from rule landing (2026-07-16 → 2026-07-23).
- **Cumulative posture impact:** same-class violations contribute to `rules/trust-posture.md` MUST Rule 4 cumulative-window math (3× same-rule in 30d → drop 1 posture; 5× total in 30d → drop 1 posture).
- **Regression-within-grace:** any same-class violation within 7 days routes through the GENERIC `regression_within_grace` emergency trigger per `rules/trust-posture.md` MUST Rule 4 (1× = drop 1 posture) — no dedicated per-clause trigger key (the universal `regression_within_grace` trigger already covers it, avoiding a self-referential edit to `trust-posture.md`).
- **Receipt requirement:** SessionStart soft-gate `[ack: canon-incorporation]` IFF `posture.json::pending_verification` includes this rule_id.
- **Detection mechanism:** Phase 1 (review-layer, load-bearing) — reviewer / cc-architect confirm at incorporation gates that the versioning check was SHA-anchored (MUST-1), the preserve-set register was walked per-item (MUST-4), the anchor advanced only post-convergence (MUST-6/10), COC artifacts merged at the fork build (MUST-7), proposal state stayed the fork's (MUST-8), and the delta was re-codified (MUST-9). Mechanical companions: `tools/canon-sync.mjs check` (on-demand drift + preserve-set-impact + coc-artifact-delta + proposal-fence) and the readiness scanner `.claude/bin/canon-sync-readiness-check.mjs` (SHIPPED) with committed fixtures at `.claude/audit-fixtures/canon-sync/` (canon-role→no-op-exit0, fork-role→active, undeclared→exit1, flag-injection-sha→exit1) and semantic probes at `.claude/test-harness/probes/canon-*.probes.json` (authored in clusters K2/K3 per `rules/cc-artifacts.md` Rule 9; registered in `.claude/test-harness/eval-manifest.json` — probe REGISTRATION is hard-gated by `.claude/bin/coc-eval-all.mjs` in CI, while the probe SEMANTIC tier runs at gate-review via `/test-harness-probe`, per `rules/coc-artifact-eval-coverage.md` MUST-3's two-tier convergence). Phase 2 (deferred per `rules/trust-posture.md` § Two-Phase Rollout) — an advisory SessionStart drift banner hook.
- **Violation scope:** all 10 MUST clauses (MUST-1..6 code plane, MUST-7..10 COC-artifact plane), fork-active only; canon is inert by construction.
- **Origin:** See § Origin.

## Origin

2026-07-16 — authored in CANON kailash-rs as the role-aware canon-sync artifact set (cluster K1), building to Contract C1 (role detection) of `workspaces/canon-sync-incorporation/02-plans/00-plan-and-contract.md`. The generic mechanism + MUST-1..10 are adapted from a fork's reference implementation (cross-repo READ owner-authorized this session; journal receipt `workspaces/canon-sync-incorporation/journal/0002-*.md`); the fork-specific preserve-set register + provider-specific (ADO/toolchain) detail are DROPPED — canon ships an empty register and role-noop behavior so a fork cloning this repo flips `repo_role.role` to `"fork"` and populates. Co-owner-directed origination per `rules/artifact-flow.md` § Co-Owner-Directed Origination.
