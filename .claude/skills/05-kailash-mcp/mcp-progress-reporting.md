---
name: mcp-progress-reporting
description: "MCP progress updates for long operations. Use when asking 'MCP progress', 'progress reporting', 'long operation', 'progress updates', or 'mcp streaming'."
---

# MCP Progress Reporting

Report progress for long-running MCP operations.

> **Skill Metadata**
> Category: `mcp`
> Priority: `LOW`
> Related Skills: [`mcp-resources`](mcp-resources.md), [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)
> Related Subagents: `mcp-specialist` (streaming patterns)

## Quick Reference

- **Progress**: Real-time updates during tool execution
- **Use Cases**: File uploads, data processing, long queries
- **SSE**: Best transport for progress streaming

## Architecture Note

MCP progress reporting is implemented on MCP servers (built with `McpApplication` or `McpServer`). MCP client connections that receive progress updates are handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes.

## Server-Side Progress Reporting

```python
from kailash.mcp import McpApplication

app = McpApplication("processor-server", "1.0")

@app.tool("process_data", "Process a large dataset")
def process_data(params):
    """Process data with progress reporting."""
    import json
    dataset_url = params["dataset_url"]
    # Implementation would report progress via MCP protocol
    # The MCP server framework handles progress notifications
    return json.dumps({"status": "completed", "records_processed": 1000})
```

## Client-Side Progress Configuration (Kaizen Agents)

Kaizen agents can receive progress updates from MCP servers via SSE transport:

```python
# Kaizen agent MCP client config with progress support
mcp_client_config = {
    "name": "processor",
    "transport": "sse",
    "url": "https://api.company.com/mcp",
}
# Pass this config to a Kaizen agent for progress-aware tool execution
```

## Related Patterns

- **Resources**: [`mcp-resources`](mcp-resources.md)
- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)

<!-- Trigger Keywords: MCP progress, progress reporting, long operation, progress updates, mcp streaming -->
