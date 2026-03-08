---
name: git-release-patterns
description: "Python project release patterns including pre-commit validation, version management, deployment, and git workflows for applications built with kailash-enterprise. Use for 'pre-commit', 'release checklist', 'version bump', 'PR workflow', or 'deployment'."
---

# Python Project Release Patterns

> **Skill Metadata**
> Category: `git`
> Priority: `HIGH`
> Tools: git, pytest, ruff, mypy, pip-audit, docker

## Pre-Commit Validation

### Quality Pipeline (MANDATORY)

Run these checks before every commit to ensure code quality and security.

```bash
# 1. Run tests
pytest --tb=short -q

# 2. Lint with ruff (fast, replaces flake8)
ruff check .

# 3. Format with ruff (replaces black)
ruff format --check .

# 4. Type checking (optional but recommended)
mypy src/

# 5. Dependency vulnerability scan
pip-audit

# All-in-one check
ruff format --check . && ruff check . && pytest --tb=short -q && pip-audit && echo "Ready to commit"
```

### Quality Gate Checklist

```
- [ ] ruff format --check .     -> No formatting changes needed
- [ ] ruff check .              -> No lint violations
- [ ] pytest --tb=short -q      -> All tests pass
- [ ] mypy src/                 -> No type errors (if using mypy)
- [ ] pip-audit                 -> No known vulnerabilities
- [ ] git status                -> All changes staged
```

### Tool Configuration

Add to your `pyproject.toml`:

```toml
[tool.ruff]
target-version = "py310"
line-length = 88

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "B", "A", "SIM"]

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.mypy]
python_version = "3.10"
warn_return_any = true
warn_unused_configs = true
```

## FORBIDDEN Git Commands

```bash
# NEVER USE - Destructive operations
git reset --hard    # Can lose work
git reset --soft    # Can lose work

# SAFE ALTERNATIVES
git stash          # Temporarily save changes
git commit         # Commit changes safely
```

## Version Management

### Your Project's Version (not the SDK)

Manage versions in your own `pyproject.toml`:

```toml
[project]
name = "my-kailash-app"
version = "1.2.0"
requires-python = ">=3.10"
dependencies = [
    "kailash-enterprise==0.15.0",  # Pin SDK version
]
```

### Semantic Versioning

Follow semver for your application releases:

- **MAJOR** (1.0.0 -> 2.0.0): Breaking API changes, workflow schema changes
- **MINOR** (1.2.0 -> 1.3.0): New features, new workflow nodes, new endpoints
- **PATCH** (1.2.0 -> 1.2.1): Bug fixes, dependency updates, config changes

### Changelog Maintenance

Maintain a `CHANGELOG.md` at your project root:

```markdown
# Changelog

## [1.3.0] - 2026-03-15

### Added

- New data enrichment workflow with RAG pipeline
- Health check endpoint at /api/health

### Changed

- Upgraded kailash-enterprise from 0.14.0 to 0.15.0

### Fixed

- Timeout handling in LLM node retry logic
```

### Version Bump Workflow

```bash
# 1. Update version in pyproject.toml
# 2. Update CHANGELOG.md
# 3. Commit
git add pyproject.toml CHANGELOG.md
git commit -m "chore: bump version to 1.3.0"

# 4. Tag
git tag v1.3.0

# 5. Push
git push && git push --tags
```

## Release Checklist

### Pre-Release Validation

```
- [ ] All tests pass: pytest --tb=short -q
- [ ] Lint clean: ruff check .
- [ ] Format clean: ruff format --check .
- [ ] No dependency vulnerabilities: pip-audit
- [ ] kailash-enterprise version pinned in pyproject.toml
- [ ] Dependencies locked: pip freeze > requirements.txt (or uv pip compile)
- [ ] Docker image builds: docker build -t my-app:v1.3.0 .
- [ ] Docker smoke test passes: docker run --rm my-app:v1.3.0 python -c "import kailash"
- [ ] CHANGELOG.md updated
- [ ] Version bumped in pyproject.toml
- [ ] .env.example updated (if new env vars added)
```

### Dependency Pinning

```bash
# Option A: pip-tools / uv
uv pip compile pyproject.toml -o requirements.lock

# Option B: pip freeze (simpler)
pip freeze > requirements.txt

# Verify kailash-enterprise is pinned
grep kailash-enterprise requirements.txt
# Expected: kailash-enterprise==0.15.0
```

## Deployment Patterns

### Docker Deployment

```dockerfile
# Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY pyproject.toml .

# Install the application
RUN pip install --no-cache-dir .

# Non-root user for security
RUN useradd --create-home appuser
USER appuser

# Use async runtime (Docker-optimized)
ENV RUNTIME_TYPE=async

# Health check using python (curl not available on slim images)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:3000/health')" || exit 1

# Never bake secrets into the image
# Pass .env at runtime: docker run --env-file .env my-app
CMD ["python", "-m", "my_kailash_app"]
```

