---
name: nodes-ai-reference
description: "AI/LLM nodes reference. Use when asking 'LLM node', 'AI nodes', 'OpenAI', 'Anthropic', 'embeddings', 'vision', 'audio', or 'classification'."
---

# AI & LLM Nodes Reference

Complete reference for AI and machine learning nodes in the Kailash Rust SDK.

> **Skill Metadata**
> Category: `nodes`
> Priority: `HIGH`
> Related Skills: [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (AI workflows), `kaizen-specialist` (agent framework)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available AI nodes:
#   LLMNode           - Multi-provider chat completions with tool calling
#   EmbeddingNode     - Text-to-vector embedding generation
#   ClassificationNode - Zero-shot/few-shot text classification
#   SentimentNode     - Sentiment analysis
#   SummarizationNode - Text summarization
#   VisionNode        - Image analysis
#   AudioNode         - Audio processing
#   ImageGenerationNode - Image generation
#   TextToSpeechNode  - Text to speech
#
# Multi-agent coordination (A2A) is handled by the Kaizen agent framework
# (kailash-kaizen), not by workflow nodes.
```

## Core LLM Node

### LLMNode

Multi-provider chat completions with tool calling support. Provider is auto-detected from the model name (no `provider` parameter needed).

**Inputs:**

- `prompt` (String, optional) -- Simple text prompt (creates a user message)
- `messages` (Any, optional) -- Chat messages array or single string
- `model` (String, optional) -- Model name (falls back to `DEFAULT_LLM_MODEL` env var)
- `system_prompt` (String, optional) -- System prompt prepended to messages
- `tools` (Array of Object, optional) -- Tool definitions for function calling
- `temperature` (Float, optional) -- Sampling temperature (0.0 to 2.0)
- `max_tokens` (Integer, optional) -- Maximum tokens in the response

**Outputs:**

- `response` (String) -- Generated text content
- `messages` (Array of Object) -- Assistant response as message array
- `tool_calls` (Array of Object) -- Tool calls requested by the model
- `finish_reason` (String) -- Why generation stopped (stop, length, tool_calls)
- `usage` (Object) -- Token usage statistics
- `model` (String) -- Model name used
- `provider` (String) -- Provider name used

**Supported providers** (auto-detected from model name):

- OpenAI: `gpt-4o`, `gpt-4`, `o1-preview`, `o3-mini`, `o4-mini`, ...
- Anthropic: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`, `claude-3.5-sonnet`, ...
- Google: `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`, ...
- Mistral: `mistral-large`, `mistral-small`, `mixtral-8x7b`, ...
- Cohere: `command-r`, `command-r-plus`, ...

#### Basic Usage

```python
import kailash
import os

builder = kailash.WorkflowBuilder()

# Simple prompt
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "prompt": "Explain quantum computing",
    "temperature": 0.7,
    "max_tokens": 1000
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))
print(result["results"]["agent"]["response"])
```

#### Chat Messages

```python
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "system_prompt": "You are a helpful assistant.",
    "messages": [
        {"role": "user", "content": "What is the capital of France?"}
    ]
})
```

#### Tool Calling (Function Calling)

```python
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "messages": [{"role": "user", "content": "What is the weather in NYC?"}],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "get_weather",
                "description": "Get current weather for a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {
                            "type": "string",
                            "description": "City name"
                        },
                        "units": {
                            "type": "string",
                            "enum": ["celsius", "fahrenheit"],
                            "default": "celsius"
                        }
                    },
                    "required": ["location"]
                }
            }
        }
    ]
})

# Check tool_calls in the result
# result["results"]["agent"]["tool_calls"] contains the LLM's tool call requests
# result["results"]["agent"]["finish_reason"] will be "tool_calls" if tools were requested
```

## Embedding Node

### EmbeddingNode

Text-to-vector embedding generation. Provider is auto-detected from the model name.

**Inputs:**

- `text` (String, optional) -- Single text to embed
- `texts` (Array of String, optional) -- Multiple texts to embed (batch)
- `model` (String, optional) -- Embedding model name (falls back to `EMBEDDING_MODEL` env var)

**Outputs:**

- `embedding` (Array of Float) -- Embedding vector for single text input
- `embeddings` (Array of Any) -- Array of embedding vectors for batch input
- `dimensions` (Integer) -- Dimensionality of the embeddings
- `model` (String) -- Model name used
- `usage` (Object) -- Token usage statistics

```python
# Single text embedding
builder.add_node("EmbeddingNode", "embedder", {
    "model": "text-embedding-3-large",
    "text": "This is a sample document"
})

# Batch embedding
builder.add_node("EmbeddingNode", "batch_embedder", {
    "model": "text-embedding-3-large",
    "texts": ["First document", "Second document", "Third document"]
})
```

## Classification Node

### ClassificationNode

Zero-shot and few-shot text classification.

```python
builder.add_node("ClassificationNode", "classifier", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "text": "I love this product! It works great.",
    "categories": ["positive", "negative", "neutral"]
})
```

## Sentiment Node

### SentimentNode

Sentiment analysis for text.

```python
builder.add_node("SentimentNode", "sentiment", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "text": "The product quality exceeded my expectations."
})
```

## Summarization Node

### SummarizationNode

Text summarization.

```python
builder.add_node("SummarizationNode", "summarizer", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "text": "Long article text here...",
    "max_length": 200
})
```

## Vision Node

### VisionNode

Image analysis and understanding.

```python
builder.add_node("VisionNode", "vision", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "image_url": "https://example.com/image.jpg",
    "prompt": "Describe what you see in this image"
})
```

## Audio Node

### AudioNode

Audio processing (transcription, analysis).

```python
builder.add_node("AudioNode", "audio", {
    "model": "whisper-1",
    "audio_url": "https://example.com/audio.mp3",
    "operation": "transcribe"
})
```

## Image Generation Node

### ImageGenerationNode

Generate images from text prompts.

```python
builder.add_node("ImageGenerationNode", "image_gen", {
    "model": "dall-e-3",
    "prompt": "A serene mountain landscape at sunset",
    "size": "1024x1024"
})
```

## Text to Speech Node

### TextToSpeechNode

Convert text to speech audio.

```python
builder.add_node("TextToSpeechNode", "tts", {
    "model": "tts-1",
    "text": "Hello, welcome to Kailash SDK.",
    "voice": "alloy"
})
```

## Multi-Agent Coordination

Multi-agent coordination (A2A protocol) is handled by the **Kaizen agent framework** (`kailash-kaizen`), not by workflow nodes. See the `kaizen-specialist` for agent patterns including:

- `BaseAgent` with the TAOD loop (think, act, observe, decide)
- `OrchestrationRuntime` for multi-agent coordination
- A2A Protocol (AgentCard, AgentRegistry, MessageBus)
- MCP client integration for tool discovery and execution

## Related Skills

- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)
- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)

<!-- Trigger Keywords: LLM node, AI nodes, OpenAI, Anthropic, embeddings, LLMNode, EmbeddingNode, ClassificationNode, SentimentNode, VisionNode, AudioNode, ImageGenerationNode, TextToSpeechNode, SummarizationNode, tool calling -->
