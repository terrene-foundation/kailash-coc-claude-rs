# Messaging

Inter-agent communication: typed payloads, priority-aware channels, routing, and dead letters.

## Source Files

### Core (sync, WASM-compatible)

- `crates/kailash-kaizen/src/l3/core/messaging/types.rs` -- `MessageEnvelope`, `L3MessagePayload`, `Priority`, `DelegationPayload`, `StatusPayload`, `ClarificationPayload`, `CompletionPayload`, `EscalationPayload`, `SystemPayload`, `EscalationSeverity`, `ResourceSnapshot`, `RoutingError`, `ChannelError`, `DeadLetterReason`
- `crates/kailash-kaizen/src/l3/core/messaging/mod.rs` -- re-exports

### Runtime (async, requires tokio)

- `crates/kailash-kaizen/src/l3/runtime/messaging/router.rs` -- `MessageRouter`, `InstanceLookup`, `AgentStateSummary`
- `crates/kailash-kaizen/src/l3/runtime/messaging/channel.rs` -- `MessageChannel`
- `crates/kailash-kaizen/src/l3/runtime/messaging/dead_letter.rs` -- `DeadLetterStore`, `DeadLetterEntry`

## Message Payloads (6 types)

| Payload                | Direction                    | Purpose                                  |
| ---------------------- | ---------------------------- | ---------------------------------------- |
| `DelegationPayload`    | Parent -> Child              | Assign a task with envelope and context  |
| `StatusPayload`        | Child -> Parent              | Progress reports with resource snapshot  |
| `ClarificationPayload` | Bidirectional (parent-child) | Request/provide clarification            |
| `CompletionPayload`    | Child -> Parent              | Task completion with result and cost     |
| `EscalationPayload`    | Descendant -> Ancestor       | Severity-based issue escalation          |
| `SystemPayload`        | Any                          | Infrastructure messages (no constraints) |

All payloads are wrapped in `L3MessagePayload` (enum) and transported via `MessageEnvelope`.

## MessageEnvelope

Transport wrapper for all L3 messages:

- `message_id: Uuid` -- unique identifier
- `correlation_id: Option<Uuid>` -- links request/response pairs
- `sender: Uuid` -- sender instance ID
- `recipient: Uuid` -- recipient instance ID
- `payload: L3MessagePayload` -- the typed payload
- `priority: Priority` -- Low/Normal/High/Critical
- `created_at: DateTime<Utc>` -- creation timestamp
- `ttl: Option<Duration>` -- time-to-live (expired messages go to dead letters)

## Priority

4 levels with derived ordering (`Critical > High > Normal > Low`):

```
Low(0) < Normal(1) < High(2) < Critical(3)
```

Default is `Normal`. Higher-priority messages are dequeued first from channels.

## MessageRouter (8-Step Validation)

Every `route()` call performs these checks in order:

1. **TTL check** -- expired messages go to dead letters
2. **Sender existence** -- sender must be known to the registry
3. **Recipient existence** -- recipient must be known
4. **Recipient state** -- terminal recipients reject messages
5. **Communication envelope check** -- reserved for future PACT integration
6. **Message type directionality** -- enforces parent-child relationship rules
7. **Channel existence** -- a channel must exist between sender and recipient
8. **Deliver** -- priority-aware send via `MessageChannel`

### Directionality Rules

| Payload Type       | Rule                                   |
| ------------------ | -------------------------------------- |
| Delegation         | Sender must be parent of recipient     |
| Status, Completion | Sender's parent must be recipient      |
| Clarification      | One must be the other's parent         |
| Escalation         | Sender must be descendant of recipient |
| System             | No constraint (infrastructure)         |

The router uses the `InstanceLookup` trait to query lineage without coupling to the full registry.

## MessageChannel

Bounded, priority-aware, unidirectional async channel:

- `send(envelope)` -- enqueues with priority ordering
- `recv()` -- blocking dequeue (higher priority first, FIFO within same priority)
- `try_recv()` -- non-blocking dequeue
- `close()` -- closes the channel, moves pending messages to dead letters
- `create_bidirectional_channels(a, b, capacity)` -- creates paired channels

Internally uses `BinaryHeap` behind `parking_lot::Mutex` + `tokio::sync::Notify`.

## DeadLetterStore

Bounded ring buffer for undeliverable messages:

- `new(max_capacity)` -- creates store with bounded capacity
- `record(envelope, reason)` -- stores undeliverable message (evicts oldest if full)
- `recent(limit)` -- returns most recent entries (newest first)
- `count()` -- total dead letters received

Thread-safe via `parking_lot::Mutex`.

## EscalationSeverity

4 severity levels for escalation messages:

- `Blocked` -- cannot proceed, not time-critical
- `Warning` -- unexpected condition, degraded quality
- `BudgetAlert` -- envelope dimension approaching exhaustion (80%+)
- `Critical` -- hard failure, immediate intervention required
