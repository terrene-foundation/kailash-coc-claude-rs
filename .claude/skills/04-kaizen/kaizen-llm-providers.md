---
name: kaizen-llm-providers
description: "LLM provider configuration for Kaizen agents. Use when asking about LlmClient, provider setup, OpenAI, Anthropic, Google, Mistral, Cohere, API keys, model names, mock provider, or switching providers."
---

# Kaizen LLM Providers

The `LlmClient` sends completion requests to multiple LLM providers with automatic provider detection from the model name, retry logic, and exponential backoff.

## Supported Providers

| Provider    | Model Prefixes              | API Key Env Var                      | Adapter File        |
| ----------- | --------------------------- | ------------------------------------ | ------------------- |
| OpenAI      | `gpt-`, `o1-`, `o3-`, `o4-` | `OPENAI_API_KEY`                     | `openai.rs`         |
| Anthropic   | `claude-`                   | `ANTHROPIC_API_KEY`                  | `anthropic.rs`      |
| Google      | `gemini-`                   | `GOOGLE_API_KEY` or `GEMINI_API_KEY` | `google.rs`         |
| Azure       | (via base_url override)     | `AZURE_OPENAI_API_KEY`               | `azure.rs`          |
| Ollama      | `ollama-*` or local models  | (none — local)                       | `ollama.rs`         |
| HuggingFace | `hf-*`                      | `HUGGINGFACE_API_KEY`                | `huggingface.rs`    |
| Perplexity  | `pplx-*`                    | `PERPLEXITY_API_KEY`                 | `perplexity.rs`     |
| Docker      | `docker-*`                  | (none — Docker Model Runner)         | `docker.rs`         |
| Mistral     | `mistral-`, `mixtral-`      | `MISTRAL_API_KEY`                    | (via OpenAI compat) |
| Cohere      | `command-`                  | `COHERE_API_KEY`                     | (via OpenAI compat) |

## Provider Capability Traits (v3.12.1)

Each provider implements a subset of 5 capability traits (`llm/traits.rs`):

| Trait              | Purpose                          | Providers                         |
| ------------------ | -------------------------------- | --------------------------------- |
| `Chat`             | Sync/async completion            | All                               |
| `StreamingChat`    | SSE-based streaming              | OpenAI, Anthropic, Google, Ollama |
| `Embeddings`       | Text embedding                   | OpenAI, HuggingFace               |
| `ToolCalling`      | Function call formatting/parsing | OpenAI, Anthropic, Google         |
| `StructuredOutput` | JSON schema output formatting    | OpenAI, Anthropic, Google         |

Check at runtime: `provider.supports(ProviderCapability::Embeddings)`.

## SSRF Protection

All provider base URLs are validated by `llm/url_safety.rs` (v3.12.1). Blocks private IPs (RFC 1918), loopback, link-local, cloud metadata endpoints. Google API key params are redacted from debug logs via `sanitize_url_for_logging()`.

## .env Setup (Required)

All API keys and model names MUST come from `.env` or environment variables. Never hardcode them.

```bash
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
MISTRAL_API_KEY=...
COHERE_API_KEY=...

# Model names
DEFAULT_LLM_MODEL=gpt-4o
```

## LlmClient() -- Production

Create a client that auto-detects API keys from environment variables. At least one key must be set.

```python
from kailash.kaizen import LlmClient

# Auto-detects from env -- NO provider string needed
client = LlmClient()
# Reads: OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY/GEMINI_API_KEY,
#        MISTRAL_API_KEY, COHERE_API_KEY
# At least one must be set, otherwise raises RuntimeError
```

**IMPORTANT**: `LlmClient(provider=None)` is the default. Do NOT pass `"openai"` or any provider string for production use.

## LlmClient.mock() -- Testing

For deterministic tests without real API calls:

```python
from kailash.kaizen import LlmClient

# Basic mock with default response
client = LlmClient.mock()
# Returns "Mock response" for every call

# Mock with FIFO response queue
client = LlmClient.mock(responses=["First response", "Second response"])
# First call returns "First response", second returns "Second response"
# After queue is empty, returns default_response

# Mock with custom default
client = LlmClient.mock(default_response="Custom fallback")

# Mock state tracking
assert client.is_mock
assert client.call_count == 0

# After usage:
# client.call_count        -- number of complete() calls
# client.last_prompt       -- last user message received
# client.prompt_history    -- full history of prompts

# Manage mock state
client.add_response("Another response")     # Enqueue a response
client.set_default_response("New default")   # Change default
client.reset_mock()                          # Clear queue, count, history
```

## Provider Detection

The provider is automatically detected from the model name prefix. Simply change the model name in `.env` to switch providers -- no code changes needed:

```bash
# .env -- switch by changing this one line
DEFAULT_LLM_MODEL=gpt-4o            # Uses OpenAI
# DEFAULT_LLM_MODEL=claude-3-opus   # Uses Anthropic
# DEFAULT_LLM_MODEL=gemini-1.5-pro  # Uses Google
# DEFAULT_LLM_MODEL=mistral-large   # Uses Mistral
# DEFAULT_LLM_MODEL=command-r-plus  # Uses Cohere
```

## Using LlmClient with BaseAgent

```python
import os
from kailash.kaizen import BaseAgent, LlmClient

class MyAgent(BaseAgent):
    name = "my-agent"
    model = None  # Uses DEFAULT_LLM_MODEL from env

    def execute(self, input_text: str) -> dict:
        return {"response": f"Processed: {input_text}"}


# BaseAgent does NOT have an `llm` attribute.
# Use LlmClient separately for LLM calls, or use the Rust-backed
# Agent + AgentConfig pattern (shown below) which accepts llm_client.
agent = MyAgent()
result = agent.run("Hello")
```

## Using LlmClient with AgentConfig

```python
import os
from kailash import Agent, AgentConfig, LlmClient

# AgentConfig for the Rust-backed Agent
config = AgentConfig(
    model=os.environ.get("DEFAULT_LLM_MODEL"),
    system_prompt="You are a helpful assistant.",
    max_iterations=10,
    temperature=0.7,
    max_tokens=4096,
)

# Create Agent with config and client
agent = Agent(config, llm_client=LlmClient())
result = agent.run("Hello!")
# result is a dict with "response", "total_tokens", etc.
```

## Error Handling

```python
from kailash.kaizen import LlmClient

# RuntimeError if no API keys configured
try:
    client = LlmClient()
except RuntimeError as e:
    print(f"No API keys found: {e}")

# ValueError if unrecognized provider string
try:
    client = LlmClient(provider="unknown")
except ValueError as e:
    print(f"Unknown provider: {e}")
```

## Key Points

- **`LlmClient()`**: No args = auto-detect from env. This is the correct production pattern.
- **`LlmClient.mock()`**: For deterministic testing. Tracks call count, prompts, and history.
- **Never hardcode** model names or API keys. Always read from environment.
- **Provider auto-detection**: Based on model name prefix. Change `.env` to switch providers.
- **Retry behavior**: Automatic retry on 429 (rate limited) and 5xx (server error) with exponential backoff.
- **URL sanitization (v3.12+)**: Google auth embeds the API key as a `?key=` query parameter. All debug-level URL logs are sanitized via `LlmClient::sanitize_url_for_logging()` which redacts `key=` params before logging. The `Debug` impl on `LlmClient` also omits key values. Never log raw URLs from Google API paths.

<!-- Trigger Keywords: LlmClient, LLM provider, OpenAI, Anthropic, Google, Gemini, Mistral, Cohere, mock, API key, model name, provider detection, switching providers -->
