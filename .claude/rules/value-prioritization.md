---
priority: 0
scope: baseline
---

# Value-Prioritization — Rank By User Value Before Shard-Fit

See `.claude/guides/rule-extracts/value-prioritization.md` for the full BLOCKED-rationalization corpus, extended Origin post-mortem (2026-04-23 Phase I1 reframing + 2026-05-07 aggregator-merge pick), detection fixture catalog, and the OR-escape-hatch pattern detail.

Selection events — what to work on next, what to defer, what to close, what to surface at `/wrapup` — are the highest-leverage decisions an autonomous agent makes. Existing rules govern HOW to recommend (`rules/recommendation-quality.md`) and WHEN to shard (`rules/autonomous-execution.md` § Per-Session Capacity Budget) but NOT what axis to rank candidates on. Without a value-rank axis, the agent defaults to _fittability_ — small, scoped, regression-locked, "fits one shard" — and ships the streetlight version of progress: small-fittable-low-value over large-valuable-needs-decomposition. Across iterations and `/clear` boundaries the user's actual forest decays in the deferred queue while the small-fittable queue gets perfect coverage.

This rule fixes the gap with paired structural defenses: **value-rank precedes shard-fit** at every selection event, AND **deferred items carry value-anchors that survive `/clear`** so re-pickup re-validates rather than silently inherits.

## MUST Rules

### 1. Value-Rank Precedes Shard-Fit At Every Selection Event

When the agent surfaces ≥2 candidate items for the user to pick between (next workstream, next shard, next PR follow-up, next sweep target), the agent MUST present a **value-ranked list first**, with each candidate's value rationale cited from a user-anchored source: the user's brief in this session, an active workspace's `briefs/`, a journal `DECISION-` entry, a spec § success criterion, or a user-stated preference in this session. Shard-fit, blast radius, regression posture, and clean-scope considerations apply ONLY as tiebreakers AFTER the value-rank. Picking a low-value candidate because it fits the shard while a higher-value candidate exceeds it is BLOCKED — the higher-value candidate MUST be sharded per `autonomous-execution.md` § Per-Session Capacity Budget instead, with each shard carrying its own value-anchor (Rule 2). When the agent picks the lower-value candidate for legitimate tiebreaker reasons, the trade-off MUST be named explicitly: "Item X is higher-value per [user-anchored source]; Item Y is more fittable. Recommend Y because [specific reason]; alternative is to shard X." Silent fittability-pick is BLOCKED.

```markdown
# DO — value-ranked list, named trade-off, explicit alternative

Candidates ranked by user value:

1. Codex/Gemini lane re-validation (HIGH)
   Anchor: v6 §9.2 multi-CLI brief — cc-only validation has shipped 3 cycles;
   Codex/Gemini lanes have 14 days of unverified drift surface.
2. Aggregator-merge follow-up (LOW)
   Anchor: none user-facing; closes a probe-migration follow-up.

Recommend #1, sharded across 3 sessions per Rule 2. Alternative: pick #2
if user wants a small-and-fast deliverable today, but the cost is one
more session where multi-CLI parity sits at "Carried-forward."

# DO NOT — silent fittability pick, no value-rank, no named trade-off

Picking the aggregator-merge follow-up — closes the only open Week-2
follow-up before the grace deadline, fixes a latent bug, cheap (~150 LOC),
regression-locked. Other items remain Carried-forward.
```

**BLOCKED rationalizations** (full corpus in guide-extract; institutional tells listed below):

