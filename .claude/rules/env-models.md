---
paths:
  - "**/*.rs"
  - "**/*.toml"
  - ".env*"
---

# Environment Variables & Model Rules

## .env Is The Single Source of Truth

ALL API keys and model names MUST be read from `.env`. NEVER hardcode.

**Why:** Hardcoded keys leak into git history and hardcoded models lock deployments to a single provider, preventing rotation or migration.

## NEVER Hardcode Model Names

**Why:** Hardcoded model names break when providers deprecate versions, and prevent per-environment model selection (e.g., cheaper model for dev, capable model for prod).

```
BLOCKED: model = "gpt-4"
BLOCKED: model = "claude-3-opus"
BLOCKED: model = "gemini-1.5-pro"
```

```rust
// ✅ Rust
use std::env;
use dotenvy::dotenv;

dotenv().ok();
let model = env::var("OPENAI_PROD_MODEL")
    .or_else(|_| env::var("DEFAULT_LLM_MODEL"))
    .expect("No LLM model configured in .env");
```

## ALWAYS Load .env Before Operations

**Why:** Accessing `std::env::var()` before `dotenvy::dotenv()` returns `Err` for every `.env`-defined key, causing panics or silent `unwrap_or_default()` fallbacks.

```rust
use dotenvy::dotenv;
dotenv().ok(); // MUST be before any env::var() access
```

For tests: use `dotenvy::from_filename(".env.test")` or `#[test]` helper that loads `.env` once.

## Model-Key Pairings

| Model Prefix                    | Required Key                         |
| ------------------------------- | ------------------------------------ |
| `gpt-*`, `o1-*`, `o3-*`, `o4-*` | `OPENAI_API_KEY`                     |
| `claude-*`                      | `ANTHROPIC_API_KEY`                  |
| `gemini-*`                      | `GOOGLE_API_KEY` or `GEMINI_API_KEY` |
| `deepseek-*`                    | `DEEPSEEK_API_KEY`                   |
| `mistral-*`, `mixtral-*`        | `MISTRAL_API_KEY`                    |

NO EXCEPTIONS. If `.env` doesn't have the key, fix the `.env` — don't hardcode.

**Why:** Sending requests with a mismatched model-key pairing produces opaque 401/403 errors that are hard to diagnose downstream.
