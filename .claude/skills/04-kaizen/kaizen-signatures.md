# Kaizen Signatures

Define agent input/output contracts using `Signature`, `InputField`, and `OutputField`.

## API

```python
from kailash.kaizen import Signature, InputField, OutputField

# Define a signature
sig = Signature(
    name="research",
    description="Research a topic and provide findings",
    inputs=[
        InputField(name="topic", description="Topic to research", required=True),
        InputField(name="depth", description="Research depth", required=False),
    ],
    outputs=[
        OutputField(name="findings", description="Research findings"),
        OutputField(name="sources", description="List of sources"),
    ],
)

# Access properties
print(sig.name)           # "research"
print(sig.description)    # "Research a topic and provide findings"
print(sig.inputs)         # list of InputField
print(sig.outputs)        # list of OutputField

# InputField properties
for field in sig.inputs:
    print(field.name)        # str
    print(field.description) # str
    print(field.required)    # bool

# OutputField properties
for field in sig.outputs:
    print(field.name)        # str
    print(field.description) # str
```

## Using Signatures with Agents

```python
from kailash.kaizen import BaseAgent, Signature, InputField, OutputField

class ResearchAgent(BaseAgent):
    signature = Signature(
        name="research",
        description="Research agent",
        inputs=[
            InputField(name="topic", description="Topic", required=True),
        ],
        outputs=[
            OutputField(name="findings", description="Findings"),
        ],
    )

    async def run(self, input_text: str) -> dict:
        # Process the input according to the signature contract
        return {
            "response": f"Research findings for: {input_text}",
            "findings": f"Detailed findings about {input_text}",
        }
```

## Signature Validation

Signatures provide runtime validation of agent inputs and outputs:

```python
# Validate that required inputs are present
sig.validate_inputs({"topic": "AI safety"})  # OK
sig.validate_inputs({})  # raises ValueError: missing required input 'topic'

# Check if an input is expected
sig.has_input("topic")    # True
sig.has_input("unknown")  # False

# Check outputs
sig.has_output("findings")  # True
```

## Common Patterns

### Chain of Thought Signature

```python
cot_sig = Signature(
    name="chain_of_thought",
    description="Step-by-step reasoning",
    inputs=[
        InputField(name="question", description="Question to reason about", required=True),
    ],
    outputs=[
        OutputField(name="reasoning", description="Step-by-step reasoning"),
        OutputField(name="answer", description="Final answer"),
    ],
)
```

### Multi-Output Signature

```python
analysis_sig = Signature(
    name="analysis",
    description="Analyze data and provide insights",
    inputs=[
        InputField(name="data", description="Data to analyze", required=True),
        InputField(name="format", description="Output format", required=False),
    ],
    outputs=[
        OutputField(name="summary", description="Summary of analysis"),
        OutputField(name="insights", description="Key insights"),
        OutputField(name="recommendations", description="Action recommendations"),
    ],
)
```

<!-- Trigger Keywords: signature, Signature, InputField, OutputField, agent contract, structured input, structured output -->