- Fit-anchors: "fits the shard budget" / "smaller is safer" / "regression-locked is responsible" / "cheap and bounded" / "tractable in one pass" / "reviewable diff" / "atomic delivery" / "well-bounded"
- Defer-anchors: "X needs decomposition first" / "back to X next session" / "in the backlog" / "tracked separately" / "Carried-forward" / "no grace clock"
- Scope-creep tells: "Closes a latent bug while we're here" / "smallest blast radius" / "mechanical work first, strategic later"
- Proxy-for-value framings: "sequencing dependencies — A unblocks B" / "risk-adjusted value: smaller scope = higher delivery probability" / "velocity multiplier — small wins unlock the bigger work" / "optionality preservation — pick reversible work first" / "reduce coordination cost" / "dependency-of-the-dependency enables the high-value work"
- Pick-anchor euphemisms: "Best path forward" / "Pragmatic call" / "Leaning toward" / "Default is to take" / "Will start with"
- Authority misappropriations: "User implicitly preferred this in the prior session" / "prior-acceptance as anchor" / "user obviously wants the safe path"
- **Time-pressure-as-authority is BLOCKED**: citing `time-pressure-discipline.md` as authority to pick low-value-fittable is BLOCKED. Time-pressure framing triggers PARALLELIZATION of value-ranked candidates per `time-pressure-discipline.md` MUST Rule 1, NOT downgrade to fittable.
- **User-anchored sources are a CLOSED ALLOWLIST** (per `rules/cc-artifacts.md` Rule 10 — positive allowlist, not denylist): the ONLY valid sources are (a) user's brief in this session, (b) `briefs/` in active workspace, (c) journal `DECISION-` entries, (d) literal user quote in this session's transcript, (e) spec § success criterion the user authored or approved. **Citations NOT matching {a, b, c, d, e} are BLOCKED for primary value-rank, regardless of phrasing.** Common evasion patterns — illustrative, not exhaustive: prior-session acceptance, retroactive inference, "the user obviously wants," unstated-but-implied preferences, "per institutional precedent," "per the workflow's recurring pattern," "per CLAUDE.md context" (CLAUDE.md is agent-loaded baseline, not user-authored), "per the standing memory," "per the spec's implicit guidance" (must be explicit), "per the rule's intent" (meta-rationalization), "per the team's working agreement," "per established convention," "per the platform's charter," "per the architectural principles," "per repo-internal precedent," "per the SDK's design intent." All fail the closed-allowlist test because none cite a user-authored artifact.

**Why:** Without an explicit value-rank axis, the agent's selection function defaults to whichever candidate has the most _legible_ signal — small-fittable-regression-locked produces the most legible signal because each quality axis is mechanically gradable. User-value is harder to grade (requires re-reading briefs, journal DECISION entries, the user's stated preferences) but it IS the axis the user actually cares about. Inverting the order — value FIRST, fit SECOND — converts streetlight selection into a forest-aware pick. The "Carried-forward (no grace clock)" pattern is the institutional tell: items without artificial deadlines never advance because every session prioritizes the clocked work, even when clocked work has lower user-stated value.

### 2. Deferred Shards MUST Carry Value-Anchors That Survive `/clear`

When a workstream is decomposed AND some shards are scheduled for later sessions (workspace todos, GH follow-up issues, README "follow-up" bullets, journal DEFER entries, "Carried-forward" lines in `.session-notes`), EACH deferred shard MUST be filed with a **value-anchor** — one sentence stating WHY THIS SHARD DELIVERS VALUE TO THE USER, in the user's language, citing a Rule-1 user-anchored source. Filing with only technical rationale (LOC count, dependency graph, "fits next shard") is BLOCKED. Filing under "Carried-forward (no grace clock)" without a value-anchor is BLOCKED — the grace-clock absence is the symptom of value-anchor absence; the fix is to record value, not invent a clock.

```markdown
# DO — every deferred shard carries a value-anchor + technical detail

- **Shard 2 (deferred to next session)**
  Value-anchor: enables multi-CLI parity per v6 §9.2 brief — without lane
  re-validation, Codex/Gemini ship rules that drift from cc.
  Technical: depends on Shard 1's emitter changes, ~700 LOC, 3 fixtures.
  Re-validation gate: confirm brief still applies before resuming (Rule 3).

# DO NOT — technical rationale only / "Carried-forward" without anchor

- Shard 2 deferred. ~700 LOC, depends on Shard 1. Will pick up next session.
- Carried-forward (no grace clock): coc-sync.md move; Codex/Gemini re-validation.
```

**BLOCKED rationalizations:** "Value rationale is obvious" / "Add value-anchor at re-pickup" / "Original brief covers it" / "Adding value-anchors to every deferral is bureaucracy" / "Technical rationale IS the value rationale" / "No-grace-clock means low-priority; anchor not needed" / "It's a Carried-forward item, that's the bucket."

