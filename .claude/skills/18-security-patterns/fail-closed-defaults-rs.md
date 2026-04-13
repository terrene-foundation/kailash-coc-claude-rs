# Fail-Closed Defaults (Rust)

Security-adjacent defaults in the Kailash Rust SDK MUST be restrictive. Every `Default` impl, `default()` constructor, and config builder that touches classification, clearance, file permissions, delegation chains, path loading, or audit durability MUST fail-closed — the permissive behavior is opt-in only.

Origin: journal `0018-RISK-six-high-security-findings.md` — red team round 1 found **four of six HIGH findings shared a single root cause: security-relevant defaults were permissive rather than restrictive**. H1 (classification clearance defaulted to `HighlyConfidential`), H2 (EATP registry silently overwrote entries), H3/H4 (file permissions defaulted to umask, world-readable), H5 (path loading defaulted to "any path"), H6 (unsound `Send`+`Sync` claimed without runtime invariant). All fixed in PR #334.

## The Pattern

For every security-adjacent type, ask: **"If the operator forgets to configure this, what happens?"**

- **Fail-closed** — they get the most restrictive, non-functional state. Must explicitly opt in to permissive behavior. CORRECT.
- **Fail-open** — they get the permissive state silently. Operators believe they enabled security; they didn't. BLOCKED.

## Canonical Examples (Post-R1)

### 1. Thread-Local Clearance Default

**Canonical implementation**: `crates/kailash-dataflow/src/classification.rs:55-121`. The DataFlow caller clearance uses `DataClassification` (variants `Public, Internal, Sensitive, PII, GDPR, HighlyConfidential`), NOT `kailash-governance::ClassificationLevel` (which is a separate enum for PACT clearance gradient).

```rust
// DO — fail-closed: default is the LOWEST clearance (Public), not the highest
// crates/kailash-dataflow/src/classification.rs:73-79
thread_local! {
    static CALLER_CLEARANCE: RefCell<DataClassification> =
        const { RefCell::new(DataClassification::Public) };
}

// Scoped installation — rolls back on panic via Drop
pub fn with_caller_clearance<F, R>(level: DataClassification, f: F) -> R
where F: FnOnce() -> R
{
    let prev = CALLER_CLEARANCE.with(|c| std::mem::replace(&mut *c.borrow_mut(), level));
    let _guard = scopeguard::guard((), |_| {
        CALLER_CLEARANCE.with(|c| *c.borrow_mut() = prev);
    });
    f()
}

// DO NOT — fail-open: any thread that forgot with_caller_clearance
// reads unredacted PII, silently.
thread_local! {
    static CALLER_CLEARANCE: RefCell<DataClassification> =
        const { RefCell::new(DataClassification::HighlyConfidential) };
}
```

**Why**: Operators enable classification believing PII will be redacted. With a fail-open default, PII is only redacted when the caller _explicitly_ sets a clearance level — which is effectively never in default configurations. The entire security feature becomes a no-op.

**Read-path enforcement**: `apply_read_classification` in the same file masks any field whose sensitivity is strictly above `current_caller_clearance()`. A `Public` caller sees redacted values for Internal/Sensitive/PII/GDPR/HighlyConfidential. A `HighlyConfidential` caller sees every field verbatim.

**Note on enum naming**: Three Classification enums exist in the workspace — do not confuse them:

- `kailash-dataflow::DataClassification` — PII/redaction tagging (`Public, Internal, Sensitive, PII, GDPR, HighlyConfidential`). This is the one used for read-path masking.
- `kailash-governance::ClassificationLevel` — clearance gradient for PACT (`Public=0, Restricted=1, Confidential=2, Secret=3, TopSecret=4`).
- `eatp::constraints::DataClassification` — constraint-layer enum (`Public, Internal, Confidential, Restricted, TopSecret`).

### 2. Registry / Delegation: Reject Duplicates

