# Subagents

> Create and use specialized AI subagents in Claude Code for task-specific workflows and improved context management.

Custom subagents in Claude Code are specialized AI assistants that can be invoked to handle specific types of tasks. They enable more efficient problem-solving by providing task-specific configurations with customized system prompts, tools and a separate context window.

## What are subagents?

Subagents are pre-configured AI personalities that Claude Code can delegate tasks to. Each subagent:

- Has a specific purpose and expertise area
- Uses its own context window separate from the main conversation
- Can be configured with specific tools it's allowed to use
- Includes a custom system prompt that guides its behavior

When Claude Code encounters a task that matches a subagent's expertise, it can delegate that task to the specialized subagent, which works independently and returns results.

## Key benefits

- **Context preservation**: Each subagent operates in its own context, preventing pollution of the main conversation and keeping it focused on high-level objectives.
- **Specialized expertise**: Subagents can be fine-tuned with detailed instructions for specific domains, leading to higher success rates on designated tasks.
- **Reusability**: Once created, subagents can be used across different projects and shared with your team for consistent workflows.
- **Flexible permissions**: Each subagent can have different tool access levels, allowing you to limit powerful tools to specific subagent types.

## Quick start

To create your first subagent:

1. Run `/agents` to open the subagents interface.
2. Select "Create New Agent" and choose project-level or user-level.
3. Define the subagent: describe its purpose, select tools, and customize the system prompt.
4. Save and use. Your subagent is now available! Claude will use it automatically when appropriate, or you can invoke it explicitly:

```
> Use the code-reviewer subagent to check my recent changes
```

## Subagent configuration

### File locations

Subagents are stored as Markdown files with YAML frontmatter in two possible locations:

| Type                  | Location            | Scope                         | Priority |
| :-------------------- | :------------------ | :---------------------------- | :------- |
| **Project subagents** | `.claude/agents/`   | Available in current project  | Highest  |
| **User subagents**    | `~/.claude/agents/` | Available across all projects | Lower    |

When subagent names conflict, project-level subagents take precedence over user-level subagents.

### File format

Each subagent is defined in a Markdown file with this structure:

```markdown
---
name: your-sub-agent-name
description: Description of when this subagent should be invoked
tools: tool1, tool2, tool3 # Optional - inherits all tools if omitted
---

Your subagent's system prompt goes here. This can be multiple paragraphs
and should clearly define the subagent's role, capabilities, and approach
to solving problems.

Include specific instructions, best practices, and any constraints
the subagent should follow.
```

#### Configuration fields

| Field         | Required | Description                                                                                 |
| :------------ | :------- | :------------------------------------------------------------------------------------------ |
| `name`        | Yes      | Unique identifier using lowercase letters and hyphens                                       |
| `description` | Yes      | Natural language description of the subagent's purpose                                      |
| `tools`       | No       | Comma-separated list of specific tools. If omitted, inherits all tools from the main thread |

### Available tools

Subagents can be granted access to any of Claude Code's internal tools. Common tools include Read, Write, Edit, Bash, Grep, Glob, and Task.

You have two options for configuring tools:

- **Omit the `tools` field** to inherit all tools from the main thread (default), including MCP tools
- **Specify individual tools** as a comma-separated list for more granular control

## Managing subagents

### Using the /agents command (Recommended)

The `/agents` command provides a comprehensive interface for subagent management:

```
/agents
```

This opens an interactive menu where you can view, create, edit, and delete subagents.

### Direct file management

You can also manage subagents by working directly with their files:

```bash
# Create a project subagent
mkdir -p .claude/agents
cat > .claude/agents/test-runner.md << 'EOF'
---
name: test-runner
description: Use proactively to run tests and fix failures
---

You are a test automation expert. When you see code changes, proactively run the appropriate tests. If tests fail, analyze the failures and fix them while preserving the original test intent.
EOF
```

## Using subagents effectively

### Automatic delegation

Claude Code proactively delegates tasks based on the task description, the `description` field in subagent configurations, and the current context.

To encourage more proactive subagent use, include phrases like "use PROACTIVELY" or "MUST BE USED" in your `description` field.

### Explicit invocation

Request a specific subagent by mentioning it in your command:

```
> Use the test-runner subagent to fix failing tests
> Have the code-reviewer subagent look at my recent changes
> Ask the debugger subagent to investigate this error
```

## Best practices

- **Start with Claude-generated agents**: Generate your initial subagent with Claude and then iterate on it.
- **Design focused subagents**: Create subagents with single, clear responsibilities rather than trying to make one subagent do everything.
- **Write detailed prompts**: Include specific instructions, examples, and constraints in your system prompts.
- **Limit tool access**: Only grant tools that are necessary for the subagent's purpose.
- **Version control**: Check project subagents into version control so your team can benefit from and improve them collaboratively.

## Advanced usage

### Chaining subagents

For complex workflows, you can chain multiple subagents:

```
> First use the deep-analyst subagent to find design issues, then use the build-fix subagent to resolve compilation errors
```

### Dynamic subagent selection

Claude Code intelligently selects subagents based on context. Make your `description` fields specific and action-oriented for best results.

## Performance considerations

- **Context efficiency**: Agents help preserve main context, enabling longer overall sessions
- **Latency**: Subagents start off with a clean slate each time they are invoked and may add latency as they gather context