```bash
# Build
docker build -t my-app:v1.3.0 .

# Run with environment variables
docker run --env-file .env -p 3000:3000 my-app:v1.3.0

# Verify kailash import works inside container
docker run --rm my-app:v1.3.0 python -c "import kailash; print(kailash.NodeRegistry().list_types())"
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.10", "3.11", "3.12"]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          pip install -e ".[dev]"

      - name: Lint
        run: ruff check .

      - name: Format check
        run: ruff format --check .

      - name: Type check
        run: mypy src/

      - name: Test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: pytest --tb=short -q

      - name: Dependency audit
        run: pip-audit

  deploy:
    needs: test
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t my-app:${{ github.ref_name }} .

      - name: Push to registry
        run: |
          docker tag my-app:${{ github.ref_name }} registry.example.com/my-app:${{ github.ref_name }}
          docker push registry.example.com/my-app:${{ github.ref_name }}
```

### Environment Management

API keys and model names must come from `.env`, never hardcoded.

```bash
# .env (NEVER commit this file)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=sqlite:///data/app.db
KAILASH_LOG_LEVEL=info
```

```bash
# .env.example (commit this as a template)
OPENAI_API_KEY=your-openai-key-here
ANTHROPIC_API_KEY=your-anthropic-key-here
DATABASE_URL=sqlite:///data/app.db
KAILASH_LOG_LEVEL=info
```

Ensure `.env` is in `.gitignore`:

```gitignore
# .gitignore
.env
*.pyc
__pycache__/
dist/
*.egg-info/
.mypy_cache/
.ruff_cache/
```

## Git Workflow

### Branch Naming

```
feat/add-rag-pipeline
fix/llm-timeout-handling
docs/update-deployment-guide
refactor/workflow-config
test/integration-coverage
```

### Feature Development

```bash
# 1. Create feature branch
git checkout main
git pull origin main
git checkout -b feat/add-rag-pipeline

# 2. Development loop
# Make changes
ruff format .                          # Auto-format
ruff check . --fix                     # Auto-fix lint issues
pytest --tb=short -q                   # Run tests
git add .
git commit -m "feat: add RAG pipeline with vector search"

# 3. Pre-push validation
ruff format --check . && ruff check . && pytest --tb=short -q && pip-audit
```

### PR Creation

```bash
# Push feature branch
git push -u origin feat/add-rag-pipeline

# Commit message format: type(scope): description
# Examples:
# feat(workflow): add document processing pipeline
# fix(api): handle timeout in LLM retry logic
# docs(readme): update deployment instructions
# test(integration): add end-to-end workflow tests
```

### PR Description Template

```markdown
## Summary

[Brief description of changes and why they are needed]

## Changes Made

- [ ] Feature implementation completed
- [ ] Tests added/updated
- [ ] Documentation updated

## Testing

- [ ] pytest passes
- [ ] ruff check clean
- [ ] ruff format clean
- [ ] pip-audit clean
- [ ] Docker build succeeds

## Breaking Changes

- [ ] None
- [ ] [Describe any breaking changes]
```

### Release Branch Workflow

```bash
# 1. Create release branch
git checkout main
git pull origin main
git checkout -b release/v1.3.0

# 2. Update version and changelog
# Edit pyproject.toml: version = "1.3.0"
# Edit CHANGELOG.md

# 3. Full validation
ruff format --check . && ruff check . && pytest --tb=short -q && pip-audit
docker build -t my-app:v1.3.0 .
docker run --rm my-app:v1.3.0 python -c "import kailash; print('OK')"

# 4. Merge, tag, push
git checkout main
git merge release/v1.3.0
git tag v1.3.0
git push && git push --tags
```

## Validation Tiers

```bash
# Quick Check (30 seconds)
ruff format --check . && ruff check .

# Standard Check (2 minutes)
ruff format --check . && ruff check . && pytest --tb=short -q

# Full Validation (5 minutes)
ruff format --check . && ruff check . && pytest --tb=short -q && mypy src/ && pip-audit

# Release Validation (10 minutes)
ruff format --check . && ruff check . && pytest --tb=short -q && mypy src/ && pip-audit && \
docker build -t my-app:latest . && \
docker run --rm my-app:latest python -c "import kailash; print('OK')"
```

## Emergency Procedures

```bash
# Rollback Release
git tag -d v1.3.0                       # Delete local tag
git push origin :refs/tags/v1.3.0       # Delete remote tag

# Urgent Hotfix
git checkout main && git pull
git checkout -b hotfix/critical-fix
# Make minimal fix
ruff format --check . && ruff check . && pytest --tb=short -q
git push -u origin hotfix/critical-fix
# Create PR with "hotfix" label
```

## Common Fixes

```bash
# Auto-format Python code
ruff format .

# Auto-fix lint issues
ruff check . --fix

# Run a specific test
pytest tests/test_workflow.py::test_rag_pipeline -v

# Uncommitted changes
git stash           # Save temporarily
# Do git operation
git stash pop       # Restore

# Upgrade kailash-enterprise
pip install --upgrade kailash-enterprise
# Then pin the new version in pyproject.toml and requirements.txt
```

<!-- Trigger Keywords: pre-commit, release checklist, version bump, PR workflow, git branching, feature branch, release branch, deployment, docker, CI/CD, pytest, ruff, pip-audit -->