**Cross-binding gap — this fix is currently Python-only.** The R1 H2 fix for `EatpAuthorityRegistry` duplicate-rejection lives at `bindings/kailash-python/src/eatp.rs:2417-2510`. The Rust `crates/eatp/` crate has **no `AuthorityRegistry` type at all**. Ruby, Node.js, WASM, C ABI, and Rust-native callers of `crates/eatp/` directly have zero duplicate-rejection protection. This is tracked as a HIGH outstanding gap in `specs/bindings.md` and needs backporting.

The pattern below is the CORRECT shape — use it when you backport to the Rust crate, or when adding duplicate-rejection to any other registry type in the workspace (delegation, key store, posture registry, etc.).

```rust
// DO — register rejects duplicates; intentional rotation uses replace(force_replace=true)
impl AuthorityRegistry {
    pub fn register(&mut self, id: AuthorityId, key: VerifyingKey) -> Result<(), RegistryError> {
        if self.entries.contains_key(&id) {
            return Err(RegistryError::DuplicateAuthority(id));
        }
        self.entries.insert(id, key);
        Ok(())
    }

    pub fn replace(&mut self, id: AuthorityId, key: VerifyingKey, force_replace: bool)
        -> Result<(), RegistryError>
    {
        if !force_replace && self.entries.contains_key(&id) {
            return Err(RegistryError::ReplaceRequiresForce);
        }
        self.entries.insert(id, key);
        Ok(())
    }
}

// DO NOT — blind overwrite hijacks delegation chains
impl AuthorityRegistry {
    pub fn register(&mut self, id: AuthorityId, key: VerifyingKey) {
        self.entries.insert(id, key);  // silently replaces existing
    }
}
```

**Why**: A single registry-write permission must not escalate to full delegation control. Blind overwrite means any authority holder can impersonate any other authority by re-registering with a new key.

**Python binding reference implementation**: the Python shim at `bindings/kailash-python/src/eatp.rs:2417-2510` wraps an internal HashMap + duplicate check + `force_replace` parameter. When backporting to Rust, the shape should match so the binding can delegate through. Regression test lives at `bindings/kailash-python/tests/regression/test_h2_authority_register_hijack.py`.

### 3. File Permissions: 0o600 on Sensitive Files

```rust
// DO — sensitive files created with 0o600 (owner read/write only)
use std::os::unix::fs::OpenOptionsExt;

let file = OpenOptions::new()
    .write(true)
    .create(true)
    .mode(0o600)  // BEFORE open: prevents any window where file is world-readable
    .open(audit_db_path)?;

// Tighten permissions even on pre-existing files:
#[cfg(unix)]
std::fs::set_permissions(&audit_db_path, Permissions::from_mode(0o600))?;
```

**Why**: Default umask (typically `0o022`) produces `0o644` files — world-readable. Audit rows contain HMAC signatures, PII, and role addresses. Evidence JSONL contains queries, tool args. A fail-open default means every operator who enabled audit is leaking audit data to any local user.

### 4. Path Loading: Allowlist, Not Free Path

```rust
// DO — allowlist-driven, canonicalized, symlink + device-file rejected
pub struct BackendConfig {
    /// Roots under which model files may be loaded.
    /// Empty list = default-deny: no models can be loaded.
    pub allowed_model_roots: Vec<PathBuf>,
}

impl LlamaCppBackend {
    pub fn load_model(&self, path: &Path) -> Result<(), BackendError> {
        let canonical = path.canonicalize()?;

        // 1. Must be under an allowed root
        let allowed = self.config.allowed_model_roots.iter()
            .any(|root| canonical.starts_with(root.canonicalize().unwrap_or(root.clone())));
        if !allowed {
            return Err(BackendError::PathOutsideAllowedRoots(canonical));
        }

        // 2. Reject symlinks (could point outside allowed roots)
        if path.symlink_metadata()?.file_type().is_symlink() {
            return Err(BackendError::SymlinksRejected);
        }

        // 3. Reject device files
        let meta = std::fs::metadata(&canonical)?;
        if !meta.is_file() {
            return Err(BackendError::NotARegularFile);
        }

        // proceed...
        Ok(())
    }
}

// DO NOT — trust caller path unconditionally
pub fn load_model(&self, path: &Path) -> Result<(), BackendError> {
    let bytes = std::fs::read(path)?;  // /etc/passwd, /dev/zero, symlinks — all loadable
    // ...
}
```

