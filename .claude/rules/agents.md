# Agent Orchestration Rules

## Scope

These rules govern when and how specialized agents MUST be used when building applications with the Kailash SDK.

## MANDATORY Delegations

### Rule 1: Code Review After ANY Change

After completing ANY file modification (Edit, Write), you MUST:

1. Delegate to **intermediate-reviewer** for code review
2. Wait for review completion before proceeding
3. Address any findings before moving to next task

**Enforced by**: PostToolUse hook reminder
**Exception**: User explicitly says "skip review"

### Rule 2: Security Review Before ANY Commit

Before executing ANY git commit command, you MUST:

1. Delegate to **security-reviewer** for security audit
2. Address all CRITICAL findings
3. Document any HIGH findings for tracking

**Enforced by**: PreToolUse hook on git commit
**Exception**: NONE - security review is always required

### Rule 3: Framework Specialist for SDK Work

When working with Kailash SDK frameworks, you MUST consult the appropriate specialist:

- **dataflow-specialist**: For database models, queries, migrations using `kailash.DataFlow` (Python) or `Kailash::DataFlow` (Ruby)
- **nexus-specialist**: For web endpoints, middleware, deployment using `kailash.NexusApp` (Python) or `Kailash::Nexus` (Ruby)
- **kaizen-specialist**: For AI agents, TAOD loop, orchestration using `kailash.Agent` (Python) or `Kailash::Kaizen::Agent` (Ruby)
- **enterprise-specialist**: For RBAC, ABAC, audit, multi-tenancy using `kailash.RbacEvaluator` (Python) or `Kailash::Enterprise` (Ruby)
- **mcp-specialist**: For MCP server/client patterns using `kailash.mcp.McpApplication`

**Applies when**:

- Creating new workflows or nodes
- Modifying database models or migrations
- Setting up API routes or middleware
- Building AI agents
- Integrating MCP tools

**Enforced by**: Session-start hook

### Rule 4: Analysis Chain for Complex Features

For features requiring design decisions, follow this chain:

1. **deep-analyst** -> Identify failure points and edge cases
2. **requirements-analyst** -> Break down requirements
3. **framework-advisor** -> Choose which Kailash framework to use
4. Then appropriate specialist for implementation

**Applies when**:

- New feature spanning multiple frameworks
- Unclear requirements
- Multiple valid approaches exist
- Cross-framework design decisions

### Rule 5: Parallel Execution for Independent Operations

When multiple independent operations are needed, you MUST:

1. Launch agents in parallel using Task tool
2. Wait for all to complete
3. Aggregate results

**Example independent operations**:

- Reading multiple unrelated source files
- Running multiple search queries across modules
- Validating separate framework implementations
- Running `pytest` and `flake8` in parallel (Python) or `bundle exec rspec` and `rubocop` in parallel (Ruby)

## Examples

### Correct: Sequential with Review

```
User asks for code change
   -> Agent implements change
   -> Agent delegates to intermediate-reviewer
   -> Agent addresses review findings
   -> Only then moves to next task
```

### Incorrect: Skipping Review

```
User asks for code change
   -> Agent implements change
   -> Agent moves to next task (skipped review!)
```

### Rule 8: Polyglot Binding Verification

When using Kailash features that span both Python and Ruby bindings, MUST verify behavior in BOTH languages before marking a task done.

**The binding verification is NON-NEGOTIABLE:**

1. Implement the feature using `import kailash` (Python) or `require 'kailash'` (Ruby)
2. Test in BOTH languages if the feature touches shared Rust binding code
3. Verify consistent behavior between Python and Ruby

**BLOCKED responses:**

- "Only tested in Python, Ruby should be the same"
- "Binding verification deferred"

**Enforced by**: /implement phase checklist, red team checklist
**Exception**: User explicitly says "skip binding verification for now"

### Rule 6: Pre-Existing Failures MUST Be Fixed

See `rules/zero-tolerance.md` Rule 1. If you find it, you fix it. "Not introduced in this session" is BLOCKED.
**Exception**: User explicitly says "skip this issue."

### Rule 7: No Workarounds for SDK Issues

When you encounter a bug or limitation in the Kailash SDK:

1. Check if it is a known issue (GitHub issues on the SDK repo)
2. File a bug report with a minimal reproduction
3. Use a supported alternative pattern if available
4. NEVER re-implement SDK functionality with naive workarounds

**Exception**: NONE.

## PROHIBITED Actions

### MUST NOT: Skip Code Review

Code review is mandatory after changes. Skipping requires explicit user approval.

### MUST NOT: Commit Without Security Review

Security review before commits is non-negotiable.

### MUST NOT: Ignore SDK Patterns

Never write raw SQL strings when `kailash.DataFlow` patterns exist.
Never build custom HTTP servers when `kailash.NexusApp` patterns exist.
Never build custom agent loops when `kailash.Agent` patterns exist.

### MUST NOT: Sequential When Parallel Possible

If operations are independent, run them in parallel.

### MUST NOT: Violate Zero-Tolerance Rules

Stubs, naive fallbacks, unfixed pre-existing failures, and SDK workarounds are all BLOCKED. See `rules/zero-tolerance.md` and `rules/no-stubs.md` for full enforcement details.

## Quality Gates

### Checkpoint 1: After Planning

- [ ] Requirements understood
- [ ] Approach validated
- [ ] Target framework(s) identified

### Checkpoint 2: After Implementation

- [ ] Code review completed
- [ ] Tests written (`pytest` / `bundle exec rspec`)
- [ ] Linting passes (`flake8` / `rubocop`)
- [ ] Type checking passes (`mypy` / `sorbet`) if applicable
- [ ] Patterns validated

### Checkpoint 3: Before Commit

- [ ] Security review passed
- [ ] `pytest` passes (Python) or `bundle exec rspec` passes (Ruby)
- [ ] `pip-audit` or `bundle-audit` clean
- [ ] Documentation updated

### Checkpoint 4: Before Push

- [ ] PR description complete
- [ ] CI checks configured
- [ ] Ready for human review
