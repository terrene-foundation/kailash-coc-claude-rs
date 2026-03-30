# 32-kaizen-agents: LLM-Powered Agent Orchestration

Crate location: `crates/kaizen-agents/`
Dependency: `kailash-kaizen` with `l3-core` feature, `kailash-pact` for governance types.

## Architecture

Sharp boundary between SDK (deterministic) and Orchestration (LLM-driven):

- **SDK layer** (`kailash-kaizen/src/l3/`): Validates and enforces. `EnvelopeTracker`, `ContextScope`, `AgentFactory`, `PlanExecutor` -- all deterministic, no LLM.
- **Orchestration layer** (`kaizen-agents/`): Proposes and decides. Every module except `gradient`, `envelope_allocator`, `budget_warnings`, and `context_injector` makes LLM calls via `StructuredLlmClient`.

## Module Quick Reference

| Module                      | Key Type                                                    | LLM?    | Purpose                                                 | Skill                                                  |
| --------------------------- | ----------------------------------------------------------- | ------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `structured_llm`            | `StructuredLlmClient`, `DefaultStructuredLlmClient`         | Yes     | Type-safe JSON schema LLM output                        | [structured-llm.md](structured-llm.md)                 |
| `decomposer`                | `TaskDecomposer<S>`                                         | Yes     | Break objective into validated `Subtask`s               | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `designer`                  | `AgentDesigner<S>`, `CapabilityMatcher`                     | Yes\*   | Match capabilities, spawn/inline decision, novel specs  | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `composer`                  | `PlanComposer<S>`, `ComposedPlan`                           | Yes     | Wire subtasks into validated plan DAG                   | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `diagnoser`                 | `FailureDiagnoser<S>`                                       | Yes     | Classify failures into `Diagnosis` categories           | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `recomposer`                | `Recomposer<S>`, `RecompositionAction`                      | Yes     | Generate plan modification actions from diagnosis       | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `monitor`                   | `PlanMonitor<S>`, `MonitorConfig`, `MonitorEvent`           | Yes     | Full lifecycle orchestration loop                       | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `gradient`                  | `classify_failure`, `GradientAction`                        | No      | Deterministic G1-G9 gradient classification rules       | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `envelope_allocator`        | `allocate_equal`, `allocate_weighted`                       | No      | Budget division across children                         | [budget-and-context.md](budget-and-context.md)         |
| `budget_warnings`           | `evaluate_budget`, `BudgetWarning`                          | No      | Threshold-based budget warning emission                 | [budget-and-context.md](budget-and-context.md)         |
| `context_injector`          | `inject_deterministic`, `inject_semantic`                   | No      | Context key selection for child scopes                  | [budget-and-context.md](budget-and-context.md)         |
| `context_summarizer`        | `ContextSummarizer<S>`                                      | Yes     | Compress large context values via LLM                   | [budget-and-context.md](budget-and-context.md)         |
| `delegation`                | `DelegationProtocol<S>`, `DelegationMessage`                | Yes     | Parent-to-child task delegation                         | [protocols.md](protocols.md)                           |
| `protocols`                 | `ClarificationProtocol<S>`, `EscalationProtocol<S>`         | Yes     | Inter-agent Q&A and escalation                          | [protocols.md](protocols.md)                           |
| `conversions`               | `Subtask`, `Diagnosis`, `SpawnDecision`                     | No      | LLM JSON -> validated SDK types at boundary             | [orchestration-pipeline.md](orchestration-pipeline.md) |
| `reasoning`                 | `TraceEmitter`, `OrchestrationDecision`, `ReasoningStore`   | No      | EATP-aligned reasoning trace emission for LLM decisions | [reasoning-and-history.md](reasoning-and-history.md)   |
| `history`                   | `ConversationHistory`, `HistoryConfig`, `TurnRole`          | Yes\*\* | Sliding-window conversation compaction                  | [reasoning-and-history.md](reasoning-and-history.md)   |
| `error`                     | `OrchestrationError`                                        | No      | Unified error type for all modules                      | (inline below)                                         |
| **Governance**              |                                                             |         |                                                         |                                                        |
| `governance/accountability` | `AccountabilityTracker`, `AccountabilityRecord`             | No      | D/T/R address → agent assignment tracking               | [governance.md](governance.md)                         |
| `governance/clearance`      | `ClearanceEnforcer`, `ClearanceLevel`                       | No      | 5-level classification enforcement (monotonic raise)    | [governance.md](governance.md)                         |
| `governance/cascade`        | `CascadeManager`, `CascadeEvent`                            | No      | Multi-level agent termination with budget reclamation   | [governance.md](governance.md)                         |
| `governance/bypass`         | `BypassManager`, `BypassRecord`, `HeldAction`               | No      | Emergency bypass (human approval required)              | [governance.md](governance.md)                         |
| `governance/vacancy`        | `VacancyManager`, `VacancyEvent`                            | No      | Orphaned resource detection (idempotent scan)           | [governance.md](governance.md)                         |
| `governance/dereliction`    | `DerelictionDetector`, `DerelictionWarning`                 | No      | Duty monitoring with severity escalation                | [governance.md](governance.md)                         |
| `governance/budget`         | `GovernanceBudgetTracker`, `BudgetSnapshot`                 | No      | Unified budget view (CAS-protected consumption)         | [governance.md](governance.md)                         |
| **Audit**                   |                                                             |         |                                                         |                                                        |
| `audit/trail`               | `AuditTrail`, `AuditRecord`, `AuditEventType`               | No      | Append-only audit chain with reasoning trace links      | [governance.md](governance.md)                         |
| **Bridges**                 |                                                             |         |                                                         |                                                        |
| `scope_bridge`              | `GovernanceSnapshot`, `project_for_child`                   | No      | Context projection + anti-amnesia injection             | [governance.md](governance.md)                         |
| `message_transport`         | `MessageTransport`, `TransportEnvelope`                     | No      | Protocol → L3 MessageRouter bridge                      | [governance.md](governance.md)                         |
| `agent_lifecycle`           | `AgentLifecycleManager`, `AgentRecord`                      | No      | PlanMonitor → L3 Factory coordinator                    | [governance.md](governance.md)                         |
| **Tool Hydration**          |                                                             |         |                                                         |                                                        |
| `hydration`                 | `ToolHydrator`, `DefaultToolHydrator`, `ToolHydratorConfig` | No      | Progressive tool disclosure via TF-IDF search           | [hydration-streaming.md](hydration-streaming.md)       |
| `hydration/meta_tool`       | `create_search_tools_meta_tool()`                           | No      | Auto-registered `search_tools` meta-tool                | [hydration-streaming.md](hydration-streaming.md)       |
| **Caller Event Streaming**  |                                                             |         |                                                         |                                                        |
| `streaming/caller_event`    | `CallerEvent`, `CallerEventWire`, `TaodResultWire`          | No      | Event stream + serializable wire types (all 7 bindings) | [hydration-streaming.md](hydration-streaming.md)       |
| `streaming/agent`           | `StreamingAgent::run_stream()`                              | No      | Single-shot token streaming via CallerEvent             | [hydration-streaming.md](hydration-streaming.md)       |
| `agent_engine/concrete`     | `Agent::chat_stream()`, `push_assistant_turn()`             | No      | Conversational streaming via CallerEvent                | [hydration-streaming.md](hydration-streaming.md)       |
| `agent_engine/taod`         | `TaodRunner::run_stream()`                                  | No      | TAOD loop with tool lifecycle events                    | [hydration-streaming.md](hydration-streaming.md)       |
| **Entry Point**             |                                                             |         |                                                         |                                                        |
| `supervisor`                | `GovernedSupervisor`, `SupervisorResult`                    | No      | Progressive-disclosure governance entry point           | [governance.md](governance.md)                         |

