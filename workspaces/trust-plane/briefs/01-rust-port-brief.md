# TrustPlane Rust Port Brief — kailash-rs

## What This Is

TrustPlane is the EATP reference implementation in Python (`packages/trust-plane/` in the kailash-py monorepo). This brief describes porting it to Rust as a crate in the kailash-rs ecosystem.

**Source of truth**: The R12-hardened Python implementation at `~/repos/kailash/kailash-py/packages/trust-plane/`
**Status**: 431 tests, 12 rounds of red teaming, converged at zero findings. The Python code IS the specification for the Rust port.

## Why Port to Rust

- Performance: Rust eliminates Python overhead for constraint checking on every tool call
- Safety: Rust's type system and ownership model naturally prevent several classes of bugs the Python implementation needed explicit defense against (fd leaks, double-close)
- Distribution: Single binary, no Python runtime dependency
- PyO3 bindings: Same API surface for Python users who prefer the Rust backend

## Architecture to Port

### Core Modules (port in this order)

| Priority | Python Module | Rust Equivalent | Lines | Complexity |
|----------|--------------|-----------------|-------|------------|
| 1 | `models.py` | `models.rs` | ~350 | Data structures, validation (NaN/Inf, ranges) |
| 2 | `_locking.py` | `locking.rs` | ~240 | File locking, atomic writes, safe reads |
| 3 | `project.py` | `project.rs` | ~1600 | Main TrustProject — largest module |
| 4 | `delegation.py` | `delegation.rs` | ~500 | Cascade revocation with WAL |
| 5 | `holds.py` | `holds.rs` | ~200 | Hold/approve workflow |
| 6 | `session.py` | `session.rs` | ~150 | File snapshot tracking |
| 7 | `mirror.py` | `mirror.rs` | ~150 | CARE Mirror records |
| 8 | `bundle.py` | `bundle.rs` | ~400 | Verification bundle export |
| 9 | `cli.py` | `cli.rs` | ~600 | CLI (use clap) |
| 10 | `proxy.py` | `proxy.rs` | ~380 | MCP proxy |
| 11 | `mcp_server.py` | `mcp_server.rs` | ~230 | MCP server |
| 12 | `conformance/` | `conformance.rs` | ~700 | Conformance test suite |

### EATP SDK Dependencies

The Rust port needs these from the kailash-rs EATP crates:
- `AuditAnchor`, `ActionResult`, `ChainVerifier` (chain module)
- `generate_keypair`, `sign`, `verify` (crypto module)
- `StrictEnforcer`, `ShadowEnforcer`, `Verdict` (enforce module)
- `FilesystemStore` (store module)
- `ReasoningTrace`, `ConfidentialityLevel` (reasoning module)
- `PostureStateMachine`, `TrustPosture` (posture module)

## Security Patterns to Preserve

These are the patterns hardened over 12 red team rounds. Each MUST be implemented correctly in Rust.

### 1. Symlink Protection (O_NOFOLLOW)

Python uses `os.open(path, os.O_RDONLY | os.O_NOFOLLOW)` on every file read.

Rust equivalent:
```rust
use std::os::unix::fs::OpenOptionsExt;
use libc::O_NOFOLLOW;

let file = OpenOptions::new()
    .read(true)
    .custom_flags(O_NOFOLLOW)
    .open(path)?;
```

Handle `ELOOP` errno as symlink rejection.

### 2. Atomic Writes (temp + fsync + rename)

Python: `tempfile.mkstemp()` → write → `fsync` → `rename`

Rust:
```rust
use tempfile::NamedTempFile;

let mut tmp = NamedTempFile::new_in(path.parent())?;
serde_json::to_writer_pretty(&mut tmp, &data)?;
tmp.as_file().sync_all()?;
tmp.persist(path)?;
```

### 3. File Locking (flock)

Python: `fcntl.flock(fd, LOCK_EX)` with timeout via `LOCK_NB` retry loop.

Rust:
```rust
use fs2::FileExt;

file.lock_exclusive()?;  // or try_lock_exclusive() with retry
```

### 4. fd Leak Prevention

Python needed manual `try/except` around `os.fdopen()`.

Rust: Ownership model handles this automatically — `File` drops close the fd. No special pattern needed.

### 5. NaN/Inf Rejection

Python: `math.isfinite()` in `__post_init__`.

Rust:
```rust
if !value.is_finite() {
    return Err(ValidationError::NonFiniteValue("max_cost_per_session"));
}
```

