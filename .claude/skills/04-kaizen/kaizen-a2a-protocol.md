# Google A2A Protocol

Agent identity cards and registry for agent-to-agent communication.

## AgentCard

```python
from kailash.kaizen import AgentCard

card = AgentCard("DataAnalyst", "Analyzes data and produces insights")

print(card.name)            # "DataAnalyst"
print(card.description)     # "Analyzes data and produces insights"
print(card.id)              # Auto-generated UUID
print(card.capabilities)    # [] (empty by default)
```

### Adding Capabilities

```python
card.with_capability("data_analysis")
card.with_capability("visualization")
print(card.has_capability("data_analysis"))  # True
```

### Properties

| Property       | Type | Description                |
| -------------- | ---- | -------------------------- |
| `id`           | str  | Auto-generated UUID        |
| `name`         | str  | Agent name                 |
| `description`  | str  | Agent description          |
| `capabilities` | list | List of capability strings |

### Methods

| Method                      | Description                        |
| --------------------------- | ---------------------------------- |
| `with_capability(name)`     | Add a capability                   |
| `has_capability(name)`      | Check if capability exists -> bool |

## AgentRegistry

```python
from kailash.kaizen import AgentRegistry, AgentCard

registry = AgentRegistry()

card = AgentCard("DataAnalyst", "Analyzes data")
registry.register(card)

# Lookup
agent = registry.get("DataAnalyst")

# List all
all_agents = registry.list_all()

# Discover by capability
matches = registry.discover("data_analysis")

# Remove
registry.deregister("DataAnalyst")
```

## TrustLevel & TrustPosture

```python
from kailash.kaizen import TrustLevel, TrustPosture
```

TrustLevel values: `untrusted`, `restricted`, `supervised`, `autonomous`, `full`

TrustPosture properties: `level`, `capabilities`, `allow_network`, `allow_filesystem`, `allow_code_execution`, `allow_delegation`, `max_tool_calls`, `max_llm_calls`

> **Known Issue**: `BaseAgent` does NOT have a `to_a2a_card()` method. Create AgentCard instances directly.

> **Known Issue**: The semantic matching pattern (`supervisor.select_worker_for_task()`) shown in older docs is conceptual and not implemented.

## References
- **Specialist**: `.claude/agents/frameworks/kaizen-specialist.md`
