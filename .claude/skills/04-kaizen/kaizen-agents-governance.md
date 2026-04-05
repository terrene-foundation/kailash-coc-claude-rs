# Governance, Audit, Bridges, and Supervisor

All modules live in `crates/kaizen-agents/src/`. They are orchestration-level -- they WIRE SDK primitives (kailash-pact, eatp, kailash-kaizen L3), not reimplementing them.

## Architecture: Why Governance Lives Here

- **kailash-pact**: Deterministic governance engine. Compiles org structure, evaluates access, produces verdicts. No LLM.
- **kailash-enterprise**: Cross-cutting enterprise features (RBAC, ABAC, audit). Not agent-specific.
- **kaizen-agents governance/**: Operationalizes governance. Translates PACT verdicts into agent state transitions, LLM prompt modifications, and human escalations.

**Boundary rule**: SDK validates/enforces (deterministic). Orchestration proposes/decides (LLM-aware).

## GovernedSupervisor (Progressive Disclosure)

Entry point at `supervisor.rs`. Three layers:

```rust
// Layer 1: Simple (zero governance knowledge needed)
let sup = GovernedSupervisor::new("gpt-4o", 10.0);

// Layer 2: Configured
let sup = GovernedSupervisor::new("gpt-4o", 10.0)
    .with_clearance(ClearanceLevel::Secret)
    .with_max_agents(100)
    .with_max_recovery_cycles(5);

// Layer 3: Advanced (inject custom components)
let sup = GovernedSupervisor::new("gpt-4o", 10.0)
    .with_accountability(custom_tracker)
    .with_audit(custom_trail)
    .with_bypass(custom_manager);
```

Accessors: `sup.audit()`, `sup.budget()`, `sup.lifecycle()`, `sup.accountability()`, `sup.clearance()`, `sup.bypass()`, `sup.cascade()`, `sup.vacancy()`, `sup.dereliction()`, `sup.transport()`.

### GovernedSupervisor::run()

Full governed orchestration cycle. Creates a `PlanMonitor` with `GovernanceHooks`, executes the objective, returns `SupervisorResult`:

```rust
let result = sup.run(
    llm,              // Arc<S: StructuredLlmClient>
    "Build a user registration API",
    &["db_url".to_string()],
    |description, spec| async move {
        Ok(serde_json::json!({"status": "completed"}))
    },
).await?;

// SupervisorResult fields:
// output, audit_record_count, cascade_event_count, budget_remaining_pct,
// agents_spawned, dereliction_warning_count, bypass_approvals
```

### build_governance_hooks()

Builds `GovernanceHooks` from the supervisor's `Arc` components. Hooks share the same `Arc` references, so governance state is visible from both the supervisor accessors and the `PlanMonitor` during execution.

```rust
let hooks = sup.build_governance_hooks();
let monitor = PlanMonitor::new(llm, config).with_governance(hooks);
```

### governance_snapshot()

Takes a point-in-time `GovernanceSnapshot` for anti-amnesia injection:

```rust
let snap = sup.governance_snapshot();
// Fields: budget_remaining_pct, budget_consumed_microdollars,
// plan_progress_pct, nodes_completed, nodes_total,
// held_actions_count, active_agents_count, cascade_events_count
```

## GovernanceHooks (PlanMonitor Integration)

Defined in `monitor.rs`. Optional governance components wired into `PlanMonitor` via `PlanMonitor::with_governance()`.

When attached, the monitor:

- Records audit events at each phase (decompose, design, spawn, complete)
- Checks clearance before granting context to subtasks
- Registers agents in the accountability tracker on spawn
- Detects dereliction on failure and triggers cascades on Critical severity
- Registers held actions in the bypass manager
- Scans for vacancies after agent termination
- Tracks budget consumption and emits warnings
- Injects governance state into LLM context (anti-amnesia)

```rust
// GovernanceHooks struct fields (all Arc-wrapped):
pub struct GovernanceHooks {
    pub lifecycle: Arc<AgentLifecycleManager>,
    pub accountability: Arc<AccountabilityTracker>,
    pub clearance: Arc<ClearanceEnforcer>,
    pub cascade: Arc<CascadeManager>,
    pub bypass: Arc<BypassManager>,
    pub vacancy: Arc<VacancyManager>,
    pub dereliction: Arc<DerelictionDetector>,
    pub budget: Arc<GovernanceBudgetTracker>,
    pub audit: Arc<AuditTrail>,
    pub transport: Arc<MessageTransport>,
    pub default_clearance: ClearanceLevel,
    pub default_address_prefix: String,
    pub hold_timeout: Duration,
}
```

Constructor: `GovernanceHooks::new(lifecycle, accountability, ...)` with default clearance `Restricted`, default address prefix `"D1-R1"`, hold timeout 300s.

`GovernanceHooks::snapshot(nodes_completed, nodes_total)` produces a `GovernanceSnapshot` for anti-amnesia injection into LLM context.

## Governance Modules

### accountability.rs -- D/T/R Tracking

- `AccountabilityTracker`: maps D/T/R address strings to agent UUIDs
- D/T/R format validated by regex: `D\d+(/T\d+)*/R\d+`
- `assign()`, `unassign()`, `lookup()`, `record_action()`
- Thread-safe: `DashMap` for assignments, `RwLock` for records

### clearance.rs -- 5-Level Classification

- `ClearanceLevel`: Public(0), Restricted(1), Confidential(2), Secret(3), TopSecret(4)
- `ClearanceEnforcer`: agent clearance management with **monotonic raise invariant** (can only go up)
- `ClassificationAssigner`: rule-based classification with simple glob patterns
- `check_access()`: returns `OrchestrationError::ClearanceViolation` if agent level < data level
- `filter_keys()`: returns only keys agent has clearance to see

### cascade.rs -- Revocation Cascade

- `CascadeManager`: coordinates multi-level agent termination
- `trigger_cascade(source, trigger, reason)` -> terminates source + all descendants
- Uses `AgentLifecycleManager::terminate()` for BFS cascade
- `CascadeTrigger`: TrustRevocation, EnvelopeViolation, ParentTermination, DerelictionCritical, ManualOverride
- Events are append-only

### bypass.rs -- Emergency Bypass

- `BypassManager`: hold/approve/reject flow for actions exceeding governance thresholds
- **Invariant**: `approve()` REQUIRES non-empty `approved_by` (human approval)
- **Invariant**: expired holds cannot be approved
- **Invariant**: rejected holds cannot be later approved
- Dual-lock pattern: both `pending` and `approved` locks held during `approve()` (TOCTOU fix)

### vacancy.rs -- Orphaned Resource Detection

- `VacancyManager`: detects agents whose parent is in terminal state
- `detect_orphans()`: idempotent -- same orphan not re-reported
- `VacancyAction`: CascadeTerminated, Reassigned, Frozen
- Uses `DashMap` for known-orphan tracking

### dereliction.rs -- Duty Monitoring

- `DerelictionDetector`: monitors agent behavior against configurable thresholds
- `DerelictionConfig`: heartbeat_timeout(60s), progress_interval(300s), max_idle_time(600s), budget_overspend_threshold(1.1)
- Severity escalation: 1st offense=Warning, 2nd=Serious, 3rd+=Critical
- `check_budget()`: fail-closed on NaN/Inf (treats as overspend)
- `DutyType`: RespondToMessages, ReportProgress, RespectBudget, CompleteAssignedTasks

### budget.rs -- Unified Budget View

- `GovernanceBudgetTracker`: AtomicU64 microdollar counters
- `record_consumption()`: CAS loop -- rejects over-budget consumption (returns false)
- `record_reclamation()`: capped at consumed amount (prevents inflation)
- `snapshot()`: point-in-time view with zone classification (normal/warning/flagged/held/blocked)
- NaN/Inf/negative clamped to 0 at API boundary via `is_finite()` check

## Audit Module

### trail.rs -- Append-Only Audit Chain

- `AuditTrail`: append-only `Vec<AuditRecord>` behind `RwLock`
- `AuditRecord`: id, timestamp, event_type, agent_id, action, reasoning_trace_id, context
- `record_with_reasoning()`: links to eatp `ReasoningTrace` for KZ-040
- 12 `AuditEventType` variants covering full governance lifecycle
- No delete/modify/clear operations

## Bridge Modules

### scope_bridge.rs -- Context Projection + Anti-Amnesia

- `project_for_child()`: filters parent context to child-visible keys
- `filter_by_clearance()`: filters by classification level
- `inject_governance_state()`: injects `GovernanceSnapshot` for KZ-041 anti-amnesia
- `GovernanceSnapshot`: budget, progress, holds, agents, cascades

### message_transport.rs -- Protocol Bridge

- `MessageTransport`: converts ClarificationMessage/EscalationMessage/DelegationMessage to `TransportEnvelope`
- `TransportPayload`: Clarification, Escalation, Delegation, Completion, Status
- Backed by `parking_lot::RwLock<Vec<TransportEnvelope>>`

### agent_lifecycle.rs -- PlanMonitor-to-L3 Coordinator

- `AgentLifecycleManager`: spawn/terminate agents, track plan node mapping
- `spawn_for_node()`: returns `Result<Uuid>`, rejects duplicate node_ids
- `terminate()`: BFS cascade termination of descendants
- Dual-lock pattern: `agents` then `node_to_agent` (documented ordering)
- `LifecycleState`: Pending, Running, Waiting, Completed, Failed, Terminated

## Thread Safety Patterns

All types are `Send + Sync` (asserted in tests). Patterns used:

- `DashMap`: concurrent read/write maps (accountability, clearance, dereliction, vacancy)
- `parking_lot::RwLock`: append-only logs (audit, cascade events, budget events)
- `AtomicU64`: lock-free counters (budget microdollars)
- CAS loops: `compare_exchange_weak` for budget consumption/reclamation

## Error Variants (added to OrchestrationError)

```rust
ClearanceViolation { agent_clearance: u8, required: u8 }
CascadeFailed(String)
BypassRequired { held_action_id: Uuid }
DerelictionDetected { agent_id: Uuid, duty: String }
VacancyDetected { agent_id: Uuid }
GovernanceViolation(String)
```

## Key Invariants

1. **Bypass requires human approval** -- no auto-bypass path
2. **Clearance is monotonically raised** -- no downgrade
3. **Cascade is atomic** -- all-or-nothing via single lock
4. **Audit trail is append-only** -- no delete/modify
5. **Budget consumption CAS-protected** -- rejects over-budget
6. **Reclamation capped at consumed** -- prevents inflation
7. **Orphan detection is idempotent** -- same orphan not re-reported
8. **Dereliction NaN/Inf fail-closed** -- treated as overspend
9. **Duplicate node_id rejected** -- spawn_for_node returns error
