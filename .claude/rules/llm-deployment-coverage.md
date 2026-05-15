---
priority: 10
scope: path-scoped
paths:
  - "specs/**/*.md"
  - "docs/ADRs/**/*.md"
  - "docs/migrations/**/*.md"
  - ".claude/**/*.md"
---

# LLM Deployment Coverage Rule (ADR-0002)

Every template, downstream project ADR, and migration guide that prescribes a specific LLM provider MUST cite a preset that exists in `crates/kailash-kaizen/src/llm/deployment/presets.rs`. Templates cannot prescribe providers the SDK has not implemented.

The originating failure was `terrene-foundation/kailash-coc-claude-rs#52`: template ADR-0005 prescribed Bedrock-first deployment; the SDK had no Bedrock support at the time; downstream consumers wired the prescribed config and received 503 errors; test-skips masked the breakage until production. This rule prevents that class of drift.

## MUST Rules

### 1. Template ADRs MUST NOT Cite Absent Presets

Any document (ADR, spec example, migration guide, CLAUDE.md, README) that contains a call expression of the form `LlmDeployment::<name>(` MUST correspond to a `pub fn <name>(` in `crates/kailash-kaizen/src/llm/deployment/presets.rs`.

```markdown
// DO — cite a preset that exists
LlmDeployment::bedrock_claude(region, model) # pub fn bedrock_claude exists

// DO NOT — cite a preset that does not exist
LlmDeployment::sagemaker_claude(endpoint, model) # pub fn sagemaker_claude does NOT exist
```

**Why:** A template that cites a non-existent preset silently misdirects every downstream consumer; the error surfaces only at runtime, hours or days after deployment.

**BLOCKED rationalizations:**

- "The preset will be added soon, the template can get ahead of it"
- "It's just a doc, the real test is the code"
- "Downstream will see the compile error anyway"

### 2. CI Grep Gate MUST Pass Before Merging Template Changes

Every PR that modifies a spec, ADR, or template document referencing `LlmDeployment::` MUST pass the following check. Run it locally before pushing; CI enforces it.

```bash
# Extract preset names from cite lines, EXCLUDING lines annotated as future-work per MUST Rule 3.
# A cite is exempt from this gate when the SAME line carries `<!-- requires kailash-rs#NNN -->`.
# Uses POSIX bracket classes (`[a-zA-Z_][a-zA-Z0-9_]*`) instead of `\w` for BSD-sed portability.
CITED=$(rg --no-line-number "LlmDeployment::[a-zA-Z_][a-zA-Z0-9_]*\(" docs/ADRs specs \
  | grep -v '<!-- requires kailash-rs#' \
  | grep -oE 'LlmDeployment::[a-zA-Z_][a-zA-Z0-9_]*\(' \
  | sed -E 's/LlmDeployment::([a-zA-Z_][a-zA-Z0-9_]*)\(/\1/' \
  | LC_ALL=C sort -u)

# Extract all implemented preset names from presets.rs.
IMPLEMENTED=$(rg "pub fn ([a-zA-Z_][a-zA-Z0-9_]*)\(" crates/kailash-kaizen/src/llm/deployment/presets.rs \
  --only-matching --replace '$1' | LC_ALL=C sort -u)

# Assert cited (minus annotated) is a subset of implemented.
LC_ALL=C comm -23 <(echo "$CITED") <(echo "$IMPLEMENTED")
# Output MUST be empty. Any line output = BLOCKED.
```

**Why:** Without the grep gate, template drift is discovered only when a downstream CI pipeline fails, turning a one-line fix into a cross-repo incident. The `grep -v '<!-- requires kailash-rs#'` filter honors MUST Rule 3 — annotated future-work cites have a corresponding tracking issue, so flagging them in the gate would force false-positive removal of legitimately-tracked design intent. `LC_ALL=C sort` guarantees byte-collation determinism across macOS / Linux runners (locale-default sort treats `_` differently and breaks `comm`).

### 3. New Template Requirements Need a Tracking Issue First

Before any document prescribes an `LlmDeployment::` variant that does not yet exist in `presets.rs`, the author MUST open a kailash-rs GitHub issue with:

- The proposed preset name (exact snake_case)
- The auth strategy axis (ApiKey / Bearer / SigV4 / OAuth / AzureEntra)
- The endpoint axis (base URL or region-derived)
- The target model grammar

The issue number MUST be referenced ON THE SAME LINE as the cite: `LlmDeployment::<name>(...) <!-- requires kailash-rs#NNN -->`. Annotation on a different line (preceding comment, following paragraph, separate `<!-- -->` block) is BLOCKED — the MUST Rule 2 gate filters per-line, so off-line annotations leave the cite flagged as drift.

```markdown
// DO — same-line annotation; gate skips this cite
LlmDeployment::sagemaker_claude(endpoint, model) <!-- requires kailash-rs#501 -->

// DO — narrative-prose annotation, also same-line
Future work: `LlmDeployment::sagemaker_claude(endpoint, model)` ships in v3.20. <!-- requires kailash-rs#501 -->

// DO NOT — annotation on preceding line; gate flags the cite as drift

<!-- requires kailash-rs#501 -->

LlmDeployment::sagemaker_claude(endpoint, model)

// DO NOT — undocumented prescription; gate flags
LlmDeployment::sagemaker_claude(endpoint, model)
```

**BLOCKED rationalizations:**

- "The annotation is one line above; the reader can correlate"
- "Narrative paragraphs read better with the annotation at the end"
- "The gate is too strict; we'll filter manually at PR review"
- "The annotation block applies to the whole code fence"

