---
skill: kaizen-structured-output
description: "StructuredOutput for typed, validated agent responses. Use when asking about 'structured output', 'typed response', 'output validation', 'agent output schema', or 'structured agent response'."
priority: MEDIUM
tags: [kaizen, structured-output, typed-response, validation, agent-output]
---

# Kaizen Structured Output

Define typed, validated output schemas for agent responses.

## Quick Reference

- **StructuredOutput**: Define expected output structure for agent responses
- **Type Safety**: Validate agent output matches expected schema
- **Integration**: Works with BaseAgent and pipeline patterns

## Import

```python
from kailash.kaizen import StructuredOutput
```

## Basic Usage

```python
from kailash.kaizen import StructuredOutput

# Define a structured output schema
output = StructuredOutput(
    name="SentimentResult",
    fields={
        "sentiment": "string",      # "positive", "negative", "neutral"
        "confidence": "float",      # 0.0 to 1.0
        "keywords": "list",         # list of relevant keywords
    },
)
```

## With BaseAgent

```python
import os
from kailash.kaizen import BaseAgent, StructuredOutput

class SentimentAgent(BaseAgent):
    name = "sentiment-agent"
    model = None  # uses default from env

    def __init__(self):
        super().__init__(name=self.name, model=os.environ.get("LLM_MODEL"))
        self.output_schema = StructuredOutput(
            name="SentimentResult",
            fields={
                "sentiment": "string",
                "confidence": "float",
                "reasoning": "string",
            },
        )

    def execute(self, input_text: str) -> dict:
        # Agent implementation that returns structured output
        return {
            "sentiment": "positive",
            "confidence": 0.95,
            "reasoning": "The text contains positive language and upbeat tone.",
        }
```

## With Signatures

Combine `StructuredOutput` with `Signature` for full input/output contracts:

```python
from kailash.kaizen import Signature, InputField, OutputField, StructuredOutput

class AnalyzeText(Signature):
    text: InputField = InputField(description="Text to analyze")
    language: InputField = InputField(description="Language code", default="en")
    analysis: OutputField = OutputField(description="Analysis result")

# StructuredOutput for the analysis field
analysis_schema = StructuredOutput(
    name="TextAnalysis",
    fields={
        "topic": "string",
        "sentiment": "string",
        "entities": "list",
        "summary": "string",
    },
)
```

## Best Practices

1. **Define clear field types** -- Use "string", "float", "int", "list", "dict", "bool"
2. **Validate output** -- Check agent output against the schema
3. **Combine with Signatures** -- Use Signatures for input contracts, StructuredOutput for output
4. **Document fields** -- Name fields descriptively for clarity

## Related Skills

- [kaizen-signatures](kaizen-signatures.md) - Input/output contracts
- [kaizen-agent-patterns](kaizen-agent-patterns.md) - Agent building blocks
- [kaizen-multi-agent](kaizen-multi-agent.md) - Multi-agent coordination

<!-- Trigger Keywords: structured output, typed response, output validation, agent output schema, structured agent response, StructuredOutput -->
