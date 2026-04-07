---
name: nexus-mcp-channel
description: "MCP channel configuration and AI agent tool exposure via Nexus handlers."
---

# Nexus MCP Channel (kailash-rs)

AI agent integration via Model Context Protocol (MCP). Handlers registered with Nexus automatically become discoverable MCP tools.

## Basic MCP Integration

```python
from kailash.nexus import NexusApp, NexusConfig

# MCP is enabled by default
app = NexusApp(config=NexusConfig(port=3000))

@app.handler("github_lookup", description="Look up GitHub user information by username")
async def github_lookup(username: str) -> dict:
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.github.com/users/{username}")
        return resp.json()

app.start()
# MCP tools are now discoverable by AI agents
```

## Tool Discovery

Handlers are automatically exposed as MCP tools with schema derived from function signatures:

```json
{
  "tools": [
    {
      "name": "github_lookup",
      "description": "Look up GitHub user information by username",
      "input_schema": {
        "type": "object",
        "properties": {
          "username": {
            "type": "string"
          }
        },
        "required": ["username"]
      }
    }
  ]
}
```

## MCP Channel Control

Enable or disable MCP via `NexusConfig`:

```python
# MCP enabled (default)
config = NexusConfig(enable_mcp=True)

# MCP disabled
config = NexusConfig(enable_mcp=False)

# MCP only (no CLI)
config = NexusConfig(enable_api=True, enable_cli=False, enable_mcp=True)
```

## Rich Tool Descriptions

Add detailed descriptions and use `HandlerParam` for explicit parameter metadata:

```python
from kailash.nexus import NexusApp, HandlerParam

app = NexusApp()

@app.handler("search_docs", description="Search documentation by keyword", params=[
    HandlerParam(name="query", param_type="string", required=True, description="Search query string"),
    HandlerParam(name="limit", param_type="integer", required=False, description="Maximum results to return"),
    HandlerParam(name="category", param_type="string", required=False, description="Filter by category"),
])
async def search_docs(query: str, limit: int = 10, category: str = None) -> dict:
    return {"query": query, "limit": limit, "results": []}
```

This produces richer MCP tool schemas that help AI agents understand parameter purpose and constraints.

## MCP Client Usage

```python
# Example: connecting to Nexus MCP server from a client
import mcp_client

client = mcp_client.connect("http://localhost:3000")

# Discover available tools
tools = client.list_tools()
print(f"Available tools: {[t['name'] for t in tools]}")

# Execute tool
result = client.call_tool("github_lookup", {"username": "octocat"})
print(result)
```

## Structured Output for AI Agents

Design handler outputs for easy AI consumption:

```python
@app.handler("analyze_repo", description="Analyze a GitHub repository")
async def analyze_repo(owner: str, repo: str) -> dict:
    return {
        "repository": f"{owner}/{repo}",
        "summary": "Repository analysis results",
        "metrics": {
            "stars": 1000,
            "forks": 200,
            "open_issues": 42,
        },
        "metadata": {
            "analyzed_at": "2026-04-07T00:00:00Z",
            "source": "github_api",
        },
    }
```

## Key Differences from kailash-py

| Aspect             | kailash-py                     | kailash-rs                               |
| ------------------ | ------------------------------ | ---------------------------------------- |
| MCP port           | Separate `mcp_port=3001`       | Unified port via `NexusConfig(port=...)` |
| MCP enable/disable | Implicit (port-based)          | Explicit `enable_mcp=True/False`         |
| Tool metadata      | `workflow.add_metadata({...})` | `HandlerParam` + handler `description`   |

## Best Practices

1. Add `description` to every handler -- AI agents rely on it for tool selection
2. Use explicit `HandlerParam` for complex parameters
3. Return structured dictionaries with clear field names
4. Include metadata in responses (timestamps, sources) for agent context
5. Use descriptive handler names -- they become MCP tool names

## Related Skills

- [nexus-multi-channel](nexus-multi-channel.md) - All channels overview
- [nexus-handler-support](nexus-handler-support.md) - Handler and HandlerParam patterns
- [nexus-config-options](nexus-config-options.md) - Channel configuration
