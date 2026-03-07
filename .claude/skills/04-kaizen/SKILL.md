# Kaizen Skills

AI agent framework for building intelligent agents with kailash-enterprise.

## Quick Links

| Skill | Description |
|-------|-------------|
| [kaizen-agent-patterns](kaizen-agent-patterns.md) | Advanced reasoning patterns (CoT, ReAct, RAG) |
| [kaizen-chain-of-thought](kaizen-chain-of-thought.md) | Chain-of-thought agent implementation |
| [kaizen-react-pattern](kaizen-react-pattern.md) | ReAct (Reasoning + Acting) agent pattern |
| [kaizen-rag-agent](kaizen-rag-agent.md) | RAG agent implementation |
| [kaizen-cost-tracking](kaizen-cost-tracking.md) | LLM cost tracking and budget management |
| [kaizen-streaming](kaizen-streaming.md) | Streaming agent responses |
| [kaizen-a2a-protocol](kaizen-a2a-protocol.md) | Agent-to-Agent protocol |

## Core API

```python
from kailash.kaizen import BaseAgent, HookManager, Signature
from kailash.kaizen import InputField, OutputField
from kailash.kaizen.agents import ReActAgent, RAGAgent, ToolCallingAgent
from kailash.kaizen.agents import ConversationalAgent, PlanningAgent, ResearchAgent, CodeAgent
from kailash.kaizen.pipelines import SequentialPipeline, ParallelPipeline
from kailash.kaizen.pipelines import RouterPipeline, MapReducePipeline, ChainPipeline
from kailash.kaizen import InterruptManager, ControlProtocol
```

## Specialist

For complex queries beyond these skills, use the **kaizen-specialist** agent.
