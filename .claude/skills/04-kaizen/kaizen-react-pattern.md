# ReAct Pattern

Reasoning + Acting pattern for tool use.

## Concept

ReAct combines:
- **Reasoning**: Think about what to do
- **Acting**: Take action (call tools)
- **Observation**: Observe results

## Implementation

```python
from kailash.kaizen import Signature, InputField, OutputField

# Signature is SUBCLASSED, not instantiated
class ReActSignature(Signature):
    task = InputField(description="Task to accomplish")
    thought = OutputField(description="Reasoning about next action")
    action = OutputField(description="Action to take")
    observation = OutputField(description="Action result")
```

## References
- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Pattern**: ReAct single-agent example (reasoning + acting with tool use)
