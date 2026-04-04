# Reasoning Traces and Conversation History

Two modules in `crates/kaizen-agents/src/` for provenance and context management.

## reasoning.rs -- EATP-Aligned Reasoning Traces

Captures the decision, rationale, alternatives, and confidence of every LLM-driven orchestration decision. Forms an append-only, thread-safe log that can be linked to EATP `ReasoningTrace` records and the orchestration `AuditTrail`.

### OrchestrationDecision (5 variants)

```rust
pub enum OrchestrationDecision {
    Decomposition { subtask_count: usize },
    Design { subtask_description: String, is_novel: bool },
    Recomposition { strategy: String, action_count: usize },
    ContextInjection { method: String, selected_key_count: usize },
    Escalation { action: String },
}
```

Implements `Display` for human-readable summaries, `Serialize`/`Deserialize`, `PartialEq`, `Eq`, `Hash`.

### ReasoningRecord

Simpler than full EATP `ReasoningTrace` but captures the same core provenance:

- `id: Uuid` -- unique identifier
- `timestamp: DateTime<Utc>` -- when the decision was made
- `decision_type: OrchestrationDecision` -- the typed decision
- `decision: String` -- human-readable summary (mirrors `Display`)
- `rationale: String` -- why this decision was made
- `confidence_bps: u16` -- confidence as basis points (0-10000, clamped)
- `alternatives: Vec<String>` -- what else was considered
- `node_id: Option<String>` -- plan node correlation

`record.confidence()` returns `f64` in `[0.0, 1.0]`.

### ReasoningStore

Append-only, thread-safe store: `parking_lot::RwLock<Vec<ReasoningRecord>>`.

- `records()` -- snapshot of all records
- `records_by_decision_type(discriminant)` -- filter by enum variant (inner values ignored)
- `records_for_node(node_id)` -- filter by plan node correlation
- `len()`, `is_empty()`, `summary()` -- basic queries
- No delete/modify/clear operations

### TraceEmitter

Entry point for emitting records. Wraps `Arc<ReasoningStore>`.

```rust
let store = Arc::new(ReasoningStore::new());
let emitter = TraceEmitter::new(Arc::clone(&store));

// Emit without node correlation
let record = emitter.emit(&decision, "rationale", &alternatives, confidence_bps);

// Emit with node correlation
let record = emitter.emit_with_node(&decision, "rationale", &alts, bps, Some("node-42"));

// Convenience: create emitter + store in one call
let (emitter, store) = TraceEmitter::with_new_store();
```

`TraceEmitter` is `Clone` (cheap `Arc` clone) and `Send + Sync`. Multiple concurrent orchestration tasks can share the same emitter.

### Thread Safety

All types are `Send + Sync`:

- `ReasoningStore`: `parking_lot::RwLock<Vec<ReasoningRecord>>`
- `TraceEmitter`: `Arc<ReasoningStore>` (Clone shares backing store)
- `ReasoningRecord`: all fields are owned types

### EATP Alignment

`ReasoningRecord` mirrors core EATP `ReasoningTrace` fields (decision, rationale, confidence_bps, alternatives) but adds orchestration-specific context (node_id, typed decision_type). Downstream conversion to full EATP traces is planned for KZ-043.

## history.rs -- Conversation History with Sliding-Window Compaction

Bounded conversation buffer preventing unbounded context growth in long-lived agent conversations.

### HistoryConfig

```rust
pub struct HistoryConfig {
    pub max_verbatim_turns: usize,     // Default: 50
    pub max_context_tokens: usize,     // Default: 100_000 (75% of 128K window)
    pub max_tool_result_chars: usize,  // Default: 10_000
    pub summary_target_tokens: usize,  // Default: 2_000
}
```

### ConversationHistory

```rust
let mut history = ConversationHistory::new(HistoryConfig::default());

// Add turns (tool outputs auto-truncated if > max_tool_result_chars)
history.add_turn(TurnRole::User, "Analyze this CSV file");
history.add_turn(TurnRole::Assistant, "I'll parse the file...");
history.add_turn(TurnRole::Tool, &large_output); // truncated + flag set

// Check compaction thresholds
if history.needs_compaction() {
    // Option A: Deterministic (no LLM, concatenates overflow to plain-text summary)
    history.compact();

    // Option B: LLM-powered (falls back to compact() on failure)
    history.compact_with_llm(&structured_llm_client).await?;
}

// Get context window for LLM calls
let window: Vec<ConversationTurn> = history.context_window();
// If summary exists, first element is TurnRole::System with "[Conversation summary]: ..."
```

### TurnRole

4 variants: `System`, `User`, `Assistant`, `Tool`. Decoupled from wire-level `kailash_kaizen::types::MessageRole` to carry additional metadata (timestamps, token estimates).

### ConversationTurn

- `role: TurnRole`
- `content: String`
- `timestamp: DateTime<Utc>`
- `token_estimate: usize` -- chars/4 heuristic
- `truncated: bool` -- set when tool output exceeded `max_tool_result_chars`

### Token Estimation

Uses `chars / 4` heuristic (no tokenizer dependency). Accurate enough for context-window budgeting across GPT/Claude/Gemini tokenizers (3.5-4.5 chars/token for English).

### Compaction Strategies

| Method                  | LLM Required | Quality | Behavior                                                            |
| ----------------------- | ------------ | ------- | ------------------------------------------------------------------- |
| `compact()`             | No           | Basic   | Concatenates overflow turns as `"role: content"` lines into summary |
| `compact_with_llm(llm)` | Yes          | High    | LLM summarization; falls back to `compact()` on failure             |

Compaction is triggered when `needs_compaction()` returns `true`:

- `turns.len() > max_verbatim_turns`, OR
- `total_token_estimate() > max_context_tokens`

### Thread Safety

`ConversationHistory` is `Send + Sync` (all owned types). Designed for single-agent ownership. For shared access, wrap in `Arc<parking_lot::RwLock<ConversationHistory>>`.

### Key Methods

- `add_turn(role, content)` -- add a turn (auto-truncates tool outputs)
- `total_token_estimate()` -- summary tokens + all turn tokens
- `needs_compaction()` -- check if compaction thresholds exceeded
- `compact()` -- deterministic compaction
- `compact_with_llm(llm)` -- LLM-powered compaction
- `context_window()` -- returns summary + recent turns for LLM context
- `len()` -- verbatim turn count
- `is_empty()` -- no turns and no summary
- `clear()` -- reset to empty
- `summary()` -- current summary text, if any

## Cross-References

- EATP reasoning traces: [26-eatp-reference/](../26-eatp-reference/)
- Audit trail integration: [governance.md](governance.md) (AuditTrail `record_with_reasoning()`)
- StructuredLlmClient (used by `compact_with_llm`): [structured-llm.md](structured-llm.md)
