---
name: trust-plane
description: "Trust-plane patterns for file-backed trust project management, constraint enforcement, shadow mode, delegation, CLI, MCP, and cross-language bindings. Use when working with kailash.trust_plane or trust_plane binding modules."
---

# Trust-Plane Patterns

EATP-powered trust environment for human-AI collaborative work. File-backed trust project management with constraint enforcement, shadow mode, delegation, verification bundles, diagnostics, CLI (`attest`), and MCP server.

**Python module**: `kailash.trust_plane` (backed by Rust implementation, source-available BSL 1.1)
**Depends on**: `kailash.eatp` (EATP protocol implementation)
**Tests**: 2,187 across the trust-plane subsystem (5 red team rounds, zero deferrals)

## Quick Start

```rust
use trust_plane::project::TrustProject;
use trust_plane::types::EnforcementMode;

// Create a new trust project (generates Ed25519 keypair, EATP genesis)
let project = TrustProject::create(
    "/path/to/trust-dir".into(),
    "My Project".into(),
    "admin@acme.com".into(),
    Some(constraint_envelope),
)?;

// Check an action against constraints (shadow-aware)
let verdict = project.shadow_check("deploy-v2", &context);

// Enable shadow mode for safe constraint rollout
project.enable_shadow(candidate_envelope, shadow_config)?;
let report = project.shadow_report()?;
```

## Core Concepts

### 12 User Flows

| #   | Flow                 | Entry Point                                                 |
| --- | -------------------- | ----------------------------------------------------------- |
| 1   | Init                 | `TrustProject::create()` / `TrustProject::load()`           |
| 2   | Action Gating        | `project.shadow_check()` / `enforcer.check()`               |
| 3   | Decision Recording   | `project.record_decision()`                                 |
| 4   | Milestone Recording  | `project.record_milestone()`                                |
| 5   | Delegation           | `project.delegate()` with cascade revocation                |
| 6   | Verification         | `project.verify()` / `bundle::create()`                     |
| 7   | Audit Export         | `project.export_audit()`                                    |
| 8   | Diagnostics          | `project.diagnose()`                                        |
| 9   | Shadow Mode          | `project.enable_shadow()` / `shadow_report()` / `promote()` |
| 10  | Constraint Evolution | Monotonic tightening via `ConstraintEnvelope`               |
| 11  | Trust Repair         | `repair::run_repair()`                                      |
| 12  | SDK Integration      | Binding access via Python/Ruby/Node.js/C ABI                |

### Verdict System

```rust
pub enum Verdict {
    AutoApproved,  // Action proceeds, logged
    Flagged,       // Action proceeds, highlighted for review
    Held,          // Queued for human approval
    Blocked,       // Rejected
}
```

### Constraint Dimensions

Five dimensions from EATP (see `docs/00-authority/05-trust-framework.md`):

1. **Financial** — per-action cost limit, session budget
2. **Operational** — allowed/blocked actions
3. **Temporal** — allowed hours, session timeout, cooldown
4. **DataAccess** — resource path restrictions
5. **Communication** — channel restrictions

## Reference Documentation

| Topic                           | File                                           |
| ------------------------------- | ---------------------------------------------- |
| Project management & dual-lock  | [project-management.md](project-management.md) |
| Shadow mode design              | [shadow-mode.md](shadow-mode.md)               |
| CLI reference (17 commands)     | [cli-reference.md](cli-reference.md)           |
| MCP server patterns             | [mcp-reference.md](mcp-reference.md)           |
| Cross-language binding patterns | [binding-patterns.md](binding-patterns.md)     |

## Critical Rules

1. **Shadow check routing**: MCP `trust_check` MUST use `project.shadow_check()` not `enforcer.check()` — shadow mode must observe all actions
2. **Terminal injection**: Sanitize action names before terminal output — strip ASCII control chars (0x00-0x1F, 0x7F)
3. **Lock ordering**: Always acquire parking_lot mutex before fs4 file lock — reversed order causes deadlock
4. **Monotonic tightening**: New constraint envelopes can ONLY be stricter — prevents privilege escalation
5. **Source protection**: trust-plane Rust implementation is source-available (BSL 1.1). Users interact via Python/Ruby bindings.
6. **Binding parity**: All binding users are equal. Every feature in Python must be in Ruby, Node.js, and C ABI.

## When to Use This Skill

- Working with `kailash.trust_plane` in Python or the `kailash` gem's trust module in Ruby
- Integrating trust-plane features into your application
- Using the `attest` CLI for trust project management
- Connecting to the trust-plane MCP server
- Debugging constraint enforcement or shadow mode
- Understanding the 4-level verdict system

## Related Skills

- [10-governance](../10-governance/SKILL.md) — EATP/CARE governance via kailash-kaizen trust module
- [26-eatp-reference](../26-eatp-reference/SKILL.md) — EATP protocol specification
- [co-reference](../co-reference/SKILL.md) — CARE governance philosophy

## Support

For complex trust-plane work, invoke:

- **trust-plane-specialist** — Trust-plane patterns and architecture
- `co-reference` skill — EATP protocol questions
- **ffi-specialist** — Binding implementation
- **security-reviewer** — Security audit of trust operations
