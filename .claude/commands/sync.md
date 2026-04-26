---
description: "Pull and merge latest COC artifacts from upstream template into this repo"
---

Pull the latest CO/COC artifacts from the upstream template and merge them into this repo, preserving project-specific artifacts.

**Usage**: `/sync`

## Context

This repo inherits its `.claude/` directory from a USE template (`kailash-coc-claude-rs`). The template is updated when the loom/ source runs `/sync`. This command pulls those updates into your repo.

```
loom/ (source) → kailash-coc-claude-rs/ (USE template) → THIS REPO
                                                              ↑ you are here
```

## BUILD vs USE Repo Distinction

- **BUILD repos** (kailash-py, kailash-rs, kailash-prism): artifacts live in canonical locations (`agents/frameworks/`, `skills/01-core-sdk/`, `rules/*.md`). `/codify` writes to canonical locations AND creates `.claude/.proposals/latest.yaml` for upstream flow to loom/. No `agents/project/` or `skills/project/`.
- **Downstream USE repos** (consumer projects): `/codify` writes project-specific artifacts to `.claude/agents/project/` and `.claude/skills/project/`; stays local.

The "Project-specific" preservation rule below applies only to downstream USE repos. In a BUILD repo every artifact is canonical and subject to merge-review.

## Merge Semantics

This is a **merge**, not an overwrite. Three categories of files:

| Category                              | Examples                                          | Behavior                      |
| ------------------------------------- | ------------------------------------------------- | ----------------------------- |
| **Shared artifacts**                  | agents/analyst.md, rules/security.md              | **Updated** from template     |
| **Project-specific** (USE repos only) | agents/project/\*, skills/project/\*, workspaces/ | **Preserved** — never touched |
| **Per-repo data**                     | learning/\*, .proposals/                          | **Preserved** — never touched |

