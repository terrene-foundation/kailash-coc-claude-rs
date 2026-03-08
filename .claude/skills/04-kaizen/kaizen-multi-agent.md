---
skill: kaizen-multi-agent
description: "Multi-agent orchestration for Kaizen including OrchestrationRuntime, strategies (Sequential, Parallel, Hierarchical, Pipeline), WorkerAgent, SupervisorAgent, MultiAgentOrchestrator, and AgentExecutor. Use when asking about 'multi-agent', 'supervisor agent', 'worker agent', 'agent coordination', 'agent delegation', 'agent orchestration', 'orchestration runtime', or 'supervisor pattern'."
priority: MEDIUM
tags: [kaizen, multi-agent, supervisor, worker, coordination, orchestration]
---

# Kaizen Orchestration: Multi-Agent Coordination

The orchestration module provides three coordination patterns:

1. **OrchestrationRuntime** -- Strategy-based runtime (Sequential/Parallel/Hierarchical/Pipeline)
2. **SupervisorAgent + WorkerAgent** -- Capability-based task delegation
3. **MultiAgentOrchestrator** -- Conditional routing with dependency tracking

Plus **AgentExecutor** for unified execution with retry, timeout, and observability.

## OrchestrationRuntime

Strategy-based runtime. Agents are stored in insertion order.

```python
from kailash.kaizen import BaseAgent

# Define agents
class ResearchAgent(BaseAgent):
    def run(self, input_text):
        return {"response": f"Research on: {input_text}"}

class WriterAgent(BaseAgent):
    def run(self, input_text):
        return {"response": f"Article about: {input_text}"}

researcher = ResearchAgent(name="researcher")
writer = WriterAgent(name="writer")
```

### Sequential Strategy

Agents run in insertion order. Each receives the previous agent's response as input.

```python
from kailash.kaizen.pipelines import SequentialPipeline

pipeline = SequentialPipeline([researcher, writer])
result = pipeline.run("Write about AI agents")
# researcher("Write about AI agents") -> writer(researcher_output)
```

### WorkerAgent

Wraps any agent with capability declarations and status tracking.

```python
from kailash.kaizen import WorkerAgent

# WorkerAgent wraps a Python callable
def code_fn(input_text: str) -> str:
    return f"coded: {input_text}"

worker = WorkerAgent("coder", code_fn, capabilities=["python", "rust", "code"])

# Capability matching
assert worker.accept_task("write python code")    # True (contains "python")
assert not worker.accept_task("design a logo")     # False

# Status tracking
assert worker.status == "idle"

# Execute
result = worker.run("hello")
# Returns dict with "response", "total_tokens", etc.
```

## SupervisorAgent

Delegates tasks to managed WorkerAgents via configurable routing strategies.

```python
from kailash.kaizen import SupervisorAgent, WorkerAgent

# Create workers
coder = WorkerAgent("coder", code_fn, capabilities=["python", "rust"])
writer = WorkerAgent("writer", write_fn, capabilities=["docs", "articles"])

# Create supervisor
supervisor = SupervisorAgent("boss", routing="capability", max_delegation_depth=3)
# routing: "round_robin" | "capability" | "llm_decision"
supervisor.add_worker(coder)
supervisor.add_worker(writer)

# Introspection
print(f"Workers: {supervisor.worker_count}")    # Property, no parens
print(f"Names: {supervisor.worker_names}")      # Property, no parens
print(f"Statuses: {supervisor.worker_statuses()}")

# Delegate task -- routes to appropriate worker
result = supervisor.run("Write Python code")
# Routes to "coder" because task matches "python" capability
```

### Routing Strategies

```python
# Round Robin -- cycles through workers sequentially
supervisor = SupervisorAgent("boss", routing="round_robin")

# Capability -- matches task keywords to worker capabilities (default)
supervisor = SupervisorAgent("boss", routing="capability")

# LLM Decision -- uses LLM to pick the best worker
supervisor = SupervisorAgent("boss", routing="llm_decision")
```

