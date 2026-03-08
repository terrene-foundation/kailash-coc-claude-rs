---
name: react-integration-quick
description: "React + Kailash SDK integration. Use when asking 'react integration', 'react kailash', or 'kailash frontend'."
---

# React + Kailash Integration

## Quick Setup

### 1. Backend API (Python)

```python
from kailash.nexus import NexusApp
import kailash
import os

reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "chat", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),  # provider auto-detected from model name
    "prompt": "{{input.message}}",
})
wf = builder.build(reg)
rt = kailash.Runtime(reg)

app = NexusApp(preset="standard")

@app.handler("execute")
async def execute(message: str) -> dict:
    result = rt.execute(wf, {"message": message})
    return result["results"]["chat"]

app.start()  # Serves on port 3000
```

### 2. React Frontend

```typescript
// src/api/workflow.ts
export async function executeWorkflow(message: string) {
  const response = await fetch('http://localhost:3000/execute', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({inputs: {message}})
  });
  return response.json();
}

// src/components/Chat.tsx
import { useState } from 'react';
import { executeWorkflow } from '../api/workflow';

export function Chat() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await executeWorkflow(message);
    setResponse(result.outputs.chat.response);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a question..."
      />
      <button type="submit">Send</button>
      {response && <div>{response}</div>}
    </form>
  );
}
```

## Streaming Responses

```typescript
// Frontend (React)
async function streamWorkflow(message: string) {
  const response = await fetch("http://localhost:3000/stream", {
    method: "POST",
    body: JSON.stringify({ inputs: { message } }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    console.log(chunk); // Update UI incrementally
  }
}
```

<!-- Trigger Keywords: react integration, react kailash, kailash frontend, react workflows -->
