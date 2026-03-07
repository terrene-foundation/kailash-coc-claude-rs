# ReAct Pattern

Reasoning + Acting pattern for tool use.

## Concept

ReAct combines:
- **Reasoning**: Think about what to do
- **Acting**: Take action (call tools)
- **Observation**: Observe results

## Implementation

```python
class ReActSignature(Signature):
    task: str = InputField(description="Task to accomplish")
    thought: str = OutputField(description="Reasoning about next action")
    action: str = OutputField(description="Action to take")
    observation: str = OutputField(description="Action result")
```

## References
- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Pattern**: ReAct single-agent example (reasoning + acting with tool use)
