# Implement Reference

Reference material for the /implement command.

  - Ensure you create/update `README.md` (navigating authority documents) and `CLAUDE.md` (preloaded instructions)
- Use as many subdirectories and files as required, naming them sequentially 00-, 01- for easy referencing
- Focus on capturing the essence and intent — the 'what it is' and 'how to use it' — not status/progress/reports

**Note:** Project agents and skills (`.claude/agents/project/`, `.claude/skills/project/`) are created in phase 05 (`/codify`), not here. However, when implementation changes an API or adds a feature, update the corresponding **existing** skill files, rules, and hooks immediately to prevent drift. Do not defer corrections to `/codify` — that phase is for creating **new** project-specific artifacts, not for fixing stale existing ones.

### 8. Completion evidence

Before closing ANY todo, you MUST provide concrete evidence:

**For code changes:**

- [ ] File path(s) where work is stored
- [ ] All tests pass (unit, integration, e2e as applicable)
- [ ] Code review (intermediate-reviewer has reviewed)
- [ ] Security review (security-reviewer has reviewed)
- [ ] No regressions introduced

**For documentation changes:**

- [ ] File path(s) where work is stored
- [ ] Cross-references verified (all links resolve)
- [ ] Review completed (intermediate-reviewer)

A todo is NOT complete until evidence is provided. "Verified with evidence" means specific file paths, test results, and review attestations — not a general statement.

### 9. Decision log

When the user makes a decision during implementation, capture it:

```yaml
decision: [What was decided]
rationale: [Why — the reasoning]
alternatives_rejected: [What other options were considered]
date: [When]
initiative: [Which initiative]
```

Store decisions in the workspace for `/codify` to capture later.

## Agent Teams

Deploy specialist agents as needed. See agent definitions for review criteria.

### Journal

After completing each task, create journal entries for insights produced:
- **DECISION** entries for implementation choices (architecture, library selection, design patterns)
- **DISCOVERY** entries for technical findings during development
- **RISK** entries for potential issues discovered during implementation

Use sequential naming: check the highest existing `NNNN-` prefix and increment.
