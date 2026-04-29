---
priority: 0
scope: baseline
---

# Git Workflow Rules

See `.claude/guides/rule-extracts/git.md` for extended bash examples, full BLOCKED rationalization lists, repository protection table, and Origin evidence.

<!-- slot:neutral-body -->

## Conventional Commits

Format: `type(scope): description`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

```
feat(auth): add OAuth2 support
fix(api): resolve rate limiting issue
```

**Why:** Non-conventional commits break automated changelog generation and make `git log --oneline` useless for release notes.

## Branch Naming

Format: `type/description` (e.g., `feat/add-auth`, `fix/api-timeout`).

**Why:** Inconsistent branch names prevent CI pattern-matching rules and make `git branch --list` unreadable.

### Release-Prep PRs MUST Use `release/v*` Branch Convention (MUST)

Any PR whose diff is metadata-only — version anchors (`pyproject.toml` / `Cargo.toml`, `__init__.py::__version__` / lib.rs `pub const VERSION`), `CHANGELOG.md`, spec/doc version-line updates — MUST be opened from a branch named `release/v<X.Y.Z>`. Using `feat/`, `fix/`, `chore/` on a release-prep PR is BLOCKED.

```bash
# DO — release-prep branch auto-skips PR-gate matrix
git checkout -b release/v3.23.0 && git push -u origin release/v3.23.0
# DO NOT — feat/ branch fires the full PR-gate matrix on metadata-only diff
git checkout -b feat/v3.23.0-release-prep
```

