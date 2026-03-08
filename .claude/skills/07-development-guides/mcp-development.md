# MCP Development

You are an expert in Model Context Protocol (MCP) server development with Kailash SDK. Guide users through creating MCP servers, tools, resources, and prompts.

## Core Responsibilities

### 1. MCP Server Development

- Creating MCP servers with `kailash.McpServer` (Rust-backed) or `McpApplication` (Python compat)
- Implementing tools, resources, and prompts
- Serving via NexusApp (McpServer has no `run()` method)
- Integration with LLM workflows

### 2. Basic MCP Server

**McpServer (Rust-backed)** uses `register_tool()` / `register_dynamic_resource()`:

```python
import kailash
import json

# Create MCP server (Rust-backed)
server = kailash.McpServer("my-mcp-server", "1.0.0")

# Register tool -- handler receives a dict, returns a dict
def calculate_sum(args: dict) -> dict:
    """Add two numbers together."""
    return {"result": args["a"] + args["b"], "operation": "addition"}

server.register_tool("calculate_sum", "Calculate the sum of two numbers", calculate_sum)

# Register static resource -- content is a string (no handler)
server.register_resource(
    "config://settings",
    "Server Settings",
    '{"version": "1.0.0", "environment": "production"}',
    description="Server configuration"
)

# Register dynamic resource -- handler receives uri string, returns string
def get_settings(uri: str) -> str:
    return '{"version": "1.0.0", "environment": "production"}'

server.register_dynamic_resource(
    "config://dynamic-settings",
    "Dynamic Settings",
    get_settings,
    description="Dynamic server configuration"
)

# NOTE: McpServer has no run() method.
# Use NexusApp to serve MCP tools via HTTP.
```

**McpApplication (Python compat)** uses `@app.tool()` / `@app.resource()` decorators:

```python
from kailash.mcp import McpApplication

# Create MCP application (Python compat wrapper with decorator API)
app = McpApplication("my-mcp-server", "1.0.0")

@app.tool("calculate_sum", "Calculate the sum of two numbers")
def calculate_sum(params):
    return {"result": params["a"] + params["b"], "operation": "addition"}

@app.resource(uri="config://settings", name="Server Settings", description="Server configuration")
def get_settings(uri: str) -> str:
    return '{"version": "1.0.0", "environment": "production"}'

# Note: app.run() raises RuntimeError -- use Nexus for serving MCP tools
```

### 3. Advanced MCP Tools

```python
import kailash
from pydantic import BaseModel, Field

server = kailash.McpServer("advanced-server", "1.0.0")

# Structured tool with Pydantic validation
class SearchParams(BaseModel):
    query: str = Field(..., description="Search query")
    limit: int = Field(default=10, description="Number of results")
    category: str = Field(default="all", description="Category filter")

# Handler receives a dict -- parse Pydantic model inside
def search_database(args: dict) -> dict:
    """Search database with structured parameters."""
    params = SearchParams(**args)
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

server.register_tool("search_database", "Search database with filters", search_database)

def perform_search(query, limit, category):
    """Actual search implementation."""
    return []
```

### 4. MCP with Workflows

```python
import kailash

server = kailash.McpServer("workflow-server", "1.0.0")

# Tool handler receives a dict
def process_data(args: dict) -> dict:
    """Execute workflow to process data."""
    builder = kailash.WorkflowBuilder()
    builder.add_node("EmbeddedPythonNode", "processor", {
        "code": "result = {'processed': True, 'input': input_data}",
        "output_vars": ["result"]
    })

    reg = kailash.NodeRegistry()
    rt = kailash.Runtime(reg)
    result = rt.execute(builder.build(reg), inputs={
        "processor": {"input_data": args.get("data", {})}
    })

    return result["results"]["processor"]

server.register_tool("process_data", "Process data through workflow", process_data)
```

### 5. Resource Management

```python
import json

# Static resources -- register_resource takes content string
server.register_resource(
    "database://schema",
    "Database Schema",
    '{"tables": ["users", "products"]}',
    description="Database schema information"
)

# Dynamic resources -- register_dynamic_resource takes handler
def get_users(uri: str) -> str:
    """Retrieve users from database."""
    users = fetch_users_from_db()
    return json.dumps({"users": users, "count": len(users)})

server.register_dynamic_resource(
    "database://users",
    "User Database",
    get_users,
    description="Access user data"
)

def get_logs(uri: str) -> str:
    """Retrieve logs -- uri contains the date."""
    date = uri.split("/")[-1] if "/" in uri else "today"
    logs = read_log_file(date)
    return json.dumps({"date": date, "logs": logs, "lines": len(logs)})

server.register_dynamic_resource(
    "file://logs",
    "Log Files",
    get_logs,
    description="Access log files"
)
```

### 6. MCP Prompts

```python
# Prompt handler receives a dict, returns a list of message dicts
def data_analysis_prompt(args: dict) -> list:
    """Generate analysis prompt."""
    dataset = args.get("dataset", "unknown")
    question = args.get("question", "Summarize the data")
    return [
        {"role": "system", "content": "You are a data analysis expert."},
        {"role": "user", "content": f"Analyze the {dataset} dataset and answer: {question}"}
    ]

server.register_prompt(
    "data_analysis",
    data_analysis_prompt,
    description="Prompt for data analysis tasks"
)
```

### 7. Serving MCP Tools

`McpServer` has no `run()` method. Use **NexusApp** to serve MCP tools via HTTP:

```python
from kailash.nexus import NexusApp, NexusConfig

app = NexusApp(NexusConfig(port=3000))

@app.handler(name="calculate_sum", description="Calculate sum of two numbers")
async def calculate_sum(a: float, b: float) -> dict:
    return {"result": a + b}

app.start()  # Blocks, serves API + CLI + MCP on port 3000
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
# Handler receives a dict
def safe_operation(args: dict) -> dict:
    """Execute operation with error handling."""
    try:
        data = args.get("data")
        if not data:
            return {"success": False, "error": "No data provided"}

        result = process(data)
        return {"success": True, "result": result}

    except ValueError as e:
        return {"success": False, "error": "validation_error", "message": str(e)}

    except Exception as e:
        return {"success": False, "error": "internal_error", "message": str(e)}

server.register_tool("safe_operation", "Operation with error handling", safe_operation)
```

### 10. MCP Server Testing

```python
import kailash
import pytest

def test_mcp_tool():
    """Test MCP tool execution."""
    server = kailash.McpServer("test-server", "1.0.0")

    # Handler receives a dict
    def test_tool(args: dict) -> dict:
        return {"result": args["value"] * 2}

    server.register_tool("test_tool", "Test tool", test_tool)

    # Test tool function directly with dict input
    result = test_tool({"value": 5})
    assert result["result"] == 10

def test_mcp_resource():
    """Test MCP static resource."""
    server = kailash.McpServer("test-server", "1.0.0")

    server.register_resource("test://data", "Test", '{"data": "test"}', description="Test resource")

    # Read resource via server
    content = server.read_resource("test://data")
    assert "test" in content["text"]

def test_mcp_dynamic_resource():
    """Test MCP dynamic resource."""
    server = kailash.McpServer("test-server", "1.0.0")

    def get_data(uri: str) -> str:
        return '{"data": "dynamic_test"}'

    server.register_dynamic_resource("test://dynamic", "Dynamic Test", get_data)

    result = get_data("test://dynamic")
    assert "dynamic_test" in result
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
