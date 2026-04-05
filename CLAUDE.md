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

See `rules/e2e-god-mode.md` and `rules/zero-tolerance.md` for enforcement details.

### 4. Recommended Reviews

- **Code review** (reviewer) after file changes — RECOMMENDED — see `rules/agents.md`
- **Security review** (security-reviewer) before commits — strongly recommended — see `rules/agents.md`
- **Real infrastructure recommended** in Tier 2/3 tests — see `rules/testing.md`

## Workspace Commands

Phase commands replace the manual copy-paste workflow. Each loads the corresponding instruction template and checks workspace state.

| Command      | Phase | Purpose                                         |
| ------------ | ----- | ----------------------------------------------- |
| `/start`     | —     | New user orientation; explains the workflow     |
| `/analyze`   | 01    | Research and validate the project idea          |
| `/todos`     | 02    | Create project roadmap; stops for your approval |
| `/implement` | 03    | Build the project one task at a time; repeat    |
| `/redteam`   | 04    | Test everything from a real user's perspective  |
| `/codify`    | 05    | Capture knowledge for future sessions           |
| `/deploy`    | —     | Get the project live (standalone)               |
| `/ws`        | —     | Check project status anytime                    |
| `/wrapup`    | —     | Save progress before ending a session           |
| `/journal`   | —     | View, create, or search project journal entries |

**Workspace detection**: Hooks automatically detect the active workspace and inject context. `session-start.js` shows workspace status on session start (human-facing). `user-prompt-rules-reminder.js` injects a 1-line `[WORKSPACE]` summary into Claude's context every turn (survives context compression).

**Session continuity**: Run `/wrapup` before ending a session to write `.session-notes`. The next session's startup reads these notes and shows workspace progress automatically.

## Rules Index

| Concern                               | Rule File                       | Scope                                               |
| ------------------------------------- | ------------------------------- | --------------------------------------------------- |
| **Foundation independence**           | `rules/independence.md`         | **Global — overrides all**                          |
| **Autonomous execution model**        | `rules/autonomous-execution.md` | **Global — 10x multiplier**                         |
| **LLM-first agent reasoning**         | `rules/agent-reasoning.md`      | `**/kaizen/**`, `**/*agent*`                        |
| Agent orchestration & review mandates | `rules/agents.md`               | Global                                              |
| CC artifact quality                   | `rules/cc-artifacts.md`         | `.claude/**`, `scripts/hooks/**`                    |
| Plain-language communication          | `rules/communication.md`        | Global                                              |
| Connection pool safety                | `rules/connection-pool.md`      | Database connection code                            |
| Documentation standards               | `rules/documentation.md`        | `README.md`, `docs/**`, `CHANGELOG.md`              |
| E2E god-mode testing                  | `rules/e2e-god-mode.md`         | `tests/e2e/**`, `**/*e2e*`, `**/*playwright*`       |
| API keys & model names                | `rules/env-models.md`           | `**/*.py`, `**/*.ts`, `**/*.js`, `.env*`            |
| Git commits, branches, PRs            | `rules/git.md`                  | Global                                              |
| Journal knowledge trail               | `rules/journal.md`              | Global                                              |
| Kailash SDK execution patterns        | `rules/patterns.md`             | `**/*.py`, `**/*.rb`, `**/*.ts`, `**/*.js`          |
| Security (secrets, injection)         | `rules/security.md`             | Global                                              |
| Terrene naming & terminology          | `rules/terrene-naming.md`       | Global                                              |
| 3-tier testing, real infra Tiers 2-3  | `rules/testing.md`              | `tests/**`, `**/*test*`, `**/*spec*`, `conftest.py` |
| Zero-tolerance enforcement            | `rules/zero-tolerance.md`       | **Global — overrides all**                          |
| Auto-generated workflow instincts     | `rules/learned-instincts.md`    | Global                                              |

**Note**: Rules with path scoping are loaded only when editing matching files. Global rules load every session.

## Agents

### Analysis (`agents/analysis/`)

- **analyst** — Failure point analysis, risk assessment, requirements breakdown, ADRs

### Framework Specialists (`agents/frameworks/`)

- **dataflow-specialist** — Database operations, auto-generated nodes
- **nexus-specialist** — Multi-channel platform (API/CLI/MCP)
- **kaizen-specialist** — AI agents, signatures, multi-agent coordination
- **mcp-specialist** — MCP server implementation
- **mcp-platform-specialist** — FastMCP platform server, contributor plugins, security tiers
- **pact-specialist** — Organizational governance (D/T/R, envelopes, clearance)
- **ml-specialist** — ML lifecycle, feature stores, training, drift monitoring
- **align-specialist** — LLM fine-tuning, LoRA adapters, alignment, model serving

### Implementation (`agents/implementation/`)

- **pattern-expert** — Workflow patterns, nodes, parameters
- **tdd-implementer** — Test-first development
- **build-fix** — Fix build/type errors with minimal changes

### Quality (`agents/quality/`)

- **reviewer** — Code review, doc validation, cross-reference accuracy
- **gold-standards-validator** — Compliance checking
- **security-reviewer** — Security audit before commits

### Frontend (`agents/frontend/`)

- **react-specialist** — React/Next.js frontends
- **flutter-specialist** — Flutter mobile/desktop apps
- **uiux-designer** — Enterprise UI/UX design

### Testing (`agents/testing/`)

- **testing-specialist** — 3-tier strategy with real infrastructure, Playwright E2E

### Release (`agents/release/`)

- **release-specialist** — CI/CD, publishing, deployment, version management

### Management (`agents/management/`)

- **todo-manager** — Project task tracking
- **gh-manager** — GitHub issue/project management

### Other

- **claude-code-architect** — CC artifact quality auditing
- **open-source-strategist** — Licensing, community building
- **value-auditor** — Enterprise demo QA from buyer perspective

## Skills Navigation

For SDK implementation patterns, see `.claude/skills/` — organized by framework (`01-core-sdk` through `05-kailash-mcp`) and topic (`06-cheatsheets` through `30-claude-code-patterns`).

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

All frameworks ship in a single package per language. Python: `pip install kailash-enterprise` (import via `import kailash`). Ruby: `gem install kailash` (require via `require "kailash"`). Enterprise infrastructure auto-scales via env vars — see `skills/01-core-sdk/enterprise-infrastructure.md`.
