# Trust-Plane MCP Server

## Overview

The trust-plane MCP server exposes trust operations as Model Context Protocol tools and resources, enabling AI agents to interact with trust enforcement through standard MCP transports (HTTP/SSE, stdio).

**Feature flag**: `mcp` (requires `dep:axum`)

```toml
[dependencies]
trust-plane = { path = "crates/trust-plane", features = ["mcp"] }
```

## Tools (5)

### `trust_check`

Evaluate an action against the constraint envelope.

**Params**: `trust_dir` (string), `action` (string), `context` (object with optional `channel`, `resource_path`, `estimated_cost`)

**Returns**: Verdict (AutoApproved/Flagged/Held/Blocked) with reason.

**Critical**: Routes through `project.shadow_check()` so shadow mode observes the action.

### `trust_record`

Record a decision or milestone.

**Params**: `trust_dir` (string), `action` (string), `decision_type` (optional, defaults to Implementation), `rationale` (string)

**Returns**: Decision record ID and verdict.

Uses `DecisionType::from_str_lossy` for resilient parsing of the `decision_type` parameter.

### `trust_envelope`

Return the current constraint envelope.

**Params**: `trust_dir` (string)

**Returns**: Full constraint envelope JSON (all 5 dimensions).

### `trust_status`

Return project manifest summary.

**Params**: `trust_dir` (string)

**Returns**: Enforcement mode, constraint summary, shadow mode status.

### `trust_verify`

Run integrity verification on the project.

**Params**: `trust_dir` (string)

**Returns**: Chain integrity, signature verification, hash link status.

## MCP Shadow Blindness Fix (Round 5)

**Problem**: `handle_trust_check()` originally called `enforcer.check()` directly. When shadow mode was active, MCP-gated AI actions were invisible to the shadow enforcer.

**Fix**: Replaced with `project.shadow_check()` which routes through the `ShadowEnforcer` when active.

**Test**: `mcp_trust_check_routes_through_shadow` — verifies shadow records are populated after MCP trust_check.

## MCP Path Canonicalization

Resource paths in MCP requests are canonicalized for cache consistency. This prevents `/foo/../bar` and `/bar` from being treated as different paths.

## Implementation

```rust
// crates/trust-plane/src/mcp/mod.rs — Main MCP handler
// crates/trust-plane/src/mcp/proxy.rs — MCP proxy utilities
```

17 MCP tests pass.
