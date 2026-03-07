# /ai - Kaizen Quick Reference

## Purpose

Load the Kaizen skill for production-ready AI agent implementation with signature-based programming and multi-agent coordination.

## Step 0: Verify Project Uses Kailash Kaizen

Before loading Kaizen patterns, check that this project uses Kailash Kaizen:

- Look for `kailash-enterprise` in `requirements.txt`, `pyproject.toml`, `setup.py`
- Look for `import kailash` in source files

If not found, inform the user: "This project doesn't appear to use Kailash Kaizen. These patterns may not apply. Continue anyway?"

## Quick Reference

| Command         | Action                                |
| --------------- | ------------------------------------- |
| `/ai`           | Load Kaizen patterns and agent basics |
| `/ai agent`     | Show Agent API patterns               |
| `/ai signature` | Show signature-based programming      |
| `/ai multi`     | Show multi-agent coordination         |

## What You Get

- Unified Agent API
- Signature-based programming
- Multi-agent coordination
- BaseAgent architecture
- Autonomous execution modes

## Quick Pattern

All Kaizen types are available directly from `import kailash`:

```python
import os
import kailash

# Agent with config
config = kailash.AgentConfig(
    model=os.environ["KAIZEN_MODEL"],
    max_iterations=10,
)
agent = kailash.Agent(config)

# LLM client (raw HTTP to providers)
llm = kailash.LlmClient(
    provider="openai",
    api_key=os.environ["OPENAI_API_KEY"],
)

# Cost tracking
tracker = kailash.CostTracker()

# Tool registration
tool = kailash.ToolDef(name="search", description="Search the web")
tool_reg = kailash.ToolRegistry()

# Trust types
trust_level = kailash.TrustLevel
posture = kailash.EatpPosture
verify_config = kailash.VerificationConfig()

# Enterprise types
rbac = kailash.RbacEvaluator()
abac = kailash.AbacEvaluator()
audit = kailash.AuditLogger()
tenants = kailash.TenantRegistry()
```

## Key Concepts

| Concept             | Description                    |
| ------------------- | ------------------------------ |
| **Signatures**      | Define input/output contracts  |
| **Execution Modes** | supervised, autonomous, hybrid |
| **BaseAgent**       | Inherit for custom agents      |
| **AgentRegistry**   | Scale to 100+ agents           |
| **TAOD Loop**       | Think, Act, Observe, Decide    |

## Agent Teams

When working with Kaizen, deploy:

- **kaizen-specialist** — Signatures, multi-agent coordination, BaseAgent architecture
- **testing-specialist** — Agent testing patterns (NO MOCKING)

## Related Commands

- `/sdk` - Core SDK patterns
- `/db` - DataFlow database operations
- `/api` - Nexus multi-channel deployment
- `/test` - Testing strategies
- `/validate` - Project compliance checks

## Skill Reference

This command loads: `.claude/skills/04-kaizen/SKILL.md`
