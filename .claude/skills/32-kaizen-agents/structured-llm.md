# Structured LLM Client

## Overview

StructuredLlmClient wraps the Kaizen LlmClient with type-safe JSON schema output. Every orchestration module uses this trait for LLM calls, ensuring responses conform to expected schemas before deserialization.

## Key Trait

The StructuredLlmClient trait defines a single async method:

- `complete_structured<T>(request) -> Result<T, OrchestrationError>` -- Sends a structured request to an LLM and deserializes the response into type T.

**Note**: The generic method makes this trait NOT dyn-compatible. Use concrete generic parameters (e.g., `Arc<S>` where `S: StructuredLlmClient`), never `Arc<dyn StructuredLlmClient>`.

## StructuredRequest

A structured request contains:

- `system_prompt` -- Optional system-level instructions
- `user_message` -- The user's message/prompt
- `response_schema` -- JSON Schema defining expected output structure
- `max_retries` -- Number of retry attempts on parse failure
- `model` -- Optional model override

## Provider-Aware Extraction

The DefaultStructuredLlmClient implementation handles:

- Markdown fence stripping (` ```json ... ``` `)
- Retry with error context on parse failure
- Temperature 0.0 for deterministic output

## Testing

For unit tests, use a mock structured LLM client with a FIFO response queue. Push expected JSON values and they are consumed in order during test execution. This allows deterministic testing of all orchestration modules without real LLM calls.
