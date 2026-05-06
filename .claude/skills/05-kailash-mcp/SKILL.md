---
name: kailash-mcp
description: "Kailash MCP (Model Context Protocol): server, client, tools, resources, prompts, auth, transports (stdio/SSE/HTTP), testing. Use for AI agent integration."
---

# Kailash MCP - Model Context Protocol Integration

Production-ready MCP server implementation built into Kailash Core SDK for seamless AI agent integration.

## Overview

Kailash's MCP module provides:

- **Full MCP Specification**: Complete implementation of Model Context Protocol
- **Multiple Transports**: stdio, SSE, HTTP support
- **Structured Tools**: Type-safe tool definitions
- **Resource Management**: Expose data sources to AI agents
- **Authentication**: Secure MCP server access
- **Progress Reporting**: Real-time operation status
- **Testing Support**: Comprehensive testing utilities

## Quick Start

### McpApplication (Phase 17 -- Decorator Pattern)

```python
from kailash.mcp import McpApplication, prompt_argument

app = McpApplication("my-server", "1.0")

@app.tool("search", "Search the web")
def search(params):
    return f"Results for {params['query']}"

@app.resource(uri="config://settings", name="Settings")
def get_settings(uri: str) -> str:
    return '{"theme": "dark"}'

@app.prompt("summarize", description="Summarize text")
def summarize_prompt(arguments):
    return [{"role": "user", "content": f"Please summarize: {arguments['text']}"}]
```

### McpServer (Core SDK Pattern)

```python
from kailash import McpServer

# Create MCP server -- name and version are required
server = McpServer("my-server", version="1.0.0")

# Register workflow as MCP tool
def summarize_handler(args: dict) -> dict:
    """Summarize the given text."""
    text = args.get("text", "")
    return {"summary": text[:100]}

server.register_tool(
    "summarize",
    "Summarize the given text",
    summarize_handler,
    schema={"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]},
)

# Note: McpServer does not have a run() method.
# To serve MCP tools over a network, use Nexus:
# from kailash.nexus import NexusApp
# app = NexusApp(config=NexusConfig(enable_mcp=True))
print(f"Tools registered: {server.tool_count()}")
```

## Reference Documentation

### Getting Started

- **[mcp-transports-quick](mcp-transports-quick.md)** - Transport configuration (stdio, SSE, HTTP)
- **[mcp-structured-tools](mcp-structured-tools.md)** - Defining MCP tools
- **[mcp-resources](mcp-resources.md)** - Exposing resources to agents

### Security & Operations

- **[mcp-authentication](mcp-authentication.md)** - Authentication and authorization
- **[mcp-progress-reporting](mcp-progress-reporting.md)** - Progress updates for long operations
- **[mcp-testing-patterns](mcp-testing-patterns.md)** - Testing MCP servers and tools

## Key Concepts

### MCP Protocol

The Model Context Protocol enables AI agents to:

- **Tools**: Call structured functions
- **Resources**: Access data sources
- **Prompts**: Use pre-defined templates
- **Sampling**: Request LLM completions

### Transports

MCP supports multiple transport mechanisms:

- **stdio**: Standard input/output (default, simplest)
- **SSE**: Server-Sent Events (for web clients)
- **HTTP**: RESTful API (for HTTP clients)

### Structured Tools

Tools are type-safe functions exposed to AI agents:

- Automatic schema generation from Python type hints
- Input validation
- Error handling
- Progress reporting

### Resources

Resources expose data to AI agents:

- File systems
- Databases
- APIs
- Custom data sources

## When to Use This Skill

Use MCP when you need to:

- Expose workflows as tools for AI agents
- Build MCP servers for Claude Desktop or other clients
- Integrate Kailash workflows with AI assistants
- Provide structured tools to language models
- Expose resources for RAG applications
- Build custom MCP integrations

## Integration Patterns

### With Core SDK (Workflow Tools)

```python
import kailash

reg = kailash.NodeRegistry()

server = McpServer("workflow-server", version="1.0.0")

def process_handler(args: dict) -> dict:
    builder = kailash.WorkflowBuilder()
    # Build workflow
    results = rt.execute(builder.build(reg))
    return results["results"]["output"]["result"]

server.register_tool("process_data", "Process data", process_handler)
```

### With Nexus (Multi-Channel with MCP)

```python
from kailash.nexus import NexusApp, NexusConfig

# Nexus automatically creates MCP channel
app = NexusApp(config=NexusConfig(port=3000, enable_mcp=True))

@app.handler(name="summarize", description="Summarize text")
async def summarize(text: str) -> dict:
    return {"summary": text[:100]}

app.start()  # Includes MCP server
```

### With DataFlow (Database Access)

```python
import kailash

server = McpServer("db-server", version="1.0.0")
df = kailash.DataFlow(...)

server.register_resource(
    uri="data://users",
    name="Users",
    content="User data from database",
    description="Expose database users via MCP resource",
)
```

### With Kaizen (Agent Tools)

```python
import kailash

server = McpServer("agent-server", version="1.0.0")

def analyze_handler(args: dict) -> dict:
    from kailash.kaizen import BaseAgent
    # Use a custom BaseAgent subclass here
    return {"output": f"Analyzed: {args.get('text', '')}"}

server.register_tool("analyze", "Analyze text", analyze_handler)
```

## Critical Rules

- ✅ Use stdio transport for local development
- ✅ Define clear tool schemas with type hints
- ✅ Implement progress reporting for long operations
- ✅ Test MCP servers with real MCP clients
- ✅ Use authentication for production servers
- ❌ NEVER expose sensitive data without authentication
- ❌ NEVER skip input validation
- ❌ NEVER mock MCP protocol in tests (use real transports)

## Transport Selection

| Transport | Use Case         | Pros              | Cons          |
| --------- | ---------------- | ----------------- | ------------- |
| **stdio** | Local tools, CLI | Simple, reliable  | Local only    |
| **SSE**   | Web apps         | Real-time updates | Complex setup |
| **HTTP**  | APIs, services   | Standard protocol | No streaming  |

## Version Compatibility

- **MCP Specification**: Latest
- **Python**: 3.10+
- **Transports**: stdio, SSE, HTTP

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** - Core workflow patterns
- **[03-nexus](../03-nexus/SKILL.md)** - Nexus includes MCP channel
- **[04-kaizen](../04-kaizen/SKILL.md)** - AI agents as MCP tools
- **[02-dataflow](../02-dataflow/SKILL.md)** - Database resources

## Support

For MCP-specific questions, invoke:

- `mcp-specialist` - MCP server implementation
- `testing-specialist` - MCP testing strategies
- ``decide-framework` skill` - MCP integration architecture
