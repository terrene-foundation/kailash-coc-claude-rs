# Kailash COC Claude (Rust-backed Bindings)

This repository is the **COC (Cognitive Orchestration for Codegen) setup** for Claude Code — providing agents, skills, rules, and hooks for building applications with the **Rust-backed Kailash Python and Ruby bindings** (`pip install kailash-enterprise` / `gem install kailash`). All projects using this setup inherit these capabilities through the `.claude/` directory.

> **Important**: This COC is for **Python and Ruby developers** who use the high-performance Rust-backed Kailash package. You write Python or Ruby — you never touch Rust. For the pure Python SDK, see `kailash-coc-claude-py`.

## Absolute Directives

These override ALL other instructions. They govern behavior before any rule file is consulted.

### 1. Framework-First

Never write code from scratch before checking whether the Kailash frameworks already handle it.

- Instead of direct SQL/SQLAlchemy/Django ORM/ActiveRecord/Sequel → check with **dataflow-specialist**
- Instead of FastAPI/custom API gateway → check with **nexus-specialist**
- Instead of custom MCP server/client → check with **mcp-specialist**
- Instead of custom agentic platform → check with **kaizen-specialist**

### 2. .env Is the Single Source of Truth

All API keys and model names MUST come from `.env`. Never hardcode model strings like `"gpt-4"` or `"claude-3-opus"`. Root `conftest.py` auto-loads `.env` for pytest; `spec/spec_helper.rb` auto-loads `.env` for RSpec.

See `rules/env-models.md` for full details.

### 3. Implement, Don't Document

When you discover a missing feature, endpoint, or record — **implement or create it**. Do not note it as a gap and move on. The only acceptable skip is explicit user instruction.

See `rules/e2e-god-mode.md` and `rules/no-stubs.md` for enforcement details.

### 4. Mandatory Reviews

- **Code review** (intermediate-reviewer) after EVERY file change — see `rules/agents.md` Rule 1
- **Security review** (security-reviewer) before EVERY commit — NO exceptions — see `rules/agents.md` Rule 2
- **NO MOCKING** in Tier 2/3 tests — use real infrastructure — see `rules/testing.md`

## Workspace Commands

Phase commands replace the manual copy-paste workflow. Each loads the corresponding instruction template and checks workspace state.

| Command      | Phase | Purpose                                            |
| ------------ | ----- | -------------------------------------------------- |
| `/start`     | —     | New user orientation; explains the workflow         |
| `/analyze`   | 01    | Research and validate the project idea              |
| `/todos`     | 02    | Create project roadmap; stops for your approval     |
| `/implement` | 03    | Build the project one task at a time; repeat        |
| `/redteam`   | 04    | Test everything from a real user's perspective      |
| `/codify`    | 05    | Capture knowledge for future sessions              |
| `/deploy`    | —     | Get the project live (standalone)                  |
| `/ws`        | —     | Check project status anytime                       |
| `/wrapup`    | —     | Save progress before ending a session              |

**Workspace detection**: Hooks automatically detect the active workspace and inject context. `session-start.js` shows workspace status on session start (human-facing). `user-prompt-rules-reminder.js` injects a 1-line `[WORKSPACE]` summary into Claude's context every turn (survives context compression).

**Session continuity**: Run `/wrapup` before ending a session to write `.session-notes`. The next session's startup reads these notes and shows workspace progress automatically.

## Rules Index

| Concern                               | Rule File                    | Scope                                               |
| ------------------------------------- | ---------------------------- | --------------------------------------------------- |
| Plain-language communication          | `rules/communication.md`     | Global                                              |
| Agent orchestration & review mandates | `rules/agents.md`            | Global                                              |
| E2E god-mode testing                  | `rules/e2e-god-mode.md`      | `tests/e2e/**`, `**/*e2e*`, `**/*playwright*`       |
| API keys & model names                | `rules/env-models.md`        | `**/*.py`, `**/*.ts`, `**/*.js`, `.env*`            |
| Git commits, branches, PRs            | `rules/git.md`               | Global                                              |
| No stubs, TODOs, or placeholders      | `rules/no-stubs.md`          | Global                                              |
| Kailash SDK execution patterns        | `rules/patterns.md`          | `**/*.py`, `**/*.rb`, `**/*.ts`, `**/*.js`          |
| Security (secrets, injection)         | `rules/security.md`          | Global                                              |
| 3-tier testing, no mocking Tiers 2-3  | `rules/testing.md`           | `tests/**`, `**/*test*`, `**/*spec*`, `conftest.py` |
| Deployment & cloud release rules      | `rules/deployment.md`        | Global                                              |
| Auto-generated workflow instincts     | `rules/learned-instincts.md` | Global                                              |

