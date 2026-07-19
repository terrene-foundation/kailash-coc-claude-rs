---
description: Incorporate a canon kailash-rs update into a fork — merge code + COC artifacts, fence proposal state, re-codify to fork-loom. Fork-active / canon-noop.
argument-hint: "[--dry-run | --check]"
audience: engineer
---

# /canon-incorporate — incorporate a canon update (code + COC artifacts)

Orchestrates a full canon → fork incorporation. **Role-aware (fork-active / canon-noop
— Contract C1):** this is a **fork-only inbound flow**. The role lives in
`docs/canon-tracking/canon-sync-version.json` `repo_role.role`; `tools/canon-sync.mjs::assertRoleForVerb`
gates it. In **canon** (`role: "canon"`) this whole command is a clean no-op — canon has
no upstream and runs the ORIGINATING flow (build → codify → loom). In a **fork**
(`role: "fork"`) every step below is ACTIVE. Canonical kailash-rs is a **loose reference
feed** the fork selectively incorporates at its own discretion, preserving fork divergences.

**The two-plane model (`rules/canon-incorporation.md` MUST-7..10 — read that first):**
a canon commit carries TWO planes, and BOTH transfer into the fork via merge (the fork
BUILD repo is the domain expert that resolves conflicts — the loom is an orchestrator, NOT
a domain-merge expert, so COC artifacts are NEVER routed through a loom mirror-pull):

- **CODE plane** — `crates/**`, `bindings/**`: governed by the Preserve-Set Register.
- **COC-artifact plane** — `.claude/**` MINUS `.claude/.proposals/`: MERGE normally.
- **Proposal state** — `.claude/.proposals/**`: **FENCED** (`merge=ours`, MUST-8). It is
  two-party `{fork-build ↔ fork-loom}` lifecycle state; canon-loom's marks + work-item ids
  MUST NOT be inherited.

The workflow:

1. **canon** build → codify → canon-loom (canon's OWN lifecycle — not the fork's concern).
2. **fork** build syncs from canon → **merge code + artifacts** → **run /codify** →
   fork-loom Gate-1/Gate-2. The `/codify` re-originates the merged canon artifacts as a
   FRESH fork proposal (the audit surface) so fork-loom learns; without it the fork lags
   canon with zero audit trail.

**State:** `docs/canon-tracking/canon-sync-version.json` (CODE anchor = `merge_base.sha`;
COC anchor = `canon_coc_incorporated_through.sha`). **Tool:** `tools/canon-sync.mjs`.
**Runbook depth:** `.claude/skills/37-canon-incorporation/SKILL.md`. Canon path:
`$CANON_KAILASH_RS`.

`--check` / `--dry-run` runs Step 0 only (report the delta; make no changes).

## Step 0 — Know the delta before you start (both planes)

**Precondition — role gate:** the incorporation verbs gate on `repo_role.role`. In canon
they clean-no-op exit 0 (the informational message prints); an undeclared role hard-errors.
Confirm `repo role: fork` before proceeding.

```bash
node tools/canon-sync.mjs status | head -3   # confirm `repo role: fork`
node tools/canon-sync.mjs check              # drift + preserve-set impact + coc-artifact delta + proposal-fence
node tools/canon-sync.mjs coc-delta          # the exact .claude/ artifact files to merge + re-codify (excl .proposals/)
```

Clean code intersection + empty coc-delta → trivial. Heavy → plan shards (skill Step 2).
Stop here if `--check` / `--dry-run`.

## Step 1 — Merge code + COC artifacts (fork build is the domain expert)

Create the incorporation branch from the new canon base and merge (skill Steps 1-3): CODE
per the Preserve-Set Register (3-way, merge-not-replace); COC artifacts (`.claude/**` minus
`.proposals/`) merge normally — **resolve every conflict as the domain expert** (keep
fork-specific content, take canon's genuine improvements). A 0-conflict auto-merge is NOT
proof of correctness — compile + test (MUST-3).

## Step 2 — Fence the proposal state (MUST-8)

The proposal LIFECYCLE STATE is fork-loom-owned. Keep the fork's; never inherit canon's:

```bash
# merge=ours (.gitattributes) handles the common merge; this is the always-fires backstop:
git restore --source=HEAD --staged --worktree -- .claude/.proposals/
git status --porcelain -- .claude/.proposals/   # MUST be empty (fork's proposal untouched by canon)
```

## Step 3 — Re-codify: re-originate the merged artifacts as a FRESH fork proposal (MUST-9)

Run `/codify`. It MUST:

- Enumerate the incorporated `.claude/` delta (`node tools/canon-sync.mjs coc-delta`) into a
  **fresh fork proposal** (`origin: build`, `status: pending_review`, an
  `incorporated-from-canon: <canon-SHA>` provenance line on each incorporated change).
- **Ingest canon's proposal CONTENT** (its `reason` / `classification_hint` /
  `cascade_to_loom` reasoning) as classification INPUT — **STRIPPED of canon's marks,
  `distributed_date`, and work-item ids** (those are canon-loom's, meaningless here).
- Append-not-overwrite per `rules/artifact-flow.md` (never clobber the fork's own pending
  changes).

## Step 4 — Gate + holistic /redteam (skill Steps 3-4)

Compile gate (0-warn) + tests (0-fail) under the pinned toolchain; a 3-agent holistic
/redteam (merge-correctness + preserve-set-security + closure-parity) to zero CRIT/HIGH/MED.

## Step 5 — Cutover (HUMAN-GATED) + advance BOTH anchors

Held local — present the gated state + recommendation and STOP (MUST-5). On the user's go:
cut over the fork line, then advance BOTH anchors (MUST-6 code + MUST-10 coc — only post
gate + closure-parity + redteam + the Step-3 codify landing):

```bash
# CODE anchor: edit merge_base.sha → new canon SHA; then:
node tools/canon-sync.mjs check
# COC anchor: only after the /codify proposal lands (MUST-10):
node tools/canon-sync.mjs set-coc-anchor <canon-SHA> <version>
```

## Step 6 — Fork-loom processes the proposal (separate, downstream)

The Step-3 fork proposal now flows to **fork-loom** on its next `/sync` (Gate-1 classify →
Gate-2 distribute → marks the FORK proposal `distributed` + resolves the FORK work-item).
That is fork-loom's cycle — NOT part of this command. The fence (Step 2) is what guarantees
fork-loom sees fork-lineage state, never canon's.

## Discipline

- Version strings across the two lines are NOT comparable — anchor on SHA/ancestry (MUST-1).
- COC artifacts reach the fork ONLY via this merge (fork = domain expert), never via a loom
  mirror-pull. Proposal STATE never crosses the canon→fork boundary (MUST-8).
- Canon-noop by construction: in a canon repo every gated verb clean-no-ops exit 0.
- This is fork-local operational tooling; it never itself flows to loom.
