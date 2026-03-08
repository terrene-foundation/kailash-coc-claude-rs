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

class ReActSignature(Signature):
    task = InputField("Task to accomplish")
    thought = OutputField("Reasoning about next action")
    action = OutputField("Action to take")
    observation = OutputField("Action result")
```

## References
- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Pattern**: ReAct single-agent example (reasoning + acting with tool use)
