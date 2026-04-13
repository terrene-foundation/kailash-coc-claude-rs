# Fail-Closed Defaults (Rust)

Security-adjacent defaults in the Kailash Rust SDK MUST be restrictive. Every `Default` impl, `default()` constructor, and config builder that touches classification, clearance, file permissions, delegation chains, path loading, or audit durability MUST fail-closed — the permissive behavior is opt-in only.

Origin: journal `0018-RISK-six-high-security-findings.md` — red team round 1 found **four of six HIGH findings shared a single root cause: security-relevant defaults were permissive rather than restrictive**. H1 (classification clearance defaulted to `HighlyConfidential`), H2 (EATP registry silently overwrote entries), H3/H4 (file permissions defaulted to umask, world-readable), H5 (path loading defaulted to "any path"), H6 (unsound `Send`+`Sync` claimed without runtime invariant). All fixed in PR #334.

## The Pattern

For every security-adjacent type, ask: **"If the operator forgets to configure this, what happens?"**

- **Fail-closed** — they get the most restrictive, non-functional state. Must explicitly opt in to permissive behavior. CORRECT.
- **Fail-open** — they get the permissive state silently. Operators believe they enabled security; they didn't. BLOCKED.

## Canonical Examples (Post-R1)

### 1. Thread-Local Clearance Default

```rust
// DO — fail-closed: missing clearance means Public, not HighlyConfidential
thread_local! {
    static CALLER_CLEARANCE: Cell<ClassificationLevel> = const {
        Cell::new(ClassificationLevel::Public)
    };
}

// DO NOT — fail-open: any thread that forgot set_caller_clearance
// reads unredacted PII, silently.
thread_local! {
    static CALLER_CLEARANCE: Cell<ClassificationLevel> =
        Cell::new(ClassificationLevel::HighlyConfidential);
}
```

**Why**: Operators enable classification believing PII will be redacted. With a fail-open default, PII is only redacted when the caller _explicitly_ sets a clearance level — which is effectively never in default configurations. The entire security feature becomes a no-op.

### 2. Registry / Delegation: Reject Duplicates

```rust
// DO — register rejects duplicates; intentional rotation uses replace(force_replace=true)
impl EatpAuthorityRegistry {
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
impl EatpAuthorityRegistry {
    pub fn register(&mut self, id: AuthorityId, key: VerifyingKey) {
        self.entries.insert(id, key);  // silently replaces existing
    }
}
```

**Why**: A single registry-write permission must not escalate to full delegation control. Blind overwrite means any authority holder can impersonate any other authority by re-registering with a new key.

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
- `crates/eatp/src/authority_registry.rs` — canonical fail-closed registry implementation
- `crates/kailash-dataflow/src/classification.rs` — fail-closed clearance default
- `crates/kailash-align-serving/src/backend/llama_cpp.rs` — canonical path containment
