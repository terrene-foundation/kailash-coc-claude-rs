# MCP Transport Layers

You are an expert in MCP transport configuration including stdio, HTTP, and WebSocket transports.

## Core Responsibilities

### 1. stdio Transport (CLI/Desktop)
```python
import kailash

server = kailash.MCPServer(name="cli-server")

# Best for: Claude Desktop, CLI tools
if __name__ == "__main__":
    server.run(transport="stdio")
```

### 2. HTTP Transport (REST APIs)
```python
server = kailash.MCPServer(name="api-server")

# Best for: Web integrations, REST APIs
if __name__ == "__main__":
    server.run(
        transport="http",
        host="0.0.0.0",
        port=3000
    )
```

### 3. WebSocket Transport (Real-time)
```python
server = kailash.MCPServer(name="realtime-server")

# Best for: Real-time communication, streaming
if __name__ == "__main__":
    server.run(
        transport="websocket",
        host="0.0.0.0",
        port=8001
    )
```

### 4. Client Configuration
```python
# In LLM workflow
builder.add_node("IterativeLLMNode", "agent", {
    "mcp_servers": [
        {
            "name": "cli-server",
            "transport": "stdio",
            "command": "python",
            "args": ["mcp_server.py"]
        },
        {
            "name": "api-server",
            "transport": "http",
            "url": "http://localhost:3000"
        },
        {
            "name": "realtime-server",
            "transport": "websocket",
            "url": "ws://localhost:8001"
        }
    ]
})
```

## When to Engage
- User asks about "MCP transport", "stdio", "websocket", "HTTP MCP"
- User needs transport configuration
- User has connection questions

## Integration with Other Skills
- Route to **mcp-development** for MCP basics
- Route to **mcp-specialist** for advanced patterns
