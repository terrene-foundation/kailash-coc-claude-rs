---
name: a2a-coordination
description: "Multi-agent coordination using A2A protocol for distributed AI systems. Use when asking 'A2A', 'agent coordination', 'multi-agent', 'agent-to-agent', 'distributed agents', 'A2A protocol', or 'agent collaboration'."
---

# Agent-to-Agent (A2A) Coordination Cheatsheet

Quick reference for A2A protocol types: AgentCard, AgentRegistry, InMemoryMessageBus, A2AProtocol.

## AgentCard

```python
from kailash.kaizen import AgentCard

# Create (auto-generates UUID)
card = AgentCard("researcher", "Researches topics")
card = card.with_capability("research")       # Returns new card (builder pattern)
card = card.with_capability("text-generation")

# Properties
card.id              # Auto-generated UUID string
card.name            # "researcher"
card.description     # "Researches topics"
card.capabilities    # ["research", "text-generation"]

# Check capability
card.has_capability("research")  # True
```

## AgentRegistry

```python
from kailash.kaizen import AgentRegistry, AgentCard

registry = AgentRegistry()

# Register — returns UUID string
card = AgentCard("coder", "Writes code")
card = card.with_capability("python")
agent_id = registry.register(card)   # Returns UUID

# Discover by capability — returns list of AgentCards
matches = registry.discover("python")

# Get by UUID (NOT by name)
found = registry.get(agent_id)

# List all
all_cards = registry.list_all()

# Deregister by UUID
registry.deregister(agent_id)  # Returns bool

# Length
len(registry)  # Number of registered agents
```

## InMemoryMessageBus

```python
from kailash.kaizen import InMemoryMessageBus

bus = InMemoryMessageBus()

# Send a task request (from_agent_id, to_agent_id, payload_dict)
bus.send("sender-uuid", "receiver-uuid", {"task": "compute"})

# Receive and drain pending messages — returns list of dicts
messages = bus.receive("receiver-uuid")
# Each message dict has: id, from_agent, to_agent, payload, timestamp

# Peek at pending count without draining
count = bus.peek("receiver-uuid")
```

## A2AProtocol

```python
from kailash.kaizen import AgentCard, AgentRegistry, InMemoryMessageBus, A2AProtocol

registry = AgentRegistry()
bus = InMemoryMessageBus()
protocol = A2AProtocol(registry, bus)

# Register agents
card = AgentCard("worker", "Computes things")
card = card.with_capability("compute")
worker_id = registry.register(card)

# Discover via protocol
matches = protocol.discover("compute")

# Discover + delegate (sends message to first matching agent)
result = protocol.delegate("compute", {"data": [1, 2, 3]}, "requester-uuid")
# Returns message dict: id, from_agent, to_agent, payload, timestamp
```

## Coordination Pattern

```python
from kailash.kaizen import AgentCard, AgentRegistry, InMemoryMessageBus, A2AProtocol

# 1. Set up infrastructure
registry = AgentRegistry()
bus = InMemoryMessageBus()
protocol = A2AProtocol(registry, bus)

# 2. Register agents with capabilities
researcher = AgentCard("researcher", "Finds information")
researcher = researcher.with_capability("research")
researcher_id = registry.register(researcher)

writer = AgentCard("writer", "Writes content")
writer = writer.with_capability("writing")
writer_id = registry.register(writer)

# 3. Discover and delegate
result = protocol.delegate("research", {"topic": "AI safety"}, writer_id)

# 4. Receiver picks up messages
messages = bus.receive(researcher_id)
for msg in messages:
    print(f"Task from {msg['from_agent']}: {msg['payload']}")
```

<!-- Trigger Keywords: A2A, agent coordination, multi-agent, agent-to-agent, distributed agents, A2A protocol, agent collaboration -->
