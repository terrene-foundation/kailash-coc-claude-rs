# Gemini Subagent Templates

Each file in this directory becomes a Gemini native subagent at `.gemini/agents/<name>.md` in the USE template. Invocation syntax is `@<name> <task>`.

Required YAML frontmatter per [geminicli.com/docs/core/subagents](https://geminicli.com/docs/core/subagents/):

```yaml
---
name: <kebab-case-name> # MUST match filename (minus .md)
description: <one line> # surfaces in @-mention autocomplete
tools: [read_file, grep_search, glob, list_directory, web_fetch] # optional; omit = all tools
model: gemini-2.5-pro # optional; defaults to session model
---
# Agent body — the system prompt / role description
...
```

Constraints:

- Subagents cannot recursively invoke other subagents — compose via the parent session.
- Tool allowlist wildcards: `*` = all, `mcp_*` = all MCP tools, specific names restrict.
- One file per CC specialist. CC-only specialists (cc-architect) MUST NOT appear here (per `cli_emit_exclusions.gemini`).

## One-to-one mapping from `.claude/agents/`

| CC specialist at `.claude/agents/`      | Gemini emission at `.gemini/agents/` |
| --------------------------------------- | ------------------------------------ |
| `frameworks/dataflow-specialist.md`     | `dataflow-specialist.md`             |
| `frameworks/nexus-specialist.md`        | `nexus-specialist.md`                |
| `frameworks/kaizen-specialist.md`       | `kaizen-specialist.md`               |
| `frameworks/mcp-specialist.md`          | `mcp-specialist.md`                  |
| `frameworks/mcp-platform-specialist.md` | `mcp-platform-specialist.md`         |
| `frameworks/pact-specialist.md`         | `pact-specialist.md`                 |
| `frameworks/ml-specialist.md`           | `ml-specialist.md`                   |
| `frameworks/align-specialist.md`        | `align-specialist.md`                |
| `implementation/pattern-expert.md`      | `pattern-expert.md`                  |
| `implementation/tdd-implementer.md`     | `tdd-implementer.md`                 |
| `implementation/build-fix.md`           | `build-fix.md`                       |
| `quality/reviewer.md`                   | `reviewer.md`                        |
| `quality/security-reviewer.md`          | `security-reviewer.md`               |
| `quality/gold-standards-validator.md`   | `gold-standards-validator.md`        |
| `release/release-specialist.md`         | `release-specialist.md`              |
| `testing/testing-specialist.md`         | `testing-specialist.md`              |
| `analysis/analyst.md`                   | `analyst.md`                         |
| `frontend/react-specialist.md`          | `react-specialist.md`                |
| `frontend/flutter-specialist.md`        | `flutter-specialist.md`              |
| `frontend/uiux-designer.md`             | `uiux-designer.md`                   |
| `open-source-strategist.md`             | `open-source-strategist.md`          |
| `value-auditor.md`                      | `value-auditor.md`                   |

Excluded from Gemini emission per `cli_emit_exclusions.gemini`:

- `cc-architect.md` — CC-specific artifact quality auditor
- `codex-architect.md` — Codex-specific peer
- `gemini-architect.md` — self-reference, not a subagent
- `management/*.md` — loom-only orchestration, not a USE-template concern
- `cli-orchestrator.md` — meta-orchestrator, not a USE subagent

## Example skeleton

See `dataflow-specialist.md.example` for the canonical shape. coc-sync generates one file per mapped specialist, adapting the source CC agent by:

1. Reading `.claude/agents/<category>/<name>.md`
2. Stripping BUILD-internal references (per coc-sync Step 3a)
3. Softening any CC-specific rule references (per Step 3b)
4. Wrapping the frontmatter in the Gemini format (name, description, tools, model)
5. Writing to USE-template `.gemini/agents/<name>.md`

Generation is deterministic; regenerate any time the source CC agent changes.
