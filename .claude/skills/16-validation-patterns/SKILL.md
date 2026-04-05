---
name: validation-patterns
description: "Validation patterns and compliance checking for Kailash Rust SDK including parameter validation, DataFlow pattern validation, connection validation, use statement validation, workflow structure validation, and security validation. Use when asking about 'validation', 'validate', 'check compliance', 'verify', 'lint', 'code review', 'parameter validation', 'connection validation', 'import validation', 'security validation', or 'workflow validation'."
---

# Kailash Validation Patterns

Comprehensive validation patterns and compliance checking for Kailash Rust SDK development.

## Overview

Validation tools and patterns for:

- Parameter validation (ValueMap, ParamDef)
- DataFlow pattern compliance (ModelDefinition, sqlx)
- Connection validation (builder.connect 4-parameter format)
- Use statement checking (absolute paths, correct crate imports)
- Workflow structure validation (builder.build(&registry)?)
- Security validation (no unsafe, sqlx::query!, cargo audit)

## Reference Documentation

### Core Validations

#### Parameter Validation

- **[validate-parameters](validate-parameters.md)** - Node parameter validation
  - Required parameters via ParamDef
  - Value type checking
  - ValueMap construction
  - Build-time validation

#### Connection Validation

- **[validate-connections](validate-connections.md)** - Connection validation
  - 4-parameter `builder.connect()` format
  - Source/target node existence
  - Parameter name validation
  - Circular dependency detection via build

#### Workflow Structure

- **[validate-workflow-structure](validate-workflow-structure.md)** - Workflow validation
  - Node ID uniqueness
  - Connection validity
  - `builder.build(&registry)?` as validation boundary
  - Registry completeness

### Framework-Specific Validations

#### DataFlow Patterns

- **[validate-dataflow-patterns](validate-dataflow-patterns.md)** - DataFlow compliance
  - ModelDefinition usage
  - sqlx compile-time query checking
  - Auto-generated node usage
  - Transaction patterns
  - Environment-based connection strings

#### Use Statements

- **[validate-absolute-imports](validate-absolute-imports.md)** - Use statement validation
  - Correct crate paths (`use kailash_core::...`)
  - Feature-gated imports
  - Re-export awareness
  - Circular dependency avoidance

#### Security Validation

- **[validate-security](validate-security.md)** - Security checks
  - No unsafe blocks (application code)
  - `sqlx::query!` for compile-time SQL checking
  - `cargo audit` for dependency vulnerabilities
  - Environment variables for secrets
  - No hardcoded credentials

## Validation Patterns

### Parameter Validation Pattern

```rust
use kailash_core::value::{Value, ValueMap};
use kailash_core::node::ParamDef;

fn validate_node_params(params: &ValueMap, required: &[ParamDef]) -> Result<(), String> {
    for param_def in required {
        if param_def.required && !params.contains_key(param_def.name.as_ref()) {
            return Err(format!("Missing required parameter: {}", param_def.name));
        }
    }
    Ok(())
}
```

### Connection Validation Pattern

```rust
use kailash_core::WorkflowBuilder;
use kailash_core::value::ValueMap;

let mut builder = WorkflowBuilder::new();
builder.add_node("LLMNode", "node1", ValueMap::new());
builder.add_node("JSONTransformNode", "node2", ValueMap::new());

// 4-parameter connection -- validated at build time
builder.connect("node1", "result", "node2", "data");

// builder.build(&registry)? validates all connections
let workflow = builder.build(&registry)?;
```

### DataFlow Pattern Validation

```rust
use kailash_dataflow::{DataFlow, ModelDefinition, FieldType};

// CORRECT: Use ModelDefinition
let user_model = ModelDefinition::new("User")
    .field("id", FieldType::Integer, |f| f.primary_key())
    .field("name", FieldType::String, |f| f.required())
    .build()?;

// WRONG: Manual SQL string construction
// let query = format!("INSERT INTO users (name) VALUES ('{}')", name);
```

