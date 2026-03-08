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

## Quick Reference

- **NO MOCKING Policy**: Test with real MCP servers (Tier 2/3)
- **Mock Provider**: Use "mock" provider for Tier 1 unit tests only
- **Integration**: Tier 2 tests with real MCP servers
- **E2E**: Tier 3 tests with full production-like setup

## Tier 1: Unit Tests (Mock Provider)

```python
import kailash

reg = kailash.NodeRegistry()

def test_mcp_workflow_structure():
    """Unit test - workflow structure only (mock provider)."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("IterativeLLMNode", "agent", {
        "provider": "mock",  # Mock provider for structure testing
        "model": "mock",
        "messages": [{"role": "user", "content": "Test"}],
        "mcp_servers": [{
            "name": "weather",
            "transport": "stdio",
            "command": "echo",
            "args": ["test"]
        }]
    })

    rt = kailash.Runtime(reg)
    built_workflow = builder.build(reg)

    # Assert structure only
    assert "agent" in built_workflow.nodes
    assert built_workflow.nodes["agent"]["type"] == "IterativeLLMNode"
```

## Tier 2: Integration Tests (Real MCP Servers)

```python
import pytest
import kailash

reg = kailash.NodeRegistry()

@pytest.mark.integration
def test_real_mcp_tool_execution():
    """Integration test - real MCP server execution."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("IterativeLLMNode", "agent", {
        "provider": "openai",
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
        "messages": [{"role": "user", "content": "Get weather for NYC"}],
        "mcp_servers": [{
            "name": "weather",
            "transport": "stdio",
            "command": "python",
            "args": ["-m", "weather_mcp_server"]  # Real MCP server
        }],
        "auto_discover_tools": True,
        "auto_execute_tools": True
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Assert real MCP tool executed
    assert result["results"]["agent"]["status"] == "completed"
    assert "iterations" in result["results"]["agent"]
    assert len(result["results"]["agent"]["context"]["tools_executed"]) > 0
```

## Tier 3: End-to-End Tests

```python
@pytest.mark.e2e
def test_mcp_production_flow():
    """E2E test - full production-like MCP flow."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("IterativeLLMNode", "agent", {
        "provider": "openai",
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
        "messages": [{"role": "user", "content": "Search docs and get weather"}],
        "mcp_servers": [
            {
                "name": "docs",
                "transport": "http",
                "url": "https://test-api.company.com/mcp",
                "headers": {"Authorization": f"Bearer {os.getenv('TEST_API_KEY')}"}
            },
            {
                "name": "weather",
                "transport": "stdio",
                "command": "python",
                "args": ["-m", "weather_mcp_server"]
            }
        ],
        "max_iterations": 3
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Assert end-to-end flow
    assert result["results"]["agent"]["status"] == "completed"
    assert len(result["results"]["agent"]["iterations"]) <= 3
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

### Test Tool Discovery

```python
def test_mcp_tool_discovery():
    """Test that MCP tools are discovered correctly."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("IterativeLLMNode", "agent", {
        "provider": "openai",
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
        "messages": [{"role": "user", "content": "List available tools"}],
        "mcp_servers": [{
            "name": "test",
            "transport": "stdio",
            "command": "python",
            "args": ["test_mcp_server.py"]
        }],
        "auto_discover_tools": True
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Check discovered tools
    discovered_tools = result["results"]["agent"]["context"].get("discovered_tools", {})
    assert "test" in discovered_tools
    assert len(discovered_tools["test"]) > 0
```

### Test Error Handling

```python
def test_mcp_server_failure_handling():
    """Test graceful handling of MCP server failures."""
    builder = kailash.WorkflowBuilder()

    builder.add_node("IterativeLLMNode", "agent", {
        "provider": "openai",
        "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
        "messages": [{"role": "user", "content": "Get data"}],
        "mcp_servers": [{
            "name": "failing",
            "transport": "stdio",
            "command": "nonexistent_command"  # Will fail
        }],
        "max_iterations": 1
    })

    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg))

    # Should complete with error reported
    assert result["results"]["agent"]["status"] == "completed"
    # Check that agent reported the failure gracefully
```

## Best Practices

1. **NO MOCKING in Tier 2/3** - Always use real MCP servers
2. **Use mock provider only in Tier 1** - For structure testing
3. **Test real tool execution** - Verify actual MCP protocol
4. **Test error scenarios** - Server failures, timeouts, invalid tools
5. **Environment-specific configs** - Different MCP servers per environment

## Related Patterns

- **Gold Standard Testing**: [`gold-test-creation`](../../17-gold-standards/gold-test-creation.md)
- **MCP Integration**: [`mcp-integration-guide`](../../01-core-sdk/mcp-integration-guide.md)

## When to Escalate

Use `mcp-specialist` for complex test server implementations and `testing-specialist` for 3-tier test strategy.

<!-- Trigger Keywords: MCP testing, mock MCP, integration test MCP, test mcp server, mcp test patterns -->
