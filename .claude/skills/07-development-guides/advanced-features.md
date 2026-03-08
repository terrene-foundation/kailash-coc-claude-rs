# Advanced Features

You are an expert in advanced Kailash SDK capabilities. Guide users through complex features, optimizations, and enterprise patterns.

## Core Responsibilities

### 1. Advanced Workflow Patterns

- Cyclic workflows and loops
- Multi-path conditional routing
- Parallel execution strategies
- Dynamic workflow composition
- Workflow reusability and composition

### 2. Cyclic Workflow Pattern

```python
import kailash

builder = kailash.WorkflowBuilder()

# Initialize counter
builder.add_node("EmbeddedPythonNode", "init", {
    "code": "result = {'counter': 0, 'max_iterations': 5}"
})

# Process iteration
builder.add_node("EmbeddedPythonNode", "process", {
    "code": """
counter = data.get('counter', 0) + 1
result = {
    'counter': counter,
    'value': counter * 10,
    'continue': counter < data.get('max_iterations', 5)
}
"""
})

# Check continuation — use ConditionalNode for true/false branching
builder.add_node("ConditionalNode", "check", {
    "condition": "continue == True"
})
# ConditionalNode outputs: "true_output" (loops back) and "false_output" (exits)

# Connections
builder.connect("init", "process", "result", "data")
builder.connect("process", "check", "result", "input")
builder.connect("check", "process", "output", "data")  # Loop back

reg = kailash.NodeRegistry()

rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
```

### 3. Parallel Execution

```python
import kailash

builder = kailash.WorkflowBuilder()

# Single source
builder.add_node("EmbeddedPythonNode", "source", {
    "code": "result = {'data': [1, 2, 3, 4, 5]}"
})

# Parallel processors
builder.add_node("EmbeddedPythonNode", "processor_a", {
    "code": "result = {'sum': sum(data)}"
})

builder.add_node("EmbeddedPythonNode", "processor_b", {
    "code": "result = {'avg': sum(data) / len(data)}"
})

builder.add_node("EmbeddedPythonNode", "processor_c", {
    "code": "result = {'max': max(data), 'min': min(data)}"
})

# Merge results
builder.add_node("MergeNode", "merge", {})

# Connections for parallel execution
builder.connect("source", "processor_a", "result", "data")
builder.connect("source", "processor_b", "result", "data")
builder.connect("source", "processor_c", "result", "data")

builder.connect("processor_a", "merge", "result", "sum_data")
builder.connect("processor_b", "merge", "result", "avg_data")
builder.connect("processor_c", "merge", "result", "stats_data")
```

### 4. Dynamic Workflow Composition

```python
import kailash

def create_processing_workflow(processors):
    """Create workflow with dynamic number of processors."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("EmbeddedPythonNode", "source", {
        "code": "result = input_data"
    })

    # Add processors dynamically
    for i, processor_config in enumerate(processors):
        node_id = f"processor_{i}"
        builder.add_node("EmbeddedPythonNode", node_id, processor_config)

        # Connect to previous node
        prev_id = "source" if i == 0 else f"processor_{i-1}"
        builder.connect(prev_id, node_id, "result", "input_data")

    return workflow
```

### 5. Advanced Error Handling

```python
import kailash

builder = kailash.WorkflowBuilder()

# Risky operation
builder.add_node("EmbeddedPythonNode", "risky_op", {
    "code": """
try:
    result = {'status': 'success', 'data': 1 / value}
except ZeroDivisionError:
    result = {'status': 'error', 'error': 'division_by_zero'}
except Exception as e:
    result = {'status': 'error', 'error': str(e)}
"""
})

# Route based on status — SwitchNode matches condition input against case keys
builder.add_node("SwitchNode", "error_router", {
    "cases": {"success": "success_handler", "error": "error_handler"},
    "default_branch": "error_handler"
})
# Connect the status field as the condition input
builder.connect("risky_op", "result.status", "error_router", "condition")
# SwitchNode outputs: "matched" (branch name) and "data" (forwarded)

# Separate handlers
builder.add_node("EmbeddedPythonNode", "success_handler", {
    "code": "result = {'final': data['data']}"
})

builder.add_node("EmbeddedPythonNode", "error_handler", {
    "code": "result = {'final': None, 'error': data['error']}"
})
```

### 6. Workflow Reusability

```python
import kailash

class WorkflowTemplates:
    """Reusable workflow templates."""

    @staticmethod
    def create_etl_pipeline(extract_config, transform_config, load_config):
        builder = kailash.WorkflowBuilder()

        builder.add_node("EmbeddedPythonNode", "extract", extract_config)
        builder.add_node("EmbeddedPythonNode", "transform", transform_config)
        builder.add_node("EmbeddedPythonNode", "load", load_config)

        builder.connect("extract", "transform", "result", "data")
        builder.connect("transform", "load", "result", "data")

        return workflow

    @staticmethod
    def create_validation_pipeline(validators):
        builder = kailash.WorkflowBuilder()

        for i, validator in enumerate(validators):
            builder.add_node("EmbeddedPythonNode", f"validator_{i}", validator)

        return workflow
```

### 7. Performance Optimization

**Batch Processing**:

```python
builder.add_node("EmbeddedPythonNode", "batch_processor", {
    "code": """
# Process in batches for efficiency
batch_size = 100
results = []
for i in range(0, len(data), batch_size):
    batch = data[i:i+batch_size]
    results.extend([process_item(item) for item in batch])
result = {'processed': results}
"""
})
```

**Caching**:

```python
builder.add_node("EmbeddedPythonNode", "cached_operation", {
    "code": """
# Use caching for expensive operations
cache = globals().get('operation_cache', {})
key = str(input_data)

if key in cache:
    result = cache[key]
else:
    result = expensive_operation(input_data)
    cache[key] = result
    globals()['operation_cache'] = cache
"""
})
```

### 8. Resource Management

```python
builder.add_node("EmbeddedPythonNode", "resource_handler", {
    "code": """
# Proper resource management
try:
    resource = acquire_resource()
    result = use_resource(resource)
finally:
    release_resource(resource)
"""
})
```

## When to Engage

- User asks about "advanced SDK", "advanced features", "complex patterns"
- User needs cyclic workflows or loops
- User wants to optimize performance
- User needs dynamic workflow composition

## Teaching Approach

1. **Assess Complexity**: Ensure user understands fundamentals first
2. **Explain Trade-offs**: Advanced features add complexity
3. **Provide Examples**: Show production-ready implementations
4. **Discuss Alternatives**: Sometimes simple is better
5. **Performance Impact**: Explain optimization considerations

## Integration with Other Skills

- Route to **sdk-fundamentals** if basics unclear
- Route to **workflow-pattern-cyclic** (in `09-workflow-patterns`) for detailed loop patterns
- Route to **production-deployment-guide** for scaling
- Route to **testing-best-practices** for testing complex workflows