\*`AgentDesigner` uses LLM only for novel agents; `CapabilityMatcher` and `decide_spawn` are deterministic.
\*\*`ConversationHistory::compact_with_llm()` uses LLM for summarization; `compact()` is deterministic (no LLM).

## Error Types

`OrchestrationError` (`crates/kaizen-agents/src/error.rs`) is `#[non_exhaustive]` with variants:

- **LLM**: `LlmFailed`, `StructuredOutputFailed`, `EmptyResponse`
- **Plan**: `PlanValidationFailed`, `ModificationRejected`, `PlanStateError`
- **Factory**: `SpawnFailed`, `InstanceNotFound`, `InvalidStateTransition`
- **Context**: `RequiredContextMissing`, `ContextWriteDenied`, `ProjectionNotSubset`
- **Messaging**: `RoutingFailed`, `ChannelError`
- **Budget**: `InsufficientBudget`, `InvalidAllocation`
- **Config**: `ConfigError`
- **Governance**: `ClearanceViolation`, `CascadeFailed`, `BypassRequired`, `DerelictionDetected`, `VacancyDetected`, `GovernanceViolation`
- **General**: `Timeout`, `Internal`

## Dependencies

| Crate            | Types Used                                                    | Notes                                 |
| ---------------- | ------------------------------------------------------------- | ------------------------------------- |
| `kailash-kaizen` | `LlmClient`, `LlmRequest`, `ConversationTurn`, `PlanGradient` | `l3-core` feature for SDK primitives  |
| `kailash-pact`   | `GradientZone`                                                | Gradient zone enum for classification |
| `serde`          | `Serialize`, `Deserialize`, `DeserializeOwned`                | All public types are serde-enabled    |
| `serde_json`     | `Value`, `json!`                                              | Schema definitions and LLM output     |
| `async-trait`    | `#[async_trait]`                                              | `StructuredLlmClient` trait           |
| `thiserror`      | `#[derive(Error)]`                                            | `OrchestrationError`                  |
| `uuid`           | `Uuid`                                                        | `InstanceNotFound` error variant      |
| `chrono`         | (reserved)                                                    | Temporal operations                   |
| `tokio`          | (runtime)                                                     | Async runtime for tests               |

