---
description: "Review BUILD repo changes (Gate 1) + distribute to templates with variant overlays (Gate 2)"
---

Sync CO/COC artifacts between loom/ (source of truth) and COC template repos.

**Usage**: `/sync [target]`

- `target`: `py`, `rs`, or `all`. If omitted, ask.

## Two Gates

This command has two sequential gates. Gate 1 runs automatically if unreviewed changes exist.

### Gate 1: Review (inbound — BUILD repo → loom/)

Scans the BUILD repo for artifact changes not yet upstreamed to loom/.

**Trigger**: Runs automatically when `/sync` detects unreviewed changes. Also runs if the user explicitly says "review" (e.g., `/sync py review`).

**Process**:

1. Read `sync-manifest.yaml` for tier membership and variant mappings
2. Read BUILD repo path from `sync-manifest.yaml` → `repos.{target}.build`
3. **Read SDK version** from BUILD repo's `pyproject.toml` (py) or `Cargo.toml` (rs). Report it in the review header so the reviewer knows which SDK release these artifacts come from.
4. Compute **expected state**: for each file in loom/.claude/, apply the correct variant overlay for this target. This is what the BUILD repo SHOULD have if it were freshly synced.
5. Diff BUILD repo's `.claude/` against expected state
6. Also check for `.claude/.proposals/latest.yaml` (created by /codify). If the proposal includes `sdk_version`, verify it matches the current BUILD repo SDK version — a mismatch means the proposal is stale (codified against an older release).
7. For each NEW or MODIFIED file, classify:
   - Deploy **sync-reviewer** agent team for autonomous classification (global vs variant vs skip)
   - Agent team reads both source and BUILD versions, checks for language-specific content
   - Present consolidated classification with reasoning for approval

8. For each change classified as **global**, consider cross-SDK impact:
   - Does rs need an equivalent adaptation? If yes → create alignment note.

9. Place files:
   - **Global** → copy to `loom/.claude/{type}/{file}`
   - **Variant** → copy to `loom/.claude/variants/{lang}/{type}/{file}`
   - **Skip** → leave in BUILD repo only

10. Mark proposal as reviewed (update `.proposals/latest.yaml` status)

**Skip conditions**: Gate 1 is skipped when:

- No changes detected between BUILD repo and expected state
- User explicitly says "distribute only" or "skip review"

### Gate 2: Distribute (outbound — loom/ → templates)

Merges loom/ source + variant overlays into USE template repos. This is a **merge** — templates may have legitimate local content.

**Process**:

1. **Read manifest** (`sync-manifest.yaml`) for tiers, variants, exclusions
2. **Inventory the template** — read what's currently there before computing changes
3. **Compute expected state** for the target (py or rs):
   - Global files from `.claude/` (agents/, commands/, rules/, skills/, guides/)
   - Variant overlay from `variants/{lang}/` — replacements and additions
   - Scripts/ with same overlay logic
4. **Per-file merge decisions**:
   - **UNCHANGED** → skip
   - **NEW** (in source, not in template) → add
   - **MODIFIED** (both exist, content differs) → read both versions. If template has USE-specific adaptations (e.g., different wording for downstream context), flag for review before overwriting
   - **TEMPLATE-ONLY** (in template, not in source) → preserve (never delete)
5. **Present merge plan** with per-file decisions, not a bulk "Apply all"
6. **Apply approved changes**
7. **Update `.coc-sync-marker`** with timestamp and file list
8. **Update `.claude/VERSION`** — set `upstream.build_version` to loom/'s version. Create VERSION if missing (per `guides/co-setup/08-versioning.md`).
9. **Update SDK dependency pins** in the template's `pyproject.toml` (py) or `Cargo.toml` (rs):
   - **py**: Read version from BUILD repo's root `pyproject.toml` and each `packages/*/pyproject.toml`. Update the template's `pyproject.toml` `dependencies` section so each Kailash package pin (`>=X.Y.Z`) matches the BUILD repo's current release version.
   - **rs**: Read version from BUILD repo's root `Cargo.toml` and workspace member `Cargo.toml` files. Update the template's `Cargo.toml` dependency versions accordingly.
   - Report any version changes in the sync report.
10. **Verify hooks** — every hook in `settings.json` has a corresponding script on disk

**Report**:

```
## Sync Report: loom/ → kailash-coc-claude-py/

### Gate 1: Review
- BUILD repo SDK version: 2.2.1 (pyproject.toml)
- Reviewed: 3 changes from kailash-py
- Global: 1 (rules/agent-reasoning.md)
- Variant-py: 1 (skills/04-kaizen/kaizen-l3-autonomy.md)
- Skipped: 1

### Gate 2: Distribute
- Updated: 12 files (approved)
- Added: 2 new files
- Flagged: 1 file (reviewed, kept template version)
- Unchanged: 482 files
- Preserved (template-only): 3 files
- SDK pins: kailash 2.2.1→2.3.0, kailash-dataflow 1.2.1→1.3.0, kailash-kaizen 2.3.1→2.3.2
- Hook verification: 11/11 scripts present
- VERSION updated: 1.0.0 → 1.1.0
```

## Exclusions (never synced)

- `.claude/learning/` — per-repo learning data
- `.claude/rules/learned-instincts.md` — auto-generated per repo
- `.claude/.proposals/` — review artifacts
- `.claude/sync-manifest.yaml` — source-only
- `.claude/variants/` — source-only (applied during sync, not copied)
- `.claude/settings.local.json` — per-repo local settings
- `CLAUDE.md` — repo-specific (never overwritten)
- `.env`, `.git/` — per-repo

## Delegate

**Gate 1**: Delegate to **sync-reviewer** agent for diff computation and change presentation.
**Gate 2**: Delegate to **coc-sync** agent for overlay computation. Merge decisions require reading target content — do NOT bulk-write without the merge review.

## Examples

- `/sync py` — Review changes from kailash-py, then merge to kailash-coc-claude-py
- `/sync rs` — Review changes from kailash-rs, then merge to kailash-coc-claude-rs

- `/sync all` — Review and merge for both py and rs (sequentially)
