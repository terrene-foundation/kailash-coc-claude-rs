# Gemini Custom Slash Command Templates (TOML)

Gemini slash commands are TOML — NOT Markdown, which is the CC/Codex convention. This is the #2 CC→Gemini translation pitfall (after hook event name translation).

Each file at `.gemini/commands/<name>.toml` is invokable as `/<name>`. Subdirectory structure maps to namespaced commands: `.gemini/commands/coc/analyze.toml` → `/coc:analyze`. Hot-reload via `/commands reload`.

## Format

```toml
name = "<command-name>"
description = "<one line surfaced in /commands list>"
prompt = """
<The prompt body — what Gemini sees when the command is invoked.>
<Can reference {{args}} for CLI argument passthrough.>
"""

# Optional:
arguments = ["phase", "target"]   # named positional args
tools = ["read_file", "grep_search", "run_shell_command"]   # tool allowlist for this command
```

## One-to-one mapping from `.claude/commands/`

The 20+ commands at `.claude/commands/*.md` must emit as TOML here:

**Phase commands:**

- `analyze.md` → `analyze.toml`
- `todos.md` → `todos.toml`
- `implement.md` → `implement.toml`
- `redteam.md` → `redteam.toml`
- `codify.md` → `codify.toml`
- `release.md` → `release.toml`

**Utility commands:**

- `sdk.md` → `sdk.toml`
- `db.md` → `db.toml`
- `api.md` → `api.toml`
- `ai.md` → `ai.toml`
- `test.md` → `test.toml`
- `design.md` → `design.toml`
- `validate.md` → `validate.toml`
- `deploy.md` → `deploy.toml`
- `start.md` → `start.toml`
- `learn.md` → `learn.toml`
- `journal.md` → `journal.toml`
- `i-audit.md` → `i-audit.toml`
- `i-polish.md` → `i-polish.toml`
- `i-harden.md` → `i-harden.toml`

**Excluded from Gemini emission per `cli_emit_exclusions.gemini`:**

- `cc-audit.md` — CC-specific artifact audit
- `sync.md`, `sync-to-build.md`, `settings.md`, `repos.md`, `inspect.md`, `ws.md`, `wrapup.md` — loom management, not USE

## Generation

coc-sync reads each `.claude/commands/<name>.md`, extracts the prompt body + frontmatter, emits as TOML at `.gemini/commands/<name>.toml` in the USE template. Argument substitution `{{args}}` is shared between CC and Gemini (same placeholder).

## Example — `analyze.toml`

See `analyze.toml.example` for the canonical shape.
