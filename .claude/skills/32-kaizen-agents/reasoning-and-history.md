# Reasoning Traces and Conversation History

Two modules in `kaizen-agents` for provenance and context management. These are internal orchestration primitives -- Python and Ruby users interact with them indirectly through the `SupervisorPipeline` and agent APIs.

## reasoning -- EATP-Aligned Reasoning Traces

Captures the decision, rationale, alternatives, and confidence of every LLM-driven orchestration decision. Forms an append-only, thread-safe log that can be linked to EATP `ReasoningTrace` records and the orchestration `AuditTrail`.

### OrchestrationDecision (5 variants)

| Variant              | Fields                                    | When Emitted                          |
| -------------------- | ----------------------------------------- | ------------------------------------- |
| `Decomposition`      | `subtask_count`                           | After breaking objective into subtasks |
| `Design`             | `subtask_description`, `is_novel`         | After designing agent for a subtask   |
| `Recomposition`      | `strategy`, `action_count`                | After recomposing a failed plan       |
| `ContextInjection`   | `method`, `selected_key_count`            | After selecting context keys for child |
| `Escalation`         | `action`                                  | After escalating to human review      |

### ReasoningRecord

Simpler than full EATP `ReasoningTrace` but captures the same core provenance:

- `id` -- unique identifier (UUID)
- `timestamp` -- when the decision was made
- `decision_type` -- one of the 5 OrchestrationDecision variants
- `decision` -- human-readable summary
- `rationale` -- why this decision was made
- `confidence_bps` -- confidence as basis points (0-10000, clamped)
- `alternatives` -- what else was considered (list of strings)
- `node_id` -- optional plan node correlation

`record.confidence()` returns a float in `[0.0, 1.0]`.

### ReasoningStore

Append-only, thread-safe store.

- `records()` -- snapshot of all records
- `records_by_decision_type(discriminant)` -- filter by variant type (inner values ignored)
- `records_for_node(node_id)` -- filter by plan node correlation
- `len()`, `is_empty()`, `summary()` -- basic queries
- No delete/modify/clear operations

### TraceEmitter

Entry point for emitting records. Wraps a shared `ReasoningStore`.

- `emit(decision, rationale, alternatives, confidence_bps)` -- emit without node correlation
- `emit_with_node(decision, rationale, alternatives, confidence_bps, node_id)` -- emit with plan node correlation
- `with_new_store()` -- convenience: create emitter + store in one call
- `TraceEmitter` is cheaply cloneable and thread-safe. Multiple concurrent orchestration tasks can share the same emitter.

### EATP Alignment

`ReasoningRecord` mirrors core EATP `ReasoningTrace` fields (decision, rationale, confidence_bps, alternatives) but adds orchestration-specific context (node_id, typed decision_type). Downstream conversion to full EATP traces is planned.

## history -- Conversation History with Sliding-Window Compaction

Bounded conversation buffer preventing unbounded context growth in long-lived agent conversations.

### HistoryConfig

| Field                   | Default   | Purpose                                       |
| ----------------------- | --------- | --------------------------------------------- |
| `max_verbatim_turns`    | 50        | Recent turns kept verbatim before compaction   |
| `max_context_tokens`    | 100,000   | Token budget (chars/4 heuristic)               |
| `max_tool_result_chars` | 10,000    | Truncate large tool outputs beyond this limit  |
| `summary_target_tokens` | 2,000     | Target length for LLM-generated summaries      |

### ConversationHistory

- `add_turn(role, content)` -- add a turn (tool outputs auto-truncated if exceeding `max_tool_result_chars`)
- `total_token_estimate()` -- summary tokens + all turn tokens
- `needs_compaction()` -- check if compaction thresholds are exceeded
- `compact()` -- deterministic compaction (no LLM, concatenates overflow turns to plain-text summary)
- `compact_with_llm(llm)` -- LLM-powered compaction (falls back to `compact()` on failure)
- `context_window()` -- returns summary + recent turns for LLM context. If summary exists, first element is a system turn with `"[Conversation summary]: ..."`
- `len()` -- verbatim turn count
- `is_empty()` -- no turns and no summary
- `clear()` -- reset to empty
- `summary()` -- current summary text, if any

### TurnRole

4 variants: `System`, `User`, `Assistant`, `Tool`. Decoupled from wire-level message roles to carry additional metadata (timestamps, token estimates).

### ConversationTurn

- `role` -- one of the 4 TurnRole variants
- `content` -- the turn text
- `timestamp` -- when the turn was added
- `token_estimate` -- chars/4 heuristic
- `truncated` -- set when tool output exceeded `max_tool_result_chars`

### Token Estimation

Uses `chars / 4` heuristic (no tokenizer dependency). Accurate enough for context-window budgeting across GPT/Claude/Gemini tokenizers (3.5-4.5 chars/token for English).

### Compaction Strategies

| Method              | LLM Required | Quality | Behavior                                                            |
| ------------------- | ------------ | ------- | ------------------------------------------------------------------- |
| `compact()`         | No           | Basic   | Concatenates overflow turns as `"role: content"` lines into summary |
| `compact_with_llm()`| Yes          | High    | LLM summarization; falls back to `compact()` on failure             |

Compaction is triggered when `needs_compaction()` returns true:

- `turns.len() > max_verbatim_turns`, OR
- `total_token_estimate() > max_context_tokens`

### Thread Safety

`ConversationHistory` is thread-safe (all owned types). Designed for single-agent ownership. For shared access across agents, wrap with appropriate synchronization.

## Python Usage

These types are accessed indirectly through the Python Kaizen API:

```python
from kailash.kaizen import BaseAgent

class MyAgent(BaseAgent):
    """Agent with built-in conversation history management."""

    def execute(self, input_text: str) -> str:
        # The underlying Rust runtime manages conversation history
        # and reasoning traces automatically during multi-step execution.
        # Access reasoning data through the supervisor result:
        return self.run(input_text)
```

The `SupervisorPipeline` from `kailash.kaizen.pipelines` manages reasoning traces and history compaction internally. Users observe the results through `SupervisorResult` fields like `audit_record_count` and `budget_remaining_pct`.

## Ruby Usage

```ruby
require "kailash"

# The Kaizen agent framework manages conversation history
# and reasoning traces internally. Access governance data
# through supervisor results:
result = supervisor.run(objective)
puts result["audit_record_count"]
puts result["budget_remaining_pct"]
```

## Cross-References

- EATP reasoning traces: [26-eatp-reference/](../26-eatp-reference/)
- Audit trail integration: [governance.md](governance.md) (AuditTrail `record_with_reasoning()`)
- StructuredLlmClient (used by `compact_with_llm`): [structured-llm.md](structured-llm.md)
