# ADR-0005: LLM Deployment Target

## Status: Proposed

## Context

Downstream projects need a production-hardened way to reach a hosted LLM provider — AWS Bedrock, Google Vertex AI, Azure OpenAI, OpenAI direct, Anthropic direct, or an on-prem / OpenAI-compatible endpoint. Until kailash-rs v3.18.0 (2026-04-18), the SDK exposed only a flat `LlmProvider` enum that conflated wire format, auth strategy, endpoint derivation, and model grammar into a single axis. This meant Bedrock (AWS SigV4 + region-derived endpoint + Converse wire), Vertex (GCP OAuth + region+project-derived endpoint + rawPredict wire), and Azure OpenAI (Entra + tenant+deployment-derived endpoint + OpenAI wire) were unreachable without downstream adapters.

The originating failure this ADR exists to prevent: downstream projects wrote Bedrock-first configuration against an enum that silently lacked Bedrock support, shipped handlers that returned 503 on every `/api/chat` call, and masked the breakage behind Playwright `test.skip` gates (see `terrene-foundation/kailash-coc-claude-rs#52`, resolved by `esperie-enterprise/kailash-rs#406`).

## Decision

Use `LlmDeployment` presets from `kailash_kaizen::llm::deployment::presets` — the four-axis deployment abstraction shipped in kailash-rs v3.18.0. Every preset cited below exists in `crates/kailash-kaizen/src/llm/deployment/presets.rs`; citing a preset that does not exist is BLOCKED by the template rule `.claude/rules/llm-deployment-coverage.md` (synced from kailash-rs on or after 2026-04-18).

The preset chosen for this project is: **`<choose one — edit this line>`** (see table below).

### Preset inventory (kailash-rs v3.18.0)

| Preset | Auth axis | Endpoint axis | Primary env vars |
|---|---|---|---|
| `openai` | ApiKey | Fixed base URL | `OPENAI_API_KEY` |
| `anthropic` | ApiKey | Fixed base URL | `ANTHROPIC_API_KEY` |
| `google` | ApiKey | Fixed base URL | `GOOGLE_API_KEY` |
| `cohere` | ApiKey | Fixed base URL | `COHERE_API_KEY` |
| `mistral` | ApiKey | Fixed base URL | `MISTRAL_API_KEY` |
| `bedrock_claude` | Bearer or AWS SigV4 | Region-derived | `AWS_BEARER_TOKEN_BEDROCK` OR `AWS_ACCESS_KEY_ID`+`AWS_SECRET_ACCESS_KEY`+`AWS_REGION` |
| `bedrock_llama` | Bearer or AWS SigV4 | Region-derived | (as above) |
| `bedrock_titan` | Bearer or AWS SigV4 | Region-derived | (as above) |
| `bedrock_mistral` | Bearer or AWS SigV4 | Region-derived | (as above) |
| `bedrock_cohere` | Bearer or AWS SigV4 | Region-derived | (as above) |
| `vertex_claude` | GCP OAuth | Region + project derived | `GOOGLE_APPLICATION_CREDENTIALS`, region, project |
| `vertex_gemini` | GCP OAuth | Region + project derived | (as above) |
| `azure_openai` | AzureEntra (MI / workload / api-key) | Tenant + deployment derived | `AZURE_CLIENT_ID` / `AZURE_FEDERATED_TOKEN_FILE` / `AZURE_API_KEY` |
| `groq` | ApiKey | Fixed base URL | `GROQ_API_KEY` |
| `openai_compatible` | ApiKey | Caller-supplied base URL | `OPENAI_API_KEY` + `OPENAI_BASE_URL` |

Spec of truth: `specs/llm-deployments.md` in kailash-rs. Rust crate: `kailash-kaizen`. Feature flag: `kailash_kaizen_llm_deployment`. Release notes: `docs/release-notes/v3.18.0.md` in kailash-rs.

### Resolution order (`LlmClient::from_env()`)

1. `KAILASH_LLM_DEPLOYMENT` URI (per-scheme grammar; endpoint derived, not parsed)
2. `KAILASH_LLM_PROVIDER` selector + preset-specific env vars
3. Legacy per-provider keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.) — backwards compatible, unchanged

Simultaneous legacy + new env var presence emits `WARN` and does not break (migration isolation guard D13).

