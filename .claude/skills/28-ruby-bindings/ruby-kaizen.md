# Ruby Kaizen — Delegate, BaseAgent, Pipelines, Governance, L3

Build AI agents from Ruby: the Delegate streaming-block pattern, `BaseAgent` subclasses with the signature DSL, orchestration pipelines (ensemble/router/supervisor), GovernedSupervisor's 3-layer progressive-disclosure API, L3 autonomy primitives, and the memory tiers.

## Usage

`/ruby-kaizen` — Kaizen reference for Ruby (Delegate, BaseAgent signature DSL, pipelines, governance, L3 primitives, memory)

This file carries the agent-construction depth. The class-API reference (`AgentConfig`, `ToolRegistry`, `SessionMemory`, `CostTracker`, trust types) lives in `ruby-framework-bindings.md` §Kaizen.

---

## Overview

Kaizen is a production-ready AI agent framework built on the Core SDK, providing signature-based programming and multi-agent coordination. The Ruby gem wraps the Rust Kaizen engine via native extensions.

- **Signature DSL** — type-safe agent interfaces via Ruby blocks
- **BaseAgent** — production agent foundation (error handling, audit, cost tracking)
- **Delegate** — zero-boilerplate autonomous agents with streaming events
- **Pipelines** — supervisor-worker, ensemble, router, parallel, sequential
- **Multi-provider** — OpenAI, Anthropic, Google, Ollama via the adapter registry
- **Memory tiers** — session, shared, persistent
- **L3 autonomy primitives** — envelope tracking, scoped context, agent factory
- **PACT governance** — GovernedSupervisor with a progressive-disclosure API

Install:

```bash
gem install kailash-kaizen
```

```ruby
# Gemfile
gem "kailash-kaizen"
```

Read the model name from the environment in every example below — never hardcode a model or a key.

---

## Delegate — Streaming-Block Pattern

`Kailash::Kaizen::Delegate` is the zero-boilerplate path for autonomous tasks. Pass a block to `run` to receive streaming events; use `run_sync` for a blocking call in scripts and CLI tools.

```ruby
require "kailash/kaizen"

delegate = Kailash::Kaizen::Delegate.new(model: ENV["LLM_MODEL"])

# Streaming execution -- block receives typed events as they arrive
delegate.run("Analyze this data") do |event|
  case event
  when Kailash::Kaizen::TextDelta
    print event.text
  when Kailash::Kaizen::ToolCallStart
    puts "\nCalling tool: #{event.tool_name}"
  end
end

# Synchronous execution -- one blocking call, returns the final result
result = delegate.run_sync("Summarize this document")
puts result
```

### Delegate Tools

Register tools on a Delegate with blocks; the block body is the tool implementation.

```ruby
delegate = Kailash::Kaizen::Delegate.new(model: ENV["LLM_MODEL"])

delegate.tool("search_web", description: "Search the web") do |params|
  perform_search(params[:query])
end

delegate.tool("read_file", description: "Read a file") do |params|
  File.read(params[:path])
end
```

---

## BaseAgent — Subclass + Signature DSL

Subclass `Kailash::Kaizen::BaseAgent` for custom agent logic. The `signature` block declares typed inputs and outputs; `configure` sets the model and parameters; `execute` holds the agent logic.

```ruby
require "kailash/kaizen"

class SummaryAgent < Kailash::Kaizen::BaseAgent
  signature do
    input  :text,    type: :string, description: "Text to summarize"
    output :summary, type: :string, description: "Generated summary"
  end

  configure do |config|
    config.model       = ENV["LLM_MODEL"]
    config.temperature = 0.7
  end

  def execute(inputs)
    { summary: summarize(inputs[:text]) }
  end
end

agent  = SummaryAgent.new
result = agent.run(text: "Long text here...")
puts result[:summary]
```

### Richer Signatures

Signatures support typed inputs/outputs with descriptions and defaults; richer signatures let the LLM reason rather than forcing logic into code.

```ruby
class TriageAgent < Kailash::Kaizen::BaseAgent
  signature do
    input  :query,      type: :string, description: "User query"
    input  :context,    type: :hash,   description: "Additional context", default: {}
    output :answer,     type: :string, description: "Agent response"
    output :confidence, type: :float,  description: "Confidence score"
  end
end
```

Define the signature BEFORE implementing the agent. NEVER skip the signature.

---

## Pipelines — Orchestration Patterns

`Kailash::Kaizen::Pipeline` builds multi-agent orchestrations. Pick the pattern by coordination shape.

```ruby
require "kailash/kaizen"

# Ensemble -- multiple perspectives synthesized into one answer
pipeline = Kailash::Kaizen::Pipeline.ensemble(
  agents:      [code_expert, data_expert, writing_expert],
  synthesizer: synthesis_agent,
  top_k:       3
)
result = pipeline.run(task: "Analyze codebase", input: "repo_path")

# Router -- LLM-based delegation to the right specialist
router = Kailash::Kaizen::Pipeline.router(
  agents:           [code_agent, data_agent, writing_agent],
  routing_strategy: :semantic
)

# Supervisor-worker -- hierarchical coordination with oversight
supervisor = Kailash::Kaizen::Pipeline.supervisor(
  supervisor: manager_agent,
  workers:    [agent_a, agent_b, agent_c],
  strategy:   :round_robin
)
```

