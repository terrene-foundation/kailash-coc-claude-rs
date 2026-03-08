# Add Node Skill

Scaffold a new node for the Kailash workflow engine using the Python SDK.

## Usage

`/add-node <NodeName>` -- Create and register a new custom node

Example: `/add-node SentimentAnalyzerNode`

## Steps

1. Define the node as a Python callback function with clear inputs and outputs.

2. Register the callback on a `NodeRegistry` using `register_callback()`.

3. Use the registered node in a workflow via `WorkflowBuilder.add_node()`.

4. Write tests covering:
   - Each operation/mode
   - Missing required inputs
   - Invalid input types
   - Edge cases

## Template

### Custom Node via register_callback

```python
from kailash import NodeRegistry, WorkflowBuilder, Runtime

# 1. Create the registry (139+ built-in nodes auto-registered)
registry = NodeRegistry()

# 2. Define your custom node as a callback
def my_transform(inputs: dict) -> dict:
    """Custom node that processes data."""
    data = inputs.get("data", "")
    operation = inputs.get("operation", "uppercase")

    if operation == "uppercase":
        result = str(data).upper()
    elif operation == "lowercase":
        result = str(data).lower()
    elif operation == "reverse":
        result = str(data)[::-1]
    else:
        result = str(data)

    return {"result": result, "length": len(result)}

# 3. Register the callback with typed inputs/outputs
registry.register_callback(
    name="MyTransformNode",
    callback=my_transform,
    inputs=["data", "operation"],
    outputs=["result", "length"],
)

# 4. Use in a workflow
builder = WorkflowBuilder()
builder.add_node("MyTransformNode", "transform", {
    "operation": "uppercase",
})

workflow = builder.build(registry)
runtime = Runtime(registry)

result = runtime.execute(workflow, {"data": "hello world"})
print(result["results"]["transform"]["result"])  # "HELLO WORLD"
print(result["results"]["transform"]["length"])  # 11
```

### Chaining Custom Nodes

```python
from kailash import NodeRegistry, WorkflowBuilder, Runtime

registry = NodeRegistry()

def validator(inputs: dict) -> dict:
    data = inputs.get("data", "")
    if not data:
        return {"valid": False, "error": "Empty input", "data": data}
    return {"valid": True, "error": None, "data": data}

def processor(inputs: dict) -> dict:
    data = inputs.get("data", "")
    return {"result": data.strip().upper()}

registry.register_callback(
    "ValidatorNode", validator,
    inputs=["data"], outputs=["valid", "error", "data"],
)
registry.register_callback(
    "ProcessorNode", processor,
    inputs=["data"], outputs=["result"],
)

builder = WorkflowBuilder()
builder.add_node("ValidatorNode", "validate")
builder.add_node("ProcessorNode", "process")
builder.connect("validate", "data", "process", "data")

workflow = builder.build(registry)
runtime = Runtime(registry)
result = runtime.execute(workflow, {"data": "  hello  "})
print(result["results"]["process"]["result"])  # "HELLO"
```

## Verify

```bash
python -c "
from kailash import NodeRegistry, WorkflowBuilder, Runtime

registry = NodeRegistry()

def echo(inputs):
    return {'result': inputs.get('data', '')}

registry.register_callback('EchoNode', echo, inputs=['data'], outputs=['result'])

builder = WorkflowBuilder()
builder.add_node('EchoNode', 'e1')
workflow = builder.build(registry)
runtime = Runtime(registry)
result = runtime.execute(workflow, {'data': 'test'})
assert result['results']['e1']['result'] == 'test'
print('OK')
"
```