**BLOCKED reframings** — deferral euphemisms that route around "Carried-forward" / "tracked separately": "Phase II/N scope," "Beta milestone," any "v<N> scope" without value-anchor, "future iteration," "architectural follow-up," "out of MVP/v1," "post-launch," "wishlist," "stretch goal," "nice-to-have," "roadmap item," "Tier-2 / P2 priority," "below the cut-line," "beyond current scope." All carry the same effect as "Carried-forward (no grace clock)" — they remove the item from the agent's queue without recording user-stated value-decay. Each MUST carry an adjacent value-anchor citing a Rule-1 user-anchored source. Full enumeration in guide-extract.

**Why:** Deferred items lose their context by definition — the next session reads `.session-notes` / GH issues / journal entries WITHOUT the conversational context that produced them. The technical rationale survives the boundary; the value rationale evaporates unless explicitly recorded. Once gone, the item is institutionally dead: the next session sees a technical scope and asks "should I work on this or something cheaper?" with no axis to answer. Evidence (2026-04-23 loom Phase I1 reframing): the v6 §9.2 step 23 obligation was reframed from "loom task" to "downstream responsibility" using a prior feedback memory as authority; 14 days later zero migrations observed; the success-criterion rationale survives in the spec but is disconnected from any executor.

### 3. Re-Pickup Of Deferred Work MUST Re-Validate The Value-Anchor

At the start of any session that picks up a deferred item (workspace todo, GH follow-up issue, journal DEFER entry, "Carried-forward" line), the agent MUST re-validate the value-anchor BEFORE resuming. If recorded, surface it and ask "is this still your value?" If NOT recorded (deferral predates this rule, or Rule 2 was violated), the agent MUST surface "this deferred item lacks a value-anchor — what's its current value to you?" rather than picking it up on faith. Silent inheritance across `/clear` boundaries is BLOCKED. Items deferred ≥2 sessions ago without re-pickup MUST surface a "still wanted?" gate at the next `/sweep` or `/wrapup`.

```markdown
# DO — re-pickup begins with value-anchor check

Picking up `feat/codex-gemini-lane-validation` (deferred 2026-04-23).
Recorded anchor: "delivers multi-CLI parity per v6 §9.2 brief."
Re-validation: brief still active per workspaces/multi-cli-coc/briefs/?
User's most recent feedback referenced multi-CLI as in-flight — anchor
holds. Resuming.

# DO NOT — re-pickup begins with technical context only

Resuming feat/codex-gemini-lane-validation. Last session left off at
the codex-architect step. Continuing with the next codex command emit.
```

**BLOCKED rationalizations:** "Revalidation is overhead for short-window deferrals" / "Deferral was N days ago, value can't have decayed" / "User already approved this once" / "Auto-resume from `.session-notes` is the documented path" / "If value had decayed, user would have said so."

**Why:** Per `rules/zero-tolerance.md` Rule 1c, claims about session-boundary state are unfalsifiable after `/clear` / auto-compaction — the same epistemic shape applies to deferral status. The agent has no audit trail proving the user still wants the deferred item; absent that, the disposition under uncertainty is to ask, not to assume. The 2-session threshold is the structural defense against silent decay.

### 4. Closure Of Value-Bearing Deferred Work As "Not Planned" Requires User Gate

A GH issue, workspace todo, or journal DEFER entry that carries a value-anchor (Rule 2) MUST NOT be closed as `not_planned`, `wontfix`, "deferred indefinitely," or "out of scope" without explicit user approval IN THE SAME SESSION. The agent MAY recommend closure with a value-decay rationale ("user's brief moved on" / "work landed elsewhere via PR #N" / "dependency was removed"); the user MUST accept. Auto-closure of value-bearing work — even when "stale ≥30 days" — is BLOCKED. Stale-triage automation that closes by age rather than by value-decay is BLOCKED. Reframing as "downstream responsibility" / "out-of-scope" without a user gate is closure under another name and is also BLOCKED. Red-team / sweep recommendations using the OR-escape-hatch pattern ("Add todos for X **OR** explicit ADR statement that X is part of Y") are a special case: the OR delegates the closure-vs-implement decision back to the next session, which always picks the cheaper proxy. Recommendations MUST commit to one disposition: implement, ADR with user-gated value-decay, or close with user gate.