**Why:** Without a tracking issue, a prescribed-but-unimplemented preset has no owner; it accumulates silently in templates and surfaces only when downstream consumers file bug reports. Same-line placement is a structural defense — the MUST Rule 2 gate is `grep`-based and per-line; off-line annotations defeat it. Annotating per cite (not per code-block) also documents which sibling cites SHARE a tracking issue versus which need their own.

## Current Canonical Preset Inventory

As of v3.25.0, the following presets exist in `presets.rs`. All template references MUST use exactly these names (snake*case). Re-derive this table from the source via `grep -oE "^\s\*pub fn [a-z*]+\(" crates/kailash-kaizen/src/llm/deployment/presets.rs`at every minor release; drift between code and table = HIGH per`spec-accuracy.md` Rule 1.

| Preset name            | Auth axis                                          | Endpoint axis               |
| ---------------------- | -------------------------------------------------- | --------------------------- |
| `openai`               | ApiKey (`OPENAI_API_KEY`)                          | Fixed base URL              |
| `anthropic`            | ApiKey (`ANTHROPIC_API_KEY`)                       | Fixed base URL              |
| `google`               | ApiKey (`GOOGLE_API_KEY`)                          | Fixed base URL              |
| `cohere`               | ApiKey (`COHERE_API_KEY`)                          | Fixed base URL              |
| `mistral`              | ApiKey (`MISTRAL_API_KEY`)                         | Fixed base URL              |
| `perplexity`           | ApiKey (`PERPLEXITY_API_KEY`)                      | Fixed base URL              |
| `huggingface`          | ApiKey (`HUGGINGFACE_API_KEY`)                     | Fixed base URL              |
| `groq`                 | ApiKey (`GROQ_API_KEY`)                            | Fixed base URL              |
| `together`             | ApiKey (`TOGETHER_API_KEY`)                        | Fixed base URL              |
| `fireworks`            | ApiKey (`FIREWORKS_API_KEY`)                       | Fixed base URL              |
| `openrouter`           | ApiKey (`OPENROUTER_API_KEY`)                      | Fixed base URL              |
| `deepseek`             | ApiKey (`DEEPSEEK_API_KEY`)                        | Fixed base URL              |
| `ollama`               | None (local)                                       | Caller-supplied base URL    |
| `docker_model_runner`  | None (local)                                       | Fixed local socket          |
| `lm_studio`            | None (local)                                       | Caller-supplied base URL    |
| `llama_cpp`            | None (local)                                       | Caller-supplied base URL    |
| `bedrock_claude`       | Bearer (`AWS_BEARER_TOKEN_BEDROCK`) or SigV4       | Region-derived              |
| `bedrock_llama`        | Bearer or SigV4                                    | Region-derived              |
| `bedrock_titan`        | Bearer or SigV4                                    | Region-derived              |
| `bedrock_mistral`      | Bearer or SigV4                                    | Region-derived              |
| `bedrock_cohere`       | Bearer or SigV4                                    | Region-derived              |
| `vertex_claude`        | GcpOauth                                           | Region + project derived    |
| `vertex_gemini`        | GcpOauth                                           | Region + project derived    |
| `azure_openai`         | AzureEntra (managed identity / workload / api-key) | Tenant + deployment derived |
| `mock`                 | None (test-only)                                   | Loopback                    |
| `openai_compatible`    | ApiKey (caller-supplied; #717)                     | Caller-supplied base URL    |
| `anthropic_compatible` | ApiKey (caller-supplied; #718)                     | Caller-supplied base URL    |

Runtime helpers (NOT presets, but required for full deployment surface): `LlmDeployment::register_bedrock_region(region)` (#720) for non-default Bedrock regions; `LlmDeployment::supports(capability)` (#719) for capability-matrix introspection.

## MUST NOT

- Prescribe `LlmDeployment::Custom` in shared templates or ADRs

**Why:** `Custom` accepts arbitrary third-party `AuthStrategy` impls and has no guarantee of satisfying the contract in `rules/llm-auth-strategy-hygiene.md`; prescribing it in a template propagates a high-security-risk pattern without review.

- Cite provider names from the deprecated `LlmProvider` enum (e.g. `LlmProvider::OpenAi`) in any new document

**Why:** The enum is deprecated as of v3.18.0 and will be removed at v4.0.0; templates that cite it teach the pattern to every downstream consumer who reads them.

## Relationship to Other Rules

- `rules/security.md` — `LlmDeployment` presets enforce SSRF guards and auth hardening; templates that bypass this enforce nothing.
- `rules/env-models.md` — env var names used by each preset MUST match the canonical list in that rule.
- `specs/llm-deployments.md` — the authoritative design document for all preset contracts.

Origin: `terrene-foundation/kailash-coc-claude-rs#52` (Bedrock-first ADR with no SDK support), surfaced and closed by kailash-rs#406 S9 (2026-04-18). MUST Rule 2 gate filter + MUST Rule 3 same-line annotation requirement added 2026-05-01 after `/redteam` Round 2 (issue #511 closure-parity) found that the original gate command false-positive'd on every `<!-- requires kailash-rs#NNN -->` annotation, contradicting MUST Rule 3's own carve-out. Tracking issues filed for the four documented but unimplemented presets surfaced by the audit: kailash-rs#717 (`openai_compatible`), #718 (`anthropic_compatible`), #719 (`supports`), #720 (`register_bedrock_region`).
