---
name: architecture-decisions
description: "Kailash Rust architecture decisions: framework (Core/DataFlow/Nexus/Kaizen), runtime (async/sync), DB (PostgreSQL/SQLite), node, test tier. Use for 'which X' choice."
---

# Kailash Architecture Decisions

Decision guides for selecting the right frameworks, runtimes, databases, nodes, and testing strategies for your Kailash Rust application.

## Overview

Comprehensive decision guides for:

- Framework selection (Core SDK, DataFlow, Nexus, Kaizen)
- Runtime selection (async `execute()` vs sync `execute_sync()`)
- Database selection (PostgreSQL vs SQLite)
- Node selection for specific tasks
- Test tier selection (Unit, Integration, E2E)

## Reference Documentation

### Framework Selection

- **[decide-framework](decide-framework.md)** - Choose the right framework
  - Core SDK: Custom workflows with full control
  - DataFlow: Database-first applications
  - Nexus: Multi-channel platforms
  - Kaizen: AI agent systems
  - When to use each
  - Combining frameworks

### Runtime Selection

- **[decide-runtime](decide-runtime.md)** - Unified Runtime with async/sync execution
  - Async: `runtime.execute(&workflow, inputs).await?`
  - Sync: `runtime.execute_sync(&workflow, inputs)?`
  - RuntimeConfig for tuning
  - Level-based parallelism via tokio

### Database Selection

- **[decide-database-postgresql-sqlite](decide-database-postgresql-sqlite.md)** - PostgreSQL vs SQLite
  - Production: PostgreSQL (sqlx::PgPool)
  - Development/Testing: SQLite (sqlx::SqlitePool)
  - Feature comparison
  - sqlx compile-time query checking

### Node Selection

- **[decide-node-for-task](decide-node-for-task.md)** - Choose the right node
  - AI tasks: LLMNode, EmbeddingNode
  - API calls: HTTPRequestNode, GraphQLNode
  - Custom logic: Use appropriate typed nodes
  - Database: DataFlow auto-generated nodes
  - File operations: FileReaderNode, CSVProcessorNode
  - Conditional logic: SwitchNode

### Test Tier Selection

- **[decide-test-tier](decide-test-tier.md)** - Unit vs Integration vs E2E
  - Tier 1: Unit tests (`#[test]`, `#[tokio::test]`)
  - Tier 2: Integration tests (`#[cfg(feature = "integration")]`, real infrastructure)
  - Tier 3: End-to-end tests (`#[cfg(feature = "e2e")]`, full system)
  - When to use each tier
  - Coverage targets

## Key Decision Frameworks

### Framework Selection Matrix

| Need                  | Framework    | Why                       |
| --------------------- | ------------ | ------------------------- |
| **Custom workflows**  | Core SDK     | Full control, 140+ nodes  |
| **Database CRUD**     | DataFlow     | Auto-generated nodes      |
| **Multi-channel API** | Nexus        | API + CLI + MCP instantly |
| **AI agents**         | Kaizen       | Signature-based agents    |
| **All of above**      | Combine them | They work together        |

### Runtime Selection Flow

```
What execution context do you need?
  |-- Async context (axum handler, tokio runtime)?
  |     -> runtime.execute(&workflow, inputs).await?
  |-- Sync context (CLI tool, script, test without async)?
  |     -> runtime.execute_sync(&workflow, inputs)?
  |-- Both?
        -> Use the same Runtime instance; call whichever method fits
```

### Database Selection Flow

```
What's your use case?
  |-- Production deployment?
  |     -> PostgreSQL (sqlx::PgPool, scalable, enterprise)
  |-- Development/testing?
  |     -> SQLite (sqlx::SqlitePool, simple, fast setup)
  |-- High concurrency?
        -> PostgreSQL (better concurrency)
```

### Node Selection Flow

```
What task are you doing?
  |-- LLM/AI tasks -> LLMNode, EmbeddingNode, ClassificationNode
  |-- Database operations -> DataFlow auto-generated nodes
  |-- HTTP API calls -> HTTPRequestNode, GraphQLNode
  |-- File reading -> FileReaderNode, CSVProcessorNode
  |-- Conditional routing -> SwitchNode
  |-- Not sure? -> Check CLAUDE.md node categories
```

### Test Tier Flow

```
What are you testing?
  |-- Individual function -> Tier 1 (Unit, #[test])
  |-- Workflow execution -> Tier 2 (Integration, cargo test --features integration)
  |-- Complete user flow -> Tier 3 (E2E, cargo test --features e2e)
  |-- All of above -> Use all tiers
```

## Critical Decision Rules

### Framework Decisions

- Use Core SDK for custom workflows
- Use DataFlow for database operations (not raw SQL or ORMs)
- Use Nexus for multi-channel platforms (not raw axum directly)
- Use Kaizen for AI agents (not building from scratch)
- Combine frameworks as needed
- NEVER use raw SQL when DataFlow can generate nodes
- NEVER build API/CLI/MCP manually when Nexus can do it
- NEVER skip framework evaluation

### Runtime Decisions

- One unified `Runtime` -- no separate sync/async types
- Use `execute()` in async contexts (tokio, axum handlers)
- Use `execute_sync()` in sync contexts (CLI, scripts)
- RuntimeConfig for tuning (concurrency, debug, etc.)

### Database Decisions

- Production: PostgreSQL
- Development: SQLite (for speed)
- Testing: SQLite (for isolation)
- Multi-instance: One DataFlow per database
- NEVER use SQLite for production high-concurrency
- NEVER skip connection pooling config

## When to Use This Skill

Use this skill when you need to:

- Choose between Core SDK, DataFlow, Nexus, or Kaizen
- Decide between async `execute()` and sync `execute_sync()`
- Decide between PostgreSQL and SQLite
- Find the right node for a task
- Determine test tier for a test case
- Make architecture decisions
- Understand trade-offs between options

## Decision Templates

### Starting a New Project

```
1. What's the primary use case?
   - Database CRUD -> Start with DataFlow
   - Multi-channel API -> Start with Nexus
   - AI agents -> Start with Kaizen
   - Custom workflows -> Start with Core SDK

2. What's the execution context?
   - Async (axum, tokio) -> runtime.execute().await?
   - Sync (CLI, scripts) -> runtime.execute_sync()?

3. What's the database?
   - Production -> PostgreSQL
   - Dev/Test -> SQLite

4. How to test?
   - Tier 1: Fast unit tests (#[test])
   - Tier 2: Real infrastructure integration (#[cfg(feature = "integration")])
   - Tier 3: Full system E2E (#[cfg(feature = "e2e")])
```

## Related Skills

- **[01-core](../../01-core/SKILL.md)** - Core SDK fundamentals
- **[02-dataflow](../../02-dataflow/SKILL.md)** - DataFlow framework
- **[03-nexus](../../03-nexus/SKILL.md)** - Nexus framework
- **[04-kaizen](../../04-kaizen/SKILL.md)** - Kaizen framework
- **[13-testing-strategies](../../13-testing-strategies/SKILL.md)** - Testing strategies

## Support

For architecture decisions, invoke:

- ``decide-framework` skill` - Framework selection and architecture
- `analyst` - Deep analysis for complex decisions
- `analyst` - Requirements breakdown
- `rust-architect` - Cross-crate trait design and API patterns