```markdown
# DO — closure with value-decay rationale + user gate

`gh issue view 234`: Codex hook integration (deferred 2026-04-23,
anchor: "multi-CLI parity per v6 brief").

Recommendation: close as **superseded** — multi-CLI parity work landed
in PR #271 via the unified emitter; value delivered, by a different path.
**Approve close? (y/N)**

# DO NOT — auto-close as not-planned / reframe-as-out-of-scope / OR-escape

`gh issue view 234`: open 35 days, no recent activity. Closing as
not_planned per stale-triage policy.

[reframe pattern]: Phase I1 is downstream responsibility per
feedback_downstream_responsibility.md; loom does not sweep these.

[OR pattern]: Add Phase C6-adjacent todos for validators 1-12 OR
explicit ADR statement that they are shell one-liners.
```

**BLOCKED rationalizations:** "Open 30+ days, time to close" / "Value rationale is stale anyway" / "Cleaning up the backlog" / "User can re-open if they care" / "Closing as not-planned is a soft signal, not hard delete" / "Stale-triage policy says ≥30 days closes" / "Reframing isn't closure" / "OR gives the team flexibility" / "Both OR options resolve the finding."

**BLOCKED OR-escape-hatch variants** — the ONLY legitimate dispositions are (1) implement now with value-anchored shards, (2) ADR with user-gated value-decay, (3) close with user gate. ANY OR-disposition that introduces a fourth option is BLOCKED regardless of framing: "Add X OR file follow-up issue / OR document as known limitation / OR mark as deferred-with-rationale / OR capture in roadmap / OR create observability / OR add a smoke test asserting current behavior / OR add to /redteam checklist / Implement-OR-spec-only / Code-OR-doc / Fix-OR-monitor." Each substitutes a cheaper proxy for the load-bearing implementation; the cheaper proxy ALWAYS wins. Full enumeration in guide-extract.

**Why:** The user's value rationale is the load-bearing claim that the work matters. Closing without re-validating is the terminal step in deferral-as-forgetting: the item disappears from the queue, the rationale disappears from the audit trail, and the next time the user asks "did we ever address X?" the answer is "we closed it 60 days ago." The user gate is the only mechanism that catches value-still-applies before closure becomes institutional fact. Evidence (Failure-A audit 2026-05-07): 7-of-7 deferred items inspected showed decay-not-pickup; 2 of 7 used the OR-escape-hatch (`workspaces/multi-cli-coc/04-validate/27-todos-redteam.md:155, 171`); both shipped only the ADR statement, neither had the load-bearing implementation 14+ days later.

### 5. Brief / User-Stated Value Is The Primary Anchor; Code-Health Is Secondary

Value-ranking MUST cite a primary source from Rule 1's user-anchored list. Code-health axes (test coverage, blast radius, regression posture, technical debt, audit findings) are SECONDARY anchors — they belong as cons under a primary-ranked option, not as primary-rank justification. Ranking by code-health alone with no user-anchored citation is BLOCKED. Citing a prior user-feedback memory (`feedback_*.md`) as standalone authority to drop work is BLOCKED — memories codify HOW preferences (`feedback_no_resource_planning.md`, `feedback_directive_recommendations.md`); they do NOT codify which workstreams the user wants delivered. Memories advise method; only the user's brief decides scope.

```markdown
# DO — primary anchor user-anchored, code-health secondary

Value-rank:

1. Multi-CLI lane parity (HIGH).
   Primary: user's 2026-04-22 brief "deliver multi-CLI codegen."
   Secondary: cc-only has shipped 3 cycles; 14 days drift surface unverified.
2. Aggregator-merge follow-up (LOW).
   Primary: none — internal harness cleanup.
   Secondary: closes a latent crash; fits one shard.

# DO NOT — code-health as primary / feedback memory as authority to defer

Value-rank:

1. Aggregator-merge (HIGH). Closes a latent crash, regression-locked.
2. Multi-CLI re-validation (MED). Bigger scope, harder to test.

[memory-as-authority pattern]: Phase I1 is downstream responsibility per
feedback_downstream_responsibility.md.
```

