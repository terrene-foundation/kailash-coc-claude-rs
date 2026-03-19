# No Stubs, TODOs, or Simulated Data

## Scope

These rules apply to ALL production Rust code (non-test modules).

## MUST NOT Rules

### 1. No Stubs or Placeholders

Production code MUST NOT contain:

- `todo!()` macro (implement the function fully)
- `unimplemented!()` macro (provide real implementation)
- `todo!("...")` with any message
- `TODO`, `FIXME`, `HACK`, `STUB`, `XXX` comment markers
- `panic!("not implemented")` or similar placeholder panics
- Empty `impl` blocks for traits that should have logic
- `Default::default()` as a placeholder return where real logic is expected

**Detection Patterns:**

```rust
// BLOCKED in production code:
todo!()
todo!("implement later")
unimplemented!()
unimplemented!("will do this next sprint")
panic!("not yet implemented")
// TODO: implement this
// FIXME: broken
// HACK: workaround
// STUB: placeholder
```

### 2. No Simulated or Fake Data

Production code MUST NOT contain:

- Hardcoded mock responses pretending to be real API calls
- `"simulated"`, `"fake"`, `"dummy"` in variable or function names
- Returning hardcoded `Ok(serde_json::json!({"status": "ok"}))` as a placeholder
- Test fixtures compiled into production builds

**Detection Patterns:**

```rust
// BLOCKED:
fn get_user(_id: i64) -> Result<User> {
    Ok(User { name: "fake_user".into(), ..Default::default() }) // placeholder!
}
```

### 3. No Silent Error Swallowing

Production code MUST NOT silently discard errors:

- `let _ = fallible_operation();` without justification
- `.unwrap_or_default()` hiding meaningful errors
- `if let Ok(_) = ...` ignoring the `Err` case without logging
- `match result { Err(_) => {} ... }` (empty error arm)

**Detection Patterns:**

```rust
// BLOCKED:
let _ = send_notification(user_id);        // Silently discards error
let _ = db.execute(query).await;           // Lost database error
result.unwrap_or_default();                // Hides error context

// ACCEPTABLE: with explicit justification comment
let _ = cleanup_temp_file(&path);  // Best-effort cleanup, failure is non-critical
```

**Acceptable**: Discarding results in cleanup/shutdown code where failure is expected, with a comment explaining why.

### 4. No Deferred Implementation

When implementing a feature:

- Implement ALL trait methods fully, not just the happy path
- If an endpoint exists, it must return real data
- If a service is referenced, it must be functional
- Never leave "will implement later" comments
- All `match` arms must have real logic (no `_ => todo!()`)

### 5. No cfg-gated Stub Escapes

MUST NOT use `#[cfg(...)]` to conditionally compile stub implementations into production:

```rust
// BLOCKED:
#[cfg(not(test))]
fn process_payment(_amount: f64) -> Result<()> {
    todo!() // Hidden stub in production!
}
```

## Enforcement

- **PostToolUse hook**: `validate-workflow.js` **BLOCKS** (exit code 2) stub patterns in production Rust code. This is NOT a warning — it stops the operation.
- **Compile-time**: `#![deny(clippy::todo)]` and `#![deny(clippy::unimplemented)]` in production crates
- **CI**: `cargo clippy` configured to deny `todo` and `unimplemented` lints
- **Red-team agents**: Scan for violations during validation rounds. If a stub is found, the red team MUST fix it — not report it.

**Required Cargo.toml / lib.rs lint configuration:**

```rust
// In lib.rs or main.rs for production crates:
#![deny(clippy::todo)]
#![deny(clippy::unimplemented)]
#![deny(clippy::panic)]
```

## Why This Matters

Stubs and TODOs accumulate silently. Each one is a hidden failure point:

- Users encounter panics from `todo!()` / `unimplemented!()` in production
- Silent error drops mask real bugs
- Simulated data gives false confidence in demos
- TODOs never get done without active tracking
- `panic!` in async code tears down the entire tokio runtime

## Exceptions

Test modules (`#[cfg(test)]`), test files in `tests/`, and benchmark files in `benches/` are excluded from stub detection.

**There are NO exceptions for production code.** Previous versions of this rule allowed stubs with "explicit user approval." That exception is REVOKED. If you cannot implement something, ask the user what the behavior should be, then implement it. If the user says "remove it entirely," delete the function — do NOT leave a stub.

See also: `rules/zero-tolerance.md` (Absolute Rule 2)
