---
name: python-bindings
description: "PyO3 Python binding patterns for Kailash Rust SDK. Use when asking about 'Python binding', 'PyO3', 'maturin', 'pip install kailash', 'Python wrapper', 'pyi stubs', 'Value mapping', or 'register_callback'."
---

# Python Bindings -- Quick Reference

PyO3-based binding distributed as `pip install kailash-enterprise`. Import as `import kailash`.

## Key Facts

| Item              | Value                                     |
| ----------------- | ----------------------------------------- |
| **Package name**  | `kailash-enterprise` (PyPI)               |
| **Import name**   | `import kailash`                          |
| **Build tool**    | maturin (`maturin develop --release`)     |
| **Rust crate**    | `bindings/kailash-python/`                |
| **Python source** | `bindings/kailash-python/python/kailash/` |
| **Stubs**         | `bindings/kailash-python/kailash.pyi`     |
| **Native module** | `kailash._kailash` (compiled .so/.dylib)  |

## Registered PyO3 Modules

| Module                | Purpose        | Key Types                                                  |
| --------------------- | -------------- | ---------------------------------------------------------- |
| `kailash` (root)      | Core SDK       | `NodeRegistry`, `WorkflowBuilder`, `Runtime`, `Value`      |
| `kailash.dataflow`    | Database       | `DataFlow`, `ModelDefinition`, `FilterCondition`           |
| `kailash.enterprise`  | Access control | `RbacEngine`, `AbacEvaluator`, `AuditLog`, `TenantContext` |
| `kailash.kaizen`      | AI agents      | `BaseAgent`, `LlmClient`, `AgentConfig`, `CostTracker`     |
| `kailash.nexus`       | Deployment     | `NexusApp`, `NexusConfig`, `SessionStore`                  |
| `kailash.trust_plane` | Trust          | `TrustProject`, `ConstraintEnvelope`                       |
| `kailash.pact`        | Governance     | `Address`, `GovernanceEngine` (feature-gated)              |
| `kailash.l3`          | L3 autonomy    | `L3Verdict`, `L3EnforcementPipeline` (feature-gated)       |

## Value Mapping (Rust <-> Python)

| Rust `Value`        | Python  |
| ------------------- | ------- |
| `Value::Null`       | `None`  |
| `Value::Bool(b)`    | `bool`  |
| `Value::Integer(i)` | `int`   |
| `Value::Float(f)`   | `float` |
| `Value::String(s)`  | `str`   |
| `Value::Array(a)`   | `list`  |
| `Value::Map(m)`     | `dict`  |

## Quick Patterns

### Build and install locally

```bash
cd bindings/kailash-python
cargo clean -p kailash-python   # Prevent stale binary
maturin develop --release
```

### Register a Python callback as a node

```python
import kailash
reg = kailash.NodeRegistry()
reg.register_callback("MyNode", my_func, ["input"], ["output"])
```

### v2 API (current)

```python
reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("NoOpNode", "n1", {})
wf = builder.build(reg)
rt = kailash.Runtime(reg)
result = rt.execute(wf, {})
```

## Skill Files

| File                           | Content                                     |
| ------------------------------ | ------------------------------------------- |
| `python-v2-quickstart.md`      | v2 API migration guide                      |
| `python-cheatsheet.md`         | Common patterns                             |
| `python-common-mistakes.md`    | Pitfalls and fixes                          |
| `python-custom-nodes.md`       | Callback node patterns                      |
| `python-framework-bindings.md` | DataFlow/Nexus/Kaizen/Enterprise Python API |
| `python-gold-standards.md`     | Binding quality rules                       |
| `python-migration-guide.md`    | v1 to v2 migration                          |
| `python-available-nodes.md`    | Node list for Python                        |
| `async-bridging.md`            | Async Rust <-> Python bridging              |

## Related

- **python-binding** agent -- PyO3 implementation specialist
- **python-pattern-expert** agent -- Debugging PyO3 errors
- `rules/release.md` -- Wheel build and PyPI publishing rules
