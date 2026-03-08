---
name: nexus-installation
description: "Nexus installation and setup. Use when asking 'install nexus', 'nexus setup', or 'nexus requirements'."
---

# Nexus Installation Guide

> **Skill Metadata**
> Category: `nexus`
> Priority: `HIGH`
> Related Skills: [`nexus-quickstart`](nexus-quickstart.md)

## Installation

```bash
# Install Kailash (Nexus included)
pip install kailash-enterprise

# Verify installation
python -c "import kailash; print('Nexus installed successfully')"
```

## Requirements

- Python 3.10+
- kailash-enterprise (includes Nexus, DataFlow, Kaizen, Enterprise)

## Quick Setup

```python
import kailash

reg = kailash.NodeRegistry()

# Create workflow
builder = kailash.WorkflowBuilder()
builder.add_node("LLMNode", "chat", {
    "provider": "openai",
    "model": os.environ.get("DEFAULT_LLM_MODEL", "gpt-5"),
    "prompt": "{{input.message}}"
})

# Create Nexus app
from kailash.nexus import NexusApp
app = NexusApp()
app.register("chat", builder.build(reg))

# Run all channels
if __name__ == "__main__":
    app.start()
```

## Running Modes

```bash
# API mode (default)
python app.py --mode api --port 8000

# CLI mode
python app.py --mode cli

# MCP mode (for Claude Desktop)
python app.py --mode mcp
```

<!-- Trigger Keywords: install nexus, nexus setup, nexus requirements, nexus installation -->