## Key Source Files

```
crates/kaizen-agents/
  Cargo.toml
  src/
    lib.rs                  # Module declarations and re-exports
    error.rs                # OrchestrationError, OrchestrationResult
    structured_llm.rs       # StructuredLlmClient trait + DefaultStructuredLlmClient
    conversions.rs          # Subtask, Diagnosis, SpawnDecision, parse_subtasks, parse_diagnosis
    decomposer.rs           # TaskDecomposer
    designer.rs             # AgentDesigner, CapabilityMatcher, SpawnPolicyConfig, decide_spawn
    composer.rs             # PlanComposer, ComposedPlan, ComposedNode, ComposedEdge
    gradient.rs             # classify_failure, GradientAction, ClassificationInput (G1-G9)
    diagnoser.rs            # FailureDiagnoser
    recomposer.rs           # Recomposer, RecompositionAction, RecompositionResult
    monitor.rs              # PlanMonitor, MonitorConfig, MonitorEvent, MonitorResult, GovernanceHooks
    envelope_allocator.rs   # allocate_equal, allocate_weighted, BudgetPolicy, ChildAllocation
    budget_warnings.rs      # evaluate_budget, BudgetWarning, BudgetWarningConfig
    context_injector.rs     # inject_deterministic, inject_semantic, inject_fallback
    context_summarizer.rs   # ContextSummarizer, SummarizerConfig, SummarizedContext
    delegation.rs           # DelegationProtocol, DelegationMessage, DelegationResult
    protocols.rs            # ClarificationProtocol, EscalationProtocol
    scope_bridge.rs         # GovernanceSnapshot, project_for_child, filter_by_clearance
    message_transport.rs    # MessageTransport, TransportEnvelope, TransportPayload
    agent_lifecycle.rs      # AgentLifecycleManager, AgentRecord, LifecycleState
    reasoning.rs            # TraceEmitter, OrchestrationDecision, ReasoningStore, ReasoningRecord
    history.rs              # ConversationHistory, HistoryConfig, TurnRole, ConversationTurn
    supervisor.rs           # GovernedSupervisor, SupervisorConfig, SupervisorResult, build_governance_hooks()
    governance/
      mod.rs                # Re-exports all governance types
      accountability.rs     # AccountabilityTracker, AccountabilityRecord
      clearance.rs          # ClearanceEnforcer, ClearanceLevel, ClassificationAssigner
      cascade.rs            # CascadeManager, CascadeEvent, CascadeTrigger
      bypass.rs             # BypassManager, BypassRecord, HeldAction
      vacancy.rs            # VacancyManager, VacancyEvent, OrphanType
      dereliction.rs        # DerelictionDetector, DerelictionConfig, DerelictionWarning
      budget.rs             # GovernanceBudgetTracker, BudgetSnapshot, DimensionSnapshot
    audit/
      mod.rs                # Re-exports audit types
      trail.rs              # AuditTrail, AuditRecord, AuditEventType
    hydration/
      mod.rs                # ToolHydrator trait, ToolHydratorConfig, hydrate_registry(), resolve_tools_for_request()
      search.rs             # DefaultToolHydrator (TF-IDF), ToolsStore (Mutex-wrapped)
      meta_tool.rs          # search_tools meta-tool (auto-registered, auto-hydrates results)
    streaming/
      mod.rs                # Re-exports all streaming types
      handler.rs            # StreamHandler trait (callback-based, backward compat)
      agent.rs              # StreamingAgent (wraps Agent), run_stream() -> CallerEventStream
      caller_event.rs       # CallerEvent enum (6 variants), CallerEventStream type alias
      collector.rs          # TokenCollector (Mutex<String> accumulator)
      channel.rs            # ChannelStreamHandler, StreamEvent
```

## Cross-References

- L3 SDK primitives: [31-l3-autonomy/SKILL.md](../31-l3-autonomy/SKILL.md)
- PACT governance: [34-pact/](../34-pact/)
- Kaizen agent framework: [04-kaizen/](../04-kaizen/)
