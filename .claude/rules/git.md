# Git Workflow Rules

## Scope

These rules apply to all git operations in projects using the Kailash SDK.

## MUST Rules

### 1. Conventional Commits

Commit messages MUST follow conventional commits format.

**Format**:

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, no code change
- `refactor`: Code restructure
- `test`: Adding tests
- `chore`: Maintenance
- `perf`: Performance improvement
- `ci`: CI/CD changes

**Scopes** (use module/framework names):

- `dataflow`, `nexus`, `kaizen`, `enterprise`
- `workflow`, `agents`, `mcp`
- `api`, `auth`, `models`
- `project` (cross-module changes)

**Examples**:

```
feat(nexus): add OAuth2 middleware for API routes
fix(dataflow): resolve connection pool exhaustion
docs(workflow): update workflow builder examples
refactor(kaizen): simplify agent orchestration
test(dataflow): add integration tests for bulk operations
perf(workflow): optimize DAG traversal
ci(project): add linting to CI pipeline
```

**Enforced by**: Pre-commit hook (future)
**Violation**: Commit message rejection

### 2. Security Review Before Commit

MUST run security-reviewer before commit.

**Process**:

1. Complete code changes
2. Delegate to security-reviewer
3. Address all CRITICAL findings (especially secrets, injection risks, auth bypasses)
4. Then commit

**Enforced by**: agents.md rule
**Violation**: Potential security issues

### 3. Branch Naming

Feature branches MUST follow naming convention.

**Format**: `type/description`

**Examples**:

- `feat/add-auth-middleware`
- `fix/db-pool-timeout`
- `docs/update-readme`
- `refactor/workflow-builder`
- `test/dataflow-integration`

### 4. PR Description

Pull requests MUST include:

- Summary of changes (what and why)
- Test plan (how to verify)
- Related issues (links)
- Modules affected

**Template**:

```markdown
## Summary

[1-3 bullet points]

## Modules Affected

- DataFlow models
- Nexus API routes

## Test plan

- [ ] `pytest` passes (Python) or `bundle exec rspec` passes (Ruby)
- [ ] Linting clean (`flake8` / `rubocop`)
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related issues

Fixes #123
```

### 5. Atomic Commits

Each commit MUST be self-contained.

**Correct**:

- One commit per logical change
- Tests and implementation together
- Each commit passes tests

**Incorrect**:

```
"WIP"
"fix stuff"
"update files"
Multiple unrelated module changes
```

## MUST NOT Rules

### 1. No Direct Push to Main

MUST NOT push directly to main/master branch.

**Enforced by**: Branch protection
**Consequence**: Push rejected

### 2. No Force Push to Main

MUST NOT force push to main/master.

**Enforced by**: Branch protection
**Consequence**: Team notification, potential rollback

### 3. No Secrets in Commits

MUST NOT commit secrets, even in history.

**Detection**: Pre-commit secret scanning
**Consequence**: History rewrite required

**Check for**:

- API keys
- Passwords
- Tokens
- Private keys
- `.env` files
- PyPI tokens / RubyGems credentials

### 4. No Large Binaries

MUST NOT commit large binary files.

**Limits**:

- Single file: <10MB
- Total repo: <1GB

**Alternatives**:

- Git LFS for large files
- External storage for assets
- Build artifacts should be in `.gitignore`

### 5. Lock Files

- Python: MUST commit `requirements.txt` or `poetry.lock` / `uv.lock` for applications
- Ruby: MUST commit `Gemfile.lock` for applications
- MUST NOT commit lock files for libraries published as packages

### 6. Close Issues After Fix

MUST close GitHub issues immediately after the fix is committed or released.

**Process**:

1. Comment on the issue with what was done and which version includes the fix
2. Close the issue: `gh issue close N`
3. Reference the version: "Fixed in vX.Y.Z"

**Enforced by**: Post-release checklist
**Violation**: Stale issue tracker, misleading backlog

## Pre-Commit Checklist

Before every commit:

- [ ] Code review completed (intermediate-reviewer)
- [ ] Security review completed (security-reviewer)
- [ ] `pytest` passes (Python) or `bundle exec rspec` passes (Ruby)
- [ ] `flake8` passes (Python) or `rubocop` passes (Ruby)
- [ ] `pip-audit` or `bundle-audit` clean
- [ ] No secrets in changes
- [ ] Commit message follows convention

## Branching Strategy

### Main

- Always deployable
- Protected branch
- Requires PR with reviews

### Feature Branches

- Branch from main
- PR back to main
- Delete after merge

### Hotfix Branches

- Branch from main
- Fix critical issues
- Fast-track review process

## Release Process

### Version Bumps

- Python: Update `version` in `pyproject.toml` or `setup.cfg`
- Ruby: Update `version` in the gemspec or `lib/*/version.rb`
- Tag with `v{version}` (e.g., `v1.0.0`)

### Publishing

- Python: `pip install build && python -m build && twine upload dist/*`
- Ruby: `gem build *.gemspec && gem push *.gem`
- Always run tests before publishing

## Exceptions

Git exceptions require:

1. Explicit user approval
2. Documentation in PR
3. Team notification for force operations