Pattern selection:

- **Ensemble** — diverse perspectives synthesized (code review, research)
- **Router** — intelligent task delegation to specialists
- **Supervisor-Worker** — hierarchical coordination with oversight
- **Parallel** — bulk processing or voting-based consensus
- **Sequential** — linear workflows with dependency chains

Routing uses LLM reasoning, not a dispatch table. Let the router decide; do not pre-classify the query in Ruby code.

---

## GovernedSupervisor — 3-Layer Progressive Disclosure

`Kailash::Kaizen::GovernedSupervisor` adds PACT governance to a supervisor. The API discloses progressively: start with 2 params, add configuration, then full governance subsystems.

```ruby
require "kailash/kaizen"

# Layer 1: Simple (2 params)
supervisor = Kailash::Kaizen::GovernedSupervisor.new(
  agents: [agent_a, agent_b],
  task:   "Analyze the dataset"
)

# Layer 2: Configured
supervisor = Kailash::Kaizen::GovernedSupervisor.new(
  agents:   [agent_a, agent_b],
  task:     "Analyze the dataset",
  budget:   { max_tokens: 100_000, max_cost: 5.0 },
  strategy: :supervised,
  cascade:  :monotonic
)

# Layer 3: Full governance (subsystems)
supervisor = Kailash::Kaizen::GovernedSupervisor.new(
  agents:         [agent_a, agent_b],
  task:           "Analyze the dataset",
  accountability: { tracker: true },
  budget:         { max_tokens: 100_000, warnings: [0.8, 0.95] },
  cascade:        { strategy: :monotonic },
  clearance:      { level: :c2 },
  dereliction:    { detect: true },
  bypass:         { enabled: false },
  vacancy:        { auto_designate: true },
  audit:          { hash_chain: true }
)
```

---

## L3 Autonomy Primitives

The `Kailash::Kaizen::L3` namespace holds the autonomy primitives: envelope tracking with gradient zones, scoped context with access control, and an agent factory with lifecycle tracking.

```ruby
require "kailash/kaizen"

# Envelope tracking with budget gradient zones
tracker = Kailash::Kaizen::L3::EnvelopeTracker.new(
  budget: { max_tokens: 50_000 }
)

# Scoped context with projection access control
context = Kailash::Kaizen::L3::ScopedContext.new(
  projection: { allow: ["data.*"], deny: ["data.secret.*"] }
)

# Agent factory with parent lifecycle tracking
factory  = Kailash::Kaizen::L3::AgentFactory.new
instance = factory.spawn(agent_spec, parent: supervisor)
```

---

## Memory Tiers

Agents expose three memory tiers via `agent.memory`: session (per-conversation, in-memory), shared (across agents), and persistent (DataFlow-backed, cross-session).

```ruby
# Session memory (in-memory, per-conversation)
agent.memory.session.store("key", "value")
agent.memory.session.recall("key")

# Shared memory (across agents)
agent.memory.shared.store("shared_key", data)

# Persistent memory (DataFlow-backed, cross-session)
agent.memory.persistent.store("long_term", data)
```

---

## Integration Patterns

### With DataFlow (data-driven agents)

```ruby
require "kailash/kaizen"
require "kailash/dataflow"

db = Kailash::DataFlow.new do |config|
  config.database_url = ENV["DATABASE_URL"]
end

delegate = Kailash::Kaizen::Delegate.new(model: ENV["LLM_MODEL"])
delegate.tool("query_users", description: "Query the user database") do |params|
  db.express.list("User", filter: params[:filter])
end
```

### With Nexus (multi-channel agents)

```ruby
require "kailash/kaizen"
require "kailash/nexus"

app = Kailash::Nexus::App.new(port: 3000)

app.handler("chat", description: "Chat with an AI agent") do |params|
  delegate = Kailash::Kaizen::Delegate.new(model: ENV["LLM_MODEL"])
  { response: delegate.run_sync(params[:message]) }
end

app.start   # agent reachable via API, CLI, and MCP
```

---

## Critical Rules

- Define signatures before implementing agents; NEVER skip the signature.
- Extend `Kailash::Kaizen::BaseAgent` for custom agents; use `Delegate` for zero-boilerplate autonomous tasks.
- Read the model name and API keys from the environment; NEVER hardcode them.
- Track costs in production; NEVER ignore cost tracking there.
- Use block form for streaming so resources clean up.
- Routing uses LLM reasoning, not a Ruby dispatch table — let the router/agent decide.
- NEVER mock LLM calls in integration tests; exercise real infrastructure.

---

## Related Skills

- `ruby-framework-bindings.md` §Kaizen — Kaizen class API (`AgentConfig`, `ToolRegistry`, `SessionMemory`, `CostTracker`, trust types)
- `ruby-dataflow.md` — DataFlow-backed persistent memory + data-driven tools
- `ruby-nexus-rack.md` — deploying agents as Nexus handlers
- `ruby-mcp.md` — agents exposed as MCP tools
