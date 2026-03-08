---
name: kaizen-quickstart
description: "First AI agent in 5 minutes with Kaizen. Use when asking 'kaizen quickstart', 'kaizen getting started', 'first agent', or 'agent hello world'."
---

# Kaizen Quickstart

First AI agent in 5 minutes with Kaizen.

## Usage

`/kaizen-quickstart` -- Fastest path to a working AI agent

## Prerequisites: .env Setup

All model names and API keys MUST come from `.env` or environment variables. Never hardcode them.

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# Model names (choose one as default)
DEFAULT_LLM_MODEL=gpt-4o
```

## Minimal Agent (BaseAgent Subclass)

```python
import os
from kailash.kaizen import BaseAgent, LlmClient

class MyAgent(BaseAgent):
    name = "my-agent"
    model = None  # Uses DEFAULT_LLM_MODEL from env

    def execute(self, input_text: str) -> dict:
        return {"response": f"Processed: {input_text}"}

agent = MyAgent()
agent.llm = LlmClient()  # Auto-detects API keys from env

result = agent.run("What is 2 + 2?")
print(result)
```

## Minimal Agent (Rust-Backed Agent)

```python
import os
from kailash import Agent, AgentConfig, LlmClient

config = AgentConfig(
    model=os.environ.get("DEFAULT_LLM_MODEL"),
    system_prompt="You are a helpful assistant.",
    max_iterations=10,
)

agent = Agent(config, llm_client=LlmClient())
result = agent.run("What is 2 + 2?")
# result is a dict: {"response": "...", "total_tokens": N, ...}
```

## LlmClient

```python
from kailash.kaizen import LlmClient

# Production: auto-detect from env (no args)
client = LlmClient()

# Testing: deterministic mock
client = LlmClient.mock(responses=["Test response"])
assert client.is_mock
```

**IMPORTANT**: `LlmClient()` with no args auto-detects API keys from environment. Do NOT pass `"openai"` or any provider string.

## Agent with Tools

```python
from kailash.kaizen import BaseAgent, ToolRegistry, ToolDef, ToolParam, LlmClient

def search_impl(args):
    return {"results": f"Results for: {args['query']}"}

tools = ToolRegistry()
tools.register(ToolDef(
    name="search_web",
    description="Search the web for information",
    handler=search_impl,
    params=[ToolParam(name="query", required=True)],
))

class SearchAgent(BaseAgent):
    name = "search-agent"

    def execute(self, input_text: str) -> dict:
        tool = self.tools.get("search_web")
        if tool:
            result = tool.call({"query": input_text})
            return {"response": str(result)}
        return {"response": "No search tool available"}

agent = SearchAgent()
agent.llm = LlmClient.mock()
agent.tools = tools

result = agent.run("What is the latest news about Rust?")
```

## Memory

```python
from kailash.kaizen import BaseAgent, SessionMemory, LlmClient

class MemoryAgent(BaseAgent):
    name = "memory-agent"

    def execute(self, input_text: str) -> dict:
        self.memory.store("last_input", input_text)
        previous = self.memory.recall("previous")
        return {"response": f"Got: {input_text}, Previous: {previous}"}

agent = MemoryAgent()
agent.memory = SessionMemory()
agent.llm = LlmClient.mock()

agent.run("Hello")
agent.run("World")
```

**IMPORTANT**: Memory uses `store()`/`recall()`/`remove()` -- NOT set/get/delete.

## Multi-Agent Orchestration

```python
from kailash import WorkerAgent, SupervisorAgent

def research(input_text: str) -> str:
    return f"Research: {input_text}"

def write(input_text: str) -> str:
    return f"Article: {input_text}"

researcher = WorkerAgent("researcher", research, capabilities=["research"])
writer = WorkerAgent("writer", write, capabilities=["writing"])

supervisor = SupervisorAgent("editor", routing="capability")
supervisor.add_worker(researcher)
supervisor.add_worker(writer)

result = supervisor.run("Research and write about AI safety")
```

## Cost Tracking

```python
import os
from kailash.kaizen import CostTracker

tracker = CostTracker(budget_limit=1.00)  # $1.00 budget

# Record LLM usage
tracker.record(os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"), 100, 50)

print(f"Cost: ${tracker.total_cost():.6f}")
print(f"Tokens: {tracker.total_tokens()}")
print(f"Over budget: {tracker.is_over_budget()}")
```

## Key API Summary

| Component         | Import                                             | Key Methods                                 |
| ----------------- | -------------------------------------------------- | ------------------------------------------- |
| `BaseAgent`       | `from kailash.kaizen import BaseAgent`             | Override `execute()`, use `run()`           |
| `LlmClient`       | `from kailash.kaizen import LlmClient`             | `LlmClient()`, `LlmClient.mock()`           |
| `ToolRegistry`    | `from kailash.kaizen import ToolRegistry, ToolDef` | `register()`, `get()`, `list_tools()`       |
| `SessionMemory`   | `from kailash.kaizen import SessionMemory`         | `store()`, `recall()`, `remove()`, `keys()` |
| `SharedMemory`    | `from kailash.kaizen import SharedMemory`          | Same as SessionMemory                       |
| `CostTracker`     | `from kailash.kaizen import CostTracker`           | `record()`, `total_cost()`, `reset()`       |
| `HookManager`     | `from kailash.kaizen import HookManager`           | `on()` decorator, `trigger()`, 9 events     |
| `AgentCheckpoint` | `from kailash import AgentCheckpoint`              | Save/restore agent state                    |
| `WorkerAgent`     | `from kailash import WorkerAgent`                  | `run()`, `accept_task()`, `status`          |
| `SupervisorAgent` | `from kailash import SupervisorAgent`              | `add_worker()`, `run()`                     |

<!-- Trigger Keywords: kaizen quickstart, getting started, first agent, hello world, agent basics -->
