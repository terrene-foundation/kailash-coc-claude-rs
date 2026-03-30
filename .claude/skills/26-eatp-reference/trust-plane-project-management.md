# Trust-Plane Project Management

## TrustProject — Central Orchestrator

`TrustProject` is the single entry point for all trust operations. It holds in-memory state backed by a filesystem directory.

### Initialization

```rust
use trust_plane::project::TrustProject;

// Create a new trust project (generates Ed25519 keypair, creates directory structure)
let project = TrustProject::create(
    "/path/to/trust-dir".into(),
    "Project Alpha".into(),
    "admin@acme.com".into(),
    Some(constraint_envelope),  // None for unconstrained
)?;

// Load an existing project
let project = TrustProject::load("/path/to/trust-dir".into())?;
```

### Dual-Lock Pattern

All mutating methods use a two-phase lock:

1. **In-process**: `parking_lot::Mutex<()>` — prevents thread interleaving
2. **Cross-process**: `fs4` file lock — prevents concurrent process access

**Lock ordering is critical**: Always acquire parking_lot first, then fs4. Reversed order causes deadlock.

```
Thread A: parking_lot.lock() → fs4.lock() → mutate → fs4.unlock() → parking_lot.unlock()
Thread B: parking_lot.lock() [blocks until A releases] → ...
Process B: fs4.lock() [blocks until Thread A releases fs4] → ...
```

### Directory Structure

```
trust-dir/
  manifest.json          # ProjectManifest (bookkeeping)
  decisions/             # Decision records (JSON)
  milestones/            # Milestone records (JSON)
  anchors/               # Audit anchor records
  chains/                # CARE chain blocks
  delegates/             # Delegation records (with WAL)
  holds/                 # Held action records
  mirror/
    execution/           # Mirror execution records
    escalation/          # Mirror escalation records
    intervention/        # Mirror intervention records
  keys/                  # Ed25519 key material
```

### ProjectManifest

Tracks metadata:

- Project ID, name, creation date
- Current enforcement mode
- Constraint envelope hash
- Shadow mode status
- Active audit session ID

### Enforcement Modes

```rust
pub enum EnforcementMode {
    /// Violations are blocked (fail-closed).
    Strict,
    /// Violations are logged but allowed (fail-open, for rollout).
    Shadow,
}
```

## Constraint Envelope

A signed container holding the active constraint configuration:

```rust
use trust_plane::envelope::ConstraintEnvelope;
use trust_plane::constraints::*;

let mut envelope = ConstraintEnvelope::default();
envelope.financial = FinancialConstraints {
    max_cost_per_action: Some(100.0),
    max_cost_per_session: Some(1000.0),
    budget_tracking: true,
};
envelope.temporal = TemporalConstraints {
    allowed_hours: Some(vec![(9, 17)]),  // 9 AM to 5 PM UTC
    max_session_hours: Some(8.0),
    cooldown_minutes: Some(5),
};
envelope.operational = OperationalConstraints {
    blocked_actions: vec!["delete-production".into()],
    allowed_actions: None,  // all actions permitted except blocked
};
envelope.data_access = DataAccessConstraints {
    blocked_paths: vec!["/etc/**".into()],
    blocked_patterns: vec!["*.key".into()],
    read_paths: None,
    write_paths: None,
};
envelope.communication = CommunicationConstraints {
    blocked_channels: vec!["sms".into()],
    allowed_channels: None,
    requires_review: false,
};
```

### Monotonic Tightening

New envelopes can ONLY be stricter than the current one. This is enforced by `ConstraintEnvelope::is_tighter_than()`:

- Financial limits can only decrease (lower max cost)
- Temporal windows can only narrow (fewer allowed hours)
- Operational blocked lists can only grow (more restrictions)
- Reverting a restriction requires a new trust chain block

### Constraint Templates

Built-in templates for common configurations:

```rust
use trust_plane::templates::TemplateRegistry;

let registry = TemplateRegistry::new(); // pre-populated with 3 built-in templates
let template = registry.get_template("governance", "Terrene Foundation")
    .ok_or("template not found")?;
let envelope = template.envelope.clone(); // ConstraintEnvelope ready to use
```

## Delegation

Delegation with cascade revocation:

```rust
// Create delegation
project.delegate(delegator_id, delegate_id, scope, constraints)?;

// Revoke (cascades to all sub-delegations)
project.revoke_delegation(delegation_id)?;
```

**WAL (Write-Ahead Log)**: Delegation operations use a write-ahead log for crash recovery. If a process crashes mid-delegation, the WAL replays on next `open()`.

## Audit Sessions

```rust
// Start a session (captures filesystem snapshot)
project.start_audit_session()?;

// ... perform operations ...

// End session (computes diff, exports report)
let report = project.end_audit_session()?;
```

Sessions capture a before/after snapshot of the trust directory, enabling full audit trail.

## Verification

```rust
// Verify all integrity (chain, signatures, hash links)
project.verify()?;

// Create verification bundle (portable proof)
let bundle = trust_plane::bundle::create(&project)?;
bundle.export_html("/path/to/report.html")?;
```

## Diagnostics

```rust
// Run constraint quality analysis
let diagnostics = project.diagnose()?;
// Returns: coverage gaps, overly broad constraints, unused templates
```

## Error Types

```rust
pub enum TrustPlaneError {
    Io(std::io::Error),
    Serialization(serde_json::Error),
    LockTimeout { path: String, timeout_secs: f64 },
    KeyNotFound(String),
    ChainError(String),
    ConstraintViolation(String),
    InvalidId(String),
    TamperDetected(String),
    SessionError(String),
    DelegationError(String),
    HoldError(String),
    MigrationError(String),
    InvalidTransition { from: String, to: String },
    Eatp(String),
    DuplicateTemplate { name: String, author: String },
    BundleIntegrity(String),
    ConformanceError(String),
}
```

## Key Gotchas

1. `TrustProject` is NOT `Sync` — wrap in `Arc<Mutex<TrustProject>>` for shared access
2. `load()` replays any pending WAL entries from previous crashes
3. File locks are advisory on some platforms — fs4 uses OS-specific implementations
4. Constraint evolution is one-way (tightening only) — loosening requires a new chain block
5. Audit sessions hold a filesystem snapshot in memory — large directories may use significant RAM
