# Zero-Tolerance Enforcement Rules

## Scope

These rules apply to ALL sessions, ALL agents, ALL code changes, ALL phases. They are ABSOLUTE and NON-NEGOTIABLE.

## ABSOLUTE RULE 1: Pre-Existing Failures MUST Be Resolved

When tests, red team, or code review reveals a pre-existing failure:

**YOU MUST FIX IT.** Period.

"It was not introduced in this session" is NOT acceptable. If you found it, you own it.

**Required response:**
1. Diagnose the root cause
2. Implement the fix
3. Write a regression test
4. Verify with `cargo test`
5. Include the fix in current work

**The only exception:** User explicitly says "skip this issue."

## ABSOLUTE RULE 2: No Stubs, Placeholders, or Deferred Implementation — EVER

Stubs are BLOCKED. No approval process. No exceptions.

Full detection patterns and enforcement: see `rules/no-stubs.md`.

## ABSOLUTE RULE 3: No Naive Fallbacks or Error Hiding

Hiding errors behind `.unwrap_or_default()`, `let _ =`, or empty error arms is BLOCKED.

Full detection patterns and acceptable exceptions: see `rules/no-stubs.md` Section 3.

## ABSOLUTE RULE 4: No Workarounds for Core SDK Issues

When you encounter a bug in `kailash-core`, `kailash-dataflow`, `kailash-nexus`, `kailash-kaizen`, or any Kailash crate:

**DO NOT work around it. DO NOT re-implement it naively.**

**This is a USE repo.** File a GitHub issue and block:

```bash
gh issue create --repo esperie/kailash --title "Bug: [description]" \
  --body "## Reproduction\n...\n## Expected\n...\n## Actual\n...\n## Version\n..."
```

Tell the user: "This is a core SDK issue. I've filed [issue link]. The fix must come from the SDK team."

## ABSOLUTE RULE 5: Package Freshness and COC Sync

At session start AND before any deployment:

1. **Verify installed SDK packages are latest version**
2. **Verify COC sync is current**
3. **If outdated, update FIRST**

```bash
pip install --upgrade kailash-enterprise  # Always latest
```

**During `/deploy`**: The deployment MUST verify the server/container has the latest SDK packages. If stale, update BEFORE deploying application code.

**BLOCKED:** Proceeding with development or deployment when the SDK package is outdated.

## ABSOLUTE RULE 6: File Improvement Issues for SDK/COC Gaps

When you encounter unclear, missing, or incorrect SDK or COC documentation that caused a mistake or wasted time:

**File an improvement issue immediately:**

```bash
gh issue create --repo esperie/kailash --title "Docs: [what's unclear/missing]" \
  --label "documentation" --body "## What happened\n...\n## What was unclear\n...\n## Suggested fix\n..."
```

**Every mistake caused by unclear documentation is a documentation bug, not a user error.**

## Enforcement

1. **validate-workflow.js hook** — BLOCKS stubs and error hiding in production code
2. **user-prompt-rules-reminder.js hook** — Injects zero-tolerance reminders every message
3. **session-start.js hook** — Checks package freshness and COC sync status

## Language Policy

Every "MUST" means "MUST." Every "BLOCKED" means the operation stops. Every "NO" means "NO."
