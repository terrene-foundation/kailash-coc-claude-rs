---
name: 37-canon-incorporation
description: Fork canon-incorporation runbook — rebase onto a canon kailash-rs base, re-apply the fork delta (merge-not-replace), SHA-anchored, gated + redteamed, human-gated cutover. Fork-active / canon-noop.
audience: engineer
---

# Canon Incorporation Runbook

The step-by-step procedure for incorporating a canonical kailash-rs update into a **fork**. **Role-aware (fork-active / canon-noop — Contract C1):** this runbook applies only when `docs/canon-tracking/canon-sync-version.json` `repo_role.role` is `"fork"`. In **canon** (`role: "canon"`) the whole flow is INERT — the incorporation verbs clean-no-op, because canon has no upstream and runs the ORIGINATING flow (build → codify → loom). The **discipline + the enumerated preserve-set register** live in `rules/canon-incorporation.md` (load that first — this skill is the how, that rule is the what/why). State: `docs/canon-tracking/canon-sync-version.json`. Tool: `tools/canon-sync.mjs`. Orchestrator: `/canon-incorporate`.

Anchor everything on the **canon-base SHA** (`merge_base.sha`) — the canon commit the fork is rebased onto. Version strings are NOT comparable — see the rule's MUST-1.

## Step 0 — Drift + preserve-set impact (know the cost before you start)

```bash
CANON=${CANON_KAILASH_RS:-<canon-checkout>}          # operator-local; never hardcode
BASE=$(node -e 'console.log(require("./docs/canon-tracking/canon-sync-version.json").merge_base.sha)')
git -C "$CANON" fetch --quiet origin                 # the on-demand fetch
# Resolve the remote's DEFAULT branch — NEVER FETCH_HEAD (it grabs whatever ref was last
# fetched, e.g. a dependabot branch, and silently reports the WRONG tip → rule MUST-1). Then cross-check:
TIP=$(git -C "$CANON" rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main)  # e.g. origin/main
git -C "$CANON" rev-parse --short "$TIP"; git -C "$CANON" show "$TIP:Cargo.toml" | grep -m1 '^version'
git -C "$CANON" rev-list --count "$BASE".."$TIP"     # drift = un-incorporated canon commits
git -C "$CANON" diff --name-only "$BASE".."$TIP"     # changed files → intersect with the register
node tools/canon-sync.mjs check                       # drift + preserve-set-impact + coc-artifact delta + proposal-fence
node tools/canon-sync.mjs coc-delta                   # the .claude/ artifact delta to merge + re-codify (excl .proposals/)
git merge-base --is-ancestor "$(git -C "$CANON" rev-parse "$TIP")" HEAD && echo "AT PARITY"  # fork contains canon tip ⇔ parity
```

The intersection of canon's changed files with the register's file globs IS the 3-way conflict surface. Clean intersection → trivial rebase. Heavy intersection → plan the shards (Step 2).

**Two planes (rule MUST-7..10):** a canon commit carries CODE (`crates/**`, `bindings/**` — Steps 1-3) AND COC ARTIFACTS (`.claude/**` — Step 3.5). Both MERGE at the fork build (the domain expert); `/canon-incorporate` orchestrates the whole flow. Only the proposal LIFECYCLE STATE (`.claude/.proposals/**`) is fenced (never take canon's marks).

## Step 1 — Create the rebase branch from the NEW canon base

```bash
NEWBASE=$(git -C "$CANON" rev-parse "$(git -C "$CANON" rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo origin/main)")  # origin/main tip, NOT FETCH_HEAD
# bring the new canon commit into the fork's object store (fetch from the canon remote/path), then:
git worktree add -b canon-rebase/<newver> .claude/worktrees/canon-build "$NEWBASE"
```

The COC-artifact overlay (`.claude`/docs/workspaces) is usually a fast-forward from the prior fork line — overlay it onto the new base (zero code, so the SDK build stays canon-green by construction).

## Step 2 — Shard the delta re-apply (parallel worktree agents)

Walk the register (rule § Preserve-Set Register — the fork populates it; canon ships it empty). Group by disposition into shards (one worktree agent each, per `worktree-isolation.md` + `agents.md`):

- `fork-only-copy`: `git show <fork-line>:<path> > <path>` verbatim.
- `merge-3way`: `git show <pre-update-base>:<F> > base; git show <fork-line>:<F> > ours; git merge-file <F> base ours` (incorporates fork `ours` INTO the new-canon current `<F>`). Hand-resolve conflicts keeping BOTH sides.
- `keep-fork`: take the fork's file (verify it's still a clean superset).
- `converge-to-canon`: take canon's; do NOT re-apply the fork's — but VERIFY canon still covers the case the fork's version fixed.

