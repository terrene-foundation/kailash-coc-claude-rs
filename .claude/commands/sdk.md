# /sdk - Core SDK Quick Reference

## Purpose

Load the Kailash Core SDK skill for workflow patterns, node configuration, and runtime execution.

## Step 0: Verify Project Uses Kailash

Before loading SDK patterns, check that this project uses Kailash:

- Python: Look for `kailash-enterprise` in `requirements.txt`, `pyproject.toml`, `setup.py`
- Python: Look for `from kailash` / `import kailash` in source files
- Ruby: Look for `kailash` in `Gemfile` or `*.gemspec`
- Ruby: Look for `require "kailash"` / `Kailash::` in source files

If not found, inform the user: "This project doesn't appear to use Kailash SDK. These patterns may not apply. Continue anyway?"

## Quick Reference

| Command         | Action                                     |
| --------------- | ------------------------------------------ |
| `/sdk`          | Load Core SDK patterns and workflow basics |
| `/sdk workflow` | Show WorkflowBuilder patterns              |
| `/sdk runtime`  | Show runtime selection guidance            |
| `/sdk nodes`    | Show node configuration patterns           |

## What You Get

- WorkflowBuilder patterns
- Node configuration (3-param pattern)
- Runtime execution (`rt.execute(builder.build(reg))`)
- Connection patterns (4-param)
- Async vs sync runtime selection

## Quick Pattern

**Python**:

```python
import kailash

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NodeType", "node_id", {"param": "value"})
builder.connect("node1", "output", "node2", "input")
wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf)
# result is dict: {"results": {...}, "run_id": "...", "metadata": {...}}
```

**Ruby**:

```ruby
require "kailash"

Kailash::Registry.open do |registry|
  builder = Kailash::WorkflowBuilder.new
  builder.add_node("NodeType", "node_id", { "param" => "value" })
  builder.connect("node1", "output", "node2", "input")
  wf = builder.build(registry)
  Kailash::Runtime.open(registry) do |rt|
    result = rt.execute(wf, {})
    # result.results is Hash, result.run_id is String
  end
  wf.close
end
```

## Critical Rules

1. **ALWAYS** call `.build(reg)` before execution
2. **ALWAYS** use `rt.execute(builder.build(reg))` - never `workflow.execute(runtime)`
3. **ALWAYS** use absolute imports (never relative)
4. **ALWAYS** use string-based node registration

## Agent Teams

When working with Core SDK, deploy:

- **pattern-expert** — Workflow patterns, node configuration, cyclic patterns

## Related Commands

- `/db` - DataFlow database operations
- `/api` - Nexus multi-channel deployment
- `/ai` - Kaizen AI agents
- `/test` - Testing strategies
- `/validate` - Project compliance checks

## Skill Reference

This command loads: `.claude/skills/01-core-sdk/SKILL.md`
