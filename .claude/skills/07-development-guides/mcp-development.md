# MCP Development

You are an expert in Model Context Protocol (MCP) server development with Kailash SDK. Guide users through creating MCP servers, tools, resources, and prompts.

## Core Responsibilities

### 1. MCP Server Development

- Creating MCP servers with kailash.core.mcp_server
- Implementing tools, resources, and prompts
- Transport configuration (stdio, HTTP, WebSocket)
- Integration with LLM workflows

### 2. Basic MCP Server

**McpServer (Rust-backed)** uses `register_tool()` / `register_resource()`:

```python
import kailash

# Create MCP server (Rust-backed)
server = kailash.McpServer(
    "my-mcp-server",
    "1.0.0",
    description="My custom MCP server"
)

# Register tool (positional: name, description, handler)
def calculate_sum(a: float, b: float) -> dict:
    """Add two numbers together."""
    return {"result": a + b, "operation": "addition"}

server.register_tool("calculate_sum", "Calculate the sum of two numbers", calculate_sum)

# Register resource (positional: uri, name, description, handler)
def get_settings() -> dict:
    """Return server settings."""
    return {"version": "1.0.0", "environment": "production"}

server.register_resource("config://settings", "Server Settings", "Server configuration", get_settings)

# Run server
if __name__ == "__main__":
    server.run(transport="stdio")
```

**McpApplication (Python compat)** uses `@app.tool()` / `@app.resource()` decorators:

```python
from kailash.nexus import McpApplication

# Create MCP application (Python compat wrapper with decorator API)
app = McpApplication("my-mcp-server", "1.0.0")

@app.tool(name="calculate_sum", description="Calculate the sum of two numbers")
def calculate_sum(a: float, b: float) -> dict:
    return {"result": a + b, "operation": "addition"}

@app.resource(uri="config://settings", name="Server Settings", description="Server configuration")
def get_settings() -> dict:
    return {"version": "1.0.0", "environment": "production"}

if __name__ == "__main__":
    app.run(transport="stdio")
```

### 3. Advanced MCP Tools

```python
import kailash
from pydantic import BaseModel, Field

server = kailash.McpServer("advanced-server", "1.0.0")

# Structured tool with Pydantic
class SearchParams(BaseModel):
    query: str = Field(..., description="Search query")
    limit: int = Field(default=10, description="Number of results")
    category: str = Field(default="all", description="Category filter")

def search_database(params: SearchParams) -> dict:
    """Search database with structured parameters."""
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

# Register with McpServer (name, description, handler)
server.register_tool("search_database", "Search database with filters", search_database)

def perform_search(query, limit, category):
    """Actual search implementation."""
    return []
```

### 4. MCP with Workflows

```python
import kailash

server = kailash.McpServer("workflow-server", "1.0.0")

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
""",
        "output_vars": ["result"]
    })

    # Execute workflow
    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), inputs={
        "processor": {"input_data": input_data}
    })

    return results["processor"]["outputs"]

server.register_tool("process_data", "Process data through workflow", process_data)
```

### 5. Resource Management

```python
def get_users() -> dict:
    """Retrieve users from database."""
    users = fetch_users_from_db()
    return {"users": users, "count": len(users)}

server.register_resource("database://users", "User Database", "Access user data", get_users)

def get_logs(date: str) -> dict:
    """Retrieve logs for specific date."""
    logs = read_log_file(date)
    return {"date": date, "logs": logs, "lines": len(logs)}

server.register_resource("file://logs/{date}", "Log Files", "Access log files by date", get_logs)
```

### 6. MCP Prompts

```python
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

server.register_prompt("data_analysis", "Prompt for data analysis tasks", data_analysis_prompt)
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

MCP server consumption (connecting to MCP servers, discovering tools, and executing them iteratively) is handled by the **Kaizen agent framework** (`kailash.kaizen`), not by workflow nodes directly.

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

server.register_tool("safe_operation", "Operation with error handling", safe_operation)
```

### 10. MCP Server Testing

```python
import kailash
import pytest

def test_mcp_tool():
    """Test MCP tool execution."""
    server = kailash.McpServer("test-server", "1.0.0")

    def test_tool(value: int) -> dict:
        return {"result": value * 2}

    server.register_tool("test_tool", "Test tool", test_tool)

    # Test tool execution directly
    result = test_tool(5)
    assert result["result"] == 10

def test_mcp_resource():
    """Test MCP resource."""
    server = kailash.McpServer("test-server", "1.0.0")

    def test_resource() -> dict:
        return {"data": "test"}

    server.register_resource("test://resource", "Test", "Test resource", test_resource)

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
