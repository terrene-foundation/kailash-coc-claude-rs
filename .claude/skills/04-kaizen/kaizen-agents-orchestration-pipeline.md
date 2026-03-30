# Orchestration Pipeline

Source: `crates/kaizen-agents/src/{decomposer,designer,composer,gradient,diagnoser,recomposer,monitor}.rs`

## Pipeline Overview

The orchestration pipeline flows through six stages, coordinated by `PlanMonitor`:

```
Objective
    |
    v
TaskDecomposer  -->  Vec<Subtask>
    |
    v
AgentDesigner   -->  Vec<(SpawnDecision, Option<DesignedAgentSpec>)>
    |
    v
PlanComposer    -->  ComposedPlan (nodes + edges)
    |
    v
execute_node()  -->  per-node callback (SDK integration point)
    |
    v  (on failure)
classify_failure()  -->  GradientAction (deterministic G1-G9)
    |
    v
FailureDiagnoser  -->  Diagnosis (LLM root cause analysis)
    |
    v
Recomposer  -->  Vec<RecompositionAction> (plan modifications)
    |
    v  (loop back to execute)
```

## Stage 1: TaskDecomposer

Source: `crates/kaizen-agents/src/decomposer.rs`

Breaks a high-level objective string into validated `Subtask`s via LLM.

```rust,ignore
let decomposer = TaskDecomposer::new(Arc::clone(&llm));
let subtasks = decomposer
    .decompose("Build a user registration API", &["db_url".into()])
    .await?;
```

- Generic over `S: StructuredLlmClient`
- `with_max_retries(n)` controls LLM retry count (default: 2)
- Validation via `parse_subtasks()` in `conversions.rs`:
  - Non-empty descriptions
  - Complexity in `[0.0, 1.0]`, must be finite
  - Dependency indices within bounds
  - At least one subtask

### Subtask

```rust,ignore
pub struct Subtask {
    pub description: String,
    pub capabilities: Vec<String>,       // Required agent capabilities
    pub complexity: f64,                  // 0.0-1.0, validated finite
    pub dependencies: Vec<usize>,         // Indices of upstream subtasks
    pub required_context_keys: Vec<String>, // Context keys needed from parent
}
```

## Stage 2: AgentDesigner

Source: `crates/kaizen-agents/src/designer.rs`

Three sub-stages, in order:

### 2a. CapabilityMatcher (deterministic)

Exact string match against a registry of `AgentCapability` entries.

```rust,ignore
let matcher = CapabilityMatcher::new(registry);
let result = matcher.find_exact_match("code-review");
// -> MatchResult::ExactMatch { agent_name: "code-reviewer", capabilities: [...] }
```

`MatchResult` variants: `ExactMatch`, `SemanticMatch` (reserved), `NoMatch`.

### 2b. decide_spawn (deterministic)

Threshold-based spawn vs inline decision, evaluated in priority order:

1. Budget < `min_budget_pct` (default 0.10) -> `Inline`
2. Capability match exists -> `Spawn`
3. Complexity > `complexity_threshold` (default 0.5) -> `Spawn`
4. Capabilities count > `tool_count_threshold` (default 3) -> `Spawn`
5. Default -> `Inline`

```rust,ignore
let decision = decide_spawn(&subtask, budget_remaining_pct, has_match, &config);
```

### 2c. AgentDesigner.design() (LLM for novel agents)

Orchestrates the full pipeline. For matched agents, returns a non-novel spec from the registry. For unmatched subtasks with high complexity, uses LLM to design a novel spec (`is_novel = true`).

```rust,ignore
let designer = AgentDesigner::new(llm, registry, SpawnPolicyConfig::default());
let (decision, spec) = designer.design(&subtask, budget_pct).await?;
// decision: SpawnDecision::Spawn or Inline
// spec: Some(DesignedAgentSpec) or None
```

`DesignedAgentSpec` fields: `name`, `description`, `capabilities`, `tool_ids`, `system_prompt`, `is_novel`.

Novel specs (`is_novel = true`) trigger COC Anti-Pattern 5 flagging upstream.

## Stage 3: PlanComposer

Source: `crates/kaizen-agents/src/composer.rs`

Wires subtasks into a validated DAG. Uses LLM to determine additional edges and optional markers.