Inject curated governance slices per `governed-throughput.md`. Cold-start ≤3 concurrent agents (`worktree-isolation.md` Rule 4). Each shard's gate: build + test its own crates.

**Watch for the clean-but-broken auto-merge:** a 0-conflict `merge-file` can still duplicate a definition both sides added or graft a call onto a renamed method — the crate MUST compile+test to confirm. If canon AND the fork both heavily rewrote a file, prefer `converge-to-canon` + a follow-up over an un-verifiable graft.

## Step 3 — Integrate + gate

Merge shards onto the rebase branch (disjoint file sets → near-zero conflict). Then run the workspace compile gate (0 warnings, `zero-tolerance.md` Rule 1) + tests (0 failed) under the pinned toolchain for every touched crate.

## Step 3.5 — COC-artifact plane (rule MUST-7..10)

Runs alongside the code merge (Steps 1-3). The fork build is the domain expert for the artifact merge; the loom never does it.

```bash
# (a) MERGE canon's .claude/ artifacts (already in the merge from Step 1); resolve conflicts
#     under .claude/** EXCLUDING .proposals/ by hand — keep fork-specific content, take canon
#     improvements. `node tools/canon-sync.mjs coc-delta` lists exactly what changed.

# (b) FENCE the proposal state (MUST-8) — keep the fork's; canon's marks NEVER inherited.
git restore --source=HEAD --staged --worktree -- .claude/.proposals/
git status --porcelain -- .claude/.proposals/    # MUST be empty

# (c) RE-CODIFY (MUST-9) — enumerate the merged .claude/ delta into a FRESH fork proposal:
node tools/canon-sync.mjs coc-delta               # the delta + canon's reasoning to ingest
/codify                                           # origin:build, pending_review,
                                                  # incorporated-from-canon @<SHA>; canon marks STRIPPED
```

`merge=ours` on `.claude/.proposals/**` (`.gitattributes`) handles the common merge; step (b)'s explicit restore is the always-fires backstop (FF / unconfigured-clone). Empty coc-delta → skip (c).

## Step 4 — Holistic /redteam — 3 parallel agents, scoped to the WHOLE delta

Per `agents.md` § Multi-Wave Holistic /redteam: reviewer (merge-correctness: dropped canon evolution? duplicate defs? conflict markers?) + security-reviewer (the fork's fail-closed / hardening surfaces) + closure-parity (every register item landed + wired; deferrals genuine). Converge to zero CRIT/HIGH/MED.

## Step 5 — Cutover (HUMAN-GATED) + advance the anchor

Held local — no push. Present the gated state + recommendation and STOP (rule MUST-5). On the user's go: rename the rebase branch to the fork line, retire the prior line as a labeled fallback, keep shard branches for provenance. Then advance the anchor (rule MUST-6 — only post gate+closure-parity+redteam):

```bash
# CODE anchor: update docs/canon-tracking/canon-sync-version.json: merge_base.sha → NEWBASE;
# canon_observed → NEWBASE/0-drift; refresh via:
node tools/canon-sync.mjs check
# COC anchor (MUST-10): ONLY after the Step-3.5(c) re-codify proposal has landed:
node tools/canon-sync.mjs set-coc-anchor <NEWBASE-SHA> <version>
```

The Step-3.5(c) fork proposal then flows to **fork-loom** on its next `/sync` (Gate-1 classify → Gate-2 distribute → marks the FORK proposal distributed). That is fork-loom's cycle, run at loom — not part of this incorporation.

## Guardrails

Anchor drift/versioning on SHA + ancestry, never version strings (MUST-1). Resolve the canon tip via `origin/HEAD` → `origin/main`, never `FETCH_HEAD` (`resolveCanonTip` in `tools/canon-sync.mjs`). Canon checkout path via `$CANON_KAILASH_RS`, never hardcoded. A clean auto-merge is not proof — compile + test (MUST-3). Cutover is human-gated (MUST-5); advance anchors only post-convergence (MUST-6/10).
