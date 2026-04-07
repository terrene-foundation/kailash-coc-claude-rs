---
name: error-troubleshooting
description: "Common error patterns and troubleshooting guides for the Kailash Rust SDK including Nexus blocking issues, connection parameter errors, runtime execution errors, cycle detection problems, missing .build() calls, parameter validation errors, and DataFlow type errors. Use when encountering errors, debugging issues, or asking about 'error', 'troubleshooting', 'debugging', 'not working', 'hangs', 'timeout', 'validation error', 'connection error', 'runtime error', 'cycle detected', 'missing build', or 'DataFlow type'."
---

# Kailash Rust SDK Error Troubleshooting

Comprehensive troubleshooting guides for common Kailash Rust SDK errors and issues.

## Key Difference from Dynamic Languages

In Rust, many errors are caught at **compile time** rather than runtime:

| Error Category            | Dynamic Language         | Rust                                  |
| ------------------------- | ------------------------ | ------------------------------------- |
| Missing `.build()`        | Runtime `TypeError`      | **Compile error**: type mismatch      |
| Wrong method name         | Runtime `AttributeError` | **Compile error**: method not found   |
| Wrong arg count           | Runtime `TypeError`      | **Compile error**: argument count     |
| Builder reuse after build | Silent bug               | **Compile error**: use of moved value |

## Reference Documentation

### Critical Errors

- **[error-missing-build](error-missing-build.md)** -- Compile error from missing `.build(&registry)?` call
- **[error-nexus-blocking](error-nexus-blocking.md)** -- axum handler hangs from `execute_sync()` in async context

### Connection and Parameter Errors

- **[error-connection-params](error-connection-params.md)** -- `BuildError::InvalidConnection` from wrong 4-parameter order
- **[error-parameter-validation](error-parameter-validation.md)** -- `NodeError::MissingInput`/`InvalidInput` from missing or wrong-typed params
- **[error-connection-exhaustion](error-connection-exhaustion.md)** -- Connection pool exhaustion patterns

### Runtime Errors

- **[error-runtime-execution](error-runtime-execution.md)** -- `RuntimeError::NodeFailed`, `RuntimeError::Timeout`, error chain debugging
- **[error-cycle-convergence](error-cycle-convergence.md)** -- `BuildError::CycleDetected`, infinite loops, convergence conditions

### DataFlow and Migration

- **[error-dataflow-template-syntax](error-dataflow-template-syntax.md)** -- Value type mismatches on DataFlow-generated nodes
- **[error-v1-migration](error-v1-migration.md)** -- Migration issues from v1

## Quick Error Reference

| Symptom                              | Quick Fix                                  |
| ------------------------------------ | ------------------------------------------ |
| **Compile: expected &Workflow**      | Add `builder.build(&registry)?`            |
| **axum handler hangs**               | Use `execute().await` not `execute_sync()` |
| **"invalid connection from..."**     | Check 4-parameter order                    |
| **"unknown node type"**              | Register node in `NodeRegistry`            |
| **"missing required input"**         | Provide via config, connection, or inputs  |
| **"invalid input...expected...got"** | Match Value variant to expected type       |
| **"cycle detected"**                 | Add `builder.enable_cycles(true)`          |
| **"timed out after..."**             | Increase `RuntimeConfig::timeout`          |
| **"use of moved value"**             | Don't use builder after `.build()`         |

## Error Type Hierarchy

```text
RuntimeError
  |-- BuildFailed { source: BuildError }
  |     |-- UnknownNodeType, DuplicateNodeId, InvalidConnection
  |     |-- CycleDetected, DisconnectedGraph, NodeCreationFailed, EmptyWorkflow
  |-- NodeFailed { node_id, source: NodeError }
  |     |-- MissingInput, InvalidInput, ExecutionFailed, Timeout, ResourceLimit
  |-- Timeout, Cancelled, Internal
```

## Debugging Strategy

1. **Compile error?** Fix the Rust code -- type system is guiding you
2. **`BuildError`?** Fix workflow construction (nodes, connections, types)
3. **`RuntimeError`?** Fix execution (inputs, timeouts, node logic)
4. **`NodeError`?** Fix individual node configuration or inputs
5. **Walk the error chain**: `e.source()` recursively to find root cause

## Error Prevention Checklist

**Before Building**: `.build(&registry)?` called, 4-param `connect()`, all required params, cycle support if needed, all node types registered.

**Before Executing**: `execute().await?` in async contexts, `execute_sync()` only in sync, timeout configured, result handled.

## Related Skills

- **[01-core](../../01-core/)** -- Core SDK patterns
- **[02-dataflow](../../02-dataflow/)** -- DataFlow specifics
- **[03-nexus](../../03-nexus/)** -- Nexus/axum specifics
- **[14-code-templates](../14-code-templates/)** -- Working code templates

## Support

- `build-fix` agent -- Fix Rust compilation errors with minimal changes
- `dataflow-specialist` -- DataFlow-specific patterns
- `nexus-specialist` -- Nexus/axum integration debugging
