# Agent Orchestration Rules

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

**Background agent pattern for MUST gates** — the review costs nearly zero parent context:

```
# At end of /implement, spawn reviews in background:
Agent({subagent_type: "reviewer", run_in_background: true, prompt: "Review all changes since last gate..."})
Agent({subagent_type: "security-reviewer", run_in_background: true, prompt: "Security audit all changes..."})
# Parent continues; reviews arrive as notifications
```

### MUST: Reviewer Prompts Include Mechanical AST/Grep Sweep, Not Only Diff Review

Every gate-level reviewer prompt MUST include explicit mechanical sweeps that verify ABSOLUTE state (not only the diff). LLM-judgment review of the diff catches what's wrong with the new code; mechanical sweeps catch what's missing from the OLD code that the spec also touched.

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

**BLOCKED rationalizations:**

- "The reviewer is smart enough to spot orphans"
- "Mechanical sweeps are /redteam's job, not the reviewer's"
- "The diff IS the reviewer's scope"
- "Adding sweeps to every reviewer prompt is repetitive"

**Why:** Gate reviewers are constrained by the diff they're shown. The orphan failure mode of `rules/orphan-detection.md` §1 is invisible at diff-level — the new entries look complete; the OLD entries that were never updated for the new public surface stay invisible. A 4-second grep sweep catches what 5 minutes of LLM judgment misses.

Origin: Cross-SDK from kailash-py 2026-04-19 — code reviewer APPROVED a release; subsequent /redteam mechanical sweep caught 2 of 7 return sites missing a required field that the reviewer never parity-grepped.

## Zero-Tolerance

Pre-existing failures MUST be fixed (see `rules/zero-tolerance.md` Rule 1). No workarounds for SDK bugs — deep dive and fix directly (Rule 4).

**Why:** Workarounds create parallel implementations that diverge from the SDK, doubling maintenance cost and masking the root bug from being fixed.

## MUST: Worktree Isolation for Compiling Agents

When launching agents that will compile Rust code (build, test, implement), MUST use `isolation: "worktree"` to avoid build directory lock contention.

```
# DO: Independent target/ dirs, compile in parallel
Agent(isolation: "worktree", prompt: "implement feature X...")
Agent(isolation: "worktree", prompt: "implement feature Y...")

# DO NOT: Multiple agents sharing same target/ (serializes on lock)
Agent(prompt: "implement feature X...")
Agent(prompt: "implement feature Y...")  # Blocks waiting for X's build lock
```

**Why:** Cargo uses an exclusive filesystem lock on `target/`. Two cargo processes in the same directory serialize completely, turning parallel agents into sequential execution. Worktrees give each agent its own `target/` directory.

## MUST: Parallel-Worktree Package Ownership Coordination

When launching two or more parallel agents whose worktrees touch the SAME sub-package (same `packages/<pkg>/` or same crate), the orchestrator MUST designate ONE agent as the **version owner** for that package AND tell every other agent explicitly: "do NOT edit `packages/<pkg>/pyproject.toml` (or `Cargo.toml`), the package's `__version__` / crate version, or `packages/<pkg>/CHANGELOG.md`". The final integration step belongs to the orchestrator, not to any agent.

```python
# DO — explicit ownership in the prompts
Agent(  # version owner for the package
    isolation="worktree",
    prompt="""...resolve issue A...
    Version bump + CHANGELOG:
    - packages/<pkg>/pyproject.toml → X.Y.Z
    - packages/<pkg>/src/<pkg>/__init__.py::__version__
    - packages/<pkg>/CHANGELOG.md — add X.Y.Z entry""",
)
Agent(  # sibling, explicitly excluded from version bump
    isolation="worktree",
    prompt="""...resolve issues B + C...
    COORDINATION NOTE: A parallel agent is bumping this package to
    X.Y.Z. You MUST NOT edit packages/<pkg>/pyproject.toml,
    packages/<pkg>/src/<pkg>/__init__.py::__version__, or
    packages/<pkg>/CHANGELOG.md. Just deliver the functionality.""",
)

# DO NOT — silent parallel ownership, both agents touch pyproject.toml
Agent(isolation="worktree", prompt="...resolve issue A... bump to X.Y.Z")
Agent(isolation="worktree", prompt="...resolve issues B + C... bump to X.Y.Z")
# ↑ Both agents race to write the same pyproject.toml version field and
#   the same CHANGELOG header; the merge-step hits a version conflict
#   that the orchestrator resolves by picking one side — abandoning the
#   other agent's CHANGELOG prose.
```

**BLOCKED rationalizations:**

- "Both agents are smart enough to see the existing version"
- "We'll resolve the conflict at merge time"
- "The CHANGELOG entries are for different issues, they'll concat cleanly"
- "Git's three-way merge handles this"
- "Each agent owns a section of the CHANGELOG"

**Why:** Parallel worktree agents see the same base SHA; each independently bumps the version field and writes a top-level CHANGELOG entry. At merge time git sees two "newest" versions of the same line and the orchestrator picks one — discarding the other agent's changelog prose silently. The integration-step post-hoc stitching is O(manual-labor); pre-declared ownership is O(one-line-in-prompt). Equivalent in Rust: `Cargo.toml [package] version` and per-crate `CHANGELOG.md` have the exact same race; the ownership contract is a multi-agent coordination primitive independent of the build system.

Origin: Cross-SDK from kailash-py session 2026-04-20 three-agent parallel-release cycle — coordination worked because one agent owned the package pyproject.toml + CHANGELOG, a sibling agent was explicitly excluded from it (delivered only code + tests), and a third agent worked on a different package. Without the exclusion clause, the two sibling agents would have raced on `pyproject.toml` and `CHANGELOG.md`.

## MUST NOT

- Framework work without specialist

**Why:** Framework misuse without specialist review produces code that looks correct but violates invariants (e.g., pool sharing, session lifecycle, trust boundaries).

- Sequential when parallel is possible

**Why:** See Parallel Execution above — same rule, expressed as MUST NOT.

- Raw SQL when DataFlow exists

**Why:** Raw SQL bypasses DataFlow's access controls, audit logging, and dialect portability, creating ungoverned database access.

- Custom API when Nexus exists

**Why:** Custom API endpoints miss Nexus's built-in session management, rate limiting, and multi-channel deployment, requiring manual reimplementation.

- Custom agents when Kaizen exists

**Why:** Custom agent implementations bypass Kaizen's signature validation, tool safety, and structured reasoning, producing fragile agents.

- Custom governance when PACT exists

**Why:** Custom governance lacks PACT's D/T/R accountability grammar and verification gradient, making audit compliance unverifiable.
