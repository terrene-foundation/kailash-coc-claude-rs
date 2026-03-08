---
name: kaizen-orchestration
description: "Multi-agent orchestration for Kaizen. Use when asking about OrchestrationRuntime, orchestration strategies (Sequential, Parallel, Hierarchical, Pipeline), AgentExecutor, RetryPolicy, or strategy-based multi-agent coordination."
---

# Kaizen Orchestration: Strategy-Based Multi-Agent Coordination

The `OrchestrationRuntime` provides strategy-based multi-agent coordination. This skill covers the runtime and strategies. For `WorkerAgent`, `SupervisorAgent`, and `MultiAgentOrchestrator`, see [kaizen-multi-agent](kaizen-multi-agent.md).

## OrchestrationRuntime

```python
from kailash import OrchestrationRuntime

runtime = OrchestrationRuntime()

# Set strategy before adding agents
runtime.set_strategy("sequential")
# Strategies: "sequential", "parallel", "hierarchical", "pipeline"

# Add agents (AgentConfig-based)
from kailash import AgentConfig
config = AgentConfig(system_prompt="You are a research expert.")
runtime.add_agent("researcher", config)

config2 = AgentConfig(system_prompt="You are a writer.")
runtime.add_agent("writer", config2)

# Run orchestration
result = runtime.run("Write about AI safety")

# Properties
print(runtime.strategy_name)   # "sequential"
runtime.max_iterations = 50
runtime.fail_fast = True
```

## Strategies

### Sequential

Agents run in insertion order. Each receives the previous agent's response as input.

```python
runtime = OrchestrationRuntime()
runtime.set_strategy("sequential")
runtime.add_agent("researcher", researcher_config)
runtime.add_agent("writer", writer_config)
runtime.add_agent("reviewer", reviewer_config)
# researcher(input) -> writer(researcher_output) -> reviewer(writer_output)
```

### Parallel

All agents run concurrently with the same input.

```python
runtime = OrchestrationRuntime()
runtime.set_strategy("parallel")
runtime.add_agent("analyst_a", config_a)
runtime.add_agent("analyst_b", config_b)
# Both receive the same input concurrently
```

### Hierarchical

A coordinator agent runs first. Sub-agents run with the coordinator's output.

```python
runtime = OrchestrationRuntime()
runtime.set_strategy("hierarchical", coordinator="coordinator")
runtime.add_agent("coordinator", coordinator_config)
runtime.add_agent("data_analyst", analyst_config)
runtime.add_agent("writer", writer_config)
# coordinator runs first, then sub-agents receive coordinator's output
```

### Pipeline

Explicit step ordering with configurable input routing (available via Rust Agent API).

## Using Pipelines (Python BaseAgent Pattern)

For Python `BaseAgent` subclasses, use the pipeline classes directly:

```python
from kailash.kaizen import BaseAgent
from kailash.kaizen.pipelines import SequentialPipeline, ParallelPipeline

class ResearchAgent(BaseAgent):
    name = "researcher"
    def execute(self, input_text: str) -> dict:
        return {"response": f"Research: {input_text}"}

class WriterAgent(BaseAgent):
    name = "writer"
    def execute(self, input_text: str) -> dict:
        return {"response": f"Article: {input_text}"}

# Sequential: output of agent N becomes input of agent N+1
pipeline = SequentialPipeline([ResearchAgent(), WriterAgent()])
result = pipeline.run("AI safety")

# Parallel: all agents receive the same input
pipeline = ParallelPipeline([ResearchAgent(), WriterAgent()])
result = pipeline.run("AI safety")
```

## AgentExecutor

Unified execution with retry, timeout, and observability.