```rust,ignore
let composer = PlanComposer::new(llm);
let plan = composer.compose(&subtasks, &specs).await?;
```

### ComposedPlan

```rust,ignore
pub struct ComposedPlan {
    pub name: String,
    pub nodes: Vec<ComposedNode>,
    pub edges: Vec<ComposedEdge>,
}

pub struct ComposedNode {
    pub node_id: String,          // "node-{index}"
    pub subtask_index: usize,
    pub description: String,
    pub optional: bool,           // LLM can mark nodes as optional
    pub agent_spec: Option<DesignedAgentSpec>,  // #[serde(skip)]
}

pub enum ComposedEdgeType {
    DataDependency,          // Output-to-input data flow
    CompletionDependency,    // Ordering without data flow
}
```

Validation:
- Self-edges rejected
- Out-of-bounds indices rejected
- Subtask-level dependencies merged with LLM edges
- Duplicate edges deduplicated

## Stage 4: execute_node Callback

The `PlanMonitor::run()` method accepts a callback that is the SDK integration point:

```rust,ignore
monitor.run(
    "Build a user registration API",
    &["db_url".into()],
    |description, spec| async move {
        // In production: delegate to AgentFactory::spawn() + PlanExecutor
        // In tests: return Ok/Err directly
        Ok(serde_json::json!({"status": "completed"}))
    },
).await?;
```

Callback signature: `Fn(String, Option<DesignedAgentSpec>) -> Future<Output = Result<Value, String>>`

## Stage 5: Gradient Classification (deterministic)

Source: `crates/kaizen-agents/src/gradient.rs`

Pure function `classify_failure()` maps failure events to `GradientAction` using `PlanGradient` config. No LLM.

### Rules G1-G9 (strict priority order)

| Rule | Condition                         | Action          | Zone          |
| ---- | --------------------------------- | --------------- | ------------- |
| G4   | Envelope violation                | `Blocked`       | Blocked       |
| G9   | Parent terminated                 | `Blocked`       | Blocked       |
| G5   | Plan cancelled                    | `Skip`          | Flagged       |
| G8   | Resolution timeout expired        | `Blocked`       | Blocked       |
| G6   | Budget >= `flag_threshold`        | `Flagged`       | Flagged       |
| G7   | Budget >= `hold_threshold`        | `Held`          | Held          |
| G1   | Retryable + retries remaining     | `Retry`         | AutoApproved  |
| G2   | Retries exhausted on required     | configurable    | Held/Blocked  |
| G3   | Optional node failure             | configurable    | Flagged/Held  |

```rust,ignore
let action = classify_failure(&input, &gradient);
match action {
    GradientAction::Retry { attempt, max_attempts } => { /* retry */ },
    GradientAction::Blocked { reason, dimension } => { /* stop */ },
    GradientAction::Held { reason, dimension } => { /* wait */ },
    GradientAction::Flagged { reason } => { /* log and continue */ },
    GradientAction::Skip { reason } => { /* skip node */ },
}
```

### ClassificationInput

```rust,ignore
pub struct ClassificationInput {
    pub retryable: bool,
    pub retry_count: u32,
    pub optional: bool,
    pub envelope_violation: bool,
    pub budget_usage_pct: Option<f64>,
    pub dimension: Option<String>,
    pub plan_cancelled: bool,
    pub parent_terminated: bool,
    pub resolution_timeout_expired: bool,
    pub error: String,
}
```

NaN/Inf `budget_usage_pct` values are fail-closed to `Blocked`.

## Stage 6: Diagnosis + Recomposition (LLM)

### FailureDiagnoser

Source: `crates/kaizen-agents/src/diagnoser.rs`

LLM classifies errors into `Diagnosis`:

```rust,ignore
let diagnoser = FailureDiagnoser::new(llm);
let diagnosis = diagnoser
    .diagnose("Connection refused on port 5432", Some("db_query"), None)
    .await?;
```

`DiagnosisCategory`: `Transient`, `Permanent`, `Resource`, `Dependency`, `Configuration`
`RecoveryStrategy`: `Retry`, `Replace`, `Skip`, `Restructure`, `Abort`

### Recomposer

Source: `crates/kaizen-agents/src/recomposer.rs`

