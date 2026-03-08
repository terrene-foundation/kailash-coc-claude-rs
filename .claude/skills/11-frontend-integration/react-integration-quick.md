---
name: react-integration-quick
description: "React + Kailash SDK integration. Use when asking 'react integration', 'react kailash', or 'kailash frontend'."
---

# React + Kailash Integration

> **Skill Metadata**
> Category: `frontend`
> Priority: `MEDIUM`

## Quick Setup

### 1. Backend API (Python)

```python
import kailash

# Create workflow
reg = kailash.NodeRegistry()
builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "chat", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "prompt": "{{input.message}}"
})

# Deploy as API
app = kailash.nexus.NexusApp(kailash.NexusConfig(port=8000))
app.start()
```

### 2. React Frontend

```typescript
// src/api/workflow.ts
export async function executeWorkflow(message: string) {
  const response = await fetch('http://localhost:8000/execute', {
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
// Backend (Python)
from kailash.nexus import NexusApp, NexusConfig
app = NexusApp(NexusConfig(port=8000))
app.start()

// Frontend (React)
async function streamWorkflow(message: string) {
  const response = await fetch('http://localhost:8000/stream', {
    method: 'POST',
    body: JSON.stringify({inputs: {message}})
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    console.log(chunk);  // Update UI incrementally
  }
}
```

<!-- Trigger Keywords: react integration, react kailash, kailash frontend, react workflows -->
