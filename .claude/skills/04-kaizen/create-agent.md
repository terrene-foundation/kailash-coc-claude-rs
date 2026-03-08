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
   - `ToolRegistry` with at least one sample tool
   - Memory configuration (`SessionMemory` or `SharedMemory`)
   - Example execution code
4. Write tests using `LlmClient.mock()` for deterministic responses.
5. If multi-agent coordination is needed, use `SupervisorAgent` + `WorkerAgent` or `MultiAgentOrchestrator`.

## Template

### Single Agent (BaseAgent Subclass)

```python
import os
from kailash.kaizen import BaseAgent, LlmClient, SessionMemory
from kailash.kaizen import ToolRegistry, ToolDef, ToolParam

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
        # Use self.llm to make LLM calls
        # Use self.memory to store/recall data
        # Use self.tools to access registered tools
        return {"response": f"Processed: {input_text}"}


def create_{agent_name_snake}():
    """Create and configure the {AgentName}."""

    # LlmClient() auto-detects API keys from env
    # Use LlmClient.mock() for testing
    llm = LlmClient()

    # Build tool registry
    tools = ToolRegistry()
    tools.register(ToolDef(
        name="search",
        description="Search for information on a topic",
        handler=lambda args: {"results": f"Results for: {args['query']}"},
        params=[ToolParam(name="query", required=True)],
    ))

    # Create the agent
    agent = {AgentName}()
    agent.llm = llm
    agent.tools = tools
    agent.memory = SessionMemory()

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
from kailash.kaizen import BaseAgent, ToolRegistry, ToolDef, ToolParam

class ToolAgent(BaseAgent):
    name = "tool-agent"

    def execute(self, input_text: str) -> dict:
        # Access tools via self.tools
        tool = self.tools.get("calculator")
        if tool:
            result = tool.call({"a": 10, "b": 5, "op": "add"})
            return {"response": f"Result: {result}"}
        return {"response": "No calculator tool found"}


tools = ToolRegistry()
tools.register(ToolDef(
    name="calculator",
    description="Performs basic arithmetic",
    handler=lambda args: args["a"] + args["b"],
    params=[
        ToolParam(name="a", param_type="integer", required=True),
        ToolParam(name="b", param_type="integer", required=True),
        ToolParam(name="op", param_type="string", required=True),
    ],
))

agent = ToolAgent()
agent.tools = tools
result = agent.run("Calculate 10 + 5")
```

### Test Template

```python
import pytest
from kailash.kaizen import LlmClient

def test_{agent_name_snake}_responds():
    """Test that the agent produces a valid response."""
    # Use LlmClient.mock() for deterministic testing
    llm = LlmClient.mock(responses=["Test response"])

    agent = {AgentName}()
    agent.llm = llm

    result = agent.run("Hello")
    assert "response" in result


def test_{agent_name_snake}_with_tools():
    """Test that the agent uses tools correctly."""
    llm = LlmClient.mock(responses=["Use the calculator"])

    agent = create_{agent_name_snake}()
    agent.llm = llm

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

<!-- Trigger Keywords: create agent, scaffold agent, new agent, agent template, agent boilerplate -->
