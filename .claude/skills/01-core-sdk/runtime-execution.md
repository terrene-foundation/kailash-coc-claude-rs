---
name: runtime-execution
description: "Execute workflows with kailash.Runtime, with parameter overrides and configuration options. Use when asking 'execute workflow', 'runtime.execute', 'kailash.Runtime', 'run workflow', 'execution options', 'runtime parameters', 'content-aware detection', or 'workflow execution'."
---

# Runtime Execution Options

Runtime Execution Options guide with patterns, examples, and best practices.

> **Skill Metadata**
> Category: `core-sdk`
> Priority: `HIGH`

## Quick Reference

- **Primary Use**: Runtime Execution Options
- **Category**: core-sdk
- **Priority**: HIGH
- **Trigger Keywords**: execute workflow, runtime.execute, kailash.Runtime, run workflow

## Core Patterns

### Unified Runtime

`kailash.Runtime` is backed by the Rust engine. It handles both sync and async execution internally.

```python
import kailash

# Build workflow
reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("CSVProcessorNode", "reader", {"file_path": "data.csv"})
wf = builder.build(reg)

# Execute — single unified Runtime
rt = kailash.Runtime(reg)
result = rt.execute(wf)

# result is a dict with keys: "results", "run_id", "metadata"
print(result["results"]["reader"])
print(result["run_id"])
```

### Runtime Configuration Options

`kailash.Runtime` handles both sync and async execution. Configuration options:

```python
# Common configuration options
rt = kailash.Runtime(reg)

# Get validation metrics
metrics = rt.get_validation_metrics()
rt.reset_validation_metrics()
```

## Parameter Passing at Runtime

```python
# Override node parameters at runtime
rt = kailash.Runtime(reg)
result = rt.execute(
    builder.build(reg),
    parameters={
        "reader": {"file_path": "custom.csv"},     # Override node config
        "filter": {"threshold": 100}               # Add runtime parameter
    }
)
```

## Runtime Architecture

`kailash.Runtime` inherits from BaseRuntime and uses shared mixins for consistent behavior:

**BaseRuntime Foundation**:

- Provides 29 configuration parameters (debug, enable_cycles, conditional_execution, connection_validation, etc.)
- Manages execution metadata (run IDs, workflow caching)
- Common initialization and validation modes (strict, warn, off)

**Shared Mixins**:

- **CycleExecutionMixin**: Cycle execution delegation to CyclicWorkflowExecutor with validation and error wrapping
- **ValidationMixin**: Workflow structure validation (5 methods)
  - validate_workflow(): Checks workflow structure, node connections, parameter mappings
  - \_validate_connection_contracts(): Validates connection parameter contracts
  - \_validate_conditional_execution_prerequisites(): Validates conditional execution setup
  - \_validate_switch_results(): Validates switch node results
  - \_validate_conditional_execution_results(): Validates conditional execution results
- **ConditionalExecutionMixin**: Conditional execution and branching logic with SwitchNode support
  - Pattern detection and cycle detection
  - Node skipping and hierarchical execution
  - Conditional workflow orchestration

**kailash.Runtime-Specific Features**:

- \_generate_enhanced_validation_error(): Enhanced error messages with context
- \_build_connection_context(): Builds connection context for errors
- get_validation_metrics(): Public API for retrieving validation metrics
- reset_validation_metrics(): Public API for resetting validation metrics

**ParameterHandlingMixin Not Used**:
kailash.Runtime uses WorkflowParameterInjector for enterprise parameter handling instead of ParameterHandlingMixin (architectural boundary for complex workflows).

All existing usage patterns remain unchanged.

## Runtime Internals

`kailash.Runtime` automatically selects the optimal execution strategy:

- **Level-Based Parallelism**: Groups nodes by dependency level, executes independent nodes concurrently
- **Concurrency Control**: Semaphore-based limits (default: 10 concurrent nodes)
- **Thread Pool**: Executes sync nodes without blocking (configurable pool size)

