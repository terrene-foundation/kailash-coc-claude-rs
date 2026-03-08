---
skill: kaizen-multi-agent
description: "SupervisorAgent and WorkerAgent for multi-agent coordination. Use when asking about 'multi-agent', 'supervisor agent', 'worker agent', 'agent coordination', 'agent delegation', 'agent orchestration', or 'supervisor pattern'."
priority: MEDIUM
tags: [kaizen, multi-agent, supervisor, worker, coordination, orchestration]
---

# Kaizen Multi-Agent Coordination

Coordinate multiple agents using the supervisor-worker pattern.

## Quick Reference

- **SupervisorAgent**: Delegates tasks to worker agents and aggregates results
- **WorkerAgent**: Executes specific tasks assigned by a supervisor
- **Pattern**: Supervisor receives request, routes to appropriate worker(s), aggregates responses

## Import

```python
from kailash.kaizen import SupervisorAgent, WorkerAgent
```

## Basic Usage

```python
import os
from kailash.kaizen import SupervisorAgent, WorkerAgent

# Define worker agents for specific tasks
research_worker = WorkerAgent(
    name="researcher",
    model=os.environ.get("LLM_MODEL"),
    description="Researches topics and gathers information",
)

writer_worker = WorkerAgent(
    name="writer",
    model=os.environ.get("LLM_MODEL"),
    description="Writes content based on research",
)

# Create a supervisor that coordinates workers
supervisor = SupervisorAgent(
    name="content-supervisor",
    model=os.environ.get("LLM_MODEL"),
    workers=[research_worker, writer_worker],
)
```

## SupervisorAgent

The supervisor agent manages task delegation and result aggregation:

```python
import os
from kailash.kaizen import SupervisorAgent, WorkerAgent

# Create workers
analyst = WorkerAgent(
    name="analyst",
    model=os.environ.get("LLM_MODEL"),
    description="Analyzes data and provides insights",
)

reviewer = WorkerAgent(
    name="reviewer",
    model=os.environ.get("LLM_MODEL"),
    description="Reviews analysis for accuracy",
)

# Create supervisor with workers
supervisor = SupervisorAgent(
    name="analysis-supervisor",
    model=os.environ.get("LLM_MODEL"),
    workers=[analyst, reviewer],
)

# Supervisor handles task routing and aggregation
```

## WorkerAgent

Worker agents execute specific tasks:

```python
import os
from kailash.kaizen import WorkerAgent, ToolRegistry, ToolDef, ToolParam

# Worker with tools
def search_database(args):
    query = args.get("query", "")
    return {"results": f"Database results for: {query}"}

tools = ToolRegistry()
tools.register(ToolDef(
    name="search_db",
    description="Search the database",
    handler=search_database,
    params=[ToolParam(name="query", required=True)],
))

data_worker = WorkerAgent(
    name="data-worker",
    model=os.environ.get("LLM_MODEL"),
    description="Retrieves data from databases",
)
# data_worker.tool_registry = tools  # Attach tools if needed
```

## Multi-Agent Patterns

### Research and Summarize

```python
import os
from kailash.kaizen import SupervisorAgent, WorkerAgent

researcher = WorkerAgent(
    name="researcher",
    model=os.environ.get("LLM_MODEL"),
    description="Researches a topic using available tools",
)

summarizer = WorkerAgent(
    name="summarizer",
    model=os.environ.get("LLM_MODEL"),
    description="Summarizes research findings into concise reports",
)

fact_checker = WorkerAgent(
    name="fact-checker",
    model=os.environ.get("LLM_MODEL"),
    description="Verifies facts and citations in reports",
)

supervisor = SupervisorAgent(
    name="report-supervisor",
    model=os.environ.get("LLM_MODEL"),
    workers=[researcher, summarizer, fact_checker],
)
```

### Code Review Pipeline

```python
import os
from kailash.kaizen import SupervisorAgent, WorkerAgent

code_analyzer = WorkerAgent(
    name="code-analyzer",
    model=os.environ.get("LLM_MODEL"),
    description="Analyzes code for bugs and anti-patterns",
)

security_reviewer = WorkerAgent(
    name="security-reviewer",
    model=os.environ.get("LLM_MODEL"),
    description="Reviews code for security vulnerabilities",
)

style_checker = WorkerAgent(
    name="style-checker",
    model=os.environ.get("LLM_MODEL"),
    description="Checks code style and formatting consistency",
)

review_supervisor = SupervisorAgent(
    name="code-review-supervisor",
    model=os.environ.get("LLM_MODEL"),
    workers=[code_analyzer, security_reviewer, style_checker],
)
```

## Comparison with Pipelines

| Feature     | SupervisorAgent/WorkerAgent  | Pipelines                   |
| ----------- | ---------------------------- | --------------------------- |
| Routing     | Dynamic (supervisor decides) | Static (predefined order)   |
| Flexibility | High (adaptive delegation)   | Fixed (sequential/parallel) |
| Complexity  | Higher                       | Lower                       |
| Best for    | Complex multi-step tasks     | Simple agent chaining       |

### When to Use Each

- **SupervisorAgent**: When task routing depends on input content or intermediate results
- **SequentialPipeline**: When agents always run in the same order
- **ParallelPipeline**: When agents can process independently
- **EnsemblePipeline**: When you need consensus from multiple agents

## Integration with Nexus

```python
import os
from kailash.kaizen import SupervisorAgent, WorkerAgent
from kailash.nexus import NexusApp

supervisor = SupervisorAgent(
    name="support-supervisor",
    model=os.environ.get("LLM_MODEL"),
    workers=[
        WorkerAgent(name="classifier", model=os.environ.get("LLM_MODEL"), description="Classifies support tickets"),
        WorkerAgent(name="responder", model=os.environ.get("LLM_MODEL"), description="Generates support responses"),
    ],
)

app = NexusApp()

@app.handler(name="support_ticket", description="Process a support ticket")
async def support_ticket(message: str) -> dict:
    # Supervisor routes to appropriate worker
    return {"status": "processed", "message": message}

app.start()
```

## Best Practices

1. **Give workers clear descriptions** -- The supervisor uses descriptions to route tasks
2. **Keep workers focused** -- Each worker should have a single responsibility
3. **Use environment variables for models** -- Never hardcode model names
4. **Add tools to workers** -- Equip workers with ToolRegistry for domain-specific actions
5. **Monitor costs** -- Use CostTracker with multi-agent setups to track total LLM spend

## Known Limitations

> **Known Issue (Blocker B3)**: `OrchestrationRuntime.run()` is a stub -- returns static config instead of executing agents. Multi-agent orchestration through OrchestrationRuntime is non-functional. Use SupervisorAgent/WorkerAgent or custom Python orchestration instead.

## Related Skills

- [kaizen-pipelines](kaizen-pipelines.md) - Pipeline-based agent composition
- [kaizen-agent-patterns](kaizen-agent-patterns.md) - Agent building blocks
- [kaizen-structured-output](kaizen-structured-output.md) - Typed agent responses
- [kaizen-observability](kaizen-observability.md) - Monitor multi-agent systems

<!-- Trigger Keywords: multi-agent, supervisor agent, worker agent, agent coordination, agent delegation, agent orchestration, supervisor pattern, SupervisorAgent, WorkerAgent -->
