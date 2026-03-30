# Structured LLM Integration

Source: `crates/kaizen-agents/src/structured_llm.rs`

## StructuredLlmClient Trait

The central abstraction for type-safe LLM output. All orchestration modules depend on this trait, never on `LlmClient` directly.

```rust,ignore
#[async_trait::async_trait]
pub trait StructuredLlmClient: Send + Sync {
    async fn complete_structured<T: DeserializeOwned + Send>(
        &self,
        request: StructuredRequest,
    ) -> Result<T, OrchestrationError>;
}
```

- Generic over any `T: DeserializeOwned + Send`
- Returns `OrchestrationError::LlmFailed` for network/auth failures
- Returns `OrchestrationError::StructuredOutputFailed` if all retries fail to produce valid JSON

## StructuredRequest

Configuration for a single structured LLM call:

```rust,ignore
pub struct StructuredRequest {
    pub system_prompt: Option<String>,  // System message before user message
    pub user_message: String,           // Schema instruction appended automatically
    pub response_schema: serde_json::Value,  // JSON Schema for expected output
    pub max_retries: u32,               // 0 = only initial attempt
    pub model: Option<String>,          // Override; None = client default
}
```

`StructuredRequest` implements `Debug`, `Clone`.

## DefaultStructuredLlmClient

Production implementation wrapping `kailash_kaizen::llm::client::LlmClient`:

```rust,ignore
let client = Arc::new(LlmClient::from_env()?);
let structured = DefaultStructuredLlmClient::new(client);

let result: MyType = structured.complete_structured(StructuredRequest {
    system_prompt: Some("You are a sentiment analyzer.".into()),
    user_message: "Analyze: 'I love this product!'".into(),
    response_schema: json!({
        "type": "object",
        "properties": {
            "sentiment": { "type": "string" },
            "confidence": { "type": "number" }
        },
        "required": ["sentiment", "confidence"]
    }),
    max_retries: 2,
    model: None,
}).await?;
```

### Provider-Aware JSON Extraction

The `extract_json()` internal function handles common LLM response formats:

1. Markdown fenced blocks: `` ```json\n{...}\n``` `` or `` ```\n{...}\n``` ``
2. Raw JSON passthrough
3. Plain text (returned trimmed)

### Retry Behavior

On deserialization failure:
- The error message from the failed parse is included in the retry prompt
- The schema is re-sent with the error for correction guidance
- Temperature is forced to `0.0` for deterministic output
- After `max_retries` exhausted, returns `StructuredOutputFailed { retries, detail }`

### LlmRequest Construction

Internally builds an `LlmRequest` with:
- System prompt as first `ConversationTurn::system()` (if present)
- User message with schema appended as `ConversationTurn::user()`
- `temperature: Some(0.0)` for deterministic output
- `model` from request or empty string (delegates to client resolution)

## Testing with MockStructuredLlm

The standard test pattern across all orchestration modules:

```rust,ignore
struct MockStructuredLlm {
    responses: std::sync::Mutex<Vec<Result<serde_json::Value, OrchestrationError>>>,
}

impl MockStructuredLlm {
    /// Pre-load successful JSON responses (consumed FIFO)
    fn new(responses: Vec<serde_json::Value>) -> Self {
        Self {
            responses: std::sync::Mutex::new(
                responses.into_iter().map(Ok).collect()
            ),
        }
    }

    /// Pre-load a single error response
    fn with_error(err: OrchestrationError) -> Self {
        Self {
            responses: std::sync::Mutex::new(vec![Err(err)]),
        }
    }
}

#[async_trait::async_trait]
impl StructuredLlmClient for MockStructuredLlm {
    async fn complete_structured<T: DeserializeOwned + Send>(
        &self,
        _request: StructuredRequest,
    ) -> Result<T, OrchestrationError> {
        let mut responses = self.responses.lock().unwrap();
        if responses.is_empty() {
            return Err(OrchestrationError::LlmFailed(
                "no mock responses remaining".to_string(),
            ));
        }
        let response = responses.remove(0);
        match response {
            Ok(value) => serde_json::from_value(value).map_err(|e| {
                OrchestrationError::StructuredOutputFailed {
                    retries: 0,
                    detail: e.to_string(),
                }
            }),
            Err(OrchestrationError::LlmFailed(msg)) =>
                Err(OrchestrationError::LlmFailed(msg)),
            Err(OrchestrationError::StructuredOutputFailed { retries, detail }) =>
                Err(OrchestrationError::StructuredOutputFailed { retries, detail }),
            Err(other) =>
                Err(OrchestrationError::Internal(format!("{other}"))),
        }
    }
}
```

### Using MockLlmProvider with DefaultStructuredLlmClient

For testing the real `DefaultStructuredLlmClient` (including JSON extraction):

```rust,ignore
use kailash_kaizen::llm::{client::LlmClient, mock::MockLlmProvider};

let mock = MockLlmProvider::new();
mock.add_response(r#"{"answer": "42", "confidence": 0.95}"#);
// or with markdown fences:
mock.add_response("```json\n{\"answer\": \"42\"}\n```");

let client = Arc::new(LlmClient::from_mock(mock));
let structured = DefaultStructuredLlmClient::new(client);

let result: MyType = structured.complete_structured(request).await?;
```

Key mock methods:
- `add_response(text)` -- queue a response (FIFO)
- `set_default_response(text)` -- return this for all calls
- `call_count()` -- number of calls made
- `prompt_history()` -- captured user messages

## Common Patterns

### Schema definition for orchestration modules

Each module defines a private `*_schema()` function returning `serde_json::Value`:

```rust,ignore
fn decomposition_schema() -> serde_json::Value {
    serde_json::json!({
        "type": "object",
        "required": ["subtasks"],
        "properties": {
            "subtasks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["description", "capabilities", "complexity"],
                    "properties": {
                        "description": { "type": "string" },
                        "capabilities": { "type": "array", "items": { "type": "string" } },
                        "complexity": { "type": "number", "minimum": 0.0, "maximum": 1.0 }
                    }
                }
            }
        }
    })
}
```

### Invariant enforcement after LLM output

The `StructuredLlmClient` handles JSON deserialization, but domain validation happens in `conversions.rs` (`parse_subtasks`, `parse_diagnosis`). The pattern is:

```rust,ignore
// LLM returns raw JSON
let raw: serde_json::Value = self.llm.complete_structured(request).await?;
// Domain validation at the boundary
let validated = parse_subtasks(&raw)?;  // Returns OrchestrationError on invariant violation
```

## Cross-References

- `LlmClient` and `MockLlmProvider`: `crates/kailash-kaizen/src/llm/`
- Conversions (boundary validation): `crates/kaizen-agents/src/conversions.rs`
- All orchestration modules that use this trait: [orchestration-pipeline.md](orchestration-pipeline.md)
