---
priority: 0
scope: baseline
---

# Agent Orchestration Rules

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

<!-- /slot:neutral-body -->

<!-- slot:examples -->


### Quality Gates — Background Agent Pattern

```
# At end of /implement, spawn reviews in background:
Agent({subagent_type: "reviewer", run_in_background: true, prompt: "Review all changes since last gate..."})
Agent({subagent_type: "security-reviewer", run_in_background: true, prompt: "Security audit all changes..."})
# Parent continues; reviews arrive as notifications
```

### Reviewer Mechanical Sweeps

```
# DO — reviewer prompt enumerates mechanical sweeps to run
Agent(subagent_type="reviewer", prompt="""
... diff context ...

Mechanical sweeps (run BEFORE LLM judgment):
1. Parity grep — every call site that returns a given result type must carry the required field
2. `cargo check --workspace` / `pytest --collect-only -q` exit 0
3. `cargo tree -d` / `pip check` — no new conflicts vs main
4. For every public symbol added by this PR — verify the re-export reaches `pub use` / `__all__`
""")

# DO NOT — reviewer prompt only includes diff context
Agent(subagent_type="reviewer", prompt="Review the diff between main and feat/X.")
# ↑ reviewer reads the diff, judges the new code, never runs the sweep.
#   Orphan in untouched lines stays invisible.
```

### Worktree Isolation for Compiling Agents

```
# DO: Independent target/ dirs, compile in parallel
Agent(isolation: "worktree", prompt: "implement feature X...")
Agent(isolation: "worktree", prompt: "implement feature Y...")

# DO NOT: Multiple agents sharing same target/ (serializes on lock)
Agent(prompt: "implement feature X...")
Agent(prompt: "implement feature Y...")  # Blocks waiting for X's build lock
```

<!-- /slot:examples -->