### Example wiring (AWS Bedrock, bearer-token path)

```rust
use kailash_kaizen::llm::{LlmClient, deployment::LlmDeployment};

// Bedrock with bearer-token auth (no IAM configuration required).
let deployment = LlmDeployment::bedrock_claude(
    std::env::var("AWS_REGION")?,
    std::env::var("BEDROCK_MODEL_ID")?,
);
let client = LlmClient::from_deployment(deployment)?;
```

### Example wiring (Azure OpenAI, managed identity)

```rust
let deployment = LlmDeployment::azure_openai(
    std::env::var("AZURE_TENANT_ID")?,
    std::env::var("AZURE_RESOURCE_NAME")?,
    std::env::var("AZURE_DEPLOYMENT_NAME")?,
);
let client = LlmClient::from_deployment(deployment)?;
```

## Consequences

### Positive

- Every preset listed ships with SSRF guards (`SafeDnsResolver`), DNS-rebinding protection, body-scrub (4 KB truncation), and auth-header masking (`Authorization`, `x-api-key`, `x-goog-api-key`, `anthropic-api-key`, `x-amz-security-token` → `"***"`) out of the box.
- Cloud-managed auth (AWS SigV4, GCP OAuth, Azure Entra) works without downstream adapter code.
- The `bedrock_claude` bearer-token path unblocks isolated test environments and CI pipelines that do not carry AWS credentials.
- `LlmClient::from_env()` three-level precedence makes the deployment swap a config change, not a code change.

### Negative

- Preset names are snake_case identifiers that the template's `llm-deployment-coverage` rule grep-gates against `presets.rs`; prescribing a preset that does not exist in the pinned kailash-rs version is BLOCKED at CI.
- `LlmDeployment::Custom` (arbitrary third-party `AuthStrategy`) is prescribed-against in shared templates; downstream projects that need `Custom` MUST file an ADR amendment citing the `rules/llm-auth-strategy-hygiene.md` requirements (`zeroize::Zeroizing` for credentials, no `Debug` derive, no credential logging).

## Alternatives Considered

1. **Continue using the legacy `LlmProvider` enum.** Rejected: deprecated in v3.18.0, scheduled for removal at v4.0.0, and cannot express cloud-managed auth axes.
2. **Downstream-authored adapter modules (e.g. `shared/ai/azure_openai_client.py`).** Rejected: every adapter duplicates SSRF guards, auth-header masking, and single-flight token refresh that the SDK now provides once. The interim adapter pattern documented in downstream ADRs SHOULD be reverted to the SDK preset at upgrade time.
3. **Provider-neutral HTTP client directly.** Rejected: loses `SafeDnsResolver`, body-scrub, grammar validation, and the `from_env()` precedence contract.

## Implementation Plan

1. Pin kailash-rs version ≥ 3.18.0 (and matching Python / Ruby / Node binding versions) in the project's dependency manifest.
2. Fill the chosen preset name into the `Decision` section above.
3. Populate the preset's env vars in `.env.example` (NEVER commit real credentials — see `.claude/rules/security.md`).
4. Wire `LlmClient::from_deployment(...)` (or the language binding equivalent) into the project's LLM construction path.
5. Run the `llm-deployment-coverage` grep gate locally before PR: cited preset names MUST be a subset of `pub fn` names in `crates/kailash-kaizen/src/llm/deployment/presets.rs`.
6. Add a Tier 2 integration test that constructs the deployment from env, issues one real completion, and asserts a non-empty response — `test.skip` gates on `/api/chat` responses ≥ 500 are BLOCKED per `test-skip-discipline`.

## Related Documents

- `specs/llm-deployments.md` (kailash-rs) — authoritative design document for all preset contracts
- `docs/release-notes/v3.18.0.md` (kailash-rs) — headline LLM deployment-target release
- `.claude/rules/llm-deployment-coverage.md` — grep gate preventing this ADR from citing absent presets
- `.claude/rules/llm-auth-strategy-hygiene.md` — contract for any `Custom` `AuthStrategy`
- `.claude/rules/env-models.md` — canonical env var names per preset
- `terrene-foundation/kailash-coc-claude-rs#52` — originating Bedrock gap report (resolved)
- `esperie-enterprise/kailash-rs#406` — tracking issue for the four-axis deployment abstraction