### 6. Path Traversal Prevention

Python: Regex `^[a-zA-Z0-9_-]+$` on all IDs used in file paths.

Rust: Same regex via the `regex` crate, or character-level validation.

### 7. Bounded Collections

Python: `collections.deque(maxlen=10_000)` for proxy call log.

Rust: Use `VecDeque` with manual length check, or a bounded ring buffer.

### 8. Argument Filtering (Proxy)

Python: `inspect.signature()` to filter kwargs before forwarding.

Rust: This maps to trait-based dispatch or explicit parameter structs — Rust's type system naturally prevents this class of attack since you can't pass arbitrary kwargs.

### 9. WAL Recovery (Cascade Revocation)

Python: JSON WAL file with SHA-256 content hash. Recovery reads WAL, verifies hash, completes planned revocations.

Rust: Same pattern. Use `serde_json` for WAL serialization, `sha2` crate for hashing.

### 10. Constraint Monotonic Tightening

5 dimensions. Child constraints must be a subset/tighter than parent:
- **Financial**: Lower limits, budget tracking monotonic
- **Operational**: Blocked actions superset, allowed actions subset
- **Temporal**: Shorter hours, narrower window (no wrap-around), longer cooldown
- **Data Access**: Blocked paths superset, allowed paths subset
- **Communication**: Blocked channels superset, allowed channels subset

## Data Model Reference

### ConstraintEnvelope
```
ConstraintEnvelope {
    operational: OperationalConstraints {
        blocked_actions: Vec<String>,
        allowed_actions: Vec<String>,
        blocked_patterns: Vec<String>,
    },
    financial: FinancialConstraints {
        max_cost_per_session: Option<f64>,  // must be finite, non-negative
        max_cost_per_action: Option<f64>,   // must be finite, non-negative
        budget_tracking: bool,
    },
    temporal: TemporalConstraints {
        max_session_hours: Option<f64>,     // must be finite, non-negative
        allowed_hours: Option<(u8, u8)>,    // 0-23, start < end (no wrap)
        cooldown_minutes: u32,
    },
    data_access: DataAccessConstraints {
        blocked_paths: Vec<String>,
        allowed_paths: Vec<String>,
        blocked_patterns: Vec<String>,
    },
    communication: CommunicationConstraints {
        allowed_channels: Vec<String>,
        blocked_channels: Vec<String>,
        requires_review: Vec<String>,
    },
}
```

### Trust Postures
```
enum TrustPosture {
    PseudoAgent,       // No autonomy
    Supervised,        // Human approves each action
    SharedPlanning,    // AI proposes, human approves plans
    ContinuousInsight, // AI acts, human monitors
    Delegated,         // Full autonomy within envelope
}
```

### Verification Levels
```
enum VerificationLevel {
    Quick,    // Hash check only
    Standard, // Hash + parent chain
    Full,     // Hash + parent chain + reasoning trace
}
```

## Red Team Reports

The full red team history (R3-R12) is available at:
`~/repos/kailash/kailash-py/workspaces/trust-plane/04-validate/`

Read these before implementing — they document every attack vector tested and why each security pattern exists.

## Test Approach

Port the Python test suite to Rust integration tests. Key test categories:
1. **Constraint tightening** (monotonic enforcement across all 5 dimensions)
2. **Concurrency** (file locking, atomic writes, WAL recovery)
3. **Symlink rejection** (O_NOFOLLOW on all file paths)
4. **Path traversal** (ID validation)
5. **Delegation** (cascade revocation, depth limits, dimension subsetting)
6. **NaN/Inf rejection** (constraint field validation)
7. **Conformance** (EATP behavioral verification)

## CLI (clap)

The `attest` CLI has these subcommands:
- `init` — Initialize trust plane
- `decide` — Record a decision
- `milestone` — Create a versioned checkpoint
- `verify` — Verify chain integrity
- `status` — Show trust status
- `decisions` — List decisions
- `mirror` — Record/list mirror records
- `export` — Export verification bundle
- `audit` — Generate audit report
- `migrate` — Run migrations
- `template` — Apply constraint templates
- `delegate` — Manage delegations
- `diagnose` — Constraint diagnostics

## Next Steps

1. Start with `models.rs` — pure data structures, no I/O, easy to validate
2. Then `locking.rs` — the security foundation everything builds on
3. Then `project.rs` — the main integration point
4. Port tests alongside each module
5. Run `/redteam` on the Rust implementation once it's feature-complete
