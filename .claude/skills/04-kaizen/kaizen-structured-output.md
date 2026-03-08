---
name: kaizen-structured-output
description: "StructuredOutput and OutputSchema for validated LLM responses. Use when asking about 'structured output', 'output schema', 'output validation', 'LLM output parsing', or 'structured agent response'."
---

# Kaizen Structured Output

Parse and validate structured LLM output using JSON schemas.

## Quick Reference

- **OutputSchema**: Define a JSON schema for validating LLM output
- **StructuredOutput**: Parse and validate LLM responses against a schema
- **Automatic extraction**: Handles raw JSON, markdown code fences, and embedded JSON
- **Retry support**: Re-prompt LLM on parse/validation failure

## Import

```python
from kailash import OutputSchema, StructuredOutput
# Also available via: from kailash.kaizen import OutputSchema, StructuredOutput
```

## OutputSchema

Define expected output structure using JSON schema:

```python
from kailash import OutputSchema

# Create schema from a Python dict (JSON schema format)
schema = OutputSchema({
    "type": "object",
    "properties": {
        "sentiment": {"type": "string"},
        "confidence": {"type": "number"},
        "keywords": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["sentiment", "confidence"]
})

# Validate data against schema
schema.validate({"sentiment": "positive", "confidence": 0.95})  # Returns True

# Convert to dict
schema.to_dict()  # Returns the JSON schema as a Python dict

# Create from JSON string
schema2 = OutputSchema.from_json('{"type": "object", "properties": {"name": {"type": "string"}}}')
```

## StructuredOutput

Parse raw LLM text and validate against a schema:

````python
from kailash import StructuredOutput

# Create with a JSON schema dict or OutputSchema
so = StructuredOutput(
    {"type": "object", "properties": {"name": {"type": "string"}}, "required": ["name"]},
    max_retries=3  # Retry attempts on parse failure (default: 3)
)

# Parse raw LLM output -- extracts JSON automatically
result = so.parse('{"name": "Alice"}')
assert result == {"name": "Alice"}

# Handles markdown code fences
result = so.parse('```json\n{"name": "Bob"}\n```')
assert result == {"name": "Bob"}

# Handles embedded JSON in surrounding text
result = so.parse('The result is {"name": "Charlie"} as expected.')
assert result == {"name": "Charlie"}
````

## With OutputSchema

```python
from kailash import OutputSchema, StructuredOutput

# Define schema explicitly
schema = OutputSchema({
    "type": "object",
    "properties": {
        "topic": {"type": "string"},
        "sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]},
        "entities": {"type": "array", "items": {"type": "string"}},
        "summary": {"type": "string"},
    },
    "required": ["topic", "sentiment"]
})

# Use OutputSchema with StructuredOutput
so = StructuredOutput(schema)

# Parse and validate
result = so.parse('{"topic": "AI", "sentiment": "positive", "entities": ["GPT", "Claude"]}')
```

## With LLM Retry

Re-prompt the LLM when parse/validation fails:

```python
import os
from kailash import StructuredOutput, LlmClient

# LlmClient auto-detects provider from env (OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.)
# Use LlmClient.mock() for deterministic testing
client = LlmClient()

so = StructuredOutput(
    {"type": "object", "properties": {"answer": {"type": "string"}}, "required": ["answer"]},
    max_retries=3
)

# parse_with_retry: on failure, sends correction prompt to LLM
result = so.parse_with_retry(
    "The answer is forty-two",  # Raw LLM text (no JSON)
    llm_client=client,
    model=os.environ.get("LLM_MODEL", "mock-model")
)
# LLM is re-prompted with schema and error details until valid JSON is produced
```

## With BaseAgent

```python
import os
from kailash.kaizen import BaseAgent
from kailash import StructuredOutput

class SentimentAgent(BaseAgent):
    name = "sentiment-agent"

    def __init__(self):
        super().__init__(name=self.name, model=os.environ.get("LLM_MODEL"))
        self.parser = StructuredOutput({
            "type": "object",
            "properties": {
                "sentiment": {"type": "string"},
                "confidence": {"type": "number"},
                "reasoning": {"type": "string"},
            },
            "required": ["sentiment", "confidence"]
        })

    def analyze(self, text: str) -> dict:
        # Get raw LLM response
        raw = self.run(f"Analyze sentiment of: {text}")
        # Parse and validate
        return self.parser.parse(raw)
```

## Best Practices

1. **Use JSON schema format** -- `OutputSchema` takes standard JSON schema dicts
2. **Set `required` fields** -- ensure critical fields are always present
3. **Use `max_retries`** -- handle LLM output variability gracefully
4. **Combine with Signatures** -- use Signatures for input contracts, StructuredOutput for output parsing
5. **Validate early** -- parse LLM output immediately, not downstream

## Related Skills

- [kaizen-signatures](kaizen-signatures.md) - Input/output contracts
- [kaizen-agent-patterns](kaizen-agent-patterns.md) - Agent building blocks
- [kaizen-multi-agent](kaizen-multi-agent.md) - Multi-agent coordination

<!-- Trigger Keywords: structured output, output schema, output validation, LLM output parsing, structured agent response, StructuredOutput, OutputSchema -->
