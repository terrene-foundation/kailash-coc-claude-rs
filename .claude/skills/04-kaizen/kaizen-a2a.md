---
name: kaizen-a2a
description: "Agent-to-Agent (A2A) communication protocol for Kaizen. Use when asking about A2A messaging, AgentCard, AgentRegistry, message bus, inter-agent messaging, capability-based discovery, or agent delegation via messages."
---

# Kaizen A2A: Agent-to-Agent Communication Protocol

The A2A protocol provides agent discovery, registration, and inter-agent messaging for multi-agent coordination beyond the orchestration runtime. This supplements the [kaizen-a2a-protocol](kaizen-a2a-protocol.md) skill which covers AgentCard and AgentRegistry basics.

## Components

| Type                 | Purpose                                                  |
| -------------------- | -------------------------------------------------------- |
| `AgentCard`          | Describes an agent's identity, capabilities, and schemas |
| `AgentRegistry`      | Discovers agents by capability (thread-safe)             |
| `A2AMessage`         | Message exchanged between agents                         |
| `MessageType`        | Enum: TaskRequest, TaskResponse, StatusUpdate, etc.      |
| `InMemoryMessageBus` | In-memory queue-based message bus                        |
| `A2AProtocol`        | High-level protocol combining discovery + messaging      |

## AgentCard: Describing Agent Capabilities

```python
from kailash.kaizen import AgentCard

# Create an agent card (auto-generates UUID)
card = AgentCard("researcher", "Researches topics using web search")
card = card.with_capability("text-generation")
card = card.with_capability("research")
card = card.with_capability("web-search")

# Each card has a unique UUID
print(card.id)            # Auto-generated UUID
print(card.name)          # "researcher"
print(card.description)   # "Researches topics using web search"
print(card.capabilities)  # ["text-generation", "research", "web-search"]

# Check capabilities
assert card.has_capability("research")
assert not card.has_capability("code-review")
```

## AgentRegistry: Capability-Based Discovery

```python
from kailash.kaizen import AgentRegistry, AgentCard

registry = AgentRegistry()

# Register agents
researcher_card = AgentCard("researcher", "Researches topics")
researcher_card = researcher_card.with_capability("research")
researcher_card = researcher_card.with_capability("text-generation")
researcher_id = registry.register(researcher_card)

coder_card = AgentCard("coder", "Writes code")
coder_card = coder_card.with_capability("code-generation")
coder_card = coder_card.with_capability("code-review")
coder_id = registry.register(coder_card)

reviewer_card = AgentCard("reviewer", "Reviews code")
reviewer_card = reviewer_card.with_capability("code-review")
reviewer_id = registry.register(reviewer_card)

# Discover agents by capability
code_reviewers = registry.discover("code-review")
assert len(code_reviewers) == 2  # coder + reviewer

researchers = registry.discover("research")
assert len(researchers) == 1

# No matches
empty = registry.discover("data-analysis")
assert len(empty) == 0

# Fetch a specific agent by UUID (returned from register())
card = registry.get(researcher_id)
assert card is not None

# List all registered agents
all_agents = registry.list_all()
assert len(all_agents) == 3

# Unregister an agent by UUID
registry.deregister(coder_id)
```

## Messaging Pattern

The A2A protocol enables discover-and-delegate semantics for inter-agent communication:

```python
from kailash.kaizen import AgentCard, AgentRegistry

# Step 1: Register agents in a shared registry
registry = AgentRegistry()

analyzer_card = AgentCard("analyzer", "Analyzes data")
analyzer_card = analyzer_card.with_capability("analysis")
analyzer_id = registry.register(analyzer_card)

# Step 2: Discover agents by capability
matches = registry.discover("analysis")
if matches:
    target = matches[0]
    print(f"Found agent: {target.name} with capabilities: {target.capabilities}")

# Step 3: Use discovered agent info to route tasks
# (Actual message transport depends on your application architecture)
```

## TrustLevel and TrustPosture

```python
from kailash.kaizen import TrustLevel, TrustPosture

# TrustLevel values: untrusted, restricted, supervised, autonomous, full
# TrustPosture properties: level, capabilities, allow_network, allow_filesystem,
#   allow_code_execution, allow_delegation, max_tool_calls, max_llm_calls
```

## Integration with SupervisorAgent

Combine A2A discovery with supervised execution:

```python
from kailash.kaizen import WorkerAgent, SupervisorAgent
from kailash.kaizen import AgentCard, AgentRegistry

# Register capabilities via AgentCard
registry = AgentRegistry()

card = AgentCard("coder", "Writes code")
card = card.with_capability("python")
card = card.with_capability("rust")
coder_id = registry.register(card)

# Create corresponding WorkerAgent for execution
def code_fn(input_text: str) -> str:
    return f"Code: {input_text}"

worker = WorkerAgent("coder", code_fn, capabilities=["python", "rust"])

# Supervisor delegates based on capabilities
supervisor = SupervisorAgent("lead", routing="capability")
supervisor.add_worker(worker)

result = supervisor.run("Write Python code")
```

## Key Points

- **AgentCard**: Identity + capabilities. Auto-generated UUID.
- **AgentRegistry**: Thread-safe discovery by capability string.
- **`discover(capability)`**: Returns list of matching AgentCards.
- **`has_capability(name)`**: Check if an agent card has a capability.
- **See also**: [kaizen-a2a-protocol](kaizen-a2a-protocol.md) for the basic AgentCard/AgentRegistry reference.

<!-- Trigger Keywords: A2A, agent-to-agent, AgentCard, AgentRegistry, inter-agent, capability discovery, agent communication, delegation, message bus -->
