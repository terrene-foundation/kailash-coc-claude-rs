---
priority: 0
scope: baseline
---

# Agent Orchestration Rules

See `.claude/guides/rule-extracts/agents.md` for full evidence, extended examples, post-mortems, recovery-protocol commands, the gate-review table, and CLI-syntax variants.

<!-- slot:neutral-body -->


## Specialist Delegation (MUST)

When working with Kailash frameworks, MUST consult the relevant specialist:

- **dataflow-specialist**: Database or DataFlow work
- **nexus-specialist**: API or deployment work
- **kaizen-specialist**: AI agent work
- **mcp-specialist**: MCP integration work
- **pact-specialist**: Organizational governance work
- **ml-specialist**: ML algorithms, pipelines, model selection
- **align-specialist**: LLM fine-tuning, LoRA, model serving

**Applies when**: Creating workflows, modifying DB models, setting up endpoints, building agents, implementing governance, ML pipelines.

**Why:** Framework specialists encode hard-won patterns and constraints that generalist agents miss, leading to subtle misuse of DataFlow, Nexus, or Kaizen APIs.

## Specs Context in Delegation (MUST)

Every specialist delegation prompt MUST include relevant spec file content from `specs/`. Read `specs/_index.md`, select relevant files, include them inline. See `rules/specs-authority.md` MUST Rule 7 for the full protocol and examples.

