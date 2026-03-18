# Contributing to Kailash COC Claude (Rust)

We welcome contributions to the Kailash COC template for Rust-backed projects. This document provides guidelines for contributing.

## About This Repository

This is a **COC (Cognitive Orchestration for Codegen) template** for Claude Code. It provides agents, skills, rules, commands, and hooks that Rust-backed projects inherit through the `.claude/` directory.

This project is maintained by the [Terrene Foundation](https://terrene.foundation) and licensed under Apache 2.0.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your changes:
   ```bash
   git checkout -b feat/your-feature
   ```

## What to Contribute

- **Agents**: New or improved agent definitions in `.claude/agents/`
- **Skills**: Knowledge documents in `.claude/skills/`
- **Rules**: Development rules in `.claude/rules/`
- **Commands**: Slash commands in `.claude/commands/`
- **Hooks**: Automation hooks in `.claude/hooks/`

## Guidelines

### Template Independence

COC templates are framework-agnostic tools for Claude Code. Contributions must not:

- Reference or depend on any proprietary codebase
- Include paths or patterns specific to a single project
- Hardcode API keys, secrets, or credentials

### Quality Standards

- Agent and skill files should be well-structured Markdown
- Rules should include clear scope, rationale, and examples
- Hook scripts should be tested and include error handling

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(agents): add data-migration specialist
fix(rules): correct testing tier definitions
docs(skills): update workflow quickstart guide
```

## Pull Request Process

1. Ensure your changes do not break the COC structure validation (CI will check)
2. Update documentation if you add new agents, skills, or rules
3. Request review from maintainers
4. Squash or rebase to clean commit history before merge

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE), the same license as the rest of the project.

## Questions?

Open an issue on GitHub or reach out at [info@terrene.foundation](mailto:info@terrene.foundation).
