# Zero-Tolerance Enforcement Rules

## Scope

These rules apply to ALL sessions, ALL agents, ALL code changes, ALL phases. They are ABSOLUTE and NON-NEGOTIABLE. There is NO flexibility on any of these rules. Softer language is explicitly forbidden in their enforcement.

## ABSOLUTE RULE 1: Pre-Existing Failures MUST Be Resolved

When tests, red team validation, code review, or any analysis reveals a pre-existing failure (a bug, broken test, incorrect behavior, or quality issue that existed before the current session):

**YOU MUST FIX IT.** Period.

"It was not introduced in this session" is NOT an acceptable response. "Pre-existing" does not mean "someone else's problem." If you found it, you own it.

**Required response to ANY pre-existing failure:**

1. Diagnose the root cause
2. Implement the fix
3. Write a regression test that fails without the fix and passes with it
4. Verify the fix with `pytest` (Python) or `bundle exec rspec` (Ruby)
5. Include the fix in the current commit or a dedicated fix commit

**BLOCKED responses:**

- "This is a pre-existing issue, not introduced in this session"
- "This failure exists in the current codebase and is outside the scope of this change"
- "Noting this as a known issue for future resolution"
- "This is not related to the current task"
- ANY response that acknowledges a failure without fixing it

**The only acceptable exception:** The user explicitly says "skip this issue" or "ignore this for now."

**Why:** Every session MUST leave the codebase better than it found it. The "right the first time, every time" principle means every time the codebase is touched, ALL known issues are resolved. Reporting without resolving is worse than not finding the issue at all -- it creates a false sense of awareness without action.

## ABSOLUTE RULE 2: No Stubs, Placeholders, or Deferred Implementation -- EVER

Stubs are BLOCKED. No approval process. No exceptions. The validate-workflow hook exits with code 2 (BLOCK) on detection.

Full detection patterns, enforcement config, and test exemptions: see `rules/no-stubs.md`.

## ABSOLUTE RULE 3: No Naive Fallbacks or Error Hiding

Hiding errors behind defaults, empty except/rescue blocks, or silent discards is BLOCKED. If an error occurs in production and nobody knows, the code is BLOCKED.

Full detection patterns and acceptable exceptions: see `rules/no-stubs.md` Section 3.

## ABSOLUTE RULE 4: No Workarounds for SDK Issues

When you encounter a bug, limitation, or unexpected behavior in the Kailash SDK:

**DO NOT work around it. DO NOT re-implement it naively.**

1. **Investigate** -- Read the SDK documentation and examples to confirm the issue
2. **Reproduce** -- Write a minimal test case that demonstrates the problem
3. **Report** -- File a GitHub issue on the SDK repository with the reproduction
4. **Use alternatives** -- If a supported alternative pattern exists, use that instead

**BLOCKED:** Naive re-implementations, post-processing to "fix" SDK output, downgrading to avoid bugs, monkey-patching SDK internals.

## ABSOLUTE RULE 5: Package Freshness and COC Sync

At session start AND before any deployment:

1. **Verify installed SDK packages are latest version**
2. **Verify COC sync is current**
3. **If outdated, update FIRST**

```bash
pip install --upgrade kailash-enterprise  # Python
gem update kailash                        # Ruby
```

**During `/deploy`**: The deployment MUST verify the server/container has the latest SDK packages. If stale, update BEFORE deploying application code.

**BLOCKED:** Proceeding with development or deployment when the SDK package is outdated.

## ABSOLUTE RULE 6: File Improvement Issues for SDK/COC Gaps

When you encounter unclear, missing, or incorrect information that caused a mistake or wasted time:

**File an improvement issue immediately** to the appropriate repo:

- **SDK issues** (API behavior, error messages, missing features) -> `gh issue create --repo esperie-enterprise/kailash-rs`
- **COC issues** (agents, skills, rules, scripts, commands) -> `gh issue create --repo terrene-foundation/kailash-coc-claude-rs`

COC artifacts to examine: **agents** (intent/delegation), **skills** (context/knowledge), **rules** (guardrails), **scripts/hooks** (automation), **commands** (instructions/workflows).

```bash
gh issue create --repo terrene-foundation/kailash-coc-claude-rs \
  --title "COC: [agent/skill/rule/command] -- [what's unclear/missing]" \
  --label "coc-improvement" \
  --body "## What happened\n...\n## Which COC artifact\n...\n## Suggested fix\n..."
```

**Every mistake caused by unclear documentation or COC guidance is a system bug, not a user error.**

## Enforcement

These rules are enforced by:

1. **validate-workflow.js hook** -- BLOCKS (exit 2) on stubs, naive fallbacks, and error hiding in production code
2. **user-prompt-rules-reminder.js hook** -- Injects zero-tolerance reminders on every message
3. **session-start.js hook** -- Checks package freshness and COC sync status
4. **intermediate-reviewer agent** -- Validates compliance during code review
5. **security-reviewer agent** -- Validates compliance during security review
6. **red team agents** -- Validates compliance during validation rounds

## Language Policy

These rules use direct, unambiguous language intentionally. Previous iterations used softer language ("consider," "prefer," "you might want to") which was interpreted as optional guidance rather than mandatory requirements.

Every "MUST" in this document means "MUST" -- not "should," not "consider," not "prefer." Every "BLOCKED" means the operation WILL NOT proceed. Every "NO" means "NO" -- not "usually no" or "no unless convenient."