**Why:** Specialists without domain context produce technically correct but intent-misaligned output (e.g., schemas without tenant_id because multi-tenancy wasn't communicated).

## Analysis Chain (Complex Features)

1. **analyst** → Identify failure points
2. **analyst** → Break down requirements
3. **`decide-framework` skill** → Choose approach
4. Then appropriate specialist

**Applies when**: Feature spans multiple files, unclear requirements, multiple valid approaches.

## Parallel Execution

When multiple independent operations are needed, launch agents in parallel using Task tool, wait for all, aggregate results. MUST NOT run sequentially when parallel is possible.

**Why:** Sequential execution of independent operations wastes the autonomous execution multiplier, turning a 1-session task into a multi-session bottleneck.

### MUST: Parallel Brief-Claim Verification When Issue Count ≥ 3

When `/analyze` runs against a brief covering ≥ 3 distinct issues / failure modes / workstreams, the orchestrator MUST launch parallel deep-dive verification agents — one per claim cluster — to independently re-grep / re-read every factual claim in the brief tagged with file:line citations. Inaccuracies surfaced by the deep-dive sweep MUST be recorded in the workspace journal AND in the architecture plan's "Brief corrections" section AS THE GATE before `/todos`. Single-agent analysis on a ≥3-issue brief is BLOCKED — the framing inherited from the brief is the failure mode this rule prevents.

**BLOCKED rationalizations:** "The brief was authored by the user, it must be accurate" / "Sequential single-agent analysis catches inaccuracies anyway" / "Three parallel agents triple the cost for the same conclusion" / "I'll spot-check a couple of claims, that's good enough" / "Brief verification is /redteam's job, not /analyze's" / "The brief's claims are 'mostly correct', the rounding errors don't change the plan".

**Why:** Briefs decay silently as the code evolves; a ≥3-issue brief carries ≥3× the surface area for stale citations and misframed root causes. Single-agent analysis cannot resist the brief's framing because the agent has no independent reading. Parallel deep-dive verification is the structural defense — three agents reading three claim-clusters independently produce three independent reports the orchestrator reconciles. Evidence: `kailash-ml-1.5.x-followup` brief had THREE distinct factual inaccuracies — all three caught only because three parallel deep-dive agents independently verified. Origin: 2026-04-29 — `workspaces/kailash-ml-1.5.x-followup/journal/0001-DISCOVERY-brief-root-cause-incorrect-on-three-issues.md`.

## Quality Gates (MUST — Gate-Level Review)

Reviews happen at COC phase boundaries, not per-edit. Skip only when explicitly told to.

**Why:** Skipping gate reviews lets analysis gaps, security holes, and naming violations propagate to downstream repos where they are far more expensive to fix. Evidence: 0052-DISCOVERY §3.3 — six commits shipped without a single review because gates were phrased as "recommended." Upgrading to MUST + background agents makes reviews nearly free.

| Gate                | After Phase  | Enforcement | Review                                                                         |
| ------------------- | ------------ | ----------- | ------------------------------------------------------------------------------ |
| Analysis complete   | `/analyze`   | RECOMMENDED | **reviewer**: Are findings complete? Gaps?                                     |
| Plan approved       | `/todos`     | RECOMMENDED | **reviewer**: Does plan cover requirements?                                    |
| Implementation done | `/implement` | **MUST**    | **reviewer** + **security-reviewer**: Run as parallel background agents.       |
| Validation passed   | `/redteam`   | RECOMMENDED | **reviewer**: Are red team findings addressed?                                 |
| Knowledge captured  | `/codify`    | RECOMMENDED | **gold-standards-validator**: Naming, licensing compliance.                    |
| Before release      | `/release`   | **MUST**    | **reviewer** + **security-reviewer** + **gold-standards-validator**: Blocking. |

**BLOCKED responses when skipping MUST gates:**

- "Skipping review to save time"
- "Reviews will happen in a follow-up session"
- "The changes are straightforward, no review needed"
- "Already reviewed informally during implementation"

## MUST: Verify Specialist Tool Inventory Before Implementation Delegation

When delegating IMPLEMENTATION work (any task involving file edits, commits, build/test invocation, version bumps), the orchestrator MUST select a specialist whose declared tool set includes `Edit` AND `Bash`. Read-only specialists (`security-reviewer`, `analyst`, `reviewer`, `gold-standards-validator`, `value-auditor`) MUST NOT be delegated implementation tasks — their tool set is `Read, Write, Grep, Glob` (and a few have `Task`), with no Edit + no Bash. Pure-research / pure-review delegations are fine.

```
# DO — match agent's tools to the mission
Agent(subagent_type: "tdd-implementer", isolation: "worktree",
      prompt: "Implement Class 1 fix + Class 3 helper + commit per cadence")
# tdd-implementer has Edit + Bash → can git commit + cargo build

Agent(subagent_type: "security-reviewer", run_in_background: true,
      prompt: "Audit unsafe blocks; post findings as PR comment")
# security-reviewer is read-only → audit OK

# DO NOT — assign code-edit + commit work to a read-only agent
Agent(subagent_type: "security-reviewer", isolation: "worktree",
      prompt: "Apply Class 1 fix + ≥5 commits + cargo green")
# ↑ security-reviewer cannot run `git commit`, cannot run `cargo`; the agent
#   exits without committing OR fakes the work; either outcome wastes a shard.
```

**BLOCKED rationalizations:**

- "security-reviewer is the security domain, so security-relevant edits go there"
- "The agent will figure out its tool limitations"
- "I'll re-launch with a different specialist if it halts"
- "Read-only review IS implementation when the diff is trivial"
- "The agent has Write — that's enough for code edits"

**Why:** Read-only specialists halt mid-instruction at file-edit boundaries with no recovery — the agent emits "Now let me wire X" then exits with zero tool calls because Edit is not available, OR fabricates commit-style language without actually committing (violating `git.md` § "Commit-Message Claim Accuracy"). Either outcome wastes one full shard's budget AND requires re-launch with a tools-equipped specialist (e.g., `tdd-implementer`, `build-fix`, `python-binding`). Verifying tool inventory pre-launch is O(1); re-launch + re-read of all context is O(N) on shard size.

Origin: 2026-04-25 v3.23 sprint Wave 2 W3 (kailash-rs) — security-reviewer assigned to apply CodeQL Class 1 fingerprint helper + connection.rs migration + ≥5 commits + cargo verification; agent's tool set was `Read, Write, Grep, Glob` only; reported "audit complete, code edits blocked by tool constraints" after writing audit doc + fingerprint.rs without committing; re-launched as tdd-implementer (with Bash) to complete. Cross-SDK independent re-discovery: 2026-04-26 Wave 4 (kailash-py) — security-reviewer launched twice for alg_id Layer-1 + JWT iss claim implementation; both halted at edit boundaries; recovered via pact-specialist + orchestrator-takeover.

<!-- /slot:neutral-body -->
