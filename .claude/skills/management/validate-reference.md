# Validate Reference

Reference material for the /validate command.


## Usage Examples

```bash
# Run all validation checks
/validate

# Check only formatting
/validate fmt

# Run clippy with strict mode
/validate clippy

# Run security audit
/validate audit

# Check dependency policies
/validate deny

# ... (see skill reference for full example)
```

## Related Commands

- `/build` - Cargo build patterns
- `/cargo` - Workspace and dependency management
- `/test` - Testing strategies

## Reference

- Validation patterns are embedded directly in this command
- See `.claude/rules/security.md` for security validation rules
- See `.claude/agents/security-reviewer.md` for security audit processes
