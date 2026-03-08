# Chain of Thought Pattern

CoT pattern with step-by-step reasoning.

## Signature

```python
from kailash.kaizen import Signature, InputField, OutputField

class ChainOfThoughtSignature(Signature):
    question = InputField("Question to reason about")
    thoughts = OutputField("Step-by-step reasoning as JSON list")
    final_answer = OutputField("Final answer")
```

## Agent

```python
import json
from kailash.kaizen import BaseAgent

class CoTAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="cot-agent", model=os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"))

    def execute(self, input_data):
        # Implement your own LLM call here
        # Use your LLM client to generate structured reasoning
        return {
            "response": str(input_data),
            "thoughts": ["step1", "step2"],
            "final_answer": "result"
        }

# Usage with convenience methods (P17-002):
# agent = CoTAgent()
# result = agent.run("Why is the sky blue?")
# answer = agent.extract_str(result)
```

> **Note**: `BaseAgent` provides `run()`, `extract_str()`, `extract_dict()`, and `write_to_memory()` convenience methods (P17-002). Override `execute()` with your custom logic.

## References

- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
- **Pattern**: Chain-of-thought single-agent example (structured reasoning with step extraction)