**Note**: Rules with path scoping are loaded only when editing matching files. Global rules load every session.

## Agents

### Analysis & Planning

- **deep-analyst** — Failure analysis, complexity assessment
- **requirements-analyst** — Requirements breakdown, ADR creation
- **sdk-navigator** — Find patterns before coding
- **framework-advisor** — Choose Core SDK, DataFlow, Nexus, or Kaizen

### Framework Specialists (`agents/frameworks/`)

- **dataflow-specialist** — Database operations, auto-generated nodes
- **nexus-specialist** — Multi-channel platform (API/CLI/MCP)
- **kaizen-specialist** — AI agents, signatures, multi-agent coordination
- **mcp-specialist** — MCP server implementation

### Core Implementation

- **pattern-expert** — Workflow patterns, nodes, parameters
- **tdd-implementer** — Test-first development
- **intermediate-reviewer** — Code review after changes (MANDATORY)
- **gold-standards-validator** — Compliance checking
- **build-fix** — Fix build/type errors with minimal changes
- **security-reviewer** — Security audit before commits (MANDATORY)

### Frontend & Design (`agents/frontend/`)

- **react-specialist** — React/Next.js frontends
- **flutter-specialist** — Flutter mobile/desktop apps
- **frontend-developer** — Responsive UI components
- **uiux-designer** — Enterprise UI/UX design
- **ai-ux-designer** — AI interaction patterns

### Testing & QA

- **testing-specialist** — 3-tier strategy with real infrastructure
- **documentation-validator** — Test code examples
- **e2e-runner** — Playwright E2E test generation
- **value-auditor** — Enterprise demo QA from buyer perspective

### Release & Operations (`agents/management/`)

- **git-release-specialist** — Git workflows, CI, releases, version management
- **deployment-specialist** — Deployment onboarding, package/cloud release, Docker/K8s
- **todo-manager** — Project task tracking
- **gh-manager** — GitHub issue/project management

### Standards (`agents/standards/`)

- **care-expert** — CARE governance framework
- **coc-expert** — COC development methodology
- **eatp-expert** — EATP trust protocol

## Skills Navigation

For SDK implementation patterns, see `.claude/skills/` — organized by framework (`01-core-sdk` through `05-kailash-mcp`) and topic (`06-cheatsheets` through `28-coc-reference`). Binding-specific skills: `06-python-bindings` (PyO3 patterns) and `06-ruby-bindings` (Ruby FFI patterns).

## Critical Execution Rules

### Python

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "node_id", {"param": "value"})
builder.connect("node1", "output", "node2", "input")
wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
# result is a dict: {"results": {...}, "run_id": "...", "metadata": {...}}
```

### Ruby

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("NodeType", "node_id", { "param" => "value" })
  builder.connect("node1", "output", "node2", "input")
  workflow = builder.build(registry)
  Kailash::Runtime.open(registry) do |runtime|
    result = runtime.execute(workflow, { "data" => "hello" })
    output = result.results["node_id"]
  end
  workflow.close
end
```

## Kailash Platform

| Framework      | Purpose                                | Python Install                   | Ruby Install          |
| -------------- | -------------------------------------- | -------------------------------- | --------------------- |
| **Core SDK**   | Workflow orchestration, 140+ nodes     | `pip install kailash-enterprise` | `gem install kailash` |
| **DataFlow**   | Zero-config database operations        | included                         | included              |
| **Nexus**      | Multi-channel deployment (API+CLI+MCP) | included                         | included              |
| **Kaizen**     | AI agent framework                     | included                         | included              |
| **Enterprise** | RBAC, ABAC, audit, multi-tenancy       | included                         | included              |

All frameworks ship in a single package per language. Python: `pip install kailash-enterprise` (import via `import kailash`). Ruby: `gem install kailash` (require via `require "kailash"`).
