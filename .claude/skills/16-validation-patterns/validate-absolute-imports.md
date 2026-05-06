---
name: validate-absolute-imports
description: "Validate use statement paths in Kailash Rust SDK code. Use when asking 'check imports', 'import validation', 'use statements', or 'crate paths'."
---

# Validate Use Statements

> **Skill Metadata**
> Category: `validation`
> Priority: `MEDIUM`

## Required Pattern

```rust
// CORRECT: Full crate paths
use kailash_core::{WorkflowBuilder, Runtime, RuntimeConfig, NodeRegistry};
use kailash_core::value::{Value, ValueMap};
use kailash_core::node::{Node, ParamDef, NodeError};
use kailash_dataflow::{DataFlow, ModelDefinition, FieldType};
use kailash_nexus::{NexusApp, Preset};
use kailash_kaizen::{BaseAgent, AgentConfig};
use kailash_enterprise::rbac::{Permission, Role};

// CORRECT: Standard library and external crates
use std::sync::Arc;
use std::collections::HashMap;
use tokio::sync::Mutex;
use serde::{Serialize, Deserialize};

// CORRECT: Feature-gated imports
#[cfg(feature = "trust")]
use kailash_kaizen::trust::{GovernedAgent, DelegationChain};
```

## Crate Path Reference

| Crate                 | Common Imports                                                |
| --------------------- | ------------------------------------------------------------- |
| `kailash_core`        | `WorkflowBuilder`, `Runtime`, `RuntimeConfig`, `NodeRegistry` |
| `kailash_core::value` | `Value`, `ValueMap`                                           |
| `kailash_core::node`  | `Node`, `ParamDef`, `NodeError`                               |
| `kailash_value`       | `Value`, `ValueMap` (re-exported by kailash_core)             |
| `kailash_dataflow`    | `DataFlow`, `ModelDefinition`, `FieldType`                    |
| `kailash_nexus`       | `NexusApp`, `Preset`                                          |
| `kailash_kaizen`      | `BaseAgent`, `AgentConfig`, `LlmClient`                       |
| `kailash_enterprise`  | `rbac::Permission`, `abac::Policy`                            |
| `kailash_macros`      | `kailash_node`, `dataflow::model`                             |

## Validation Checks

### Check for Correct Crate Names

```bash
# Verify all kailash imports use underscores (not hyphens)
grep -rn "use kailash-" crates/ --include="*.rs"
# Should return empty -- Rust uses underscores in use statements

# Verify no wildcard imports in production code
grep -rn "use kailash_.*::*;" crates/ --include="*.rs" | grep -v "test"
# Should return empty -- prefer explicit imports
```

### Common Mistakes

```rust
// WRONG: Hyphenated crate name (Cargo.toml name, not Rust name)
// use kailash-core::WorkflowBuilder;  // Won't compile

// WRONG: Wildcard imports in production code
// use kailash_core::*;  // Too broad, unclear dependencies

// WRONG: Importing from wrong crate
// use kailash_nodes::value::Value;  // Value is in kailash_value/kailash_core

// CORRECT
use kailash_core::value::Value;
```

## Why Correct Imports Matter

1. **Compilation** -- Wrong crate paths cause compile errors
2. **Dependency clarity** -- Explicit imports show crate dependencies
3. **Feature gates** -- Some imports require feature flags enabled
4. **Re-exports** -- `kailash_core::value` re-exports from `kailash_value`
5. **IDE support** -- Correct paths enable autocomplete and go-to-definition

## Cargo.toml Dependencies

Ensure your `Cargo.toml` lists the crates you import:

```toml
[dependencies]
kailash-core = { path = "../kailash-core" }
kailash-value = { path = "../kailash-value" }
kailash-dataflow = { path = "../kailash-dataflow" }
kailash-nexus = { path = "../kailash-nexus" }
kailash-kaizen = { path = "../kailash-kaizen", features = ["trust"] }
```

## Documentation

- **Crate dependency graph**: [`CLAUDE.md`](../../../../CLAUDE.md) -- Crate Dependency Graph section
- **Workspace structure**: [`CLAUDE.md`](../../../../CLAUDE.md) -- Workspace Architecture section

<!-- Trigger Keywords: check imports, import validation, use statements, crate paths, absolute imports -->
