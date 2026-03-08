---
name: mcp-testing-patterns
description: "MCP testing patterns: real vs mock, integration patterns. Use when asking 'MCP testing', 'mock MCP', 'integration test MCP', 'test mcp server', or 'mcp test patterns'."
---

# MCP Testing Patterns

Test MCP integrations with real servers and mock strategies.

> **Skill Metadata**
> Category: `mcp`
> Priority: `HIGH`
> Related Skills: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md), [`gold-test-creation`](../../17-gold-standards/gold-test-creation.md)
> Related Subagents: `mcp-specialist` (test server implementation), `testing-specialist` (3-tier strategy)

## Architecture Note

MCP client connections (connecting to MCP servers, discovering and executing tools) are handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes. `LLMNode` supports tool calling via the `tools` parameter but does not connect to MCP servers directly.

For testing MCP servers you build, test the server tools directly. For testing MCP client integration, use Kaizen agent tests.

## Quick Reference

- **NO MOCKING Policy**: Test with real MCP servers (Tier 2/3)
- **Tier 1**: Unit tests for tool logic and workflow structure
- **Tier 2**: Integration tests with real MCP servers
- **Tier 3**: E2E tests with full production-like setup

## Tier 1: Unit Tests (Tool Logic)

```python
import kailash

reg = kailash.NodeRegistry()

def test_llm_workflow_with_tools():
    """Unit test - workflow structure with tool definitions."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("LLMNode", "agent", {
        "model": "gpt-4o",
        "messages": [{"role": "user", "content": "Test"}],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "test_tool",
                    "description": "A test tool",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "value": {"type": "integer"}
                        }
                    }
                }
            }
        ]
    })

    # Verify workflow builds successfully
    built_workflow = builder.build(reg)
    assert built_workflow is not None
```

## Tier 2: Integration Tests (Real MCP Servers)

```python
import pytest
import kailash

reg = kailash.NodeRegistry()

@pytest.mark.integration
def test_mcp_server_tool_execution():
    """Integration test - test MCP server tools directly."""
    from kailash.mcp import McpApplication

    app = McpApplication("test-server", "1.0")

    @app.tool(name="get_data", description="Get test data")
    def get_data(key: str) -> str:
        return f'{{"key": "{key}", "value": "test_data"}}'

    # Test tool function directly
    result = get_data("test_key")
    assert "test_data" in result

@pytest.mark.integration
def test_llm_tool_calling():
    """Integration test - LLMNode with real tool calling."""
    import os

    builder = kailash.WorkflowBuilder()

    builder.add_node("LLMNode", "agent", {
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
        "messages": [{"role": "user", "content": "Get weather for NYC"}],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get weather for a city",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "city": {"type": "string"}
                        },
                        "required": ["city"]
                    }
                }
            }
        ]
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Verify LLM returned tool calls or a response
    agent_result = result["results"]["agent"]
    assert "response" in agent_result or "tool_calls" in agent_result
```

## Tier 3: End-to-End Tests

```python
@pytest.mark.e2e
def test_mcp_server_production_flow():
    """E2E test - full MCP server serving tools."""
    from kailash.mcp import McpApplication

    app = McpApplication("e2e-server", "1.0")

    @app.tool(name="search", description="Search documents")
    def search(query: str) -> str:
        return f'{{"results": ["{query} result 1", "{query} result 2"]}}'

    @app.resource(uri="config://settings", name="Settings")
    def get_settings() -> str:
        return '{"version": "1.0", "environment": "test"}'

    # Test tool
    search_result = search("python tutorials")
    assert "result 1" in search_result

    # Test resource
    settings = get_settings()
    assert "version" in settings
```

## Test MCP Server Implementation

```python
# test_mcp_server.py - Simple test MCP server
import json
import sys

def handle_mcp_request(request):
    """Handle MCP protocol requests."""
    method = request.get("method")

    if method == "tools/list":
        return {
            "tools": [
                {
                    "name": "get_test_data",
                    "description": "Get test data",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "key": {"type": "string"}
                        }
                    }
                }
            ]
        }
    elif method == "tools/call":
        tool_name = request["params"]["name"]
        if tool_name == "get_test_data":
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({"test": "data", "status": "success"})
                    }
                ]
            }

    return {"error": "Method not found"}

if __name__ == "__main__":
    for line in sys.stdin:
        request = json.loads(line)
        response = handle_mcp_request(request)
        print(json.dumps(response))
        sys.stdout.flush()
```

## Common Test Patterns

### Test LLMNode Tool Calling

```python
def test_llm_tool_calling_structure():
    """Test that LLMNode accepts tool definitions correctly."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("LLMNode", "agent", {
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
        "messages": [{"role": "user", "content": "List available tools"}],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": "get_data",
                    "description": "Get data by key",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "key": {"type": "string"}
                        },
                        "required": ["key"]
                    }
                }
            }
        ]
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # LLM should respond with tool usage or text
    assert result["results"]["agent"] is not None
```

### Test Error Handling

```python
def test_llm_graceful_on_missing_model():
    """Test graceful handling of missing model."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("LLMNode", "agent", {
        "model": "nonexistent-model-xyz",
        "messages": [{"role": "user", "content": "Get data"}],
    })

    rt = kailash.Runtime(reg)

    # Should handle error gracefully
    try:
        result = rt.execute(builder.build(reg))
    except Exception as e:
        assert "model" in str(e).lower() or "provider" in str(e).lower()
```

## Best Practices

1. **NO MOCKING in Tier 2/3** - Always use real MCP servers and real LLM providers
2. **Test tool functions directly** - MCP server tools are regular Python functions
3. **Test LLMNode tool calling** - Verify tool definitions are accepted and tool_calls are returned
4. **Test error scenarios** - Missing models, invalid parameters, timeouts
5. **Environment-specific configs** - Use env vars for model names and API keys

## Related Patterns

- **Gold Standard Testing**: [`gold-test-creation`](../../17-gold-standards/gold-test-creation.md)
- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)

## When to Escalate

Use `mcp-specialist` for complex test server implementations and `testing-specialist` for 3-tier test strategy.

<!-- Trigger Keywords: MCP testing, mock MCP, integration test MCP, test mcp server, mcp test patterns -->
