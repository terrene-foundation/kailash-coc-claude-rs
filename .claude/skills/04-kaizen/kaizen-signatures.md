---
name: kaizen-signatures
description: "Structured input/output contracts for Kaizen agents using Signature, InputField, and OutputField. Use when asking about 'Signature', 'InputField', 'OutputField', 'agent contract', 'structured input', or 'agent signature'."
---

# Kaizen Signatures

Define agent input/output contracts using `Signature`, `InputField`, and `OutputField`.

## API

Signature uses a **subclass** pattern. Field names come from class attribute names.

```python
from kailash.kaizen import Signature, InputField, OutputField

class Research(Signature):
    topic = InputField(description="Topic to research")
    depth = InputField(description="Research depth", default="medium")
    findings = OutputField(description="Research findings")
    sources = OutputField(description="List of sources")

# Class methods
input_fields = Research.input_fields()    # dict of input field names -> InputField
output_fields = Research.output_fields()  # dict of output field names -> OutputField

# Validation
Research.validate_inputs({"topic": "AI safety"})  # OK
Research.validate_inputs({})  # raises ValueError: missing required input 'topic'
```

**InputField kwargs**: `description` (str) and `default` (optional). NO `name`, `required`, or `type` kwargs -- the field name comes from the class attribute, and fields without `default` are required.

**OutputField kwargs**: `description` (str) only.

## Using Signatures with Agents

```python
from kailash.kaizen import BaseAgent, Signature, InputField, OutputField

class ResearchSignature(Signature):
    topic = InputField(description="Topic to research")
    findings = OutputField(description="Research findings")

class ResearchAgent(BaseAgent):
    signature = ResearchSignature

    async def run(self, input_text: str) -> dict:
        # Process the input according to the signature contract
        return {
            "response": f"Research findings for: {input_text}",
            "findings": f"Detailed findings about {input_text}",
        }
```

## Common Patterns

### Chain of Thought Signature

```python
from kailash.kaizen import Signature, InputField, OutputField

class ChainOfThought(Signature):
    question = InputField(description="Question to reason about")
    reasoning = OutputField(description="Step-by-step reasoning")
    answer = OutputField(description="Final answer")
```

### Multi-Output Signature

```python
class Analysis(Signature):
    data = InputField(description="Data to analyze")
    format = InputField(description="Output format", default="json")
    summary = OutputField(description="Summary of analysis")
    insights = OutputField(description="Key insights")
    recommendations = OutputField(description="Action recommendations")
```

### Accessing Field Metadata

```python
class MySignature(Signature):
    query = InputField(description="Search query")
    depth = InputField(description="Search depth", default="shallow")
    results = OutputField(description="Search results")

# input_fields() returns a dict: {"query": InputField(...), "depth": InputField(...)}
for name, field in MySignature.input_fields().items():
    print(f"{name}: {field.description}")

# output_fields() returns a dict: {"results": OutputField(...)}
for name, field in MySignature.output_fields().items():
    print(f"{name}: {field.description}")
```

<!-- Trigger Keywords: signature, Signature, InputField, OutputField, agent contract, structured input, structured output -->