**Why:** PR-gate workflows check `if: !startsWith(github.head_ref, 'release/')`. Branching from `release/v*` triggers the auto-skip and saves ~45 min × matrix-size of CI minutes per release-prep PR. If the work IS NOT metadata-only, split: keep code fix on `feat/`/`fix/` branch, cut release-prep on a separate `release/v*` branch. See extract for evidence (kailash-rs PR #602, ~120 min wasted).

### Pre-FIRST-Push CI Parity Discipline (MUST)

Before the FIRST `git push` that creates a remote branch, the agent MUST run the project's local CI parity command set (Rust: `cargo +nightly fmt --all --check` + `cargo clippy -- -D warnings` + `cargo nextest run` + `RUSTDOCFLAGS="-Dwarnings" cargo doc`. Python: `pre-commit run --all-files` + `pytest` + `mypy --strict`). All MUST exit 0 → push.

```bash
# DO — pre-flight all local CI commands before first push
cargo +nightly fmt --all --check && cargo clippy -- -D warnings && cargo nextest run
git push -u origin feat/<branch>
# DO NOT — push, watch CI, fix-up commit, push again, repeat
git push -u origin feat/<branch>; git commit -am "style: fmt"; git push  # CI run #2 still bills run #1's wall-clock
```

**Why:** With `concurrency: cancel-in-progress: true` on the workflow, prior in-flight runs are cancelled — but **the cancelled runs are still billed for the wall-clock minutes already consumed before cancellation**. PR #598 (2026-04-25) had a 71-minute Workspace Tests run cancelled mid-flight; those 71 min were charged. Pre-flighting takes ~5-10 min; the alternative is N × 45 min of billed CI per fix-up cycle.

## Branch Protection

All protected repos require PRs to main. Direct push is rejected by GitHub. Owner workflow: branch → commit → push → PR → `gh pr merge <N> --admin --merge --delete-branch`. See extract for the full repository × protection table.

**Why:** Direct pushes bypass CI checks and code review, allowing broken or unreviewed code to reach the release branch.

## PR Description

CC system prompt provides the template. Always include a `## Related issues` section (e.g., `Fixes #123`).

**Why:** Without issue links, PRs become disconnected from their motivation, breaking traceability and preventing automatic issue closure on merge.

## `git reset --hard` MUST Verify Clean Working Tree (MUST)

`git reset --hard <ref>` SILENTLY discards every unstaged modification AND every untracked file in the affected paths. Recovery is impossible — unstaged content has no reflog entry. Running `git reset --hard` without first verifying `git status --porcelain` is empty is BLOCKED. Prefer `git reset --keep <ref>`, which performs the same commit-graph operation BUT aborts if it would lose local changes.

```bash
# DO — --keep aborts loudly when working tree has changes
git reset --keep origin/main
# DO — verify clean first if --hard is genuinely needed
[ -z "$(git status --porcelain)" ] || { echo "stash or commit first"; exit 1; }
git reset --hard origin/main
# DO NOT — bare --hard with no working-tree check
git reset --hard origin/main         # silently wipes M files and untracked files; no reflog
```

**Why:** `git reset --hard` is the most destructive git operation that doesn't rewrite history — and unlike force-push, the destruction is unrecoverable. `git reset --keep` exists in git specifically to provide the same effect with structural safety. Sibling of `dataflow-identifier-safety.md` Rule 4 (DROP) and `schema-migration.md` Rule 7 (downgrade) — same structural-confirmation pattern. Origin: kailash-py 2026-04-28 PR #691 wiped `.session-notes`; cross-language principle.

## Rules

- Atomic commits: one logical change per commit, tests + implementation together
- No direct push to main, no force push to main
- No secrets in commits (API keys, passwords, tokens, .env files)
- No large binaries (>10MB single file)
- Commit bodies MUST answer **why**, not **what** (the diff shows what)

```
# DO — explains why
feat(dataflow): add WARN log on bulk partial failure
# (BulkCreate silently swallowed per-row exceptions; alerting never fired.)
# DO NOT — restates the diff
feat(dataflow): add logging to bulk create
# (Added logger.warning call in _handle_batch_error method.)
```

**Why:** Mixed commits are impossible to revert cleanly. Leaked secrets require key rotation across all environments. Large binaries permanently bloat the repo. Commit bodies that explain "why" are the cheapest form of institutional documentation — co-located, versioned, `git log --grep`-searchable, never stale.

## Issue Closure Discipline

Closing a GitHub issue as "completed" MUST include a commit SHA, PR number, or merged-PR link in the close comment. Closing with no code reference is BLOCKED.

```bash
# DO — close with delivered-code reference
gh issue close 351 --comment "Fixed in #412 (commit a1b2c3d)"
# DO NOT — close with no code proof
gh issue close 351 --comment "Resolved"
```

**Why:** Issues closed with zero delivered code references break traceability; the next session cannot verify whether the fix actually shipped.

## Pre-Commit Hook Workarounds

When pre-commit auto-stash causes commits to fail despite hooks passing in direct invocation, the workaround `git -c core.hooksPath=/dev/null commit ...` MUST be documented in the commit body, AND a follow-up todo MUST be filed against the pre-commit configuration. Silent re-tries with `--no-verify` are BLOCKED.

```bash
# DO — document the bypass; file a follow-up todo
git -c core.hooksPath=/dev/null commit -m "fix(security): ...

Pre-commit auto-stash fails to restore staged changes; bypassed.
TODO: fix pre-commit stash/restore interaction (#NNN)."
# DO NOT — silent --no-verify
git commit --no-verify -m "fix(security): ..."
```

**Why:** Recurring across sessions; without documentation each session re-discovers the workaround at high cost. With documentation the next agent finds it via `git log --grep`.

## Commit-Message Claim Accuracy

Commit bodies MUST describe ONLY changes actually present in the diff. Claiming a refactor, deletion, or side-effect that the diff does NOT contain is BLOCKED. If the claim was made in error, push a FOLLOW-UP commit that actually does what the prior message said — do NOT amend, do NOT ignore.

```bash
# DO — body describes exactly what the diff contains
fix(dataflow): clamp user-SQL $N index at MAX_PARAMS = 65535
# DO — follow-up commit corrects an earlier over-claiming body
fix(dataflow): actually drop the unused `second_start` binding
# DO NOT — claim a change the diff does not contain
fix(dataflow): clamp MAX_PARAMS and drop unused `second_start` binding
# (diff only contains the clamp; the binding is still there)
```

**Why:** `git log --grep` is the cheapest institutional-knowledge search across a repo — a body that claims something the diff doesn't contain poisons every future search that lands on it. Amending is BLOCKED because it loses the audit trail; a follow-up commit preserves both the original claim AND the correction. Origin: 2026-04-20 kailash-rs self-correction; cross-language principle.

<!-- /slot:neutral-body -->
