---
name: validate-workflow-structure
description: "Validate Kailash Rust workflow code for pattern compliance and standards. Use when reviewing workflow code, checking for errors, validating patterns, or ensuring best practices before execution."
---

# Validate Workflow Structure

Quick validation checklist for Kailash Rust workflow patterns to ensure compliance with standards and prevent common errors.

> **Skill Metadata**
> Category: `cross-cutting` (validation)
> Priority: `HIGH`
> Related Skills: [`workflow-quickstart`](../../01-core/workflow-quickstart.md)

## Quick Validation Checklist

Run through this checklist for any Kailash workflow code:

### Critical Patterns (Must Pass)

- [ ] **Imports**: Using correct crate paths (`use kailash_core::WorkflowBuilder`)
- [ ] **build() call**: Always `builder.build(&registry)?` before execution
- [ ] **String-based nodes**: `"CSVProcessorNode"` not `CSVProcessorNode::new()`
- [ ] **4-parameter connections**: `builder.connect(src, src_out, tgt, tgt_in)`
- [ ] **Execution pattern**: `runtime.execute(&workflow, inputs).await?` (async) or `runtime.execute(&workflow, inputs)?` (sync)
- [ ] **Error handling**: Using `?` operator, not `.unwrap()` in production code
- [ ] **Registry**: `NodeRegistry::default()` or custom registry with all needed nodes

### Common Mistakes (Check These)

- [ ] **Node suffix**: All nodes end with "Node" (CSVProcessor**Node**, LLMAgent**Node**)
- [ ] **snake_case**: Method names and config keys use snake_case
- [ ] **Arc wrapping**: Registry wrapped in `Arc::new()` for shared ownership
- [ ] **ValueMap construction**: Using `ValueMap::from([...])` with `.into()` for keys
- [ ] **Node ID uniqueness**: Each node has unique string ID in workflow

## Validation Examples

### Example 1: Valid Workflow

```rust
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use std::sync::Arc;

let mut builder = WorkflowBuilder::new();
builder.add_node("CSVProcessorNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));
builder.add_node("JSONTransformNode", "process", ValueMap::from([
    ("expression".into(), Value::String("@.length()".into())),
]));
builder.connect("reader", "data", "process", "data");

let registry = Arc::new(NodeRegistry::default());
let workflow = builder.build(&registry)?;

let runtime = Runtime::new(RuntimeConfig::default(), registry);
let result = runtime.execute(&workflow, ValueMap::new()).await?;
```

**Validation Result**: PASS

- Correct crate imports
- String-based node types
- 4-parameter connections
- `builder.build(&registry)?` called
- Correct execution pattern with `?`

### Example 2: Code with Violations

```rust
// VIOLATIONS -- DO NOT USE
use kailash_core::WorkflowBuilder;

let mut builder = WorkflowBuilder::new();
builder.add_node("CSVReader", "reader", ValueMap::new());  // Missing "Node" suffix
// builder.connect("reader", "processor");  // Only 2 params
let workflow = builder.build(&registry).unwrap();  // unwrap in production
runtime.execute(&workflow, inputs).await.unwrap();  // unwrap in production
```

**Violations found:**

1. Missing "Node" suffix -- use `CSVProcessorNode` not `CSVReader`
2. Connection with only 2 params -- use 4-parameter format
3. `.unwrap()` in production -- use `?` operator

## Pattern Validation Rules

### Rule 1: Execution Pattern (CRITICAL)

```rust
// CORRECT
let result = runtime.execute(&workflow, inputs).await?;
let result = runtime.execute_sync(&workflow, inputs)?;

// WRONG
let result = runtime.execute(&workflow, inputs).await.unwrap();  // No unwrap
// workflow.execute(&runtime);  // Wrong direction
```

### Rule 2: Node API (CRITICAL)

```rust
// CORRECT: String-based node types
builder.add_node("CSVProcessorNode", "reader", ValueMap::from([
    ("file_path".into(), Value::String("data.csv".into())),
]));

// WRONG: Instance-based (not how Kailash works)
// builder.add_node("reader", CSVProcessorNode::new("data.csv"));
```

### Rule 3: Connection Pattern (CRITICAL)

```rust
// CORRECT: 4 parameters (source_node, source_output, target_node, target_input)
builder.connect("reader", "data", "processor", "input");

// WRONG: Fewer than 4 parameters
// builder.connect("reader", "processor");
```

