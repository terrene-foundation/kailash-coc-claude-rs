# Rust Auth Middleware Patterns (Nexus)

Patterns discovered during v3.8 red team. Apply when reviewing `crates/kailash-nexus/src/auth/`.

## Constant-Time Comparison

```rust
// ❌ WRONG — .any() short-circuits, leaking which key matched
self.valid_key_hashes.iter()
    .any(|stored| bool::from(incoming.ct_eq(stored)))

// ✅ CORRECT — always iterate ALL keys
let mut found = 0u8;
for stored in &self.valid_key_hashes {
    found |= u8::from(bool::from(incoming.ct_eq(stored)));
}
found != 0
```

## Deny-by-Default MUST Deny

```rust
// ❌ WRONG — passes through when deny_by_default is true
} else if self.config.deny_by_default {
    let future = self.inner.call(req);  // BUG: should deny!
    return Box::pin(future);

// ✅ CORRECT
} else if self.config.deny_by_default {
    return Box::pin(async { Ok(forbidden_response()) });
```

## Higher-Level Engines Delegate

```rust
// ❌ WRONG — reimplements query building, skips validation
let (sql, values) = query::build_list(&model, ...)?;

// ✅ CORRECT — delegates to express which validates offset/limit
self.express.list(model_name, express_opts).await
```

## Budget Checks Include Reservations

```rust
// ❌ WRONG — ignores in-flight reservations
committed > allocated

// ✅ CORRECT
committed.saturating_add(reserved) > allocated
```
