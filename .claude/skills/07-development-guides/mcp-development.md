# MCP Development

You are an expert in Model Context Protocol (MCP) server development with Kailash SDK. Guide users through creating MCP servers, tools, resources, and prompts.

## Core Responsibilities

### 1. MCP Server Development

- Creating MCP servers with kailash.core.mcp_server
- Implementing tools, resources, and prompts
- Transport configuration (stdio, HTTP, WebSocket)
- Integration with LLM workflows

### 2. Basic MCP Server

```python
import kailash

# Create MCP server
server = kailash.MCPServer(
    name="my-mcp-server",
    version="1.0.0",
    description="My custom MCP server"
)

# Define tool
@server.tool(
    name="calculate_sum",
    description="Calculate the sum of two numbers"
)
def calculate_sum(a: float, b: float) -> dict:
    """Add two numbers together."""
    return {
        "result": a + b,
        "operation": "addition"
    }

# Define resource
@server.resource(
    uri="config://settings",
    name="Server Settings",
    description="Server configuration"
)
def get_settings() -> dict:
    """Return server settings."""
    return {
        "version": "1.0.0",
        "environment": "production"
    }

# Run server
if __name__ == "__main__":
    server.run(transport="stdio")
```

### 3. Advanced MCP Tools

```python
import kailash
from pydantic import BaseModel, Field

server = kailash.MCPServer(name="advanced-server")

# Structured tool with Pydantic
class SearchParams(BaseModel):
    query: str = Field(..., description="Search query")
    limit: int = Field(default=10, description="Number of results")
    category: str = Field(default="all", description="Category filter")

@server.tool(
    name="search_database",
    description="Search database with filters"
)
def search_database(params: SearchParams) -> dict:
    """Search database with structured parameters."""
    # Real database search
    results = perform_search(
        query=params.query,
        limit=params.limit,
        category=params.category
    )

    return {
        "results": results,
        "count": len(results),
        "query": params.query
    }

def perform_search(query, limit, category):
    """Actual search implementation."""
    # Implementation
    return []
```

### 4. MCP with Workflows

```python
import kailash

server = kailash.MCPServer(name="workflow-server")

@server.tool(
    name="process_data",
    description="Process data through workflow"
)
def process_data(input_data: dict) -> dict:
    """Execute workflow to process data."""
    # Create workflow
    builder = kailash.WorkflowBuilder()

    builder.add_node("EmbeddedPythonNode", "processor", {
        "code": """
# Process the input data
result = {
    'processed': True,
    'data': input_data,
    'timestamp': str(datetime.now())
}
"""
    })

    # Execute workflow
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), inputs={
        "processor": {"input_data": input_data}
    })

    return results["processor"]["result"]
```

### 5. Resource Management

```python
@server.resource(
    uri="database://users",
    name="User Database",
    description="Access user data",
    mime_type="application/json"
)
def get_users() -> dict:
    """Retrieve users from database."""
    # Real database access
    users = fetch_users_from_db()
    return {
        "users": users,
        "count": len(users)
    }

@server.resource(
    uri="file://logs/{date}",
    name="Log Files",
    description="Access log files by date"
)
def get_logs(date: str) -> dict:
    """Retrieve logs for specific date."""
    logs = read_log_file(date)
    return {
        "date": date,
        "logs": logs,
        "lines": len(logs)
    }
```

### 6. MCP Prompts

```python
@server.prompt(
    name="data_analysis",
    description="Prompt for data analysis tasks"
)
def data_analysis_prompt(dataset: str, question: str) -> dict:
    """Generate analysis prompt."""
    return {
        "messages": [
            {
                "role": "system",
                "content": "You are a data analysis expert."
            },
            {
                "role": "user",
                "content": f"Analyze the {dataset} dataset and answer: {question}"
            }
        ]
    }
```

### 7. Transport Configuration

**stdio (Standard Input/Output)**:

```python
# Best for: Claude Desktop, CLI tools
server.run(transport="stdio")
```

**HTTP**:

```python
# Best for: Web integrations, REST APIs
server.run(transport="http", host="0.0.0.0", port=3000)
```

**WebSocket**:

```python
# Best for: Real-time communication
server.run(transport="websocket", host="0.0.0.0", port=8001)
```

### 8. Consuming MCP Servers from Agents

MCP server consumption (connecting to MCP servers, discovering tools, and executing them iteratively) is handled by the **Kaizen agent framework** (`kailash-kaizen`), not by workflow nodes directly.

For workflow-level tool calling, use `LLMNode` with explicit tool definitions:

```python
import kailash
import os

builder = kailash.WorkflowBuilder()

# LLMNode supports tool calling via the "tools" parameter.
# Provider is auto-detected from the model name (no "provider" param needed).
builder.add_node("LLMNode", "agent", {
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-4o"),
    "messages": [{"role": "user", "content": "Search for Python tutorials"}],
    "tools": [
        {
            "type": "function",
            "function": {
                "name": "search",
                "description": "Search for tutorials",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string"}
                    },
                    "required": ["query"]
                }
            }
        }
    ]
})

reg = kailash.NodeRegistry()
rt = kailash.Runtime(reg)
result = rt.execute(builder.build(reg))

# The LLM may return tool_calls in its response for your code to handle
```

For full MCP client integration (auto-discovery, iterative tool execution, MCP protocol), use Kaizen agents. See the **kaizen-specialist** for patterns.

### 9. Error Handling in MCP Tools

```python
@server.tool(
    name="safe_operation",
    description="Operation with error handling"
)
def safe_operation(data: dict) -> dict:
    """Execute operation with error handling."""
    try:
        # Validate input
        if not data:
            return {
                "success": False,
                "error": "No data provided"
            }

        # Process
        result = process(data)

        return {
            "success": True,
            "result": result
        }

    except ValueError as e:
        return {
            "success": False,
            "error": "validation_error",
            "message": str(e)
        }

    except Exception as e:
        return {
            "success": False,
            "error": "internal_error",
            "message": str(e)
        }
```

### 10. MCP Server Testing

```python
import kailash
import pytest

def test_mcp_tool():
    """Test MCP tool execution."""
    server = kailash.MCPServer(name="test-server")

    @server.tool(name="test_tool", description="Test tool")
    def test_tool(value: int) -> dict:
        return {"result": value * 2}

    # Test tool execution
    result = test_tool(5)
    assert result["result"] == 10

def test_mcp_resource():
    """Test MCP resource."""
    server = kailash.MCPServer(name="test-server")

    @server.resource(uri="test://resource", name="Test")
    def test_resource() -> dict:
        return {"data": "test"}

    result = test_resource()
    assert result["data"] == "test"
```

## When to Engage

- User asks about "MCP development", "build MCP server", "MCP guide"
- User needs to create MCP tools
- User wants to integrate MCP with workflows
- User has MCP server questions

## Integration with Other Skills

- Route to **mcp-specialist** for advanced MCP patterns
- Route to **mcp-advanced-features** for structured tools, progress
- Route to **mcp-transport-layers** for transport configuration
- Route to **mcp-tool-execution** for tool execution patterns
