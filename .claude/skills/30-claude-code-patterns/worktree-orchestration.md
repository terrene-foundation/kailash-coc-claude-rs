# Worktree Orchestration Protocol

Extended evidence and per-rule post-mortems for `rules/agents.md` (worktree MUSTs) and `rules/worktree-isolation.md`. The rule files hold the load-bearing MUST clauses; this skill holds the narrative evidence and origin histories that would otherwise bloat the rules past their 200-line cap.

Parallel-agent orchestration with isolated git worktrees is the standard pattern when multiple agents must compile/test the same sub-package concurrently. It works reliably only when four collaborating contracts hold: (1) isolation is pinned in the prompt, (2) paths are relative or anchored to the worktree, (3) the agent commits incremental progress, (4) the parent verifies deliverables after exit, and (5) when two agents touch the same package, ownership of version-bearing files (`pyproject.toml`, `Cargo.toml`, `CHANGELOG.md`) is designated.

## Rule 1 — Worktree Isolation for Compiling Agents

When launching agents that will compile Rust code (build, test, implement), use `isolation: "worktree"` to avoid build directory lock contention. Cargo uses an exclusive filesystem lock on `target/`. Two cargo processes in the same directory serialize completely, turning parallel agents into sequential execution. Worktrees give each agent its own `target/` directory.

The same principle applies to Python (`.venv/` install races when two agents install dependencies concurrently) and JS (`node_modules/` writes). The `isolation: "worktree"` flag is necessary but NOT sufficient — without the verification layers in Rules 2-5 below, agents drift back to the main checkout silently.

## Rule 2 — Relative Paths Only

`isolation: "worktree"` runs the agent with cwd set to the worktree, but file-write tools accept any absolute path — an absolute path that points to the parent resolves there regardless of cwd.

**Post-mortem — Session 2026-04-19 parallel-shard ml-specialist (kailash-py):** 2 of 3 parallel ml-specialist shards wrote to main before self-correcting (Shard B) or losing work entirely (Shard A). The orchestrator prompt included absolute paths rooted in the parent checkout (`/Users/me/repos/kailash-py/packages/kailash-ml/src/...`). Each worktree was created, cwd was set, but every file-write tool call resolved the absolute path to the parent instead. Shard B self-corrected mid-run because its prompt happened to include a pinned worktree-path reminder. Shard A wrote ~300 LOC of sklearn array-API implementation into the main checkout; when the empty worktree auto-cleaned on agent exit, the work was effectively orphaned — main had changes, the worktree that "owned" them was gone, and the parent orchestrator didn't know which branch to pick from.

The fix is to anchor every absolute path to the pinned worktree path OR to use relative paths that resolve to the agent's cwd (which IS the worktree).

## Rule 2a — Recovery Protocol When Rule 2 Fails

Rule 2 prevents orphan writes; Rule 2a recovers them when prevention fails. The failure shape is specific: agent reports completion, branch has zero commits on it, worktree has been auto-cleaned, and the MAIN checkout has untracked files the orchestrator did not write. These files are the agent's output — reachable because absolute paths resolved to the parent cwd.

**The 4-step recovery protocol:**

```bash
# Step 1 — detect the orphan
git worktree list | grep <expected-branch>          # empty if cleaned
git log <expected-branch> --oneline | head -5       # zero agent commits
git status --short                                   # orphan files visible as "??" entries
find . -path .claude/worktrees -prune -o -name "<expected-file>" -print  # confirm

# Step 2 — create a recovery branch from main (NOT from the cleaned-up branch)
git checkout -b recovery/<original-branch-name>

# Step 3 — commit the orphaned work with explicit provenance
git add <orphaned files>
git -c core.hooksPath=/dev/null commit -m "feat(...): recovered from failed parallel worktree agent"

# Step 4 — fill missing deliverables that the agent truncated before writing
#          (tests, specs, pyproject bumps, CHANGELOG entries)
#          Each fix = its own commit. Final PR body notes the orphan-write recovery explicitly.
```

