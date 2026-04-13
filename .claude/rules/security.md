# Security Rules

ALL code changes in the repository.

## No Hardcoded Secrets

All sensitive data MUST use environment variables.

**Why:** Hardcoded secrets end up in git history, CI logs, and error traces, making them permanently extractable even after deletion.

```
❌ api_key = "sk-..."
❌ password = "admin123"
❌ DATABASE_URL = "postgres://user:pass@..."

✅ api_key = os.environ.get("API_KEY")
✅ password = os.environ["DB_PASSWORD"]
✅ from dotenv import load_dotenv; load_dotenv()
```

## Parameterized Queries

All database queries MUST use parameterized queries or ORM.

**Why:** Without parameterized queries, user input becomes executable SQL, enabling data theft, deletion, or privilege escalation.

```
❌ f"SELECT * FROM users WHERE id = {user_id}"
❌ "DELETE FROM users WHERE name = '" + name + "'"

✅ "SELECT * FROM users WHERE id = %s", (user_id,)
✅ cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
✅ User.query.filter_by(id=user_id)  # ORM
```

## Credential Decode Helpers

Connection strings carry credentials in URL-encoded form. Decoding them at a call site with `unquote(parsed.password)` is BLOCKED — every decode site MUST route through a shared helper module so the validation logic lives in exactly one place and drift between sites is impossible.

### 1. Null-Byte Rejection At Every Credential Decode Site (MUST)

Every URL parsing site that extracts `user`/`password` from `urlparse(connection_string)` MUST route through a single shared helper that rejects null bytes after percent-decoding. Hand-rolled `unquote(parsed.password)` at a call site is BLOCKED.

```python
# DO — route through the shared helper
from myapp.utils.url_credentials import decode_userinfo_or_raise

parsed = urlparse(connection_string)
user, password = decode_userinfo_or_raise(parsed)  # raises on \x00 after unquote

# DO NOT — hand-rolled at the call site
from urllib.parse import unquote
parsed = urlparse(connection_string)
user = unquote(parsed.username or "")
password = unquote(parsed.password or "")  # no null-byte check, drifts from other sites
```

**BLOCKED rationalizations:**

- "The existing site already has the check"
- "This is a new dialect, the rule doesn't apply yet"
- "We'll consolidate later"
- "The URL comes from a trusted config file, null bytes can't happen"

**Why:** A crafted `mysql://user:%00bypass@host/db` decodes to `\x00bypass`; the MySQL C client truncates credentials at the first null byte and the driver sends an empty password, succeeding against any row in `mysql.user` with an empty `authentication_string`. Drift between sites that have the check and sites that don't is unauditable without a single helper.

### 2. Pre-Encoder Consolidation (MUST)

Password pre-encoding helpers (`quote_plus` of `#$@?` etc.) MUST live in the same shared helper module as the decode path. Per-adapter copies are BLOCKED.

```python
# DO — single helper module owns both halves of the contract
from myapp.utils.url_credentials import (
    preencode_password_special_chars,
    decode_userinfo_or_raise,
)
url = preencode_password_special_chars(raw_url)
parsed = urlparse(url)
user, password = decode_userinfo_or_raise(parsed)

# DO NOT — inline pre-encode in each adapter
pwd = pwd.replace("@", "%40").replace(":", "%3A").replace("#", "%23")
url = f"postgresql://{user}:{pwd}@{host}/{db}"  # drifts from decode path silently
```

**Why:** Encode and decode are dual halves of one contract; splitting them across modules guarantees one half drifts. Round-trip tests are only meaningful when both ends share the helper.

## Input Validation

All user input MUST be validated before use: type checking, length limits, format validation, whitelist when possible. Applies to API endpoints, CLI inputs, file uploads, form submissions.

**Why:** Unvalidated input is the entry point for injection attacks, buffer overflows, and type confusion across every attack surface.

## Output Encoding

All user-generated content MUST be encoded before display in HTML templates, JSON responses, and log output.

**Why:** Unencoded user content enables cross-site scripting (XSS), allowing attackers to execute arbitrary JavaScript in other users' browsers.

```
❌ element.innerHTML = userContent
❌ dangerouslySetInnerHTML={{ __html: userContent }}

✅ element.textContent = userContent
✅ DOMPurify.sanitize(userContent)
```

## MUST NOT

- **No eval() on user input**: `eval()`, `exec()`, `subprocess.call(cmd, shell=True)` — BLOCKED

**Why:** `eval()` on user input is arbitrary code execution — the attacker runs whatever they want on the server.

- **No secrets in logs**: MUST NOT log passwords, tokens, or PII