```python
from kailash.kaizen import AgentExecutor, RetryPolicy, WorkerAgent

# Create retry policy
policy = RetryPolicy(
    max_retries=3,
    backoff="exponential",       # "fixed" | "exponential"
    base_delay_ms=100,
    max_delay_ms=5000,
)

# Create executor
executor = AgentExecutor(
    retry_policy=policy,
    agent_timeout_ms=30000,      # 30 second per-agent timeout
    global_timeout_ms=120000,    # 2 minute global timeout
)

# Execute a worker agent with retry and timeout
def code_fn(input_text: str) -> str:
    return f"coded: {input_text}"

worker = WorkerAgent("coder", code_fn, capabilities=["python"])
result = executor.execute_single(worker, "hello")
# result is a dict with "response", "total_tokens", etc.
```

## RetryPolicy

```python
from kailash.kaizen import RetryPolicy

# Exponential backoff (default)
policy = RetryPolicy(
    max_retries=3,            # Maximum retry attempts
    backoff="exponential",    # 100ms, 200ms, 400ms... capped at max_delay_ms
    base_delay_ms=100,        # Base delay
    max_delay_ms=5000,        # Cap for exponential backoff
)

# Fixed delay
policy = RetryPolicy(
    max_retries=5,
    backoff="fixed",          # Same delay every retry
    base_delay_ms=500,
)

# Properties
print(policy.max_retries)     # 3
```

## OrchestrationResult

**`OrchestrationRuntime.run()`** and **`MultiAgentOrchestrator.orchestrate()`** return DIFFERENT dicts:

```python
# OrchestrationRuntime.run() returns:
result = runtime.run("input")
# - "input"        -- The input string (str)
# - "strategy"     -- Strategy name: "sequential", "parallel", "hierarchical" (str)
# - "agent_count"  -- Number of registered agents (int)
# - "agents"       -- List of agent names (list[str])
# - "results"      -- Per-agent status dicts keyed by name (dict)

# MultiAgentOrchestrator.orchestrate() returns:
result = orchestrator.orchestrate("input")
# - "final_output"     -- Last agent's response or aggregation (str)
# - "agent_results"    -- Per-agent AgentResult dicts (dict)
# - "total_tokens"     -- Sum of all agents' tokens (int)
# - "total_iterations" -- Number of agent invocations (int)
# - "duration_ms"      -- Wall-clock duration (int)
```

## Complete Example

```python
import os
from kailash import OrchestrationRuntime, AgentConfig
from kailash.kaizen import (
    WorkerAgent, SupervisorAgent, AgentExecutor, RetryPolicy,
)

# Option 1: OrchestrationRuntime with strategies
runtime = OrchestrationRuntime()
runtime.set_strategy("sequential")
runtime.add_agent("researcher", AgentConfig(
    model=os.environ.get("DEFAULT_LLM_MODEL"),
    system_prompt="You are a research expert.",
))
runtime.add_agent("writer", AgentConfig(
    model=os.environ.get("DEFAULT_LLM_MODEL"),
    system_prompt="You are a clear writer.",
))
result = runtime.run("Write about Rust performance")

# Option 2: WorkerAgent + AgentExecutor with retry
def research(input_text: str) -> str:
    return f"Research findings: {input_text}"

worker = WorkerAgent("researcher", research, capabilities=["research"])
executor = AgentExecutor(
    retry_policy=RetryPolicy(max_retries=3),
    agent_timeout_ms=30000,
)
result = executor.execute_single(worker, "AI safety")
```

## Key Points

- **OrchestrationRuntime**: Strategy-based (sequential/parallel/hierarchical/pipeline) with `AgentConfig`
- **Pipelines**: For Python `BaseAgent` subclasses (SequentialPipeline, ParallelPipeline, EnsemblePipeline)
- **AgentExecutor**: Retry + timeout wrapper for `WorkerAgent` execution
- **RetryPolicy**: Fixed or exponential backoff configuration
- See [kaizen-multi-agent](kaizen-multi-agent.md) for WorkerAgent, SupervisorAgent, MultiAgentOrchestrator

<!-- Trigger Keywords: orchestration, OrchestrationRuntime, multi-agent, Sequential, Parallel, Hierarchical, Pipeline, AgentExecutor, RetryPolicy, strategy, coordination -->
