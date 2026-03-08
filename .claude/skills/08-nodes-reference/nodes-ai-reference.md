---
name: nodes-ai-reference
description: "AI/LLM nodes reference. Use when asking 'LLM node', 'AI nodes', 'OpenAI', 'Anthropic', 'embeddings', 'vision', 'audio', or 'classification'."
---

# AI & LLM Nodes Reference

Complete reference for AI and machine learning nodes.

> **Skill Metadata**
> Category: `nodes`
> Priority: `HIGH`
> Related Skills: [`nodes-quick-index`](nodes-quick-index.md)
> Related Subagents: `pattern-expert` (AI workflows)

## Quick Reference

```python
import kailash

# All nodes are string-based: builder.add_node("NodeType", "id", {...})
# Available AI nodes:
#   LLMNode (multi-provider chat completions with tool calling)
#   EmbeddingNode (text-to-vector embedding generation)
#   ClassificationNode (zero-shot/few-shot text classification)
#   SentimentNode (sentiment analysis)
#   SummarizationNode (text summarization)
#   VisionNode (image analysis)
#   AudioNode (audio processing)
#   ImageGenerationNode (image generation)
#   TextToSpeechNode (text to speech)
#
# Multi-agent coordination (A2A) is handled by kailash-kaizen, not workflow nodes.
```

## Core LLM Nodes

### LLMNode

Multi-provider chat completions. Provider is auto-detected from the model name (OpenAI, Anthropic, Google, Mistral, Cohere).

**Inputs:** `prompt` (String), `messages` (Array), `model` (String, falls back to `DEFAULT_LLM_MODEL` env var), `system_prompt` (String), `tools` (Array of Objects), `temperature` (Float, 0.0-2.0), `max_tokens` (Integer)

**Outputs:** `response` (String), `messages` (Array), `tool_calls` (Array), `finish_reason` (String), `usage` (Object), `model` (String), `provider` (String)

```python
import kailash
import os

builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "chat", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected
    "prompt": "Explain quantum computing",
    "temperature": 0.7,
    "max_tokens": 1000
})
```

### LLMNode with Tool Calling

```python
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "messages": [{"role": "user", "content": "What's the weather in NYC?"}],
    "tools": [{
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"}
                },
                "required": ["location"]
            }
        }
    }]
})
# Output includes tool_calls array if the model requests function calls
```

## Embeddings

### EmbeddingNode

Text-to-vector embedding generation via LLM APIs.

**Inputs:** `text` (String), `texts` (Array of Strings), `model` (String, falls back to `EMBEDDING_MODEL` env var)

**Outputs:** `embedding` (Array of Floats), `embeddings` (Array of Arrays), `model` (String), `usage` (Object), `token_count` (Integer)

```python
builder.add_node("EmbeddingNode", "embedder", {
    "text": "This is a sample document",
    "model": "text-embedding-3-large"
})
```

## Classification & Analysis

### ClassificationNode

Zero-shot and few-shot text classification.

```python
builder.add_node("ClassificationNode", "classify", {
    "text": "I love this product!",
    "categories": ["positive", "negative", "neutral"]
})
```

### SentimentNode

Sentiment analysis.

```python
builder.add_node("SentimentNode", "sentiment", {
    "text": "The service was excellent and the food was great"
})
```

### SummarizationNode

Text summarization.

```python
builder.add_node("SummarizationNode", "summarize", {
    "text": "Long document text here...",
    "max_length": 200
})
```

## Vision & Audio

### VisionNode

Image analysis using vision-capable LLMs.

```python
builder.add_node("VisionNode", "analyze_image", {
    "image_url": "https://example.com/photo.jpg",
    "prompt": "Describe what you see in this image"
})
```

### AudioNode

Audio processing.

```python
builder.add_node("AudioNode", "transcribe", {
    "audio_url": "https://example.com/audio.mp3",
    "operation": "transcribe"
})
```

### ImageGenerationNode

Image generation.

```python
builder.add_node("ImageGenerationNode", "generate", {
    "prompt": "A sunset over mountains",
    "size": "1024x1024"
})
```

### TextToSpeechNode

Text to speech conversion.

```python
builder.add_node("TextToSpeechNode", "speak", {
    "text": "Hello, how can I help you today?",
    "voice": "alloy"
})
```

## Multi-Agent Coordination

For multi-agent systems, use the **Kaizen agent framework** (`kailash-kaizen`), not workflow nodes:

```python
from kailash.kaizen import BaseAgent, OrchestrationRuntime

class ResearchAgent(BaseAgent):
    def execute(self, input_text):
        return {"response": f"Research findings for: {input_text}"}

# See kaizen-orchestration skill for multi-agent patterns
```

## Related Skills

- **Node Index**: [`nodes-quick-index`](nodes-quick-index.md)
- **Kaizen Agents**: [kaizen-quickstart](../../04-kaizen/kaizen-quickstart.md)

<!-- Trigger Keywords: LLM node, AI nodes, OpenAI, Anthropic, embeddings, vision, audio, classification, sentiment, summarization, LLMNode, EmbeddingNode -->