**Why:** Log files are widely accessible (CI, monitoring, support staff) and rarely encrypted, turning every logged secret into a breach.

- **No .env in Git**: .env in .gitignore, use .env.example for templates

**Why:** Once committed, secrets persist in git history even after removal, and are exposed to anyone with repo access.

## Kailash-Specific Security

- **DataFlow**: Access controls on models, validate at model level, never expose internal IDs
- **Nexus**: Authentication on protected routes, rate limiting, CORS configured
- **Kaizen**: Prompt injection protection, sensitive data filtering, output validation

## Rust: Credential Comparison (MUST)

Every credential / token / HMAC / API key comparison in Rust code MUST use `kailash_auth::validate_token_against_list` (list) or `kailash_auth::constant_time_eq` (single) — NEVER `==`, NEVER `.any()` over a constant-time inner comparison.

```rust
// DO — single helper, always walks full list
let ok = kailash_auth::validate_token_against_list(token, valid_keys);

// DO NOT — .any() short-circuits, leaks match position via timing
let ok = valid_keys.iter().any(|k| constant_time_eq(token, k));
```

**Why:** `.any()` returns on first match, revealing _which position_ matched via response timing. During key rotation this narrows brute force by one key's worth of entropy per observation. Origin: R3 red team finding `0021-RISK-r3-timing-leak-mcp-auth.md`, fixed in commit `173d054b`. Full pattern: `skills/18-security-patterns/constant-time-comparison-rs.md`.

**BLOCKED rationalizations:**

- "The inner comparison is constant-time, so the loop is fine"
- "Only one valid key in production, the iterator doesn't loop"
- "We'll use `.any()` now and switch when we add rotation"

## Rust: Fail-Closed Security Defaults (MUST)

Every `Default` impl, `default()` constructor, and builder-chain starting value on a security-adjacent type MUST be the most restrictive, non-functional state. Permissive behavior is explicit opt-in only.

```rust
// DO — fail-closed default
thread_local! {
    static CALLER_CLEARANCE: Cell<ClassificationLevel> = const {
        Cell::new(ClassificationLevel::Public)  // Public = most restrictive
    };
}

// DO NOT — fail-open default
thread_local! {
    static CALLER_CLEARANCE: Cell<ClassificationLevel> =
        Cell::new(ClassificationLevel::HighlyConfidential);  // anyone who forgot set_clearance sees PII
}
```

Applies to: classification/clearance levels, registry insert, file permissions (0o600 on audit/evidence files), path containment (allowlist, not free path), posture/tenant selection, delegation keys, and unsafe `Send`/`Sync` invariants.

**Why:** Four of six HIGH findings in R1 shared a single root cause — permissive defaults silently disabled security features that operators believed were enabled. Origin: `0018-RISK-six-high-security-findings.md`, fixed in PR #334. Full pattern: `skills/18-security-patterns/fail-closed-defaults-rs.md`.

**BLOCKED rationalizations:**

- "The caller will always configure this"
- "Backwards compat requires the permissive default"
- "Fail-closed will break tests that don't set the field"

## Rust: Network Transport Hardening (MUST)

HTTP MCP transports MUST validate `Origin`/`Host` against an allowlist before dispatching any JSON-RPC method. Stdio MCP transports MUST restrict spawn to an allowlisted `{command, arg regex, env key}` triple. Log lines including rejected credential / token / identifier content MUST fingerprint the content, never echo it.

```rust
// DO — explicit origin allowlist
let origin = req.headers().get("origin").and_then(|v| v.to_str().ok()).unwrap_or("");
if !self.allowed_origins.contains(origin) {
    return Response::builder().status(StatusCode::FORBIDDEN).body(...).unwrap();
}

// DO NOT — trust everything that reaches the bind address
// (DNS rebinding attack: attacker-controlled DNS -> 127.0.0.1, browser sends the attacker's cookies)
dispatch(req).await
```

**Why:** Local-only MCP servers bind to 127.0.0.1 and assume localhost = trusted. DNS rebinding defeats this — a website the operator visits while the MCP server runs can invoke local MCP tools via the browser. Stdio spawn without allowlist gives the JSON-RPC caller arbitrary code execution via `sh -c`, `LD_PRELOAD`, or argv injection. Log content without sanitization is a log-poisoning + secret-exfiltration vector. Origin: R3 commits `173d054b`, `0d4ebd12`. Full pattern: `skills/18-security-patterns/network-security-rs.md`.

**BLOCKED rationalizations:**

- "127.0.0.1 binding is enough"
- "The caller specifies the command, we just run it"
- "Logging the rejected token helps debugging"

## Exceptions

Security exceptions require: written justification, security-reviewer approval, documentation, and time-limited remediation plan.