**Rule**: If a file exists in BOTH the template and this repo, the template version wins (it's the upstream source). If a file exists ONLY in this repo, it's preserved. If a file exists ONLY in the template, it's added.

## Process

### 1. Detect upstream template

Check `.claude/.coc-sync-marker` for the template. If missing, auto-detect:

- `pyproject.toml` has `kailash-enterprise` → `kailash-coc-claude-rs`
- `Gemfile` has `kailash` gem → `kailash-coc-claude-rs`
- `pyproject.toml` has `kailash` dependency → `kailash-coc-claude-py`

### 2. Locate template

Resolution order (canonical, v2.9.1+) — **GitHub-backed cache wins by default**, local clones are offline-only fallback:

1. **`KAILASH_COC_TEMPLATE_PATH` env var** — explicit developer escape hatch. Use this when iterating on un-pushed local template changes. MUST point at a directory containing `.claude/`.
2. **Cache** at `~/.cache/kailash-coc/<template>/`. Auto-update via `git -C <cache> fetch --depth 1 origin main && git -C <cache> reset --hard origin/main` on every sync.
3. **Shallow clone** to cache if no cache exists: `git clone --depth 1 --single-branch --branch main https://github.com/terrene-foundation/kailash-coc-claude-rs.git ~/.cache/kailash-coc/kailash-coc-claude-rs/`.
4. **Offline fallback only** — local sibling `../{template}/` or `~/repos/loom/{template}/`. Used ONLY when steps 2-3 all fail (network unreachable). Emit `freshness NOT guaranteed` notice.

If a local sibling is detected during online resolution but NOT used, emit one-line stderr notice: "Found local clone at X but using GitHub-backed cache for freshness. Set KAILASH_COC_TEMPLATE_PATH=X to use the local clone instead."

**Why the change**: pre-v2.9.1 the local sibling was step 1, silently shadowing the auto-updating cache forever and forcing users to `git pull` two repos before every downstream sync.

### 2.5. Read obsoleted-paths manifest from the resolved template

Read `<resolved-template>/.claude/.coc-obsoleted` (slim purpose-built file emitted by coc-sync). Each non-comment, non-blank line is a repo-relative path; trailing slash means directory. If the file is missing, the template predates v2.9.1 — log one-line warning, skip the purge, proceed.

### 2.6. Purge obsoleted paths in this consumer (MUST, before merge)

For each entry in `.coc-obsoleted`, recursively delete the matching path. This is the ONLY mechanism by which downstream consumers purge stale orphan directories from former COC layouts (`scripts/hooks/`, `.claude/scripts/`, `scripts/resolve-template.js`). Skipping it leaves `require("./lib/...")` resolving against the wrong sibling and ships hooks that fail at every CC session start with `MODULE_NOT_FOUND`.

### 3. Check SDK version compatibility

Read this project's SDK version from `pyproject.toml` (look for `kailash-enterprise`) or `Gemfile` (look for `kailash` gem) or `Cargo.toml` (look for `kailash` dependency). Read the template's VERSION file for the `build_version`.

Report both in the sync header:

```
Project SDK: kailash-enterprise==1.0.0 (from pyproject.toml)
Template COC: 1.0.0 (from template .claude/VERSION)
```

If the template artifacts were codified from a newer SDK version than the project uses, warn:

```
⚠ Template artifacts may reference SDK features newer than your installed version.
  Consider upgrading your SDK dependency.
```

This is informational — sync proceeds regardless.

### 4. Compare freshness

Compare `.coc-sync-marker` timestamps. If already fresh: "Already up to date."

### 5. Pull and merge

**Updated from template** (shared artifacts):

- `agents/**/*.md` (except `agents/project/`)
- `commands/*.md`
- `rules/*.md`
- `skills/**/*` (except `skills/project/`)
- `guides/**/*`

**Added from template** (new files not yet in this repo):

- Any file in the template not present locally

**Preserved** (never modified by sync):

- `agents/project/**` and `skills/project/**` — project-specific (USE repos only; BUILD repos do not have these directories)
- `learning/**` — per-repo learning data
- `.proposals/**` — review artifacts
- `settings.local.json` — per-repo settings
- `workspaces/**` — project workspaces
- `CLAUDE.md` (at repo root) — project-specific directives
- Any file/directory not present in the template

**Scripts** (updated from template):

- `.claude/hooks/*.js` — updated
- `.claude/hooks/lib/*.js` — updated

### 6. Verify integrity

- Every hook in `settings.json` has a corresponding script
- Every `require("./lib/...")` has a matching lib file

### 7. Update tracking

- Write `.claude/.coc-sync-marker` with timestamp and template source
- If `.claude/VERSION` exists, update `upstream.version` to match the template's VERSION version (so future session-start checks report correctly)

### 8. Report

```
## Sync Complete: kailash-coc-claude-rs → this repo

Updated: {N} shared artifacts
Added: {N} new artifacts from template
Preserved: {N} project-specific files untouched
Scripts: {N} hooks updated

Your artifacts are current with the template.
```

## Pushing Changes Upstream

BUILD repos and downstream USE repos behave differently when `/codify` runs:

- **BUILD repos** (kailash-py, kailash-rs, kailash-prism): `/codify` writes to canonical locations (`agents/frameworks/`, `skills/NN-name/`, `rules/*.md`) AND appends entries to `.claude/.proposals/latest.yaml` for upstream flow to loom/. Then open loom/ and run `/sync rs` — Gate 1 classifies each change (global vs variant), Gate 2 distributes to USE templates.
- **Downstream USE repos** (consumer projects): `/codify` writes to `.claude/agents/project/` and `.claude/skills/project/` and stays LOCAL. No `.proposals/latest.yaml` is created; no upstream flow. These artifacts are preserved across `/sync` runs by the "Project-specific" rule above.

**Never** edit the template directly. All shared artifact changes flow through loom/.

## When to Run

- Session-start reports "COC artifacts are stale"
- After upstream releases new patterns
- Before starting a new feature (ensure latest)