### Rule 4: Build Validation (CRITICAL)

```rust
// CORRECT: build returns Result, use ? operator
let workflow = builder.build(&registry)?;

// WRONG: Skipping build or using unwrap
// runtime.execute(&builder, inputs);  // Passing builder, not workflow
// let workflow = builder.build(&registry).unwrap();  // unwrap in production
```

### Rule 5: Import Paths (HIGH)

```rust
// CORRECT: Full crate paths
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};

// CORRECT: From specific modules
use kailash_dataflow::{DataFlow, ModelDefinition, FieldType};
use kailash_nexus::{NexusApp, Preset};
use kailash_kaizen::{BaseAgent, AgentConfig};
```

### Rule 6: Naming Conventions (HIGH)

```rust
// CORRECT
// Node types: PascalCase with "Node" suffix
"CSVProcessorNode", "LLMNode", "HTTPRequestNode", "JSONTransformNode"

// Config keys: snake_case
"file_path", "has_header", "connection_string", "max_tokens"

// Node IDs: snake_case descriptive strings
"reader", "data_processor", "ai_classifier", "output_writer"
```

## Automated Validation

### Using cargo clippy

```bash
# Catches many issues automatically
cargo clippy --workspace -- -D warnings

# Specific checks for Kailash patterns
cargo clippy -- \
    -D clippy::unwrap_used \
    -D clippy::expect_used \
    -D clippy::todo \
    -D clippy::unimplemented
```

### Pre-Commit Checklist

```bash
cargo test --workspace                    # All tests pass
cargo clippy --workspace -- -D warnings   # No warnings
cargo fmt --all --check                   # Formatting correct
cargo audit                               # No vulnerabilities
```

## Common Validation Scenarios

### Scenario 1: Code Review Checklist

- [ ] All imports use correct crate paths
- [ ] All nodes use string-based API with "Node" suffix
- [ ] All connections use 4-parameter `builder.connect()` pattern
- [ ] `builder.build(&registry)?` called before execution
- [ ] Execution uses `?` operator, not `.unwrap()`
- [ ] All config keys are snake_case
- [ ] Registry wrapped in `Arc::new()`
- [ ] No hardcoded secrets

### Scenario 2: Refactoring from Python

When converting Python Kailash code to Rust:

1. `WorkflowBuilder()` -> `WorkflowBuilder::new()`
2. `workflow.add_node(type, id, {params})` -> `builder.add_node(type, id, ValueMap::from([...]))`
3. `workflow.add_connection(...)` -> `builder.connect(...)`
4. `workflow.build()` -> `builder.build(&registry)?`
5. `runtime.execute(wf.build())` -> `runtime.execute(&workflow, inputs).await?`
6. Python dicts `{"key": "val"}` -> `ValueMap::from([("key".into(), Value::String("val".into()))])`

## Related Patterns

- **Workflow basics**: See CLAUDE.md -- Essential Patterns section
- **Node selection**: [`decide-node-for-task`](../../14-architecture-decisions/decide-node-for-task.md)
- **Testing**: [`decide-test-tier`](../../14-architecture-decisions/decide-test-tier.md)

## When to Escalate to Subagent

Use `reviewer` (MANDATORY after changes):

- Comprehensive code review of workflow implementations
- Pattern compliance verification

Use `rust-architect`:

- Cross-crate trait design questions
- Ownership/lifetime issues in workflow code
- API surface design

## Documentation References

### Primary Sources

- **Essential Patterns**: [`CLAUDE.md`](../../../../CLAUDE.md) -- Essential Patterns section
- **WorkflowBuilder**: `crates/kailash-core/src/workflow/builder.rs`
- **Node trait**: `crates/kailash-core/src/node.rs`
- **Rules**: `rules/zero-tolerance.md`, `rules/security.md`

## Quick Tips

- `builder.build(&registry)?` is the primary validation boundary -- always call it
- Use `cargo clippy -- -D warnings` to catch common issues
- The `?` operator propagates errors cleanly -- never use `.unwrap()` in production
- Start with templates from `.claude/skills/15-code-templates/` to avoid violations
- All ValueMap keys need `.into()` to convert `&str` to `Arc<str>`

<!-- Trigger Keywords: validate workflow, check workflow, workflow validation, verify code, code review, pattern compliance, check for errors, validate patterns, standards check, best practices check, workflow review -->
