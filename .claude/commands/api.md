# /api - Nexus Quick Reference

## Purpose

Load the Nexus skill for zero-config multi-channel platform deployment (API + CLI + MCP simultaneously).

## Step 0: Verify Project Uses Kailash Nexus

Before loading Nexus patterns, check that this project uses Kailash Nexus:

- Python: Look for `kailash-enterprise` in `requirements.txt`, `pyproject.toml`, `setup.py`; `import kailash` in source files
- Ruby: Look for `kailash` in `Gemfile` or `*.gemspec`; `require "kailash"` / `Kailash::Nexus` in source files

If not found, inform the user: "This project doesn't appear to use Kailash Nexus. These patterns may not apply. Continue anyway?"

## Quick Reference

| Command         | Action                                    |
| --------------- | ----------------------------------------- |
| `/api`          | Load Nexus patterns and deployment basics |
| `/api deploy`   | Show deployment patterns                  |
| `/api session`  | Show unified session management           |
| `/api channels` | Show multi-channel configuration          |

## What You Get

- Zero-config deployment (API + CLI + MCP)
- Unified session management
- Workflow registration patterns
- Health monitoring
- Plugin system

## Quick Pattern

**Python** (`import kailash`):

```python
import kailash

config = kailash.NexusConfig(port=3000)
app = kailash.NexusApp(config)
config_with_preset = kailash.NexusConfig(preset=kailash.Preset.Standard)
param = kailash.HandlerParam(name="user_id", required=True)
mcp = kailash.McpServer(name="my-service")
```

**Ruby** (`require "kailash"`):

```ruby
require "kailash"

config = Kailash::Nexus::NexusConfig.new
config.host = "0.0.0.0"
config.port = 3000
preset = Kailash::Nexus::Preset.standard
param = Kailash::Nexus::HandlerParam.new("user_id", "string")
jwt = Kailash::Nexus::JwtConfig.new("secret-at-least-32-bytes-long!!")
mcp = Kailash::Nexus::McpServer.new("my-service", "1.0")
```

## Key Concepts

| Concept              | Description                              |
| -------------------- | ---------------------------------------- |
| **Unified Sessions** | State maintained across API/CLI/MCP      |
| **Zero-Config**      | Automatic endpoint generation            |
| **Multi-Channel**    | Single workflow, multiple access methods |
| **Plugin System**    | Extend with custom plugins               |

## Agent Teams

When working with Nexus, deploy:

- **nexus-specialist** — Multi-channel deployment, unified sessions, workflow registration
- **release-specialist** — Docker/Kubernetes production deployment

## Related Commands

- `/sdk` - Core SDK patterns
- `/db` - DataFlow database operations
- `/ai` - Kaizen AI agents
- `/test` - Testing strategies
- `/validate` - Project compliance checks

## Skill Reference

This command loads: `.claude/skills/03-nexus/SKILL.md`
