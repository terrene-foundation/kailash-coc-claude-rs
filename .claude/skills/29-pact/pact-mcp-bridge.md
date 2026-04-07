# PACT MCP Bridge (`mcp` feature, KZ-091)

PACT governance enforcement on MCP tool invocations. Behind `mcp` feature flag.

## Usage

```rust
use kailash_pact::mcp::{PactMcpBridge, AgentContext, McpVerdict};
use kailash_pact::clearance::ClassificationLevel;

let mut bridge = PactMcpBridge::new();

// Register tool policies (default-deny: unregistered tools are BLOCKED)
bridge.register_tool_policy("file_read", ClassificationLevel::Public, Some(0.01));
bridge.register_tool_policy("database_query", ClassificationLevel::Confidential, Some(1.0));

// Evaluate a tool call
let ctx = AgentContext::new(ClassificationLevel::Confidential, 5.0); // clearance, daily spending USD
let verdict = bridge.evaluate_tool_call("file_read", &serde_json::json!({"path": "/etc"}), &ctx);
assert!(verdict.is_allowed());
```

## Evaluation Algorithm (6 steps, fail-closed)

1. Never-delegated check (7 actions always HELD)
2. Registration check -> unregistered = BLOCKED
3. Clearance check -> tool requires higher = BLOCKED
4. Financial: transaction amount -> exceeds limit = HELD, >=80% = FLAGGED
5. Financial: daily spending -> projected exceeds = HELD, >=80% = FLAGGED
6. Default -> AUTO_APPROVED

## Security

- **NaN/Inf protection**: All financial values validated with `is_finite()`. Non-finite = BLOCKED.
- **Thread safety**: `PactMcpBridge` is `Send + Sync`. Wrap in `Arc<RwLock<_>>` for concurrent mutable registration.
- **Default-deny**: Unregistered tools are always BLOCKED.

## Types

- `PactMcpBridge` -- tool policy registry
- `McpVerdict` -- 4-zone verdict with `is_allowed()` (true for AutoApproved/Flagged), `severity()` (0-3), `tool_name()`, `reason()` (None for AutoApproved)
- `ToolPolicy` -- clearance + optional financial limit
- `AgentContext::new(clearance, daily_spending_usd)`

**47 tests** covering all verdict paths, NaN bypass prevention, serde roundtrips.