Generates typed plan modification actions from a `Diagnosis`:

```rust,ignore
let recomposer = Recomposer::new(llm);
let result = recomposer
    .recompose(&diagnosis, "fetch_data_node", None)
    .await?;
```

`RecompositionAction` variants: `RetryNode`, `ReplaceNode`, `SkipNode`, `AddNode`, `RemoveEdge`, `AddEdge`.

## PlanMonitor (Integration Point)

Source: `crates/kaizen-agents/src/monitor.rs`

Ties all stages together into a single entry point.

### MonitorConfig

```rust,ignore
pub struct MonitorConfig {
    pub max_recovery_cycles: u32,      // Default: 3
    pub budget_reserve_pct: f64,       // Default: 0.05
    pub spawn_policy: SpawnPolicyConfig,
    pub budget_policy: BudgetPolicy,
    pub agent_registry: Vec<AgentCapability>,
}
```

### MonitorEvent

Tagged enum (`#[serde(tag = "type")]`) with variants:
`DecompositionStarted`, `SubtasksProduced`, `SpecsDesigned`, `PlanComposed`,
`NodeStarted`, `NodeCompleted`, `NodeFailed`, `GradientClassified`,
`RecoveryStarted`, `RecoveryCompleted`, `PlanCompleted`, `PlanFailed`, `BudgetWarning`.

### MonitorResult

```rust,ignore
pub struct MonitorResult {
    pub plan: ComposedPlan,
    pub events: Vec<MonitorEvent>,
    pub success: bool,
    pub error: Option<String>,
    pub recovery_cycles: u32,
}
```

## Testing with MockStructuredLlm

Every module's tests use a local `MockStructuredLlm` that implements `StructuredLlmClient`. Pattern:

```rust,ignore
struct MockStructuredLlm {
    responses: std::sync::Mutex<Vec<Result<serde_json::Value, OrchestrationError>>>,
}

impl MockStructuredLlm {
    fn new(responses: Vec<serde_json::Value>) -> Self { /* ... */ }
    fn with_error(err: OrchestrationError) -> Self { /* ... */ }
}

#[async_trait::async_trait]
impl StructuredLlmClient for MockStructuredLlm {
    async fn complete_structured<T: DeserializeOwned + Send>(
        &self, _request: StructuredRequest,
    ) -> Result<T, OrchestrationError> {
        // FIFO pop from responses, serde_json::from_value to T
    }
}
```

For the gradient module, no mock is needed -- `classify_failure` is a pure function.

## Common Patterns

### Composing the full pipeline manually (without PlanMonitor)

```rust,ignore
let llm: Arc<dyn StructuredLlmClient> = /* ... */;

// 1. Decompose
let decomposer = TaskDecomposer::new(Arc::clone(&llm));
let subtasks = decomposer.decompose(objective, &context_keys).await?;

// 2. Design
let designer = AgentDesigner::new(Arc::clone(&llm), registry, SpawnPolicyConfig::default());
let mut specs = Vec::new();
for subtask in &subtasks {
    let (decision, spec) = designer.design(subtask, 0.8).await?;
    specs.push(spec);
}

// 3. Compose
let composer = PlanComposer::new(Arc::clone(&llm));
let plan = composer.compose(&subtasks, &specs).await?;

// 4. Execute nodes (custom logic)
for node in &plan.nodes {
    // ...
}
```

### Gradient classification in a recovery loop

```rust,ignore
use kaizen_agents::gradient::{classify_failure, ClassificationInput, GradientAction};
use kailash_kaizen::l3::l3_core::envelope::tracker::PlanGradient;

let gradient = PlanGradient::default();
let input = ClassificationInput {
    retryable: true,
    retry_count: attempt,
    optional: node.optional,
    envelope_violation: false,
    budget_usage_pct: Some(tracker.usage_pct()),
    dimension: None,
    plan_cancelled: false,
    parent_terminated: false,
    resolution_timeout_expired: false,
    error: err_msg.clone(),
};

match classify_failure(&input, &gradient) {
    GradientAction::Retry { attempt, .. } => { /* retry */ },
    GradientAction::Blocked { reason, .. } => { /* abort */ },
    action => { /* diagnose + recompose */ },
}
```
