# Run Benchmarks Skill

Run performance benchmarks for the Kailash Python SDK.

## Usage

`/run-benchmarks` -- Run timing benchmarks for key SDK operations

## Steps

1. Run a Python script that times the core operations:

```python
import time
from kailash import NodeRegistry, WorkflowBuilder, Runtime

def bench(label, fn, iterations=1000):
    start = time.perf_counter()
    for _ in range(iterations):
        fn()
    elapsed = time.perf_counter() - start
    per_op = elapsed / iterations * 1_000_000  # microseconds
    print(f"{label}: {per_op:.1f} us/op ({iterations} iterations)")

registry = NodeRegistry()

# --- Workflow build benchmarks ---

def build_5_node():
    b = WorkflowBuilder()
    for i in range(5):
        b.add_node("NoOpNode", f"n{i}")
    for i in range(4):
        b.connect(f"n{i}", "data", f"n{i+1}", "data")
    b.build(registry)

def build_20_node():
    b = WorkflowBuilder()
    for i in range(20):
        b.add_node("NoOpNode", f"n{i}")
    for i in range(19):
        b.connect(f"n{i}", "data", f"n{i+1}", "data")
    b.build(registry)

bench("Build 5-node workflow", build_5_node, 500)
bench("Build 20-node workflow", build_20_node, 200)

# --- Workflow execute benchmarks ---

runtime = Runtime(registry)

b = WorkflowBuilder()
for i in range(5):
    b.add_node("NoOpNode", f"n{i}")
for i in range(4):
    b.connect(f"n{i}", "data", f"n{i+1}", "data")
wf5 = b.build(registry)

def exec_5_node():
    runtime.execute(wf5)

bench("Execute 5-node workflow", exec_5_node, 500)

b = WorkflowBuilder()
for i in range(20):
    b.add_node("NoOpNode", f"n{i}")
for i in range(19):
    b.connect(f"n{i}", "data", f"n{i+1}", "data")
wf20 = b.build(registry)

def exec_20_node():
    runtime.execute(wf20)

bench("Execute 20-node workflow", exec_20_node, 200)

# --- Registry benchmarks ---

def registry_create():
    NodeRegistry()

bench("Registry creation", registry_create, 100)

def registry_lookup():
    registry.has_type("NoOpNode")

bench("Registry type lookup", registry_lookup, 5000)

print("\nDone.")
```

2. Report results organized by group:
   - **Workflow build**: Build time for 5/20 node workflows
   - **Workflow execute**: Execution overhead for 5/20 node NoOp workflows
   - **Registry**: Creation and lookup times

3. Compare against previous results if available.

## Benchmark Groups

### Core benchmarks

- **workflow_build**: Build time for 5/20/100 node workflows
- **workflow_execute**: Execution overhead for 5/20/100 node NoOp workflows
- **registry**: Creation time and type lookup

### Expected Performance (Rust backend)

- **Workflow build** (5-node): ~11 us
- **Per-node overhead**: ~0.2 us
- **20-node execution**: ~15 us (target: <30 us)
- **Memory per workflow** (5-node): ~2.5 KB (target: <5 KB/node)

Note: Python overhead adds FFI crossing cost, so Python-measured times will be higher than pure Rust benchmarks.

## Verify

```bash
python -c "
import time
from kailash import NodeRegistry, WorkflowBuilder, Runtime
registry = NodeRegistry()
b = WorkflowBuilder()
b.add_node('NoOpNode', 'n1')
wf = b.build(registry)
runtime = Runtime(registry)
start = time.perf_counter()
for _ in range(100):
    runtime.execute(wf)
elapsed = (time.perf_counter() - start) / 100 * 1e6
print(f'Single node execute: {elapsed:.1f} us/op')
print('OK' if elapsed < 10_000 else 'SLOW')
"
```
