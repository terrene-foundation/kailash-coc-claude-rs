# Gemini Template Source Tree

Source templates for the Gemini-specific content that flows into every Gemini-aware USE template repo. Authored here in loom; emitted by coc-sync into each USE template's `.gemini/` directory at Gate 2.

## Layout

```
.claude/gemini-templates/
├── README.md                 # this file — describes the emission contract
├── settings.json             # base .gemini/settings.json (merged with per-repo overrides)
├── agents/
│   ├── README.md             # agent emission mapping (CC → Gemini)
│   └── *.md.example          # canonical shapes; actual agent emission is generated from .claude/agents/
├── commands/
│   ├── README.md             # command emission mapping
│   └── *.toml.example        # canonical shapes; actual TOML is generated from .claude/commands/
├── skills/                   # (TBD — emission mirror of .claude/skills/)
└── docs/                     # (TBD — copy of .claude/guides/ as .gemini/docs/)
```

## Emission targets (via coc-sync Step 6.5+)

Gemini-aware USE templates listed in `.claude/sync-manifest.yaml → repos.{target}.templates[]` where `clis` includes `gemini`:

- `kailash-coc-py` (Phase H1, 2026-04-22)
- `kailash-coc-rs` (Phase H1, 2026-04-22)

Each receives `.gemini/` at the repo root:

```
kailash-coc-<lang>/
├── CLAUDE.md                 # Step 7 preserved (CC)
├── AGENTS.md                 # Step 6.5 emitted (Codex, via emit.mjs --cli codex)
├── GEMINI.md                 # Step 6.5 emitted (Gemini, via emit.mjs --cli gemini)
├── .claude/                  # Step 2–5 synced
│   └── ...
└── .gemini/                  # Step 6.6 synced from .claude/gemini-templates/
    ├── settings.json         # from settings.json (merge with repo-local overrides)
    ├── agents/               # per-specialist .md files generated from .claude/agents/
    ├── commands/             # per-command .toml files generated from .claude/commands/
    └── skills/               # per-skill SKILL.md mirrors generated from .claude/skills/
```

CC-only USE templates (`kailash-coc-claude-py`, `kailash-coc-claude-rs`, `kailash-coc-claude-rb`, `kailash-coc-claude-prism`) do NOT receive `.gemini/` — their template entries list `clis: [claude]` only.

## Source of truth

Template shapes live here. Actual emission content comes from the corresponding `.claude/` source:

| Emitted file                        | Source                                   | Generation                                                   |
| ----------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `.gemini/settings.json`             | `.claude/gemini-templates/settings.json` | Copy with per-repo override merge                            |
| `.gemini/agents/<name>.md`          | `.claude/agents/<category>/<name>.md`    | Read CC agent, adapt frontmatter to Gemini format, wrap body |
| `.gemini/commands/<name>.toml`      | `.claude/commands/<name>.md`             | Extract prompt body + frontmatter, emit as TOML              |
| `.gemini/skills/<nn-name>/SKILL.md` | `.claude/skills/<nn-name>/SKILL.md`      | Copy (progressive-disclosure contract shared)                |
| `.gemini/docs/<guide>.md`           | `.claude/guides/<guide>.md`              | Copy (hard-copy, not symlink)                                |

## Coc-sync responsibility split

See `.claude/agents/management/coc-sync.md`:

- **Step 6.5** — emits AGENTS.md + GEMINI.md baselines to repo root (from `emit.mjs`)
- **Step 6.6** (to be documented if not yet) — emits `.gemini/` tree from this template source

The Gemini emission is a first-class coc-sync responsibility, not a separate tool. The architect agents (codex-architect, gemini-architect) specify what gets emitted; coc-sync orchestrates the emission.