Every step has a reason:

- **Step 1 `git status --short`** — the orphans surface as `??` entries IF the agent wrote them to paths the MAIN checkout recognizes. `find` confirms when many candidates exist.
- **Step 2 `recovery/` branch prefix** — `git log --grep '^recovery/'` is the institutional-memory search for this rescue class. A `feat/`-prefixed recovery is indistinguishable from a normal feature branch and loses the forensic signal.
- **Step 3 separate commit** — the initial "recovered from failed parallel worktree agent" commit is the audit-trail boundary; subsequent commits are the post-recovery fill-in work. Combining them makes it impossible to diff "what the orphan produced" from "what the orchestrator had to patch."
- **Step 4 PR body provenance** — the PR body MUST explicitly note the orphan-write failure mode. Without this, future contributors reading the merged commit assume everything in it was produced normally, and the institutional lesson is lost.

**Post-mortem — Session 2026-04-20 Session 3b (kailash-py issue #567 PR#3 alignment):** Parallel agent for `AlignmentDiagnostics` truncated mid-run. Branch `feat/567-pr3-alignment-diagnostics` had zero commits; worktree auto-cleaned on agent exit. Parent orchestrator's first reaction was "work lost, re-launch." Before re-launching, `git status --short` on the MAIN checkout revealed 1129 LOC of uncommitted `packages/kailash-align/src/kailash_align/diagnostics/alignment.py`. Recovery protocol applied: branch renamed `recovery/pr3-alignment-diagnostics`, orphan committed, then 6 follow-up commits filled `__init__.py` (facade), `pyproject.toml` version bump 0.3.2 → 0.4.0, `CHANGELOG.md` 0.4.0 entry, 16 Tier 1 unit tests, 6 Tier 2 integration tests, `specs/alignment-diagnostics.md`, and `specs/_index.md` Alignment section update. Without the recovery, the next session would have produced a second orphan set and the MAIN checkout would have had two partial adapters for the same feature.

**Rust equivalent:** `cargo check` replaces `pytest --collect-only` as the post-recovery build-verification gate. Worktree auto-cleanup behavior is identical across git's own implementation — the protocol applies to every SDK that uses `isolation: "worktree"`.

## Rule 3 — Commit Incremental Progress

Worktree auto-cleanup silently deletes worktrees with zero commits on their branch. An agent that writes perfect code but truncates mid-message before committing loses 100% of its output.

**Post-mortem — Session 2026-04-19 three-shard ml-specialist:** 3 of 3 parallel ml-specialist shards truncated at 250-370k tokens. 2 lost work to auto-cleanup; only Shard B self-corrected because its prompt happened to emphasize "commit before exit." Shard A's 300+ LOC of sklearn array-API impl was lost when its empty worktree auto-cleaned; Shard C similarly lost work. Post-hoc file-existence verification (Rule 4) catches orphan files in main but CANNOT recover files that were only in a cleaned-up worktree.

The only reliable defense is instructing the agent to commit as it goes: `git add <file> && git commit -m "wip(shard-X): <what>"` after each file, not only at completion.

## Rule 4 — Verify Deliverables Exist After Exit

Agents hit their budget mid-message and emit "Now let me write X..." without having written X. The completion message is misleading; the filesystem is the source of truth.

**Post-mortem — kaizen-specialist round 6 (Session 2026-04-19, kailash-py):** Agent reported successful creation of a multi-file hooks-lifecycle skill; completion message enumerated 4 files with line counts and summary. Parent orchestrator committed the branch without verification. `ls .claude/skills/04-kaizen/` revealed ZERO of the 4 files existed — the agent had consumed its budget drafting the descriptions and emitted "Now let me write each file..." with no subsequent tool calls.

**Post-mortem — ml-specialist round 7 (Session 2026-04-19, kailash-py):** Similar failure mode. Agent claimed 2 files written; 0 existed.

The fix is O(1) — `ls` or `Read` the claimed file before trusting the completion. Converts silent no-op into loud retry.

## Rule 5 — Parallel-Worktree Package Ownership

When two or more parallel agents' worktrees touch the SAME sub-package (same `packages/<pkg>/` or same crate), the orchestrator must designate ONE agent as the **version owner** for that package AND tell every other agent explicitly: "do NOT edit `packages/<pkg>/pyproject.toml` (or `Cargo.toml`), the package's `__version__` / crate version, or `packages/<pkg>/CHANGELOG.md`". The final integration step belongs to the orchestrator, not to any agent.

**Success case — Session 2026-04-20 three-agent parallel-release cycle (kailash-py, kailash-ml 0.13.0):** Three agents launched in parallel worktrees. Agent A owned the kailash-ml package: version bump in `packages/kailash-ml/pyproject.toml` (0.12.0 → 0.13.0), `__version__` string in `packages/kailash-ml/src/kailash_ml/__init__.py`, and the 0.13.0 entry at the top of `packages/kailash-ml/CHANGELOG.md`. Agent B touched the SAME kailash-ml package for a sibling feature but its prompt included an explicit `COORDINATION NOTE: A parallel agent is bumping this package to 0.13.0. You MUST NOT edit pyproject.toml, __version__, or CHANGELOG.md.` Agent C worked on a different package (kailash-align) with full ownership over that package's version files. At merge time, Agent A's version bump and Agent B's feature code concatenated cleanly — zero conflict on the version line because B never touched it. The integration step was purely additive.

Contrast: without the exclusion clause, the two sibling agents would have raced on `pyproject.toml` (both writing `version = "0.13.0"`) and on `CHANGELOG.md` (both writing a top-level `## 0.13.0` header, one underneath the other). Git's three-way merge would have seen two "newest" versions of the same line; the orchestrator would have picked one — discarding the other agent's changelog prose silently. Parallel worktree agents see the same base SHA; each independently bumps and writes. Pre-declared ownership is O(one-line-in-prompt); post-hoc stitching is O(manual-labor).

Rust equivalent: `Cargo.toml [package] version` and per-crate `CHANGELOG.md` have the exact same race. The ownership contract is a multi-agent coordination primitive independent of the build system.

## Reviewer Prompts — Mechanical AST/Grep Sweep

Related contract — see `rules/agents.md` § "MUST: Reviewer Prompts Include Mechanical AST/Grep Sweep, Not Only Diff Review". Gate reviewers are constrained by the diff they're shown. The orphan failure mode of `rules/orphan-detection.md` §1 is invisible at diff-level — the new entries look complete; the OLD entries that were never updated for the new public surface stay invisible. A 4-second `grep -c` sweep catches what 5 minutes of LLM judgment misses.

**Post-mortem — Session 2026-04-19 ML GPU-first Phase 1 codify cycle (kailash-py):** Code reviewer APPROVED kailash-ml 0.12.0 with one minor finding. The approval was necessary but not sufficient — the subsequent `/redteam` mechanical sweep caught TorchTrainable + LightningTrainable missing `device=DeviceReport` in 2 of 7 `return TrainingResult(...)` sites. The reviewer never ran the parity grep because the prompt only contained diff context. A 4-second `grep -c 'return TrainingResult' packages/kailash-ml/src/` + manual inspection of each call site's kwargs would have caught the missing `device=` parameter on the 2 offending sites; the reviewer spent 5 minutes of LLM judgment on the diff and missed them entirely.

Every gate-level reviewer prompt must include explicit mechanical sweeps that verify ABSOLUTE state (not only the diff): parity greps on call sites, `pytest --collect-only -q` / `cargo check --workspace`, `pip check` / `cargo tree -d` for dependency conflicts, and verify that every public symbol added in the PR also lands in `__all__` (per `rules/orphan-detection.md` §6).