**BLOCKED rationalizations:** "Code health IS user value" / "User obviously wants the safe path" / "Blast radius reduction IS what the user is paying for" / "Test coverage is the user's actual interest" / "Reliability work is always high-value" / "Closing audit findings is the user's stated preference" (when it isn't) / "Per `feedback_X.md` we don't do this kind of work."

**Why:** Code-health axes are LEGITIMATELY important — but they're the agent's professional concerns, not the user's. The user comes with a brief: "deliver X for the product launch," "ship multi-CLI parity," "address the deferred queue." Code health is the agent's responsibility to maintain BACKGROUND while delivering the brief — not the brief's substitute. When code health becomes the primary rank, the agent has effectively re-briefed itself; the user's brief becomes secondary. Likewise, prior feedback memories codify HOW (always-recommend-with-rigor; no-effort-estimation); citing them to drop specific work conflates HOW preferences with WHAT priorities — exactly the rationalization that allowed Phase I1 to be reframed as "downstream responsibility" using `feedback_downstream_responsibility.md` as the authority.

## MUST NOT

- Use "no grace clock" as a downgrade signal

**Why:** A grace clock is an artificial deadline tied to a recently-authored rule; its absence does NOT indicate low value. Grace-clocked items are about the rule's own enforcement, not user value; clock presence is orthogonal to value.

- Treat decomposition pressure as a deferral signal

**Why:** When a high-value candidate exceeds the shard budget per `autonomous-execution.md` MUST Rule 1, the disposition is to DECOMPOSE (with value-anchored shards per Rule 2), not to DEFER and pick a smaller fittable item. Decomposition keeps value moving; deferral lets it decay.

- Frame fittability-pick as the only candidate

**Why:** Hiding the candidate set inverts the user's structural ability to override (Rule 1 named-trade-off requirement). Silent presentation of the small pick AS IF it were the only option is the streetlight pattern at its most invisible.

## Trust Posture Wiring

- **Severity:** `halt-and-report` at gate-review (reviewer / cc-architect / analyst at `/codify`); `advisory` at the hook layer (lexical regex MUST NOT carry `block` per `rules/hook-output-discipline.md` MUST-2).
- **Grace period:** 7 days from rule landing.
- **Regression-within-grace:** any same-class violation triggers emergency downgrade L5→L4 per `rules/trust-posture.md` MUST Rule 4. Add `streetlight_selection` and `deferral_without_value_anchor` to trust-posture.md's emergency-trigger list.
- **Receipt requirement:** SessionStart MUST require `[ack: value-prioritization]` in the agent's first response IF `posture.json::pending_verification` includes this rule_id.
- **Detection (hook layer):** `.claude/hooks/lib/violation-patterns.js::detectStreetlightSelection` runs on Stop. Pattern: ≥2 candidate-item markers PLUS pick anchor PLUS fittability-anchor language WITHOUT value-anchor language. Companion `detectDeferralWithoutValueAnchor` flags `Carried-forward (no grace clock)` / `tracked separately` / `deferred to follow-up` markers without an adjacent value-anchor citation. F-2 companion `detectDeferredItemPickupWithoutRevalidation` (landed 2026-05-07) flags pickup-action verbs (`resuming` / `picking up` / `continuing` / `re-opening`) adjacent to deferred-item nouns (`deferred shard` / `Carried-forward` / `prior session` / `issue #N`) without a re-validation surface (`re-validate` / `is this still your value` / `anchor still applies` / `before resuming`) within ±250 chars — closes the silent-inheritance loophole MUST-3 enforces in prose only. F-3 companion `detectGhIssueCloseAsNotPlanned` (landed 2026-05-07) runs on PostToolUse(Bash); flags `gh issue close N --reason not_planned` / `--reason wontfix` / `gh pr close N --reason wontfix` invocations — closes the tool-call-space evasion of MUST-4 the prose-scan hooks cannot see. Severity: `advisory` for Stop-event prose detectors, `halt-and-report` for the Bash-time F-3 detector. Audit fixtures committed at `.claude/audit-fixtures/violation-patterns/detect{Streetlight,DeferralWithoutValueAnchor,DeferredItemPickupWithoutRevalidation,GhIssueCloseAsNotPlanned}/` per `rules/cc-artifacts.md` Rule 9.
- **Detection (review layer):** `/codify` mechanical sweep on hook-flagged transcripts — reviewer confirms semantic compliance per the rule the hook detector flagged. **MUST-1 (`detectStreetlightSelection`)**: reviewer confirms whether (a) user authorized the fittability pick, (b) response value-ranked first with user-anchored citation, or (c) session genuinely had only one candidate. **MUST-2 (`detectDeferralWithoutValueAnchor`)**: reviewer confirms whether each flagged deferral has an adjacent value-anchor citing a Rule-1 user-anchored source, or whether the marker appears in legitimate non-deferral context (migration phasing, user feature description, public roadmap). **MUST-3 (`detectDeferredItemPickupWithoutRevalidation`)**: reviewer confirms whether the agent's pickup prose semantically surfaced the re-validation gate (recorded value-anchor + "is this still your value" surface) — distinguishing genuine re-validation from token-presence-only proxies (the agent saying "re-validate" without actually citing the recorded anchor or asking the gate question). The reviewer agent IS the probe-driven gate-review counterpart per `rules/probe-driven-verification.md` MUST-4 (paired with the lexical hook layer) for ALL THREE MUST clauses: the reviewer's LLM-judge verdict on whether the response semantically complied is the probe per `probe-driven-verification.md` MUST-2 ("a probe MAY be: an LLM-as-judge with JSON-schema output, a subprocess verifier, an AST walker, a structural file/exit-code check, or a domain-specific oracle"). Final disposition is human.

## Distinct From / Cross-References

- **Extends**: `rules/recommendation-quality.md` MUST-1+3 (HOW to recommend) → this rule shapes WHAT axis to rank on; `rules/autonomous-execution.md` MUST-4 (shard-budget anchor only) → this rule adds the value-anchor; `rules/sweep-completeness.md` (step-substitution) → this rule blocks item-substitution (low-value-fittable in place of high-value-shardable).
- **Pairs with**: `rules/time-pressure-discipline.md` MUST-3 (prioritized list under pressure) — this rule defines the rank-axis (value, with user-anchored citation, not fit); `rules/zero-tolerance.md` Rule 1c — same epistemic shape (deferral-status unprovable across `/clear` → re-validate at re-pickup); `rules/git.md` § Discipline (Issue closure SHA-required) — extends to value-disposition for non-SHA closures.
- **Distinct from**: `rules/autonomous-execution.md` § Per-Session Capacity Budget (shard-size upper bound) — this rule defines order-of-operations (value FIRST, fit SECOND), not in conflict; `feedback_directive_recommendations.md` + `feedback_no_resource_planning.md` (HOW preferences) — this rule defines the WHAT axis.

## Origin

**Primary** (Failure-A: deferral-as-forgetting): 2026-04-23 — `workspaces/multi-cli-coc/todos/active/00-migration-plan.md:403-452` reframed v6 §9.2 step 23 (30+ downstream re-pin obligation) from "loom task" to "downstream responsibility — loom does not sweep these," citing prior feedback memory as authority. Failure-A audit (2026-05-07) confirmed 7-of-7 decay-not-pickup ratio across deferred items inspected; OR-escape-hatch pattern in 2 of 7.

**Corroboration** (Failure-B: streetlight selection): 2026-05-07 loom session — agent picked aggregator-merge `.probes.jsonl` follow-up over THREE Carried-forward candidates (`coc-sync.md` move, `cc-audit.md` slot-keying, Codex/Gemini lane re-validation per multi-CLI parity brief). Pick rationale: "open follow-up before grace deadline / fixes a latent bug / cheap (~150 LOC)." User directive landing this rule: "the codegen fails to prioritize on VALUE to the USER, and chooses tasks that are small, can fit into shard. Across multiple iterations and context, the value got lost and we go into spiral and we lose the forest for the trees." Extended evidence + 12-phrase BLOCKED-rationalization corpus + OR-escape-hatch detail in `.claude/guides/rule-extracts/value-prioritization.md`.
