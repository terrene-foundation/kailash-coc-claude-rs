---
name: implement
description: "Load phase 03 (implement) for the current workspace. Repeat until all todos complete."
---

## What This Phase Does (present to user)

Build the project one task at a time from the approved roadmap. Each run of `/implement` completes one task. The AI writes code, tests it, reviews it for quality and security, then moves to the next task.

## Your Role (communicate to user)

You don't need to look at code. Your role is to answer questions when decisions come up during building — these will always be about what the product should do, not how it's coded. You can check progress anytime with `/ws`.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name or todo, parse accordingly
2. Otherwise, use the most recently modified directory under `workspaces/` (excluding `instructions/`)
3. If no workspace exists, ask the user to create one first
4. Read all files in `workspaces/<project>/briefs/` for user context (this is the user's input surface)

## Phase Check

- Read files in `workspaces/<project>/todos/active/` to see what needs doing
- Read files in `workspaces/<project>/todos/completed/` to see what's done
- If `$ARGUMENTS` specifies a specific todo, focus on that one
- Otherwise, pick the next active todo
- Reference plans in `workspaces/<project>/02-plans/` for context

## Execution Model

This phase executes under the **autonomous execution model** (see `rules/autonomous-execution.md`). Implementation is fully autonomous — agents execute in parallel, self-validate through TDD, and converge through quality gates. The human observes outcomes but does not sit in the execution loop. Pre-existing failures are fixed, not reported (zero-tolerance). Agent-to-agent delegation (intermediate-reviewer, security-reviewer) is autonomous, not human-gated.

## Workflow

### NOTE: Run `/implement` repeatedly until all todos/active have been moved to todos/completed

### 1. Prepare todos

You MUST always use the todo-manager to create detailed todos for EVERY SINGLE TODO in `todos/000-master.md`.

- Review with agents before implementation
- Ensure that both FE and BE detailed todos exist, if applicable

### 2. Implement

Continue with the implementation of the next todo/phase using a team of agents, following procedural directives.

- Ensure that both FE and BE are implemented, if applicable

### 3. Quality standards

Always involve tdd-implementer, testing-specialists, value auditor, ai ui ux specialists, with any agents relevant to the work at hand.

- Test for rigor, completeness, and quality of output from both value and technical user perspectives
- Pre-existing failures often hint that you are missing something obvious and critical
  - Always address pre-existing failures — do not pass until all failures, warnings, hints are resolved
- Always identify the root causes of issues, and implement optimal, elegant fixes

### 4. Testing requirements

**Test-once protocol**: Tests run ONCE per code change, not once per phase.

**Before implementing (baseline):**

1. Run the full test suite ONCE to establish baseline
2. Record the result: pass count, fail count, commit hash
3. If there are pre-existing failures, note them — they are NOT your regressions

**During implementation (TDD cycle):**

- tdd-implementer runs tests as part of red-green-refactor — this is the ONE authoritative test run
- Run only affected tests during development for speed
- Run the full suite ONCE when the todo is complete (not after every small change)

**After implementing (regression check):**

1. Run full suite one final time
2. Compare against baseline: if any test that passed before now fails, you introduced a regression — STOP and fix
3. Write `.test-results` artifact in workspace: `workspaces/<project>/.test-results`

**`.test-results` format:**

```
commit: <git hash>
timestamp: <ISO 8601>
baseline_pass: <N>
baseline_fail: <N>
final_pass: <N>
final_fail: <N>
new_tests: <N>
regressions: <N> (must be 0)
```

**Bug fixes MUST include regression tests** (see `rules/testing.md` Rule 0):

- Every bug fix adds a regression test that reproduces the bug
- The test MUST fail before the fix and pass after
- Regression tests are NEVER deleted — they are permanent guards

**What NOT to do:**

- Do NOT run the full suite multiple times per todo
- Do NOT let testing-specialist re-run tests that tdd-implementer already ran
- Do NOT re-run tests just to "verify" — read the results from the last run
- No tests can be skipped (make sure docker is up and running)
- Do not rewrite tests just to get them passing — ensure it's not infrastructure issues causing errors
- Always test according to the intent of what we are trying to achieve and against users' expectations
  - Do not write simple naive technical assertions
  - Do not have stubs, hardcodes, simulations, naive fallbacks without informative logs
- If tests involve LLMs and are too slow, check if you are using local LLMs and switch to OpenAI
- If tests involve LLMs and are failing, check these errors first before skipping or changing logic:
  - Structured outputs are not coded properly
  - LLM agentic pipelines are not coded properly
  - Only after exhausting all input/output and pipeline errors, try with a larger model

### 5. LLM usage

When writing and testing agents, always utilize the LLM's capabilities instead of naive NLP approaches (keywords, regex, etc).

- Use ollama or openai (if ollama is too slow)
- Always check `.env` for api keys and model names to use in development
  - Always assume model names in memory are outdated — perform a web check on model names in `.env` before declaring them invalid

### 6. Communicate progress and surface decisions

When reporting to the user:

- **Progress**: State what users can now do, not what files changed. "Users can now reset their password via email" not "Added password reset endpoint and email template"
- **Decisions needed**: Present choices with impact. "Should password reset links expire after 1 hour or 24 hours? Shorter is more secure but less convenient for users who check email infrequently."
- **Scope changes**: If implementation reveals something not in the plan, explain what and why: "While building the signup flow, I noticed we don't have a way to handle duplicate emails. Should I add that now (adds ~30 minutes) or save it for later?"
- **Blockers**: Translate technical blockers into business language. Never present raw error messages.

### 7. Update docs and close todos

After completing each todo:

- Move it from `todos/active/` to `todos/completed/`
- Ensure every task is verified with evidence before closing

At the end of each implementation cycle, create and update documentation at the **project root** (not inside the workspace):

- `docs/` (complete detailed docs capturing every detail of the codebase)
  - This is the last resort document that agents use to find elusive and deep documentation
- `docs/00-authority/`
  - Authoritative documents that developers and codegen read first for full situational awareness

**Full reference**: `.claude/skills/management/implement-reference.md`