## Advanced: Runtime Usage

The Rust-backed `kailash.Runtime` is the single runtime. Custom runtimes are not supported in the Rust-backed package. Use `kailash.Runtime(reg)` for all execution:

```python
import kailash

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

# Execute any workflow
result = rt.execute(builder.build(reg))
```

The runtime internally handles cycle execution, validation, conditional execution, and parameter injection.

## Related Patterns

- **For fundamentals**: See [`workflow-quickstart`](#)
- **For parameter passing**: See [`gold-parameter-passing`](#)
- **For runtime selection**: See [`decide-runtime`](#)

## Documentation References

### Primary Sources

- [`CLAUDE.md#L111-177`](../../../CLAUDE.md)

### Advanced References

- `src/kailash/runtime/base.py` - BaseRuntime implementation (699 lines)
- `src/kailash/runtime/mixins/validation.py` - ValidationMixin (519 lines, 5 methods)
- `src/kailash/runtime/mixins/parameters.py` - ParameterHandlingMixin (650 lines, 9 methods)
- `src/kailash/runtime/mixins/conditional_execution.py` - ConditionalExecutionMixin (1,107 lines, 12 methods)
- `src/kailash/runtime/mixins/cycle_execution.py` - CycleExecutionMixin (178 lines, 1 method)

## Performance Configuration

Phase 0 optimizations reduce per-node execution overhead. Key configuration:

```python
import kailash

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)

# Execute workflow
result = rt.execute(builder.build(reg))
```

**What's optimized (automatic, no config needed)**:

- Topological sort cached per workflow (742x-6504x speedup on cache hit)
- Cycle edge classification cached with dirty-flag invalidation (60x-265x speedup)
- Module-level imports (no per-node import overhead)
- Shared MetricsCollector per workflow (skips thread spawn when psutil disabled)
- Node ID frozenset pre-computed once per execution
- Security allowed_types cached at module level (eliminates 13+ per-call lazy imports)
- Topo cache returns immutable tuple (prevents cache corruption)
- Deferred monitoring storage (zero I/O during execution, batch write after)
- Batch CARE persistence (single file per run, avoids 1M+ entry directory bloat)
- SQLite CARE storage (ACID-compliant, queryable audit trail with EATP event persistence)

**Framework overhead**: ~41-52us/node with monitoring disabled (30-34% of total execution time
for EmbeddedPythonNode with minimal code). See `docs/guides/00-performance-optimizations.md` for
detailed benchmark results.

**Monitoring overhead**: ~35us/node in-loop + ~1.5-2.8ms SQLite flush after execution.
Monitoring ON adds ~34% overhead in-loop (down from 3200x before P0D-007). Post-execution
SQLite flush adds ~1.5ms for 5-node workflows, scaling sub-linearly at ~56us/task for 50 tasks.

**CARE audit persistence (P0E)**: Tracking data + EATP audit events written atomically to
`~/.kailash/tracking/tracking.db` using WAL mode + `executemany()` batch inserts.
`DeferredStorageBackend.flush_to_sqlite()` is called by `_flush_deferred_storage_sqlite()`
in kailash.Runtime, which collects `RuntimeAuditGenerator` events before flushing.

- networkx removed from hot-path execution (local.py, async_local.py)
- BFS ancestor traversal replaces nx.ancestors for switch evaluation

**Regression tests**: `tests/unit/runtime/test_phase0{a,b,c,d,e}_optimizations.py` (113+ tests)

See `docs/guides/00-performance-optimizations.md` for full details.

## Quick Tips

- Always use `rt.execute(builder.build(reg))` -- never `builder.execute()`
- `kailash.Runtime` handles both sync and async execution
- Parameter resolution supports ${param} templates with type preservation

## Keywords for Auto-Trigger

<!-- Trigger Keywords: execute workflow, runtime.execute, kailash.Runtime, run workflow -->
