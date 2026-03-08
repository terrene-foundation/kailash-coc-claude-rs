# Kaizen Pipelines

Compose multiple agents into sequential, parallel, or ensemble execution patterns.

## API

```python
from kailash.kaizen.pipelines import SequentialPipeline, ParallelPipeline, EnsemblePipeline
```

## Agent Contract

Pipeline agents must subclass `BaseAgent` with a **sync** `execute()` that returns a dict with a `"response"` key:

```python
from kailash.kaizen import BaseAgent

class MyAgent(BaseAgent):
    def __init__(self, name):
        super().__init__()
        self._name = name

    def execute(self, input_data):  # SYNC, not async
        return {"response": f"{self._name} processed: {input_data}"}
```

## SequentialPipeline

Chains agents: output of agent N becomes input of agent N+1.

```python
from kailash.kaizen.pipelines import SequentialPipeline

a1 = MyAgent("preprocessor")
a2 = MyAgent("analyzer")

pipeline = SequentialPipeline([a1, a2])
result = pipeline.run("raw data")

# result = {
#   "response": "analyzer processed: preprocessor processed: raw data",
#   "trace": [...],      # per-agent input/output trace
#   "agent_count": 2
# }
```

## ParallelPipeline

Runs all agents on the same input simultaneously.

```python
from kailash.kaizen.pipelines import ParallelPipeline

a1 = MyAgent("sentiment")
a2 = MyAgent("entities")

pipeline = ParallelPipeline([a1, a2])
result = pipeline.run("Analyze this text")

# result = {
#   "response": "Parallel results from 2 agents",
#   "results": [
#     {"agent": "BaseAgent", "output": {"response": "sentiment processed: ..."}},
#     {"agent": "BaseAgent", "output": {"response": "entities processed: ..."}}
#   ],
#   "agent_count": 2
# }
```

## EnsemblePipeline

Runs all agents and picks the best result (first by default).

```python
from kailash.kaizen.pipelines import EnsemblePipeline

a1 = MyAgent("model_a")
a2 = MyAgent("model_b")

pipeline = EnsemblePipeline([a1, a2])
result = pipeline.run("Question?")

# result = {
#   "response": "model_a processed: Question?",  # first result selected
#   "individual_results": [
#     {"response": "model_a processed: Question?"},
#     {"response": "model_b processed: Question?"}
#   ],
#   "agent_count": 2
# }
```

## Methods

All pipelines share:

| Method       | Description                           |
| ------------ | ------------------------------------- |
| `run(input)` | Execute pipeline, returns result dict |
| `agents`     | Property: list of agents in pipeline  |

## Key Points

- `execute()` must be **sync** (not async) — pipelines call it directly
- Return dict must include `"response"` key for chaining to work
- `agent.name` defaults to `"BaseAgent"` — override for better traces
- Sequential chains `response` from one agent as input to the next
- Parallel runs all agents with the same input
- Ensemble picks the first result by default

## Additional Pipelines

`RouterPipeline` and `SupervisorPipeline` are also available in `kailash.kaizen.pipelines`:

```python
from kailash.kaizen.pipelines import RouterPipeline, SupervisorPipeline
```

These have different API contracts from the three core pipelines above.

## Limitations

- No async pipeline execution
- Agent `name` always shows as "BaseAgent" in traces (from base class)
