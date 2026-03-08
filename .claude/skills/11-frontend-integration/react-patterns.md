---
name: react-patterns
description: "React and Next.js implementation patterns for Kailash SDK integration including React Flow workflow editors, TanStack Query, Zustand state, and Nexus/DataFlow/Kaizen clients. Use for 'react patterns', 'react flow', 'workflow editor', 'next.js patterns', or 'react kailash'."
---

# React Implementation Patterns

## Kailash SDK Integration

### Nexus API Client

```typescript
import axios from "axios";

const nexusClient = axios.create({
  baseURL: "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

async function executeWorkflow(workflowId: string, params: Record<string, any>) {
  const { data } = await nexusClient.post(`/workflows/${workflowId}/execute`, params);
  return data;
}
```

### DataFlow Admin Dashboard

```typescript
function DataFlowBulkOperations() {
  const { data, isPending } = useQuery({
    queryKey: ['dataflow-models'],
    queryFn: () => fetch('/api/dataflow/models').then(res => res.json())
  });

  if (isPending) return <DataFlowSkeleton />;

  return (
    <div className="grid gap-4">
      {data.models.map(model => (
        <BulkOperationCard key={model.name} model={model} />
      ))}
    </div>
  );
}
```

### Kaizen AI Chat Interface

```typescript
function KaizenChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: (text: string) =>
      fetch('/api/kaizen/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text })
      }).then(res => res.json()),
    onSuccess: (data) => {
      setMessages(prev => [...prev, data.response]);
    }
  });

  return <ChatUI messages={messages} onSend={sendMessage} loading={isPending} />;
}
```

## React Flow Workflow Editor

```typescript
import { Handle, Position } from 'reactflow';

export function KaizenAgentNode({ data }: KaizenNodeProps) {
  return (
    <div className="bg-white border-2 border-purple-500 rounded-lg p-4 shadow-lg">
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">AI</span>
        </div>
        <div>
          <div className="font-semibold">{data.label}</div>
          <div className="text-xs text-gray-500">{data.agentType}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  kaizenAgent: KaizenAgentNode,
  dataflowQuery: DataFlowQueryNode,
  nexusEndpoint: NexusEndpointNode,
};
```

## Modular Component Structure

```
[feature]/
  index.tsx           # Entry point
  elements/           # Low-level UI building blocks
    WorkflowCanvas.tsx
    NodePalette.tsx
    PropertyPanel.tsx
    ExecutionStatus.tsx
    [Feature]Skeleton.tsx
```

### One API Call Per Component

```typescript
// CORRECT
function WorkflowList() {
  const { isPending, error, data } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => fetch('/api/workflows').then(res => res.json())
  });

  if (isPending) return <WorkflowListSkeleton />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div className="grid gap-4">
      {data.workflows.map(workflow => (
        <WorkflowCard key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}
```

## Workflow Execution

```typescript
async function executeKailashWorkflow(workflowDef: WorkflowDefinition) {
  const response = await fetch('/api/workflows/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow_definition: workflowDef })
  });

  if (!response.ok) throw new Error('Workflow execution failed');
  return response.json();
}
```

## Real-Time Updates (WebSockets)

```typescript
function useWorkflowExecution(executionId: string) {
  const [status, setStatus] = useState<ExecutionStatus>("pending");
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/ws/executions/${executionId}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "status") setStatus(data.status);
      if (data.type === "log") setLogs(prev => [...prev, data.message]);
    };
    return () => ws.close();
  }, [executionId]);

  return { status, logs };
}
```

<!-- Trigger Keywords: react patterns, react flow, workflow editor, next.js patterns, react kailash -->
