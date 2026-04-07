---
name: nexus
description: "Kailash Nexus - zero-config multi-channel platform for deploying workflows as API + CLI + MCP simultaneously. Use when asking about 'Nexus', 'multi-channel', 'platform deployment', 'API deployment', 'CLI deployment', 'MCP deployment', 'unified sessions', 'workflow deployment', 'production deployment', 'API gateway', 'session management', 'health monitoring', 'enterprise platform', 'plugins', 'event system', or 'workflow registration'."
---

# Kailash Nexus - Multi-Channel Platform Framework

Nexus is a zero-config multi-channel platform built on Kailash Core SDK that deploys workflows as API + CLI + MCP simultaneously.

## Features

- **Zero Configuration**: Deploy workflows instantly without boilerplate code
- **Multi-Channel Access**: API, CLI, and MCP from single deployment
- **Unified Sessions**: Consistent session management across all channels
- **Enterprise Features**: Health monitoring, plugins, event system, comprehensive logging
- **DataFlow Integration**: Automatic CRUD API generation from database models
- **Async-First**: Uses kailash.Runtime by default for optimal performance

## Reference Documentation

### Getting Started

- **[nexus-quickstart](nexus-quickstart.md)** -- Quick start guide and installation
- **[nexus-essential-patterns](nexus-essential-patterns.md)** -- Core usage patterns
- **[nexus-comparison](nexus-comparison.md)** -- Nexus vs alternatives

### Core Concepts

- **[nexus-workflow-registration](nexus-workflow-registration.md)** -- Registering workflows
- **[nexus-multi-channel](nexus-multi-channel.md)** -- Multi-channel architecture
- **[nexus-config-options](nexus-config-options.md)** -- Configuration options
- **[nexus-handler-support](nexus-handler-support.md)** -- `@app.handler()` decorator

### Channel-Specific Patterns

- **[nexus-api-patterns](nexus-api-patterns.md)** -- HTTP API patterns and input mapping
- **[nexus-mcp-channel](nexus-mcp-channel.md)** -- MCP channel configuration

### Production and Security

- **[nexus-production-deployment](nexus-production-deployment.md)** -- Deployment patterns, Docker, load balancer
- **[nexus-security-best-practices](nexus-security-best-practices.md)** -- Security patterns

## Key Concepts

**Zero-Config Platform**: No manual routes, no CLI arg parsing, no MCP server setup. One deployment for all channels.

**Multi-Channel Architecture**: Single deployment, three access methods -- HTTP API (RESTful JSON), CLI (command-line), MCP (Model Context Protocol server).

**Unified Sessions**: Cross-channel session tracking, state persistence, session-scoped workflows, concurrent session support.

## Channel Comparison

| Feature       | API  | CLI       | MCP         |
| ------------- | ---- | --------- | ----------- |
| **Access**    | HTTP | Terminal  | MCP Clients |
| **Input**     | JSON | Args/JSON | Structured  |
| **Output**    | JSON | Text/JSON | Structured  |
| **Sessions**  | Yes  | Yes       | Yes         |
| **Auth**      | Yes  | Yes       | Yes         |
| **Streaming** | Yes  | Yes       | Yes         |

## Critical Rules

- Use Nexus for workflow platforms -- never bypass with raw framework routes
- Register workflows, not individual routes
- Enable health monitoring in production
- Nexus uses kailash.Runtime by default (correct for Docker)
- NEVER implement manual API/CLI/MCP servers when Nexus can do it

## Related Skills

- **[01-core-sdk](../../01-core-sdk/SKILL.md)** -- Core workflow patterns
- **[02-dataflow](../02-dataflow/SKILL.md)** -- Auto CRUD API generation
- **[04-kaizen](../04-kaizen/SKILL.md)** -- AI agent deployment
- **[05-kailash-mcp](../05-kailash-mcp/SKILL.md)** -- MCP channel details

## Support

- `nexus-specialist` -- Nexus implementation and deployment
- `release-specialist` -- Production deployment patterns