**Why**: Model-loading is the primary user-controlled input to the serving layer. Without containment, any caller can read arbitrary host files through the model interface.

### 5. Unsafe Send/Sync: Explicit Invariant + Runtime Enforcement

```rust
// DO — SAFETY note describes the actual invariant, and runtime enforces it
/// SAFETY: `llama_context` is a raw pointer to a C struct that is NOT
/// thread-safe. We enforce single-threaded access by holding
/// `inference_latch: Mutex<()>` for every `run_generation` call, including
/// the streaming path which otherwise would take `&self` under a read lock.
unsafe impl Send for LlamaCppBackend {}
unsafe impl Sync for LlamaCppBackend {}

impl LlamaCppBackend {
    fn run_generation(&self, params: GenerateParams) -> Result<String, Error> {
        let _guard = self.inference_latch.lock().unwrap();  // serializes C API calls
        // ... call llama_eval / llama_sample under the guard
        Ok(text)
    }
}

// DO NOT — SAFETY note claims an invariant the code doesn't hold
unsafe impl Sync for LlamaCppBackend {}
// "SAFETY: RwLock serializes access" — but generate_stream takes &self
// under a read lock, allowing concurrent calls into the C context.
```

**Why**: Unsound `Send`/`Sync` impls on FFI types do not fail in single-threaded tests. They surface as undefined behavior under concurrent production load — crashes, corrupted output, or silent data races. Every `unsafe impl Send/Sync` on a type wrapping FFI state MUST state the runtime invariant in the SAFETY comment AND enforce it via a mutex/latch, not just an abstract lock hierarchy.

## Audit Protocol

Run on every red-team pass and before every release:

```bash
# 1. Find every Default impl on security-adjacent types
rg 'impl Default for' crates/ | rg -i 'clearance|classification|registry|permissions|config|policy'

# 2. Find every thread_local with a security-relevant Cell
rg 'thread_local!' crates/ -A 3 | rg -i 'clearance|classification|posture|tenant'

# 3. Find every unsafe impl Send/Sync on FFI types
rg 'unsafe impl (Send|Sync)' crates/ -B 2 | rg -i 'raw|ffi|llama|cpp|ctx|handle'

# 4. Find every .insert() without prior contains_key() guard on registry types
rg 'Registry.*\.insert\(' crates/ -B 5
```

Any match that cannot cite a fail-closed default OR an explicit `force_*` flag for the permissive path is a HIGH finding.

## Related

- `rules/security.md` — top-level security rules
- `rules/trust-plane-security.md` — trust-plane-specific fail-closed patterns
- `skills/18-security-patterns/constant-time-comparison-rs.md` — companion rule on credential comparison
- `crates/kailash-dataflow/src/classification.rs:55-121` — canonical fail-closed clearance default + RAII installer
- `crates/kailash-align-serving/src/backend/llama_cpp.rs:81,91,233-293,315-328` — canonical path containment + FFI Sync invariant
- `crates/kailash-enterprise/src/audit/sqlite.rs:160-218` — canonical 0o600 tightening + regression test at :1005-1022
- `bindings/kailash-python/src/eatp.rs:2417-2510` — Python-only `EatpAuthorityRegistry` duplicate-rejection (R1 H2 fix). **Note:** no Rust equivalent exists yet — Rust crate `crates/eatp/` has no `AuthorityRegistry` type; backporting is a tracked security task.
- `bindings/kailash-python/tests/regression/test_h2_authority_register_hijack.py` — regression test for the Python-side fix