## MultiAgentOrchestrator

Dynamic agent selection with conditional routing, dependency tracking, and concurrent execution.

```python
from kailash.kaizen import MultiAgentOrchestrator

orch = MultiAgentOrchestrator()

# Register agents (callables)
orch.add_agent("researcher", research_fn)
orch.add_agent("writer", write_fn)
orch.add_agent("coder", code_fn)

# Add routing rules (condition -> agent)
orch.add_route("always", "researcher")
orch.add_route("contains:code", "coder")
orch.add_custom_route(lambda input_text: len(input_text) > 50, "long_handler")

# Declare dependencies (topological sort, cycle detection)
orch.add_dependency("writer", "researcher")  # writer waits for researcher

# Configuration
orch.set_concurrency_limit(5)

# Run orchestration
result = orch.orchestrate("Write about Rust")
# result is a dict: {"final_output": "...", "agent_results": {...}, "total_tokens": N}
```

### Execution Model

1. **Route selection**: Evaluate each route's condition against input. Matching agents form the execution set.
2. **Dependency resolution**: Topological sort (Kahn's algorithm). Circular dependencies rejected.
3. **Concurrent execution**: Independent agents run concurrently (up to concurrency limit). Dependent agents receive their dependency's output.
4. **Result aggregation**: Single agent returns its output; multiple agents concatenated with headers.

## AgentExecutor

Unified execution with retry, timeout, and observability hooks.

```python
from kailash.kaizen import AgentExecutor, RetryPolicy

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

# Single agent execution
result = executor.execute_single(worker, "hello")

# Multi-agent execution
# result = executor.execute_multi(runtime, "hello")
```

## OrchestrationResult

All orchestration methods return a dict with:

```python
result = orch.orchestrate("input")

# result["final_output"]     -- Last agent's response or aggregation (str)
# result["agent_results"]    -- Per-agent results in execution order (dict)
# result["total_tokens"]     -- Sum of all agents' tokens (int)
# result["total_iterations"] -- Number of agent invocations (int)
# result["duration_ms"]      -- Wall-clock duration (int)
```

## Complete Example

```python
from kailash.kaizen import WorkerAgent, SupervisorAgent, MultiAgentOrchestrator

# Define worker functions
def research(input_text: str) -> str:
    return f"Research findings on: {input_text}"

def write(input_text: str) -> str:
    return f"Article based on: {input_text}"

def review(input_text: str) -> str:
    return f"Review of: {input_text}"

# Create workers with capabilities
researcher = WorkerAgent("researcher", research, capabilities=["research", "analysis"])
writer = WorkerAgent("writer", write, capabilities=["writing", "articles"])
reviewer = WorkerAgent("reviewer", review, capabilities=["review", "qa"])

# Option 1: Supervisor pattern
supervisor = SupervisorAgent("editor", routing="capability")
supervisor.add_worker(researcher)
supervisor.add_worker(writer)
supervisor.add_worker(reviewer)
result = supervisor.run("Research and write about AI safety")

# Option 2: Orchestrator with dependencies
orch = MultiAgentOrchestrator()
orch.add_agent("researcher", research)
orch.add_agent("writer", write)
orch.add_agent("reviewer", review)
orch.add_route("always", "researcher")
orch.add_route("always", "writer")
orch.add_route("always", "reviewer")
orch.add_dependency("writer", "researcher")
orch.add_dependency("reviewer", "writer")
result = orch.orchestrate("Write about AI safety")
print(result["final_output"])
```

<!-- Trigger Keywords: orchestration, multi-agent, Sequential, Parallel, Hierarchical, Pipeline, WorkerAgent, SupervisorAgent, MultiAgentOrchestrator, AgentExecutor, RetryPolicy, strategy, coordination, routing, delegation -->
