---
name: create-agent
description: "Scaffold a Kaizen AI agent with LLM client, tools, memory, and hook template. Use when asking 'create agent', 'scaffold agent', 'new agent template', or 'agent boilerplate'."
---

# Create Agent Skill

Scaffold a Kaizen AI agent with LLM client, tools, memory, and lifecycle hooks.

## Usage

`/create-agent <AgentName>` -- Create a new Kaizen agent with the given name

Examples:

- `/create-agent ResearchAgent`
- `/create-agent CodeReviewAgent`

## Steps

1. Read the existing agent patterns from the Kaizen skills directory.
2. Create the agent module file at the appropriate location.
3. Implement the agent with:
   - `BaseAgent` subclass with class attributes
   - `LlmClient()` with no provider arg (auto-detects from env) or `LlmClient.mock()` for testing
   - Tools registered via `agent.register_tool()`
   - Memory configuration (`SessionMemory` or `SharedMemory`)
   - Example execution code
4. Write tests using `LlmClient.mock()` for deterministic responses.
5. If multi-agent coordination is needed, use `SupervisorAgent` + `WorkerAgent` or `MultiAgentOrchestrator`.

## Template

### Single Agent (BaseAgent Subclass)

```python
import os
from kailash.kaizen import BaseAgent, LlmClient, SessionMemory

class {AgentName}(BaseAgent):
    """A custom agent that {description}."""

    name = "{agent_name}"
    description = "{agent_description}"
    system_prompt = "You are a helpful {AgentName}. Respond concisely."
    model = None  # Reads DEFAULT_LLM_MODEL from env
    max_iterations = 10
    temperature = 0.7
    max_tokens = 4096

    def execute(self, input_text: str) -> dict:
        """Override execute() with your agent logic."""
        # Use self.memory to store/recall data
        # Tools are invoked by the TAOD loop, not directly
        return {"response": f"Processed: {input_text}"}


def create_{agent_name_snake}():
    """Create and configure the {AgentName}."""

    # LlmClient() auto-detects API keys from env
    # Use LlmClient.mock() for testing
    llm = LlmClient()

    # Create the agent
    agent = {AgentName}()
    agent.set_memory(SessionMemory())

    # Register tools via register_tool() (tool_registry is read-only)
    agent.register_tool(
        "search",
        lambda args: {"results": f"Results for: {args['query']}"},
        "Search for information on a topic",
        [{"name": "query", "param_type": "string", "required": True}],
    )

    return agent


if __name__ == "__main__":
    agent = create_{agent_name_snake}()

    # Single-shot execution
    result = agent.run("What is Kailash?")
    print(f"Response: {result}")
```

### Agent with Cost Tracking

```python
import os
from kailash.kaizen import BaseAgent, LlmClient, CostTracker

class TrackedAgent(BaseAgent):
    name = "tracked-agent"

    def execute(self, input_text: str) -> dict:
        return {"response": f"Processed: {input_text}"}


# Create cost tracker with optional budget
tracker = CostTracker(budget_limit=1.00)  # $1.00 budget

agent = TrackedAgent()
result = agent.run("Hello")

# Record LLM usage manually
tracker.record(os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"), 100, 50)

# Query cost report
print(f"Total cost: ${tracker.total_cost():.6f}")
print(f"Total tokens: {tracker.total_tokens()}")
print(f"Over budget: {tracker.is_over_budget()}")
print(f"Remaining: {tracker.remaining_budget()}")

# Reset tracking
tracker.reset()
```

### Agent with Lifecycle Hooks

```python
from kailash.kaizen import BaseAgent, HookManager

class HookedAgent(BaseAgent):
    name = "hooked-agent"

    def execute(self, input_text: str) -> dict:
        return {"response": f"Processed: {input_text}"}


hooks = HookManager()

@hooks.on("on_start")
def log_start(data):
    print(f"Agent started: {data}")

@hooks.on("on_error")
def handle_error(data):
    print(f"Error occurred: {data}")

@hooks.on("on_complete")
def on_done(data):
    print(f"Completed: {data}")

# Trigger hooks manually during agent execution
hooks.trigger("on_start", {"agent": "hooked-agent", "input": "hello"})
```

### Agent with Tools

```python
from kailash.kaizen import BaseAgent

class ToolAgent(BaseAgent):
    name = "tool-agent"

    def execute(self, input_text: str) -> dict:
        # Tools are invoked by the agent's TAOD loop, not directly.
        # Access tool_registry for inspection:
        tools = self.tool_registry.list_tools()
        return {"response": f"Processing with {len(tools)} tools available"}


agent = ToolAgent()

# Register tools via register_tool() (tool_registry is read-only)
agent.register_tool(
    "calculator",
    lambda args: args["a"] + args["b"],
    "Performs basic arithmetic",
    [
        {"name": "a", "param_type": "integer", "required": True},
        {"name": "b", "param_type": "integer", "required": True},
        {"name": "op", "param_type": "string"},
    ],
)

result = agent.run("Calculate 10 + 5")
```

### Test Template

```python
import pytest
from kailash.kaizen import LlmClient

def test_{agent_name_snake}_responds():
    """Test that the agent produces a valid response."""
    agent = {AgentName}()

    result = agent.run("Hello")
    assert "response" in result


def test_{agent_name_snake}_with_tools():
    """Test that the agent uses tools correctly."""
    agent = create_{agent_name_snake}()

    result = agent.run("What is 2 + 2?")
    assert result is not None


def test_mock_client_tracking():
    """Verify mock client tracks calls."""
    llm = LlmClient.mock(responses=["First", "Second"])

    assert llm.is_mock
    assert llm.call_count == 0

    # After usage, check tracking
    # llm.call_count, llm.last_prompt, llm.prompt_history
```

## Key API Notes

- **LlmClient()**: No args = auto-detect from env. NO `"openai"` string needed.
- **LlmClient.mock()**: Deterministic testing with FIFO responses.
- **BaseAgent**: Subclass and override `execute()`. Class attrs for config.
- **Memory**: `store()`/`recall()`/`remove()` -- NOT set/get/delete.
- **CostTracker**: `record(model, prompt_tokens, completion_tokens)`, `total_cost()`, `reset()`.
- **ToolDef**: Use `handler=` kwarg for the callable, not `callback=`.
- **tool_registry**: Read-only property. Use `agent.register_tool(name, func, desc, params)` to add tools.

<!-- Trigger Keywords: create agent, scaffold agent, new agent, agent template, agent boilerplate -->
