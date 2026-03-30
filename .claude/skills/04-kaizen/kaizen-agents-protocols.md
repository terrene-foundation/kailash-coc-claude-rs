# Inter-Agent Protocols

Source: `crates/kaizen-agents/src/{delegation,protocols}.rs`

## DelegationProtocol

Source: `crates/kaizen-agents/src/delegation.rs`

Handles the parent-to-child delegation flow using LLM to compose well-formed delegation messages.

### Flow

1. Parent composes a `DelegationMessage` via `compose_delegation()`
2. Child executes and returns a `DelegationResult`
3. Parent processes completion via `process_completion()`

### Usage

```rust,ignore
use kaizen_agents::delegation::{DelegationProtocol, DelegationMessage, DelegationResult};

let protocol = DelegationProtocol::new(llm);

// Step 1: Compose delegation
let message = protocol
    .compose_delegation(
        "Analyze sales data and produce a summary report",
        &["sales_db_url".into(), "report_template".into()],
        Some("Quarterly business review"),
    )
    .await?;

// message.task_description: LLM-refined task description
// message.context_keys: LLM-selected subset of available keys
// message.priority: DelegationPriority (Low/Normal/High/Critical)
// message.deadline: Optional deadline string

// Step 2: Child executes...
let child_result = DelegationResult {
    success: true,
    output: Some(json!({"report": "..."})),
    error: None,
};

// Step 3: Process completion
let processed = protocol
    .process_completion(&child_result, "generate_report")
    .await?;
```

### DelegationMessage

```rust,ignore
pub struct DelegationMessage {
    pub task_description: String,
    pub context_keys: Vec<String>,
    pub priority: DelegationPriority,
    pub deadline: Option<String>,
    pub metadata: HashMap<String, serde_json::Value>,
}
```

### DelegationPriority

```rust,ignore
pub enum DelegationPriority {
    Low,
    Normal,    // #[default]
    High,
    Critical,
}
```

Serializes as lowercase: `"low"`, `"normal"`, `"high"`, `"critical"`.

### DelegationResult

```rust,ignore
pub struct DelegationResult {
    pub success: bool,
    pub output: Option<serde_json::Value>,
    pub error: Option<String>,
}
```

## ClarificationProtocol

Source: `crates/kaizen-agents/src/protocols.rs`

Composes structured Q&A messages between parent and child agents.

### compose_question

Child asks parent for information. Protocol enforces invariants after LLM generation:

```rust,ignore
use kaizen_agents::protocols::{ClarificationProtocol, ClarificationMessage};

let clarifier = ClarificationProtocol::new(llm);

// Blocking question: child is blocked waiting for answer
let question = clarifier
    .compose_question("I need the database schema to proceed", true)
    .await?;

// question.content: LLM-composed question text
// question.options: Optional suggested answers
// question.blocking: true (enforced by protocol, regardless of LLM output)
// question.is_response: false (always false for questions)
```

### compose_answer

Parent answers child's question:

```rust,ignore
let answer = clarifier
    .compose_answer(
        "What database schema should I use?",
        "We use PostgreSQL with UUID primary keys",
    )
    .await?;

// answer.is_response: true (always true for answers)
// answer.blocking: false (always false for answers)
```

### ClarificationMessage

```rust,ignore
pub struct ClarificationMessage {
    pub content: String,              // Question or answer text
    pub options: Option<Vec<String>>, // Suggested answer options
    pub blocking: bool,               // Is sender blocked waiting?
    pub is_response: bool,            // false=question, true=answer
}
```

Invariant enforcement: `compose_question()` always sets `is_response=false` and `blocking` to the caller's value. `compose_answer()` always sets `is_response=true` and `blocking=false`. This prevents LLM output from violating protocol semantics.

## EscalationProtocol

Source: `crates/kaizen-agents/src/protocols.rs`

Composes structured escalation messages when a child agent cannot complete its task.

### Usage

```rust,ignore
use kaizen_agents::protocols::{
    EscalationProtocol, EscalationMessage, EscalationAction, EscalationSeverity,
};

let escalator = EscalationProtocol::new(llm);

let escalation = escalator
    .escalate(
        "All 3 API endpoints returned 503",
        &["retry with backoff".into(), "tried alternate endpoint".into()],
        Some("Data ingestion pipeline, step 2 of 4"),
    )
    .await?;

// escalation.severity: EscalationSeverity
// escalation.problem: LLM-composed problem description
// escalation.attempted_mitigations: Vec<String>
// escalation.recommended_action: EscalationAction
// escalation.detail: Optional additional context
```

### EscalationAction

4 recovery action types:

```rust,ignore
pub enum EscalationAction {
    Retry,              // Retry the failed operation
    Recompose,          // Modify the plan
    EscalateFurther,    // Go to grandparent
    Abandon,            // Give up entirely
}
```

Serializes as SCREAMING_SNAKE_CASE: `"RETRY"`, `"RECOMPOSE"`, `"ESCALATE_FURTHER"`, `"ABANDON"`.

### EscalationSeverity

```rust,ignore
pub enum EscalationSeverity {
    Low,       // Informational
    Medium,    // Warning
    High,      // Blocking progress
    Critical,  // Immediate intervention required
}
```

Serializes as lowercase: `"low"`, `"medium"`, `"high"`, `"critical"`.

### EscalationMessage

```rust,ignore
pub struct EscalationMessage {
    pub severity: EscalationSeverity,
    pub problem: String,
    pub attempted_mitigations: Vec<String>,
    pub recommended_action: EscalationAction,
    pub detail: Option<String>,
}
```

## Testing Protocols

All protocol types implement `Serialize + Deserialize` and can be roundtripped through JSON:

```rust,ignore
// Test serde roundtrip
let msg = ClarificationMessage {
    content: "What format?".into(),
    options: Some(vec!["JSON".into(), "CSV".into()]),
    blocking: true,
    is_response: false,
};
let json = serde_json::to_string(&msg)?;
let restored: ClarificationMessage = serde_json::from_str(&json)?;
assert_eq!(restored.content, msg.content);
```

Test with `MockStructuredLlm` (see [structured-llm.md](structured-llm.md) for pattern).

Key testing patterns:
- Verify invariant enforcement: `compose_question` always returns `is_response=false`
- Verify `blocking` is caller-controlled, not LLM-controlled
- Verify context/mitigations are included in the LLM user message (capture requests)

## Protocol Integration with PlanMonitor

The protocols are not directly called by `PlanMonitor` but are available for custom orchestration loops:

```rust,ignore
// In a custom recovery handler:
match gradient_action {
    GradientAction::Held { reason, .. } => {
        // Escalate to parent
        let escalation = escalator.escalate(&reason, &[], None).await?;
        match escalation.recommended_action {
            EscalationAction::Retry => { /* retry node */ },
            EscalationAction::Recompose => { /* recompose plan */ },
            EscalationAction::EscalateFurther => { /* pass to grandparent */ },
            EscalationAction::Abandon => { /* abort plan */ },
        }
    },
    _ => { /* other actions */ },
}

// During child execution, if more info needed:
let question = clarifier
    .compose_question("Missing database credentials", true)
    .await?;
// Route via MessageRouter to parent agent
```

## Cross-References

- Structured LLM trait: [structured-llm.md](structured-llm.md)
- Gradient classification (triggers escalation): [orchestration-pipeline.md](orchestration-pipeline.md)
- L3 messaging (message routing): [31-l3-autonomy/messaging.md](../31-l3-autonomy/messaging.md)
