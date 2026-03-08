---
skill: nexus-multi-channel
description: Understand Nexus's revolutionary multi-channel architecture - single workflow, three interfaces (API/CLI/MCP)
priority: HIGH
tags: [nexus, multi-channel, api, cli, mcp, architecture]
---

# Nexus Multi-Channel Architecture

Register once, deploy to API + CLI + MCP automatically.

## Core Innovation

Traditional platforms require separate implementations for each interface. Nexus automatically generates all three:

```python
import kailash
from kailash.nexus import NexusApp

reg = kailash.NodeRegistry()

app = NexusApp()

# Build once
builder = kailash.WorkflowBuilder()
builder.add_node("HTTPRequestNode", "fetch", {
    "url": "https://api.github.com/users/{{username}}",
    "method": "GET"
})

# Register once
wf = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("github-user", lambda **inputs: rt.execute(wf, inputs))

# Now available as:
# 1. REST API: POST /workflows/github-user/execute
# 2. CLI: nexus run github-user --username octocat
# 3. MCP: AI agents discover as "github-user" tool
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│                    Nexus Core                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   API    │  │   CLI    │  │   MCP    │     │
│  │ Channel  │  │ Channel  │  │ Channel  │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘     │
│       └──────────────┴──────────────┘           │
│         Session Manager & Event Router          │
│  ┌─────────────────────────────────────────────┐│
│  │        Enterprise Gateway                   ││
│  └─────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│               Kailash SDK                       │
│         Workflows │ Nodes │ Runtime             │
└─────────────────────────────────────────────────┘
```

## API Channel

**Automatic REST Endpoints**:

```bash
# Execute workflow
curl -X POST http://localhost:3000/workflows/github-user/execute \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"username": "octocat"}}'

# Get workflow schema
curl http://localhost:3000/workflows/github-user/schema

# Get OpenAPI docs
curl http://localhost:3000/docs

# Health check
curl http://localhost:3000/health
```

**Configuration**:

```python
from kailash.nexus import NexusApp

app = NexusApp()

# Add rate limiting
app.add_rate_limit(1000)

# NOTE: NexusApp does not have app.api.* attributes.
# API behavior (compression, timeouts, concurrency) is configured
# server-side via Rust Nexus engine and tower middleware.
```

## CLI Channel

**Automatic Commands**:

```bash
# Execute workflow
nexus run github-user --username octocat

# List available workflows
nexus list

# Get workflow info
nexus info github-user

# Help
nexus --help
```

**Note**: NexusApp does not have `app.cli.*` attributes. CLI behavior is configured
server-side via the Rust Nexus engine (clap-based CLI generation).

## MCP Channel

**AI Agent Integration**:

```python
# Workflows automatically become MCP tools
from kailash.nexus import NexusApp
app = NexusApp()

# Use @app.handler() with descriptions for AI discovery
# NOTE: workflow.add_metadata() does not exist. Use handler descriptions instead.
@app.handler("github_user_lookup", description="Look up GitHub user by username")
async def github_user_lookup(username: str) -> dict:
    """Look up GitHub user information by username."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("HTTPRequestNode", "fetch", {
        "url": f"https://api.github.com/users/{username}",
        "method": "GET"
    })
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))
    return result["results"]["fetch"]
```

**MCP Usage**:

```python
import mcp_client

client = mcp_client.connect("http://localhost:3001")
result = client.call_tool("github-lookup", {"username": "octocat"})
```

**Note**: NexusApp does not have `app.mcp.*` attributes. MCP behavior is configured
server-side via the Rust Nexus engine.

## Cross-Channel Parameter Consistency

**Same inputs work across all channels**:

```python
# API Request
{
  "inputs": {
    "username": "octocat",
    "include_repos": true
  }
}

# CLI Command
nexus run github-user --username octocat --include-repos true

# MCP Call
client.call_tool("github-user", {
  "username": "octocat",
  "include_repos": true
})
```

## Unified Sessions

Sessions work across all channels:

```python
# Create session in API
response = requests.post(
    "http://localhost:3000/workflows/process/execute",
    json={"inputs": {"step": 1}},
    headers={"X-Session-ID": "session-123"}
)

# Continue in CLI (same session)
# nexus run process --session session-123 --step 2

# Complete in MCP (full state preserved)
result = client.call_tool("process", {
    "step": 3,
    "session_id": "session-123"
})
```

## Testing All Channels

```python
import requests
import subprocess

class MultiChannelTester:
    def test_api(self, workflow_name, inputs):
        response = requests.post(
            f"http://localhost:3000/workflows/{workflow_name}/execute",
            json={"inputs": inputs}
        )
        return response.json()

    def test_cli(self, workflow_name, params):
        cmd = ["nexus", "run", workflow_name] + params
        result = subprocess.run(cmd, capture_output=True, text=True)
        return result.stdout

    def test_mcp(self, tool_name, parameters):
        client = mcp_client.connect("http://localhost:3001")
        return client.call_tool(tool_name, parameters)

tester = MultiChannelTester()
tester.test_api("github-user", {"username": "octocat"})
tester.test_cli("github-user", ["--username", "octocat"])
tester.test_mcp("github-user", {"username": "octocat"})
```

## Best Practices

### 1. Channel-Agnostic Design

Design workflows that work well across all channels:

```python
builder.add_node("EmbeddedPythonNode", "universal_output", {
    "code": """
result = {
    'data': process(input_data),        # Core logic
    'api_response': format_json(data),  # For API
    'cli_display': format_text(data),   # For CLI
    'mcp_result': format_tool(data)     # For MCP
}
""",
    "output_vars": ["result"]
})
```

### 2. Progressive Enhancement

Start simple, add channel-specific features as needed:

```python
app = NexusApp()
wf = builder.build(reg)
rt = kailash.Runtime(reg)
app.register("workflow", lambda **inputs: rt.execute(wf, inputs))

# NOTE: NexusApp does not have app.api.*, app.cli.*, or app.mcp.* attributes.
# Channel-specific features are configured server-side via the Rust Nexus engine.
# Use presets for bundled middleware configurations.
```

### 3. Consistent Error Handling

Handle errors uniformly across channels:

```python
builder.add_node("EmbeddedPythonNode", "error_handler", {
    "code": """
if 'error' in data:
    result = {
        'api_error': {'status': 'error', 'message': data['error']},
        'cli_error': f"Error: {data['error']}",
        'mcp_error': {'error': True, 'details': data['error']}
    }
""",
    "output_vars": ["result"]
})
```

## Key Takeaways

- Single registration creates three interfaces automatically
- Same parameters work across all channels
- Unified session management across channels
- Test all channels during development
- Channel-specific optimizations available
- Progressive enhancement from simple to complex

## Related Skills

- [nexus-api-patterns](#) - Deep dive into API usage
- [nexus-cli-patterns](#) - CLI command patterns
- [nexus-mcp-channel](#) - MCP integration details
- [nexus-sessions](#) - Session management guide
