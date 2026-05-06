---
name: nexus-multi-channel
description: "Multi-channel architecture (API + CLI + MCP) via NexusConfig channel flags."
---

# Nexus Multi-Channel Architecture (kailash-rs)

Register once, deploy to API + CLI + MCP automatically.

## Core Pattern

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(config=NexusConfig(port=3000))

@app.handler("github-user", description="Look up a GitHub user")
async def github_user(username: str) -> dict:
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.github.com/users/{username}")
        return resp.json()

app.start()

# Now available as:
# 1. REST API:  POST http://localhost:3000/api/github-user
# 2. CLI:       nexus run github-user --username octocat
# 3. MCP:       AI agents discover as "github-user" tool
```

## Channel Configuration

Control which channels are active via `NexusConfig`:

```python
from kailash.nexus import NexusConfig

# All channels (default)
config = NexusConfig(enable_api=True, enable_cli=True, enable_mcp=True)

# API only
config = NexusConfig(enable_api=True, enable_cli=False, enable_mcp=False)

# API + MCP (no CLI)
config = NexusConfig(enable_api=True, enable_cli=False, enable_mcp=True)
```

## API Channel

Handlers automatically get REST endpoints:

```bash
# Execute handler
curl -X POST http://localhost:3000/api/github-user \
  -H "Content-Type: application/json" \
  -d '{"username": "octocat"}'

# Health check
curl http://localhost:3000/health
```

Custom REST endpoints for API-only routes:

```python
@app.endpoint("/api/v1/status", methods=["GET"])
async def status():
    return app.health_check()
```

## CLI Channel

Handlers automatically become CLI commands:

```bash
# Execute handler
nexus run github-user --username octocat

# List available handlers
nexus list

# Help
nexus --help
```

Configure CLI name:

```python
config = NexusConfig(cli_name="myplatform")
# Now: myplatform run github-user --username octocat
```

## MCP Channel

Handlers automatically become MCP tools discoverable by AI agents:

```json
{
  "tools": [
    {
      "name": "github-user",
      "description": "Look up a GitHub user",
      "input_schema": {
        "type": "object",
        "properties": {
          "username": { "type": "string" }
        },
        "required": ["username"]
      }
    }
  ]
}
```

MCP clients (Claude Desktop, custom agents) connect and discover tools automatically.

## Cross-Channel Parameter Consistency

Same inputs work across all channels:

```python
# API request
{"username": "octocat"}

# CLI command
nexus run github-user --username octocat

# MCP call
client.call_tool("github-user", {"username": "octocat"})
```

## Channel Comparison

| Feature   | API  | CLI       | MCP         |
| --------- | ---- | --------- | ----------- |
| Access    | HTTP | Terminal  | MCP Clients |
| Input     | JSON | Args/JSON | Structured  |
| Output    | JSON | Text/JSON | Structured  |
| Sessions  | Yes  | Yes       | Yes         |
| Auth      | Yes  | Yes       | Yes         |
| Streaming | Yes  | Yes       | Yes         |

## Key Differences from kailash-py

| Aspect        | kailash-py                  | kailash-rs                                         |
| ------------- | --------------------------- | -------------------------------------------------- |
| Channel flags | Implicit (port-based)       | Explicit: `enable_api`, `enable_cli`, `enable_mcp` |
| MCP config    | `mcp_port=3001`             | `enable_mcp=True` in NexusConfig                   |
| API prefix    | `/workflows/{name}/execute` | `/api/{name}`                                      |
| Default port  | 8000 (API), 3001 (MCP)      | 3000 (unified)                                     |

## Best Practices

1. Design handlers that work across all channels -- return structured data
2. Add `description` parameter for MCP tool discovery and CLI help
3. Use type annotations for automatic parameter schema generation
4. Test all three channels during development
5. Disable unused channels in production for reduced attack surface

## Related Skills

- [nexus-api-patterns](nexus-api-patterns.md) - REST API patterns
- [nexus-mcp-channel](nexus-mcp-channel.md) - MCP integration details
- [nexus-config-options](nexus-config-options.md) - Channel configuration