### Security Validation Pattern

```rust
// CORRECT: Environment variables for secrets
dotenvy::dotenv().ok();
let api_key = std::env::var("OPENAI_API_KEY")
    .map_err(|_| anyhow::anyhow!("OPENAI_API_KEY not set"))?;

// CORRECT: Compile-time checked SQL
let user = sqlx::query_as!(User, "SELECT * FROM users WHERE id = $1", user_id)
    .fetch_one(&pool)
    .await?;

// WRONG: Hardcoded secrets
// let api_key = "sk-abc123...";

// WRONG: String-interpolated SQL
// let query = format!("SELECT * FROM users WHERE id = {}", user_id);
```

## Validation Checklists

### Pre-Execution Checklist

- [ ] All required parameters provided in ValueMap
- [ ] All connections use 4-parameter `builder.connect()` format
- [ ] No duplicate node IDs
- [ ] All referenced nodes exist in builder
- [ ] Called `builder.build(&registry)?` before execute
- [ ] Registry contains all required node types

### DataFlow Checklist

- [ ] Models use `ModelDefinition::new().field().build()?`
- [ ] Database URL from `std::env::var("DATABASE_URL")?`
- [ ] Using auto-generated nodes (CreateX, ReadX, etc.)
- [ ] Compile-time SQL with `sqlx::query!` or `sqlx::query_as!`
- [ ] Connection pooling configured for production

### Security Checklist

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] No `unsafe` blocks in application code
- [ ] SQL uses `sqlx::query!` (compile-time checked) or bound parameters
- [ ] All secrets from `std::env::var()` with `.env` file
- [ ] `cargo audit` clean
- [ ] `cargo deny check` passing

### Use Statement Checklist

- [ ] All imports use full crate paths (`use kailash_core::...`)
- [ ] Feature-gated imports wrapped in `#[cfg(feature = "...")]`
- [ ] No circular crate dependencies
- [ ] Using re-exports from prelude where available

## Pre-Commit Validation

```bash
# Run all checks before commit
cargo test --workspace                           # Unit tests
cargo clippy --workspace -- -D warnings          # Lint (no warnings)
cargo fmt --all --check                          # Format check
cargo audit                                      # Dependency vulnerabilities
```

### CI/CD Validation

```yaml
# In CI pipeline
steps:
  - name: Validate
    run: |
      cargo test --workspace
      cargo clippy --workspace -- -D warnings
      cargo fmt --all --check
      cargo audit
```

## Critical Validation Rules

### Must Validate

- All parameters before execution via `builder.build(&registry)?`
- All connections before building
- Security risks before deployment
- Use statement correctness before commit
- DataFlow patterns in code review

### Never Skip

- NEVER skip `builder.build(&registry)?` -- it is the validation boundary
- NEVER skip security validation
- NEVER deploy without `cargo audit`
- NEVER commit without `cargo clippy -- -D warnings`
- NEVER use raw SQL strings when DataFlow or `sqlx::query!` is available

## When to Use This Skill

Use this skill when you need to:

- Validate workflow before execution
- Check parameter correctness
- Verify connection format
- Audit security issues
- Review DataFlow patterns
- Check use statement compliance
- Perform code review
- Ensure standards compliance

## Related Skills

- **[14-architecture-decisions](../../14-architecture-decisions/SKILL.md)** - Architecture decisions
- **[13-testing-strategies](../../13-testing-strategies/SKILL.md)** - Testing strategies
- **[01-core](../../01-core/SKILL.md)** - Core patterns
- **[02-dataflow](../../02-dataflow/SKILL.md)** - DataFlow patterns

## Support

For validation help, invoke:

- `reviewer` - Code review (MANDATORY after changes)
- `security-reviewer` - Security audit (MANDATORY before commit)
- `rust-architect` - Cross-crate pattern validation
- `cargo-specialist` - Dependency and workspace validation
