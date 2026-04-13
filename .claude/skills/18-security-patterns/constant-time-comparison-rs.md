# Constant-Time Comparison Patterns (Rust)

All credential / token / HMAC equality checks in the Kailash Rust SDK MUST be constant-time to prevent timing side-channel attacks. This file documents the correct pattern, the bugs it prevents, and the enforcement points.

Origin: journal `0021-RISK-r3-timing-leak-mcp-auth.md` — R3 red team found `kailash-nexus/src/mcp/auth.rs:275` used `.any()` over a list of valid API keys, which short-circuits on first match and leaks the matching position through timing. The fix pattern already existed in `kailash-auth/src/api_key.rs:116` and should have been reused.

## The Rule

**Every constant-time comparison MUST use bitwise-OR accumulation across a loop, NOT `Iterator::any()`.**

```rust
// DO — bitwise OR accumulation, always walks the full list
fn validate_api_key(token: &str, valid_keys: &[String]) -> bool {
    let mut found = false;
    for key in valid_keys {
        found |= constant_time_eq(token, key);
    }
    found
}

// DO NOT — .any() short-circuits on first match, leaks position via timing
fn validate_api_key(token: &str, valid_keys: &[String]) -> bool {
    valid_keys.iter().any(|key| constant_time_eq(token, key))
}
```

**Why `.any()` is wrong even with a constant-time inner comparison**: the individual `constant_time_eq` on each element takes constant time, but the _loop_ exits early on first match. An attacker who can measure response time (sub-millisecond, over many samples) learns _which position_ in the key list matched. During key rotation (when multiple keys are valid), this narrows brute force by one key's worth of entropy per observation. The fix is O(n) always — walk the full list, accumulate via OR, return the accumulator.

## The Helper

The canonical helper lives in `kailash-auth/src/api_key.rs:114` as a method on `ApiKeyConfig`. Every Rust crate that validates credentials MUST route through this helper, not re-implement it.

```rust
// kailash-auth/src/api_key.rs:114 (canonical, exact)
impl ApiKeyConfig {
    /// Returns true if the given key matches any valid key hash
    /// using constant-time comparison.
    pub fn validate_key(&self, key: &str) -> bool {
        let incoming_hash = sha256_hash(key.as_bytes());
        let mut found = 0u8;
        for stored in &self.valid_key_hashes {
            found |= u8::from(bool::from(incoming_hash.ct_eq(stored)));
        }
        found != 0
    }
}
```

Two invariants enforce constant-time behavior:

1. **Bitwise OR accumulation** — the loop walks the FULL `valid_key_hashes` list every call, OR-ing `ct_eq` results into `found`. No early return, no `.any()`.
2. **Hash-then-compare** — the incoming key is hashed before comparison; stored `valid_key_hashes` are SHA-256 hashes (not raw keys). This prevents length-based side-channels and protects the stored key material at rest.

**Why a single helper**: the R3 finding was a duplicate implementation drift. `kailash-nexus/src/mcp/auth.rs` had its own constant-time comparison and its own validation loop. The duplicate was "correct" in isolation but had the `.any()` bug. A single helper is the only audit point that survives refactors.

## Enforcement Checklist

Before adding any credential / token / HMAC comparison to a Rust crate:

1. **Use `kailash_auth::api_key::ApiKeyConfig::validate_key`** for list comparisons, NOT `.any()` over an inner constant-time helper.
2. **Use `subtle::ConstantTimeEq`** (via `kailash_auth::constant_time_eq`) for single comparisons — NOT `==` on `&str`, `&[u8]`, or `String`.
3. **Never short-circuit** a credential loop via `.any()`, `.find()`, `.position()`, or early `return true`.
4. **Add a regression test** in `tests/regression/` that asserts the loop walks the full list. Test pattern:

   ```rust
   #[test]
   fn test_validate_key_walks_full_list() {
       // First key matches; verify full list still walked by asserting
       // behavior on a list where later entries are invalid patterns.
       let valid = vec!["match".to_string(), "".to_string(), "x".to_string()];
       assert!(validate_key("match", &valid));
       // Timing-invariant: same function also returns false for non-match
       assert!(!validate_key("nope", &valid));
   }
   ```

## Anti-Pattern: Early Return on Length Mismatch

```rust
// DO NOT — length check leaks the expected length
fn compare(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    constant_time_eq(a, b)
}
```

**Fix**: use `subtle::ConstantTimeEq::ct_eq` on padded buffers, or accept the length leak only when the expected length is not secret (e.g., fixed-size HMAC output).

## Audit Protocol

On every red-team pass, grep for `.any(|` + `constant_time_eq` + `validate|check|verify` across `crates/*/src/**/*.rs`. Any match is a HIGH finding until proven not a credential path.

```bash
# DO — audit grep
rg -l 'constant_time_eq' crates/ | xargs rg '\.any\('

# Zero matches required. If any result, add a regression test that fails without the fix.
```

## Related

- `rules/security.md` — parameterized queries, secret management, credential decode
- `skills/18-security-patterns/fail-closed-defaults-rs.md` — companion rule on security-adjacent defaults
- `kailash-auth/src/api_key.rs:116-121` — canonical helper
- `kailash-nexus/src/mcp/auth.rs:275-285` — example fix site (post-R3)
