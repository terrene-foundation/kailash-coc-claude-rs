---
name: validate-security
description: "Security validation checks for the Kailash Rust SDK. Use when asking 'security validation', 'check security', or 'security audit'."
---

# Security Validation

> **Skill Metadata**
> Category: `validation`
> Priority: `HIGH`

## Security Checklist

### 1. Secrets Management

```rust
// CORRECT: Use environment variables
dotenvy::dotenv().ok();
let api_key = std::env::var("OPENAI_API_KEY")
    .map_err(|_| anyhow::anyhow!("OPENAI_API_KEY not set in .env"))?;

let db_url = std::env::var("DATABASE_URL")
    .map_err(|_| anyhow::anyhow!("DATABASE_URL not set in .env"))?;

// WRONG: Hardcoded secrets
// let api_key = "sk-abc123...";
// let db_url = "postgres://user:password@localhost/db";
```

### 2. SQL Injection Prevention

```rust
// CORRECT: Compile-time checked queries (preferred)
let user = sqlx::query_as!(
    User,
    "SELECT * FROM users WHERE id = $1",
    user_id
)
.fetch_one(&pool)
.await?;

// CORRECT: Runtime query with bound parameters
let user = sqlx::query_as::<_, User>("SELECT * FROM users WHERE id = $1")
    .bind(user_id)
    .fetch_one(&pool)
    .await?;

// WRONG: String interpolation (SQL injection risk!)
// let query = format!("SELECT * FROM users WHERE id = {}", user_id);
// sqlx::query(&query).execute(&pool).await?;
```

### 3. No Unsafe in Application Code

```rust
// CORRECT: Safe Rust code in application crates
let data: Vec<u8> = response.bytes().await?.to_vec();

// WRONG: Unsafe in application code (only allowed in kailash-capi/kailash-plugin)
// unsafe { std::ptr::read(ptr) }

// If unsafe is absolutely necessary (FFI boundaries only):
// SAFETY: Pointer is guaranteed non-null by caller contract.
// Alignment is correct because T: Repr(C).
// unsafe { std::ptr::read(ptr) }
```

### 4. Input Validation

```rust
use validator::Validate;
use serde::Deserialize;

#[derive(Debug, Deserialize, Validate)]
pub struct CreateUserRequest {
    #[validate(length(min = 1, max = 255))]
    pub name: String,
    #[validate(email)]
    pub email: String,
    #[validate(range(min = 0, max = 150))]
    pub age: Option<u8>,
}

// In axum handler
async fn create_user(
    axum::Json(payload): axum::Json<CreateUserRequest>,
) -> Result<axum::Json<User>, AppError> {
    payload.validate()
        .map_err(|e| AppError::Validation(e.to_string()))?;
    // ... proceed with validated data
    Ok(axum::Json(user))
}
```

### 5. No Secrets in Logs

```rust
// CORRECT: Log non-sensitive identifiers
tracing::info!(user_id = %user.id, "User logged in successfully");

// WRONG: Logging sensitive data
// tracing::info!("User logged in with password: {}", password);
// tracing::debug!("API key: {}", api_key);
```

### 6. Dependency Auditing

```bash
# Check for known vulnerabilities
cargo audit

# Check licenses and bans
cargo deny check

# Should return clean results
```

## Validation Commands

```bash
# Security validation suite
cargo audit                                      # Dependency vulnerabilities
cargo clippy --workspace -- -D warnings          # Catches unsafe patterns
cargo deny check                                 # License + ban check

# Check for hardcoded secrets
grep -rn "api_key.*=.*\"sk-" crates/ --include="*.rs"
grep -rn "password.*=.*\"" crates/ --include="*.rs"
grep -rn "token.*=.*\"ghp_" crates/ --include="*.rs"
# All should return empty

# Check for unsafe blocks in application crates (not capi/plugin)
grep -rn "unsafe" crates/kailash-core/ --include="*.rs"
grep -rn "unsafe" crates/kailash-nodes/ --include="*.rs"
grep -rn "unsafe" crates/kailash-dataflow/ --include="*.rs"
# Should return empty or only in #[cfg(test)] modules
```

## Security Rules Summary

| Rule                           | Scope                                   | Enforcement                     |
| ------------------------------ | --------------------------------------- | ------------------------------- |
| No hardcoded secrets           | All crates                              | `security-reviewer` agent, grep |
| `sqlx::query!` for SQL         | DataFlow, application code              | Compile-time checking           |
| No `unsafe` in app code        | All except kailash-capi, kailash-plugin | `#![deny(unsafe_code)]`         |
| Env vars via `std::env::var()` | All crates                              | `security-reviewer` agent       |
| `cargo audit` clean            | Workspace                               | CI pipeline                     |
| No secrets in logs             | All crates                              | Code review                     |
| Input validation               | axum handlers                           | `validator` crate               |

## Documentation

- **Security rules**: `rules/security.md`
- **CLAUDE.md security section**: [`CLAUDE.md`](../../../../CLAUDE.md)
- **Security reviewer**: `.claude/agents/security-reviewer.md`

<!-- Trigger Keywords: security validation, check security, security audit, secrets management, cargo audit, unsafe -->
